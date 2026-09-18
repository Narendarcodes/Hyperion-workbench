/** Authenticated raw-byte routes registered on the Connection fetch registry. */

import { readdir, readFile, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { AttachmentId } from '@deepseek-ai/dsh-attachment'
import type { FileAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { SessionId } from '@deepseek-ai/dsh-session'
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol'
import type { FileUploads } from './index.ts'
import type { FileUploadValue } from './types.ts'

type FileUploadHttpResult =
  | { readonly ok: true; readonly value: FileUploadValue }
  | {
    readonly ok: false
    readonly error: { readonly code: string; readonly message: string; readonly details: object }
  }

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
}

function sanitizeLeafName(value: string): string {
  const leaf = value.slice(Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\')) + 1)
  const clean = leaf.replace(/[\u0000-\u001f\u007f]/g, '').replace(/[<>:"|?*]/g, '_').trim()
  return clean === '' || clean === '.' || clean === '..' ? 'file' : clean
}

async function findAttachmentByName(attachments: unknown, leafName: string): Promise<string | undefined> {
  const root = (attachments as { root?: string })?.root
  if (typeof root !== 'string') return undefined
  const filesDir = join(root, 'files')
  try {
    const prefixes = await readdir(filesDir)
    for (const prefix of prefixes) {
      const prefixDir = join(filesDir, prefix)
      const digests = await readdir(prefixDir)
      for (const digest of digests) {
        const candidate = join(prefixDir, digest, leafName)
        try {
          const stats = await stat(candidate)
          if (stats.isFile()) return candidate
        } catch {
          // Continue search
        }
      }
    }
  } catch {
    return undefined
  }
  return undefined
}

/**
 * Handle one authenticated HTTP file download/read request.
 * @param ctx - Host plugin context carrying the attachments service.
 * @param request - authenticated HTTP request from Connection.
 * @returns binary file response or HTTP error status.
 */
export async function handleFileDownloadHttp(ctx: Context, request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { allow: 'GET, HEAD' } })
  }
  const url = new URL(request.url)
  const paramDigest = url.searchParams.get('digest') ?? url.searchParams.get('attachmentId')
  const rawDigest = paramDigest?.replace(/^sha256:/i, '')
  const name = url.searchParams.get('name') ?? url.searchParams.get('file') ?? url.searchParams.get('path')
  if (name === null || name.trim() === '') {
    return new Response('invalid attachment parameters', { status: 400 })
  }
  const attachments = ctx.get('attachments')
  if (attachments === undefined) {
    return new Response('attachment service unavailable', { status: 500 })
  }
  const leafName = sanitizeLeafName(name)
  let filePath: string | undefined

  if (rawDigest !== undefined && rawDigest !== '' && /^[a-f0-9]{64}$/i.test(rawDigest)) {
    const digest = rawDigest.toLowerCase()
    const ref: FileAttachmentRef = {
      attachmentId: AttachmentId(`sha256:${digest}`),
      name: leafName,
      bytes: 0,
    }
    try {
      filePath = attachments.fileHostPath(ref)
    } catch {
      // Fallback to name search
    }
  }

  if (filePath === undefined) {
    filePath = await findAttachmentByName(attachments, leafName)
  }

  if (filePath === undefined) {
    return new Response('attachment file not found', { status: 404 })
  }
  try {
    const fileData = await readFile(filePath)
    const ext = extname(leafName).toLowerCase()
    const mimeType = MIME_TYPES[ext] ?? 'application/octet-stream'
    const headers = new Headers({
      'content-type': mimeType,
      'content-disposition': `inline; filename="${encodeURIComponent(leafName)}"`,
      'cache-control': 'public, max-age=31536000, immutable',
    })
    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers })
    }
    return new Response(fileData, { status: 200, headers })
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return new Response('attachment file not found', { status: 404 })
    }
    return new Response('failed to read attachment file', { status: 500 })
  }
}

/**
 * Handle one authenticated raw-byte upload.
 * @param service - Host upload service receiving streamed bytes.
 * @param request - authenticated HTTP request from Connection.
 * @returns JSON result using HTTP status 200 after request validation.
 */
export async function handleFileUploadHttp(service: FileUploads, request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: { allow: 'POST' } })
  }
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (mediaType !== 'application/octet-stream') {
    return new Response('content type must be application/octet-stream', { status: 415 })
  }
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')
  if (sessionId === null || sessionId === '') {
    return new Response('sessionId is required', { status: 400 })
  }
  const name = url.searchParams.get('name') ?? undefined
  let result: FileUploadHttpResult
  try {
    result = {
      ok: true,
      value: await service.uploadStream({
        sessionId: brandString<SessionId>(sessionId),
        data: requestBodyChunks(request.body),
        signal: request.signal,
        ...(name === undefined ? {} : { name }),
      }),
    }
  } catch (error) {
    const failure = remoteErrorOf(error)
    result = {
      ok: false,
      error: failure !== undefined
        ? { code: failure.code, message: failure.message, details: failure.details }
        : {
          code: 'gateway/internal',
          message: error instanceof Error ? error.message : String(error),
          details: {},
        },
    }
  }
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

async function* requestBodyChunks(body: ReadableStream<Uint8Array> | null): AsyncIterable<Uint8Array> {
  if (body === null) return
  const reader = body.getReader()
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) return
      yield chunk.value
    }
  } finally {
    reader.releaseLock()
  }
}
