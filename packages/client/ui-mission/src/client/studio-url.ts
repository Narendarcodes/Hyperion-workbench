/**
 * Studio base URL for the embedded live office. Set once from the plugin
 * Config in `apply()`; the MissionView iframe reads it at render time.
 * @module @deepseek-ai/dsh-client-ui-mission/client/studio-url
 */

let studioUrl = 'http://localhost:3000'

/** Override the Studio base URL (trailing slashes trimmed). */
export function setStudioUrl(url: string): void {
  studioUrl = url.replace(/\/+$/, '') || 'http://localhost:3000'
}

/** Current Studio base URL for the office iframe. */
export function getStudioUrl(): string {
  return studioUrl
}
