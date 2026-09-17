import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import { ModelHubSidebarButton } from './ModelHubSidebarButton'
import { ModelHubWorkspace } from './ModelHubWorkspace'
import { startTelemetryPolling, bindCordisContext } from './store'

export const inject = ['slots', 'sessions', 'modelDirectories', 'remote', 'remote.settings']

export function apply(ctx: Context): void {
  // Bind context to store for session model switching
  bindCordisContext(ctx)

  // Start polling hardware & Ollama status while the client is alive
  ctx.effect(() => {
    const stopPolling = startTelemetryPolling(4000)
    return () => {
      stopPolling()
    }
  }, 'ui-model-hub: telemetry polling')

  // Register the sidebar footer button (stacks above Settings in sidebar footArea)
  const slots = (ctx as any).slots
  slots.inject('sidebar.footer.action', () =>
    slots.register(
      {
        name: 'sidebar.footer.action',
        id: 'model-hub-sidebar-button',
      },
      ModelHubSidebarButton
    )
  )

  // Register the Model Hub full workspace overlay in shell.overlay
  slots.inject('shell.overlay', () =>
    slots.register(
      {
        name: 'shell.overlay',
        id: 'model-hub-workspace',
      },
      ModelHubWorkspace
    )
  )
}
