/** ChatGPT-style scrolling voice waveform for the composer voice pill: one
 * smoothed loudness sample per tick appended to a history ring, painted
 * left-to-right with short silence bars swelling into rounded speech humps.
 * The component owns only its AudioContext, animation frame, and the history
 * buffer; the stream's tracks stay owned by the MediaRecorder flow that
 * created them. When the stream drops (stop → transcribing), painting stops
 * and the recorded strip stays frozen until the pill unmounts.
 */

import { useEffect, useRef } from 'react'
import css from './VoiceWaveform.module.css'

/** Bar geometry in CSS pixels; the visible bar count adapts to the width. */
const BAR_WIDTH = 3
const BAR_GAP = 2
/** One sample per animation frame is jumpy spikes; ~30 bars/sec reads smooth. */
const SAMPLE_INTERVAL_MS = 33
/** History cap in bars; older samples scroll off the left edge past it. */
const MAX_HISTORY = 300
/** Silence floor as a fraction of strip height: short bars, never dots. */
const SILENCE_FLOOR = 0.28
/** Temporal smoothing: each tick keeps most of the previous level so words
 * form wide humps instead of isolated spikes. */
const SMOOTHING = 0.72
/** Bar color when the computed currentColor is unavailable (tests). */
const FALLBACK_BAR_COLOR = '#81858c'

export interface VoiceWaveformProps {
  /** Live capture stream; null freezes the recorded strip. */
  stream: MediaStream | null
  /** Accessible label for the waveform image. */
  label: string
}

/**
 * Sample one raw loudness level from the analyser's time-domain data.
 * @param analyser - live analyser fed by the capture stream.
 * @returns raw frame loudness in the 0..1 range before floor and smoothing.
 */
function sampleRawLevel(analyser: AnalyserNode): number {
  const data = new Uint8Array(analyser.fftSize)
  analyser.getByteTimeDomainData(data)
  let sum = 0
  for (let index = 0; index < data.length; index += 1) {
    const sample = (data[index] ?? 128) - 128
    sum += sample * sample
  }
  const rms = Math.sqrt(sum / Math.max(1, data.length)) / 128
  return Math.min(1, Math.max(0, rms * 2.6))
}

/**
 * Paint centered rounded bars; quiet frames hold the silence floor while
 * speech swells toward full height.
 * @param ctx - 2d context with its fillStyle already resolved.
 * @param height - CSS pixel height of the canvas.
 * @param levels - one smoothed level per bar in the 0..1 range.
 */
function paintBars(ctx: CanvasRenderingContext2D, height: number, levels: readonly number[]): void {
  const centerY = height / 2
  const rounded = 'roundRect' in ctx && typeof ctx.roundRect === 'function'
  levels.forEach((level, index) => {
    const barHeight = Math.max(3, (SILENCE_FLOOR + level * (1 - SILENCE_FLOOR)) * height * 0.92)
    const x = index * (BAR_WIDTH + BAR_GAP)
    const y = centerY - barHeight / 2
    if (rounded) {
      ctx.beginPath()
      ctx.roundRect(x, y, BAR_WIDTH, barHeight, BAR_WIDTH / 2)
      ctx.fill()
    } else {
      ctx.fillRect(x, y, BAR_WIDTH, barHeight)
    }
  })
}

/**
 * ChatGPT-style scrolling voice waveform: an accessible image appending one
 * smoothed loudness sample per tick to a history ring, freezing the recorded
 * strip when the stream drops.
 * @param props - capture stream and accessible label.
 * @returns the waveform image.
 */
export function VoiceWaveform({ stream, label }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const historyRef = useRef<number[]>([])
  const lastSampleRef = useRef(0)
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
    // A fresh stream starts a fresh strip and clock; null freezes the one.
    if (stream === null) return
    historyRef.current = []
    lastSampleRef.current = 0
    const canvas = canvasRef.current
    if (canvas === null) return
    const ctx = canvas.getContext('2d')
    if (ctx === null) return
    const computed = typeof getComputedStyle === 'function' ? getComputedStyle(canvas).color : ''
    ctx.fillStyle = computed === '' ? FALLBACK_BAR_COLOR : computed
    const paint = (now: number): void => {
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
      const previous = historyRef.current.length === 0 ? 0 : (historyRef.current[historyRef.current.length - 1] ?? 0)
      // Throttle sampling to the bar cadence: every frame repaints, but a new
      // level lands only every SAMPLE_INTERVAL_MS, smoothed against the last.
      if (analyser === null) {
        historyRef.current.push(previous * SMOOTHING)
      } else if (now - lastSampleRef.current >= SAMPLE_INTERVAL_MS || historyRef.current.length === 0) {
        lastSampleRef.current = now
        const raw = sampleRawLevel(analyser)
        historyRef.current.push(previous * SMOOTHING + raw * (1 - SMOOTHING))
      } else {
        historyRef.current.push(previous)
      }
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.splice(0, historyRef.current.length - MAX_HISTORY)
      }
      const capacity = Math.max(1, Math.floor(width / (BAR_WIDTH + BAR_GAP)))
      const visible = historyRef.current.slice(-capacity)
      paintBars(ctx, height, visible)
    }

    if (typeof requestAnimationFrame !== 'function') {
      paint(0)
      return
    }
    let frame = requestAnimationFrame(function tick(now: number): void {
      paint(now)
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
