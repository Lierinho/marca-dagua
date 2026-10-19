import hmUI from '@zos/ui'
import { back, push } from '@zos/router'
import { setScrollMode, SCROLL_MODE_FREE } from '@zos/page'
import { getDraft, touchDraft, draftVersion, commitDraft, closeDraft } from '../utils/draft'
import { profileName, profileHours, MAX_PROFILES } from '../utils/schedule'
import {
  W,
  PAD,
  ROW_H,
  GAP,
  TOP,
  COLOR,
  title,
  button,
  toggleColors,
  stepperRow,
  card,
  spacer,
} from '../utils/ui'

const INTERVALS = [5, 10, 15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240]
const CARD_ROW_H = 38
const REFRESH_MS = 500

let timer = null

function intervalText(cfg) {
  return cfg.intervalMin >= 60 && cfg.intervalMin % 60 === 0
    ? cfg.intervalMin / 60 + ' h'
    : cfg.intervalMin + ' min'
}

function enabledText(cfg) {
  return cfg.enabled ? 'Avisos ligados' : 'Avisos desligados'
}

Page({
  build() {
    const cfg = getDraft()
    setScrollMode({ mode: SCROLL_MODE_FREE })

    title(TOP, 'Ajustes')
    let y = TOP + 60

    y = stepperRow(y, 'Intervalo', intervalText(cfg), (dir) => {
      let i = INTERVALS.indexOf(cfg.intervalMin)
      if (i < 0) i = INTERVALS.indexOf(60)
      cfg.intervalMin = INTERVALS[Math.max(0, Math.min(INTERVALS.length - 1, i + dir))]
      touchDraft()
      return intervalText(cfg)
    })

    // Summary of the day/time profiles; tapping it opens the schedules page.
    const rows = [{ text: 'Dias e horários  >', size: 26, color: COLOR.on }]
    for (let i = 0; i < MAX_PROFILES; i++) rows.push({ text: '', size: 24 })
    const cardRect = { x: PAD, y, w: W - 2 * PAD, h: 20 + rows.length * CARD_ROW_H }
    this.summary = card(cardRect, rows, CARD_ROW_H, () => push({ url: 'page/profiles' })).slice(1)
    this.refreshSummary()
    y += cardRect.h + GAP

    const toggleRect = { x: PAD, y, w: W - 2 * PAD, h: ROW_H }
    const toggle = button(toggleRect, enabledText(cfg), () => {
      cfg.enabled = !cfg.enabled
      touchDraft()
      toggle.update(enabledText(cfg), toggleColors(cfg.enabled))
    }, toggleColors(cfg.enabled))
    y += ROW_H + GAP

    button({ x: PAD, y, w: W - 2 * PAD, h: ROW_H }, 'Salvar', () => {
      commitDraft()
      back()
    }, { normal: COLOR.on, press: COLOR.onPress })
    y += ROW_H

    spacer(y)

    // Child pages edit the shared draft; repaint the summary when it changes.
    this.seenVersion = draftVersion()
    timer = setInterval(() => {
      if (draftVersion() !== this.seenVersion) {
        this.seenVersion = draftVersion()
        this.refreshSummary()
      }
    }, REFRESH_MS)
  },

  refreshSummary() {
    const profiles = getDraft().profiles
    this.summary.forEach((widget, i) => {
      const p = profiles[i]
      widget.setProperty(hmUI.prop.TEXT, p ? profileName(p.days) + '   ' + profileHours(p) : '')
    })
  },

  onDestroy() {
    if (timer) clearInterval(timer)
    timer = null
    // Swiping back without tapping "Salvar" still keeps the changes.
    closeDraft()
  },
})
