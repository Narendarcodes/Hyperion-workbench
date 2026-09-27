// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ModelHubHeader } from '../src/client/ModelHubHeader.tsx'
import { ModelsTabView } from '../src/client/ModelsTabView.tsx'
import { RuntimeTabView } from '../src/client/RuntimeTabView.tsx'
import { ModelHubView } from '../src/client/ModelHubView.tsx'
import { modelHubStore } from '../src/client/store.ts'

afterEach(cleanup)

describe('HYPERION Model Hub Redesign', () => {
  it('renders ModelHubHeader with breadcrumb, title, and tabs', () => {
    const onTabChange = vi.fn()
    render(<ModelHubHeader activeTab="models" onTabChange={onTabChange} />)

    expect(screen.getByText('AI Infrastructure')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Model Hub' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Models' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Runtime' })).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'Runtime' }))
    expect(onTabChange).toHaveBeenCalledWith('runtime')
  })

  it('renders ModelsTabView with search, filter chips, model cards, and details drawer', () => {
    const storeState = {
      ...modelHubStore.getSnapshot(),
      models: [
        {
          name: 'qwen3.5:4b',
          model: 'qwen3.5:4b',
          modified_at: '2026-09-09T19:06:27.1336423+05:30',
          size: 3389983489,
          digest: '6f134ed003034f79398e9dbe1cb34fb8f582cbcd806937d76ae0f26fc61e8ab2',
          details: {
            parent_model: 'qwen3.5:4b',
            format: 'gguf',
            family: 'qwen35',
            families: ['qwen35'],
            parameter_size: '4.7B',
            quantization_level: 'Q4_K_M',
            context_length: 262144,
            embedding_length: 2560,
          },
          capabilities: ['completion', 'vision', 'tools', 'thinking'],
        },
      ],
    }

    render(<ModelsTabView storeState={storeState} />)

    // Toolbar search & buttons
    expect(screen.getByPlaceholderText('Search models...')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add Model' })).toBeTruthy()

    // Source filter chips
    expect(screen.getByRole('button', { name: /All \(/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Ollama \(/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /llama\.cpp \(/ })).toBeTruthy()

    // Sections
    expect(screen.getByRole('heading', { level: 2, name: /Installed Models/ })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Available to Add' })).toBeTruthy()

    // Drawer with Model Information
    expect(screen.getByRole('heading', { level: 4, name: 'Model Information' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Use Model' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Load to Memory' })).toBeTruthy()
  })

  it('renders RuntimeTabView with Engine Cards, System Resources, and Loaded Models table', () => {
    const storeState = {
      ...modelHubStore.getSnapshot(),
      runningModels: [
        {
          name: 'qwen3.5:4b',
          model: 'qwen3.5:4b',
          size: 3389983489,
          digest: '6f134ed003034f79398e9dbe1cb34fb8f582cbcd806937d76ae0f26fc61e8ab2',
          expires_at: '2026-09-27T12:00:00Z',
          size_vram: 3389983489,
        },
      ],
    }

    render(<RuntimeTabView storeState={storeState} />)

    // Engine cards
    expect(screen.getAllByRole('heading', { level: 3, name: 'Ollama Engine' }).length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('heading', { level: 3, name: 'llama.cpp Engine' })).toBeTruthy()

    // System resources
    expect(screen.getByRole('heading', { level: 2, name: 'System Resources' })).toBeTruthy()
    expect(screen.getByText('GPU VRAM')).toBeTruthy()
    expect(screen.getByText('System RAM')).toBeTruthy()
    expect(screen.getByText('CPU Compute')).toBeTruthy()
    expect(screen.getByText(/Disk Storage/)).toBeTruthy()

    // Loaded models table
    expect(screen.getByRole('heading', { level: 2, name: /Loaded Models/ })).toBeTruthy()
    expect(screen.getByText('MODEL')).toBeTruthy()
    expect(screen.getByText('ACTIONS')).toBeTruthy()

    // Drawer
    expect(screen.getByRole('heading', { level: 4, name: 'Engine Information' })).toBeTruthy()
    expect(screen.getByRole('heading', { level: 4, name: 'System Logs' })).toBeTruthy()
  })

  it('renders complete ModelHubView and switches between tabs', () => {
    render(<ModelHubView />)

    expect(screen.getByRole('region', { name: 'Model Hub' })).toBeTruthy()

    // Switch to Runtime
    fireEvent.click(screen.getByRole('tab', { name: 'Runtime' }))
    expect(screen.getAllByRole('heading', { level: 3, name: 'Ollama Engine' }).length).toBeGreaterThanOrEqual(2)

    // Switch back to Models
    fireEvent.click(screen.getByRole('tab', { name: 'Models' }))
    expect(screen.getByPlaceholderText('Search models...')).toBeTruthy()
  })
})
