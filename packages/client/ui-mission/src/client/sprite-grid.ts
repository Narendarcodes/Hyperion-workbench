/**
 * Agent Virtual Office (AVO)
 * Copyright (c) 2024
 * Licensed under the MIT License.
 * Adapted for Hyperion Mission View: pixel-art character sprite matrix and frame math.
 * @module @deepseek-ai/dsh-client-ui-mission/client/sprite-grid
 */

/** Single pixel coordinate and color in a 16x16 sprite matrix. */
export interface SpritePixel {
  readonly x: number
  readonly y: number
  readonly color: string
}

/**
 * Darkens a hex color by a specified percentage.
 *
 * @param hex - Color in #RRGGBB format.
 * @param percent - Darkening ratio (0.0 - 1.0).
 * @returns Darkened hex color.
 */
export function darken(hex: string, percent: number): string {
  const num = Number.parseInt(hex.replace('#', ''), 16)
  if (Number.isNaN(num)) return hex
  const r = Math.max(0, Math.floor((num >> 16) * (1 - percent)))
  const g = Math.max(0, Math.floor(((num >> 8) & 0x00ff) * (1 - percent)))
  const b = Math.max(0, Math.floor((num & 0x0000ff) * (1 - percent)))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

/**
 * Generates the 16x16 pixel matrix for an agent character in idle or seated posture.
 *
 * @param bodyColor - Primary shirt/body color.
 * @param hairColor - Hair color.
 * @param accessory - Optional accessory ('crown' | 'glasses' | 'headset' | 'tie' | 'hoodie' | 'badge' | 'clipboard').
 * @param frame - Animation walk frame (0 = idle, 1 = left step, 2 = right step).
 * @returns Array of colored pixels.
 */
export function generateCharacterPixels(
  bodyColor: string,
  hairColor: string,
  accessory?: string,
  frame = 0,
): readonly SpritePixel[] {
  const pixels: SpritePixel[] = []
  const skinColor = '#fcd34d' // warm pixel skin tone
  const darkSkin = darken(skinColor, 0.15)
  const darkBody = darken(bodyColor, 0.2)
  const eyeColor = '#1e293b'

  // Hair (top rows 2-4)
  for (let x = 5; x <= 10; x++) {
    pixels.push({ x, y: 2, color: hairColor })
    pixels.push({ x, y: 3, color: hairColor })
  }
  pixels.push({ x: 4, y: 3, color: hairColor })
  pixels.push({ x: 11, y: 3, color: hairColor })
  pixels.push({ x: 4, y: 4, color: hairColor })
  pixels.push({ x: 11, y: 4, color: hairColor })

  // Face (rows 4-7)
  for (let y = 4; y <= 7; y++) {
    for (let x = 5; x <= 10; x++) {
      pixels.push({ x, y, color: skinColor })
    }
  }

  // Eyes (row 5)
  pixels.push({ x: 6, y: 5, color: eyeColor })
  pixels.push({ x: 9, y: 5, color: eyeColor })

  // Cheeks / Mouth (rows 6-7)
  pixels.push({ x: 6, y: 6, color: darkSkin })
  pixels.push({ x: 9, y: 6, color: darkSkin })
  pixels.push({ x: 7, y: 7, color: darkSkin })
  pixels.push({ x: 8, y: 7, color: darkSkin })

  // Body / Shirt (rows 8-12)
  for (let y = 8; y <= 12; y++) {
    for (let x = 4; x <= 11; x++) {
      pixels.push({ x, y, color: (x === 4 || x === 11 || y === 12) ? darkBody : bodyColor })
    }
  }

  // Arms / Hands
  pixels.push({ x: 3, y: 9, color: bodyColor })
  pixels.push({ x: 3, y: 10, color: bodyColor })
  pixels.push({ x: 3, y: 11, color: skinColor })
  pixels.push({ x: 12, y: 9, color: bodyColor })
  pixels.push({ x: 12, y: 10, color: bodyColor })
  pixels.push({ x: 12, y: 11, color: skinColor })

  // Legs / Feet (rows 13-15) based on walk frame
  const pantsColor = '#334155'
  const shoeColor = '#0f172a'

  if (frame === 0) {
    // Idle / Seated
    pixels.push({ x: 5, y: 13, color: pantsColor })
    pixels.push({ x: 6, y: 13, color: pantsColor })
    pixels.push({ x: 9, y: 13, color: pantsColor })
    pixels.push({ x: 10, y: 13, color: pantsColor })
    pixels.push({ x: 5, y: 14, color: shoeColor })
    pixels.push({ x: 6, y: 14, color: shoeColor })
    pixels.push({ x: 9, y: 14, color: shoeColor })
    pixels.push({ x: 10, y: 14, color: shoeColor })
  } else if (frame === 1) {
    // Left step forward
    pixels.push({ x: 5, y: 13, color: pantsColor })
    pixels.push({ x: 5, y: 14, color: pantsColor })
    pixels.push({ x: 5, y: 15, color: shoeColor })
    pixels.push({ x: 6, y: 15, color: shoeColor })
    pixels.push({ x: 9, y: 13, color: pantsColor })
    pixels.push({ x: 9, y: 14, color: shoeColor })
  } else {
    // Right step forward
    pixels.push({ x: 6, y: 13, color: pantsColor })
    pixels.push({ x: 6, y: 14, color: shoeColor })
    pixels.push({ x: 10, y: 13, color: pantsColor })
    pixels.push({ x: 10, y: 14, color: shoeColor })
    pixels.push({ x: 9, y: 15, color: shoeColor })
    pixels.push({ x: 10, y: 15, color: shoeColor })
  }

  // Accessories
  if (accessory === 'crown') {
    const gold = '#fbbf24'
    const ruby = '#ef4444'
    pixels.push({ x: 5, y: 1, color: gold })
    pixels.push({ x: 7, y: 1, color: ruby })
    pixels.push({ x: 8, y: 1, color: ruby })
    pixels.push({ x: 10, y: 1, color: gold })
    pixels.push({ x: 6, y: 2, color: gold })
    pixels.push({ x: 9, y: 2, color: gold })
  } else if (accessory === 'glasses') {
    const frameColor = '#0f172a'
    pixels.push({ x: 5, y: 5, color: frameColor })
    pixels.push({ x: 7, y: 5, color: frameColor })
    pixels.push({ x: 8, y: 5, color: frameColor })
    pixels.push({ x: 10, y: 5, color: frameColor })
  } else if (accessory === 'headset') {
    const headColor = '#06b6d4'
    pixels.push({ x: 4, y: 2, color: headColor })
    pixels.push({ x: 5, y: 1, color: headColor })
    pixels.push({ x: 10, y: 1, color: headColor })
    pixels.push({ x: 11, y: 2, color: headColor })
    pixels.push({ x: 4, y: 5, color: headColor })
    pixels.push({ x: 4, y: 6, color: headColor })
  } else if (accessory === 'tie') {
    const tieColor = '#ef4444'
    pixels.push({ x: 7, y: 8, color: tieColor })
    pixels.push({ x: 8, y: 8, color: tieColor })
    pixels.push({ x: 7, y: 9, color: tieColor })
    pixels.push({ x: 8, y: 9, color: tieColor })
    pixels.push({ x: 7, y: 10, color: tieColor })
    pixels.push({ x: 8, y: 10, color: tieColor })
  } else if (accessory === 'hoodie') {
    const hood = darken(bodyColor, 0.3)
    pixels.push({ x: 4, y: 2, color: hood })
    pixels.push({ x: 11, y: 2, color: hood })
    pixels.push({ x: 4, y: 3, color: hood })
    pixels.push({ x: 11, y: 3, color: hood })
  } else if (accessory === 'badge') {
    const badge = '#facc15'
    pixels.push({ x: 9, y: 9, color: badge })
    pixels.push({ x: 10, y: 9, color: badge })
  } else if (accessory === 'clipboard') {
    const board = '#d97706'
    const paper = '#ffffff'
    pixels.push({ x: 12, y: 10, color: board })
    pixels.push({ x: 13, y: 10, color: board })
    pixels.push({ x: 12, y: 11, color: paper })
    pixels.push({ x: 13, y: 11, color: paper })
  }

  return pixels
}
