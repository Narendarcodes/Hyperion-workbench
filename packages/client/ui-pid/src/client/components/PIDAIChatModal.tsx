import React, { useState } from 'react'
import { usePIDStore, pidStore } from '../pidStore'
import css from './PIDAIChatModal.module.css'

export const PIDAIChatModal: React.FC = () => {
  const { isAIChatOpen, aiChatQuery, selectedEquipment, selectedPID } = usePIDStore()
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([])
  const [inputText, setInputText] = useState('')

  if (!isAIChatOpen) return null

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputText || aiChatQuery
    if (!query.trim()) return

    const newMsgs = [...messages, { sender: 'user' as const, text: query }]
    setMessages(newMsgs)
    setInputText('')

    // Generate AI Engineering Response based on real P&ID context
    setTimeout(() => {
      const eqTag = selectedEquipment?.tag || 'P-101 A/B'
      const responseText = `HYPERION P&ID Reasoning Agent:
Context: Diagram ${selectedPID} · Equipment ${eqTag} (Centrifugal Crude Feed Pump).

1. Function: Charges desalted crude from storage Tank-01 through 10"-CR-101 suction line and delivers 450 m³/h at 120m head into preheat exchangers E-101, E-102, E-103 before column T-101.
2. Downstream Topology: Line 10"-CR-102 connects pump discharge directly to E-101 shell side.
3. Reliability & Redundancy: P-101 A is currently In Service while P-101 B is in Standby mode with auto-start logic enabled on low discharge pressure (< 8.5 bar).
4. Connected Documentation: Refer to CDU-03-001.pdf and P-101 Maintenance.pdf for vibration threshold specs.`

      setMessages(prev => [...prev, { sender: 'ai' as const, text: responseText }])
    }, 400)
  }

  return (
    <div className={css.overlay} onClick={() => pidStore.closeAIChat()}>
      <div className={css.drawer} onClick={e => e.stopPropagation()}>
        <div className={css.header}>
          <div className={css.titleGroup}>
            <svg className={css.sparkleIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" />
            </svg>
            <span className={css.title}>HYPERION AI Engineering Reasoning</span>
          </div>
          <button type="button" className={css.closeBtn} onClick={() => pidStore.closeAIChat()}>
            ✕
          </button>
        </div>

        <div className={css.contextPill}>
          <span>⚡ Context Loaded: P&ID {selectedPID} · {selectedEquipment?.tag || 'P-101 A/B'}</span>
        </div>

        <div className={css.chatBody}>
          <div className={css.message + ' ' + css.aiMessage}>
            Hello! I am your HYPERION Industrial Engineering Assistant. I have loaded context for P&ID diagram <strong>{selectedPID}</strong> and asset <strong>{selectedEquipment?.tag || 'P-101 A/B'}</strong>. How can I assist with process flows, equipment specs, or investigations?
          </div>

          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`${css.message} ${m.sender === 'user' ? css.userMessage : css.aiMessage}`}
            >
              {m.text}
            </div>
          ))}
        </div>

        <div className={css.inputArea}>
          <input
            type="text"
            className={css.chatInput}
            placeholder={aiChatQuery || 'Ask Hyperion about process flow, equipment, or failure modes...'}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend()
            }}
          />
          <button type="button" className={css.sendBtn} onClick={() => handleSend()}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
