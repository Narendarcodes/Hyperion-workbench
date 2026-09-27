import React, { useState } from 'react'
import { useWorkbenchStore, workbenchStore } from '../workbenchStore'
import { toastStore } from '../toastStore'
import css from './SettingsWorkspace.module.css'

export const SettingsWorkspace: React.FC = () => {
  const { theme } = useWorkbenchStore()
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'notifications'>('general')

  const handleSave = () => {
    toastStore.success('Saved workbench settings.')
  }

  return (
    <div className={css.container}>
      <div className={css.header}>
        <div>
          <div className={css.breadcrumb}>More / Settings</div>
          <h1 className={css.title}>Workbench Settings</h1>
          <p className={css.subtitle}>Configure user interface preferences, notification triggers, and default AI models</p>
        </div>

        <button type="button" className={css.saveBtn} onClick={handleSave}>Save Settings</button>
      </div>

      <div className={css.card}>
        <div className={css.navTabs}>
          <button
            type="button"
            className={`${css.tab} ${activeTab === 'general' ? css.activeTab : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General & Theme
          </button>
          <button
            type="button"
            className={`${css.tab} ${activeTab === 'ai' ? css.activeTab : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            AI Assistant Defaults
          </button>
          <button
            type="button"
            className={`${css.tab} ${activeTab === 'notifications' ? css.activeTab : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            Notifications
          </button>
        </div>

        <div className={css.body}>
          {activeTab === 'general' && (
            <div className={css.section}>
              <div className={css.fieldRow}>
                <div>
                  <h4 className={css.fieldTitle}>Application Theme</h4>
                  <p className={css.fieldDesc}>Switch between Light and Dark enterprise modes</p>
                </div>
                <div className={css.themeOptions}>
                  <button
                    type="button"
                    className={`${css.themeBtn} ${theme === 'light' ? css.activeTheme : ''}`}
                    onClick={() => workbenchStore.setTheme('light')}
                  >
                    ☀️ Light
                  </button>
                  <button
                    type="button"
                    className={`${css.themeBtn} ${theme === 'dark' ? css.activeTheme : ''}`}
                    onClick={() => workbenchStore.setTheme('dark')}
                  >
                    🌙 Dark
                  </button>
                </div>
              </div>

              <div className={css.fieldRow}>
                <div>
                  <h4 className={css.fieldTitle}>Default Plant Context</h4>
                  <p className={css.fieldDesc}>Default refinery unit selected at application launch</p>
                </div>
                <select className={css.select} defaultValue="CDU-03">
                  <option value="CDU-03">CDU-03 (Crude Distillation Unit)</option>
                  <option value="VDU-01">VDU-01 (Vacuum Distillation Unit)</option>
                  <option value="HCU-02">HCU-02 (Hydrocracker Unit)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className={css.section}>
              <div className={css.fieldRow}>
                <div>
                  <h4 className={css.fieldTitle}>P&ID Reasoning Model</h4>
                  <p className={css.fieldDesc}>Primary Vision LLM used for interactive P&ID analysis</p>
                </div>
                <select className={css.select} defaultValue="qwen2.5-vl">
                  <option value="qwen2.5-vl">Qwen 2.5 VL 72B (Local Ollama)</option>
                  <option value="llama3.2-vision">Llama 3.2 Vision 11B (Local llama.cpp)</option>
                </select>
              </div>

              <div className={css.fieldRow}>
                <div>
                  <h4 className={css.fieldTitle}>Auto-Attach Telemetry Context</h4>
                  <p className={css.fieldDesc}>Automatically include active equipment specs in AI prompts</p>
                </div>
                <input type="checkbox" defaultChecked className={css.checkbox} />
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className={css.section}>
              <div className={css.fieldRow}>
                <div>
                  <h4 className={css.fieldTitle}>Equipment Anomaly Alerts</h4>
                  <p className={css.fieldDesc}>Notify when vibration or thermal thresholds are exceeded</p>
                </div>
                <input type="checkbox" defaultChecked className={css.checkbox} />
              </div>

              <div className={css.fieldRow}>
                <div>
                  <h4 className={css.fieldTitle}>P&ID Revision Notifications</h4>
                  <p className={css.fieldDesc}>Notify when a process diagram is updated by engineering</p>
                </div>
                <input type="checkbox" defaultChecked className={css.checkbox} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
