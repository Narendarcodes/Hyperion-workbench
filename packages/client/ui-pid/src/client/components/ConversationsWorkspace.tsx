import React from 'react'
import { pidStore } from '../pidStore'
import css from './ConversationsWorkspace.module.css'

export const ConversationsWorkspace: React.FC = () => {
  const conversations = [
    { id: 'c1', title: 'P-101 Cavitation Root Cause Analysis', time: '10 min ago', category: 'P&ID Reasoning' },
    { id: 'c2', title: 'CDU-03 Energy Audit & Preheat Temperature', time: '2 hours ago', category: 'Process Optimization' },
    { id: 'c3', title: 'E-101 Tube Bundle Inspection Criteria', time: '1 day ago', category: 'Mechanical Integrity' },
  ]

  return (
    <div className={css.container}>
      <div className={css.header}>
        <div>
          <div className={css.breadcrumb}>History / Conversations</div>
          <h1 className={css.title}>AI Conversation History</h1>
          <p className={css.subtitle}>Previous Hyperion AI engineering reasoning sessions and P&ID discussions</p>
        </div>

        <button type="button" className={css.newBtn} onClick={() => { pidStore.setActiveNav('pid'); pidStore.openAIChat() }}>
          <span>+ New AI Chat</span>
        </button>
      </div>

      <div className={css.card}>
        {conversations.map(c => (
          <div key={c.id} className={css.item} onClick={() => { pidStore.setActiveNav('pid'); pidStore.openAIChat(`Resuming conversation: ${c.title}`) }}>
            <div className={css.iconBox}>💬</div>
            <div className={css.body}>
              <h3 className={css.itemTitle}>{c.title}</h3>
              <span className={css.itemCategory}>{c.category} • {c.time}</span>
            </div>
            <span className={css.openLabel}>Resume →</span>
          </div>
        ))}
      </div>
    </div>
  )
}
