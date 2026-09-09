/** One-line accuracy disclaimer docked directly under the composer card. */
import type { Context } from '@deepseek-ai/cordis'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { NS } from '../locales.ts'
import css from './DisclaimerDock.module.css'

/** Props for the composer disclaimer dock entry. */
export type DisclaimerDockProps = PropsRuntime<'conversation.composer.dock'> & PropsLocale<'conversation'>

/**
 * Render the accuracy disclaimer caption.
 * @param props.t - conversation locale seat.
 * @returns the disclaimer caption.
 */
export function DisclaimerDock({ t }: DisclaimerDockProps) {
  return <p className={css.root}>{t('disclaimer.verify')}</p>
}

/** Registers the accuracy disclaimer under the composer card. */
export const disclaimerDockEntry = {
  name: 'conversation-disclaimer-dock',
  inject: ['slots'],
  apply(ctx: Context): void {
    ctx.slots.inject('conversation.composer.dock', () =>
      ctx.slots.register({
        name: 'conversation.composer.dock', id: 'disclaimer', order: 10, locale: NS,
      }, DisclaimerDock))
  },
}
