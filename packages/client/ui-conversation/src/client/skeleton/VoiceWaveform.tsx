/** Minimal scrolling voice waveform for the composer voice row: one loudness
 * sample per frame appended to a history ring, painted left-to-right as a
 * ChatGPT-style playback strip — the past stays visible instead of pulsing in
 * place. The component owns only its AudioContext, animation frame, and the
 * history buffer; the stream's tracks stay owned by the MediaRecorder flow
 * that created them. When the stream drops (stop → transcribing), painting
 * stops and the recorded strip stays frozen until the row unmounts.
 */

import { useEffect, useRef } from 'react'
import css from './VoiceWaveform.module.css'

/** Bar geometry in CSS pixels; the visible bar count adapts to the width. */
const BAR_WIDTH = 2
const BAR_GAP = 1
/** History cap in bars; older samples scroll off the left edge past it. */
const MAX_HISTORY = 400
/** Floor height so silence reads as a dotted line, not a blank box. */
const MIN_BAR_HEIGHT = 2
/** Bar color when the computed currentColor is unavailable (tests). */
const FALLBACK_BAR_COLOR = '#3964fe'

export interface VoiceWaveformProps {
  /** Live capture stream; null freezes the recorded strip. */
  stream: MediaStream | null
  /** Accessible label for the waveform image. */
  label: string
}

/**
 * Sample one loudness level for this frame from the analyser's time-domain
 * data. A single RMS over the whole buffer (not per-bar slices) keeps quiet
 * frames quiet instead of inflating one bar to full height on every tick.
 * @param analyser - live analyser fed by the capture stream.
 * @returns frame loudness clamped to the paint range.
 */
function sampleFrameLevel(analyser: AnalyserNode): number {
  const data = new Uint8Array(analyser.fftSize)
  analyser.getByteTimeDomainData(data)
  let sum = 0
  for (let index = 0; index < data.length; index += 1) {
    const sample = (data[index] ?? 128) - 128
    sum += sample * sample
  }
  const rms = Math.sqrt(sum / Math.max(1, data.length)) / 128
  return Math.min(1, Math.max(0.05, rms * 2.2))
}

/**
 * Paint centered single-color bars; loudness rides height only.
 * @param ctx - 2d context with its fillStyle already resolved.
 * @param height - CSS pixel height of the canvas.
 * @param levels - one level per bar in paint range.
 */
function paintBars(ctx: CanvasRenderingContext2D, height: number, levels: readonly number[]): void {
  const centerY = height / 2
  levels.forEach((level, index) => {
    const barHeight = Math.max(MIN_BAR_HEIGHT, level * height * 0.9)
    ctx.fillRect(index * (BAR_WIDTH + BAR_GAP), centerY - barHeight / 2, BAR_WIDTH, barHeight)
  })
}

/**
 * Minimal scrolling voice waveform: an accessible image appending one
 * loudness sample per frame to a history ring, freezing the recorded strip
 * when the stream drops.
 * @param props - capture stream and accessible label.
 * @returns the waveform image.
 */
export function VoiceWaveform({ stream, label }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const historyRef = useRef<number[]>([])

  useEffect(() => {
    if (stream === null || typeof AudioContext === 'undefined') return
    const audio = new AudioContext()
    const analyser = audio.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    const source = audio.createMediaStreamSource(stream)
    source.connect(analyser)
    analyserRef.current = analyser
    return () => {
      analyserRef.current = null
      source.disconnect()
      audio.close().catch(() => {
        // Teardown races a closing context (stop then unmount); the tracks it
        // observed are already stopped, so a rejected close carries no state.
      })
    }
  }, [stream])

  useEffect(() => {
    // A fresh stream starts a fresh strip; null freezes the recorded one.
    if (stream === null) return
    historyRef.current = []
    const canvas = canvasRef.current
    if (canvas === null) return
    const ctx = canvas.getContext('2d')
    if (ctx === null) return
    const computed = typeof getComputedStyle === 'function' ? getComputedStyle(canvas).color : ''
    ctx.fillStyle = computed === '' ? FALLBACK_BAR_COLOR : computed

    const paint = (): void => {
      const dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const width = Math.max(1, rect.width)
      const height = Math.max(1, rect.height)
      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr)
        canvas.height = Math.floor(height * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      const analyser = analyserRef.current
      historyRef.current.push(analyser !== null ? sampleFrameLevel(analyser) : 0.05)
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.splice(0, historyRef.current.length - MAX_HISTORY)
      }
      const capacity = Math.max(1, Math.floor(width / (BAR_WIDTH + BAR_GAP)))
      const visible = historyRef.current.slice(-capacity)
      paintBars(ctx, height, visible)
    }

    if (typeof requestAnimationFrame !== 'function') {
      paint()
      return
    }
    let frame = requestAnimationFrame(function tick(): void {
      paint()
      frame = requestAnimationFrame(tick)
    })
    return () => { cancelAnimationFrame(frame) }
  }, [stream])

  return (
    <div className={css.root} role="img" aria-label={label}>
      <canvas ref={canvasRef} className={css.canvas} aria-hidden="true" />
    </div>
  )
}
