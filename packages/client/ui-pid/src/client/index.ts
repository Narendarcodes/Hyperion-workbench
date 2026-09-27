import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { PIDWorkspace } from './PIDWorkspace.tsx'

export { PIDWorkspace } from './PIDWorkspace.tsx'
export { pidStore, usePIDStore, openPIDWorkspace, closePIDWorkspace } from './pidStore.ts'
export type { PIDEquipment, PIDLine, PIDDocument, PIDAreaNode } from './types.ts'

export const inject = ['slots']

export function apply(ctx: Context): void {
  // Register the P&ID Engineering Workspace in shell.overlay
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      {
        name: 'shell.overlay',
        id: 'pid-workspace',
      },
      PIDWorkspace,
    ),
  )
}
