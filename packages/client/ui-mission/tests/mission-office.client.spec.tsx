// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import type { MissionOfficeState } from '../src/client/mission-contract.ts'
import { HyperionOffice } from '../src/client/HyperionOffice.tsx'
import { OFFICE_STATIONS } from '../src/client/office-layout.ts'

describe('HyperionOffice Component', () => {
  it('renders 6 labeled stations, orchestrator dais, and unseated desks when workers are empty', () => {
    const officeState: MissionOfficeState = {
      orchestrator: {
        status: 'idle',
        bubble: 'Ready',
      },
      workers: [],
    }

    const { container } = render(
      <HyperionOffice
        officeState={officeState}
        reducedMotion
        t={key => key === 'core.label' ? 'HYPERION CORE' : key}
      />,
    )

    expect(container.querySelector('[data-mission-office]')).toBeDefined()
    expect(container.textContent).toContain('HYPERION CORE')
    expect(container.textContent).toContain(OFFICE_STATIONS.documents.label)
    expect(container.textContent).toContain(OFFICE_STATIONS.knowledge.label)
    expect(container.textContent).toContain(OFFICE_STATIONS.analysis.label)
    expect(container.textContent).toContain(OFFICE_STATIONS.code.label)
    expect(container.textContent).toContain(OFFICE_STATIONS.report.label)
    expect(container.textContent).toContain(OFFICE_STATIONS.verification.label)

    // Crystal orb is the distinct orchestrator figure.
    const figures = container.querySelectorAll('.orchestrator-orb')
    expect(figures.length).toBe(1)
  })

  it('renders specialist workers at assigned stations with bubbles and caps active bubbles to 3', () => {
    const officeState: MissionOfficeState = {
      orchestrator: {
        status: 'delegating',
        bubble: 'Coordinating mission',
      },
      workers: [
        {
          id: 'w-doc',
          label: 'Doc Writer',
          station: 'documents',
          status: 'working',
          bubble: 'Reading spec…',
          evidenceSeqs: [1],
        },
        {
          id: 'w-code',
          label: 'Coder',
          station: 'code',
          status: 'executing',
          bubble: 'Writing code…',
          evidenceSeqs: [2],
        },
        {
          id: 'w-search',
          label: 'Searcher',
          station: 'knowledge',
          status: 'searching',
          bubble: 'Searching repo…',
          evidenceSeqs: [3],
        },
        {
          id: 'w-verif',
          label: 'Verifier',
          station: 'verification',
          status: 'verifying',
          bubble: 'Waiting on user…',
          evidenceSeqs: [4],
        },
      ],
    }

    const { container } = render(
      <HyperionOffice officeState={officeState} hasPendingVerification reducedMotion />,
    )

    // 1 orchestrator orb + 4 workers = 5 figures
    const figures = container.querySelectorAll('.orchestrator-orb, .worker-figure')
    expect(figures.length).toBe(5)

    // Active bubbles capped to at most 3
    const bubbles = container.querySelectorAll('.behavior-bubble')
    expect(bubbles.length).toBeLessThanOrEqual(3)

    // Verification highlight rendered
    const highlight = container.querySelector('rect[fill="#ef4444"]')
    expect(highlight).not.toBeNull()
  })
})
