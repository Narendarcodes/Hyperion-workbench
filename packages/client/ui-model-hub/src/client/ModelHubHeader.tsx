/**
 * ModelHubHeader: Unified header for HYPERION Model Hub.
 * Includes breadcrumb, page title, contextual subtitle based on active tab,
 * primary tab switches [ Models ] [ Runtime ], refinery background line-art,
 * and top utility controls.
 * @module @deepseek-ai/dsh-client-ui-model-hub/client/ModelHubHeader
 */

import React from 'react'
import {
  IconBellOutline16,
  IconChevronDownOutline14,
  IconLightOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import css from './ModelHubHeader.module.css'

export interface ModelHubHeaderProps {
  readonly activeTab: 'models' | 'runtime'
  readonly onTabChange: (tab: 'models' | 'runtime') => void
  readonly localState?: 'available' | 'unavailable' | undefined
  readonly onToggleTheme?: () => void
  readonly onNotificationsClick?: () => void
  readonly onProfileClick?: () => void
}

export const ModelHubHeader: React.FC<ModelHubHeaderProps> = ({
  activeTab,
  onTabChange,
  localState = 'available',
  onToggleTheme,
  onNotificationsClick,
  onProfileClick,
}) => {
  const handleToggleTheme = () => {
    if (onToggleTheme) {
      onToggleTheme()
      return
    }
    const isDark = document.body.hasAttribute('data-ds-dark-theme')
    if (isDark) {
      document.body.removeAttribute('data-ds-dark-theme')
    } else {
      document.body.setAttribute('data-ds-dark-theme', 'true')
    }
  }

  const subtitle =
    activeTab === 'models'
      ? 'Manage and use local AI models for engineering analysis, document understanding and more.'
      : 'Manage local AI runtimes, system resources and loaded models.'

  return (
    <header className={css.headerRoot}>
      {/* Background refinery silhouette decoration */}
      <div className={css.refineryBackdrop} aria-hidden="true">
        <img
          src="/refinery.png"
          alt=""
          className={css.refineryImg}
        />
      </div>

      {/* Top utility row */}
      <div className={css.utilityRow}>
        <div className={css.headerAffordances} role="group" aria-label="System controls">
          <button
            type="button"
            className={css.affordanceBtn}
            aria-label="Toggle theme"
            title="Toggle color theme"
            onClick={handleToggleTheme}
          >
            <IconLightOutline16 size={15} />
          </button>
          <button
            type="button"
            className={css.affordanceBtn}
            aria-label="Notifications"
            title="Notifications"
            onClick={onNotificationsClick}
          >
            <IconBellOutline16 size={15} />
          </button>
          <button
            type="button"
            className={css.profileBtn}
            aria-label="User profile"
            title="User Profile: N"
            onClick={onProfileClick}
          >
            <span className={css.profileAvatar}>N</span>
            <IconChevronDownOutline14 size={11} className={css.profileChevron} />
          </button>
        </div>

        <span className={css.statusPill}>
          <span
            aria-hidden="true"
            className={`${css.statusDot} ${localState === 'unavailable' ? css.statusDotUnavailable : ''}`}
          />
          {localState === 'available' ? 'Local state available' : 'Local state unavailable'}
        </span>
      </div>

      {/* Main Header Row: Title & Subtitle */}
      <div className={css.mainHeaderRow}>
        <div className={css.titleColumn}>
          <nav className={css.breadcrumb} aria-label="Breadcrumb">
            <span className={css.breadcrumbMuted}>AI Infrastructure</span>
            <span className={css.breadcrumbSeparator} aria-hidden="true">/</span>
            <span className={css.breadcrumbActive}>Model Hub</span>
          </nav>
          <h1 className={css.pageTitle}>Model Hub</h1>
          <p className={css.pageSubtitle}>{subtitle}</p>
        </div>
      </div>

      {/* Primary Tabs: [ Models ] [ Runtime ] */}
      <nav className={css.primaryTabsBar} aria-label="Model Hub primary navigation">
        <div className={css.tabsList} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'models'}
            className={`${css.tabBtn} ${activeTab === 'models' ? css.tabActive : ''}`}
            onClick={() => onTabChange('models')}
          >
            Models
            {activeTab === 'models' && <span className={css.tabActiveIndicator} aria-hidden="true" />}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'runtime'}
            className={`${css.tabBtn} ${activeTab === 'runtime' ? css.tabActive : ''}`}
            onClick={() => onTabChange('runtime')}
          >
            Runtime
            {activeTab === 'runtime' && <span className={css.tabActiveIndicator} aria-hidden="true" />}
          </button>
        </div>
      </nav>
    </header>
  )
}
