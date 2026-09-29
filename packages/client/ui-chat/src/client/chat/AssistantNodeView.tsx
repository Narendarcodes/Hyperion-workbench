import { memo, useCallback, useMemo } from 'react'
import type { ChatNodeViewProps, TurnTailOwnerProps } from '../contract/slots.ts'
import { AssistantMarkdown } from './AssistantMarkdown.tsx'
import { MrplEvidencePanel } from './MrplEvidenceCard.tsx'
import { RouterIndicator } from './RouterIndicator.tsx'

/** Streaming, settled, and interrupted Assistant states share one keyed renderer instance. */
export const AssistantNodeView = memo(function AssistantNodeView({
  node, useTurnData, turnProcess, openFile, renderMessageImages, fileMentions, t,
}: ChatNodeViewProps<'assistant-step'>) {
  const data = node.data
  const turn = node.location.kind === 'turn' || node.location.kind === 'step'
    ? node.location.turn
    : undefined
  const tail = useTurnData('turn-tail')
  const owner = useMemo<TurnTailOwnerProps | undefined>(() => {
    if (turn?.status !== 'closed' || data.finalNode === undefined) return undefined
    if (tail?.closing?.finalNode.seq !== data.finalNode.seq) return undefined
    return { turn, seq: data.finalNode.seq, openFile }
  }, [data.finalNode, openFile, tail, turn])
  const mentions = useMemo(
    () => owner === undefined ? undefined : fileMentions(owner),
    [fileMentions, owner],
  )
  const reasoningHidden = turnProcess !== undefined
    && turnProcess.foldable
    && turnProcess.spec.answerStep === data.step
    && turnProcess.spec.inlineReasoning
    && !turnProcess.open
  const revealProcess = useCallback(() => { turnProcess?.setOpen(true) }, [turnProcess])
  const route = tail?.tokenUsage?.routes?.[0]
  const provenance = data.finalNode?.provenance as { model?: string; provider?: string } | undefined
  const routedModel = route?.model ?? provenance?.model ?? data.finalNode?.requestConfig?.model
  const routedProvider = route?.provider ?? provenance?.provider ?? data.finalNode?.requestConfig?.provider
  return (
    <>
      <AssistantMarkdown
        blocks={data.blocks}
        streaming={data.status === 'running'}
        interrupted={data.status === 'interrupted'}
        renderMessageImages={renderMessageImages}
        reasoningHidden={reasoningHidden}
        revealProcess={revealProcess}
        mentions={mentions}
        t={t}
      />
      <MrplEvidencePanel blocks={data.blocks} t={t} />
      {routedModel && (
        <RouterIndicator modelId={routedModel} provider={routedProvider} />
      )}
    </>
  )
})
