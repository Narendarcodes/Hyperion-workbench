import { HyperionMark } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SidebarBrandMarkOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'

/**
 * Render the Hyperion mark with the presentation requested by its host surface.
 * @param props - Host-supplied mark presentation.
 * @returns the Hyperion product mark.
 */
export function OfficialBrandMark({ size }: SidebarBrandMarkOwnerProps) {
  return <HyperionMark size={size} />
}

/**
 * Render the Hyperion product name without its independently slotted mark.
 * @returns the Hyperion name text.
 */
export function OfficialBrandName() {
  return <span>HYPERION</span>
}
