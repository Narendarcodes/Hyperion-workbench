/**
 * System Telemetry and Update checking client service.
 */

export interface GpuMetrics {
  name: string
  totalVramMB: number
  usedVramMB: number
  freeVramMB: number
  utilization: number
  temperature: number
  vramTotalMB?: number | undefined
  vramUsedMB?: number | undefined
  temperatureC?: number | undefined
  utilizationGPU?: number | undefined
}

export interface SystemResources {
  gpu: GpuMetrics | null
  cpu: {
    model: string
    cores: number
    usagePercent: number
    loadPercent?: number | undefined
  }
  ram: {
    totalGB: number
    usedGB: number
    freeGB: number
    usagePercent: number
  }
  storage: {
    drive: string
    totalGB: number
    usedGB: number
    freeGB: number
    usagePercent: number
  }
  memory?: {
    total: number
    used: number
    free: number
  } | undefined
  disk?: {
    drive: string
    total: number
    free: number
  } | undefined
}

export interface OllamaReleaseUpdate {
  isOnline: boolean
  latestVersion?: string | undefined
  currentVersion: string
  updateAvailable?: boolean | undefined
  releaseNotes?: string | undefined
  publishedAt?: string | undefined
  htmlUrl?: string | undefined
}

function enrichResources(raw: {
  gpu?: {
    name?: string
    totalVramMB?: number
    usedVramMB?: number
    freeVramMB?: number
    utilization?: number
    temperature?: number
  } | null
  cpu: {
    model?: string
    cores?: number
    usagePercent?: number
  }
  ram: {
    totalGB?: number
    usedGB?: number
    freeGB?: number
    usagePercent?: number
  }
  storage: {
    drive?: string
    totalGB?: number
    usedGB?: number
    freeGB?: number
    usagePercent?: number
  }
}): SystemResources {
  const gpu: GpuMetrics | null = raw.gpu
    ? {
      name: raw.gpu.name || 'Local GPU',
      totalVramMB: raw.gpu.totalVramMB || 0,
      usedVramMB: raw.gpu.usedVramMB || 0,
      freeVramMB: raw.gpu.freeVramMB || 0,
      utilization: raw.gpu.utilization || 0,
      temperature: raw.gpu.temperature || 0,
      vramTotalMB: raw.gpu.totalVramMB || 0,
      vramUsedMB: raw.gpu.usedVramMB || 0,
      temperatureC: raw.gpu.temperature,
      utilizationGPU: raw.gpu.utilization,
    }
    : null

  const cpu = {
    model: raw.cpu.model || 'Host Processor',
    cores: raw.cpu.cores || 1,
    usagePercent: raw.cpu.usagePercent || 0,
    loadPercent: raw.cpu.usagePercent || 0,
  }

  const ramTotal = raw.ram.totalGB || 0
  const ramUsed = raw.ram.usedGB || 0
  const ramFree = raw.ram.freeGB || 0

  const memory = {
    total: ramTotal * 1024 * 1024 * 1024,
    used: ramUsed * 1024 * 1024 * 1024,
    free: ramFree * 1024 * 1024 * 1024,
  }

  const storageTotal = raw.storage.totalGB || 0
  const storageUsed = raw.storage.usedGB || 0
  const storageFree = raw.storage.freeGB || 0

  const disk = {
    drive: raw.storage.drive || 'System',
    total: storageTotal * 1024 * 1024 * 1024,
    free: storageFree * 1024 * 1024 * 1024,
  }

  return {
    gpu,
    cpu,
    ram: {
      totalGB: ramTotal,
      usedGB: ramUsed,
      freeGB: ramFree,
      usagePercent: raw.ram.usagePercent || (ramTotal > 0 ? Math.round((ramUsed / ramTotal) * 100) : 0),
    },
    storage: {
      drive: raw.storage.drive || 'System',
      totalGB: storageTotal,
      usedGB: storageUsed,
      freeGB: storageFree,
      usagePercent: raw.storage.usagePercent || (storageTotal > 0 ? Math.round((storageUsed / storageTotal) * 100) : 0),
    },
    memory,
    disk,
  }
}

export async function fetchSystemResources(): Promise<SystemResources> {
  try {
    const res = await fetch('/api/system/resources', { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json()
      return enrichResources(data)
    }
  } catch {
    // Fallback if host endpoint not reachable
  }
  // Graceful empty fallback when host introspection is unavailable — never invent fake hardware metrics
  const detectedCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 1 : 1
  return enrichResources({
    gpu: null,
    cpu: {
      model: 'Host Processor (Telemetry Unreachable)',
      cores: detectedCores,
      usagePercent: 0,
    },
    ram: {
      totalGB: 0,
      usedGB: 0,
      freeGB: 0,
      usagePercent: 0,
    },
    storage: {
      drive: 'Local',
      totalGB: 0,
      usedGB: 0,
      freeGB: 0,
      usagePercent: 0,
    },
  })
}

export async function checkOllamaUpdates(currentVersion: string): Promise<OllamaReleaseUpdate> {
  try {
    const res = await fetch('https://api.github.com/repos/ollama/ollama/releases/latest', {
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) {
      return { isOnline: false, currentVersion }
    }
    const data = (await res.json()) as {
      tag_name?: string
      name?: string
      body?: string
      published_at?: string
      html_url?: string
    }

    const latest = (data.tag_name || '').replace(/^v/, '')
    const current = currentVersion.replace(/^v/, '')
    const updateAvailable = Boolean(latest && current && latest !== current)

    const update: OllamaReleaseUpdate = {
      isOnline: true,
      currentVersion,
      updateAvailable,
    }
    if (data.tag_name || latest) update.latestVersion = data.tag_name || latest
    if (data.body !== undefined) update.releaseNotes = data.body
    if (data.published_at !== undefined) update.publishedAt = data.published_at
    if (data.html_url !== undefined) update.htmlUrl = data.html_url
    return update
  } catch {
    return {
      isOnline: false,
      currentVersion,
    }
  }
}
