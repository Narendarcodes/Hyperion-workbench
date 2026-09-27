import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { ModelHubSidebarButton } from './ModelHubSidebarButton'
import { ModelHubWorkspace } from './ModelHubWorkspace'
import { ModelHubView } from './ModelHubView'
import { startTelemetryPolling, bindCordisContext } from './store'

export { ModelHubView, ModelHubSidebarButton, ModelHubWorkspace }
export * from './ModelHubHeader'
export * from './ModelsTabView'
export * from './RuntimeTabView'

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

  // Model Hub is accessed exclusively via the More navigation section in the workbench sidebar.

  // Register the Model Hub full workspace overlay in shell.overlay
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      {
        name: 'shell.overlay',
        id: 'model-hub-workspace',
      },
      ModelHubWorkspace,
    ),
  )
}
