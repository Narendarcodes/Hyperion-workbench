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
 * Render the product name without its independently slotted mark. The text
 * arrives locale-resolved so no product copy lives in presentation code.
 * @param props.name - localized product name.
 * @returns the product name text.
 */
export function OfficialBrandName({ name }: { name: string }) {
  return <span>{name}</span>
}
