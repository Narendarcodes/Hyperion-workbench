/**
 * The workbench light/dark toggle shared by the top-right utility row and the
 * Home header (the body attribute the design tokens key off).
 * @module @deepseek-ai/dsh-client-ui-conversation/client/skeleton/theme-toggle
 */

export const DARK_THEME_ATTRIBUTE = 'data-ds-dark-theme'

export function toggleWorkbenchTheme(body: HTMLElement = document.body): void {
  if (body.hasAttribute(DARK_THEME_ATTRIBUTE)) body.removeAttribute(DARK_THEME_ATTRIBUTE)
  else body.setAttribute(DARK_THEME_ATTRIBUTE, 'true')
}
