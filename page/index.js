import hmUI from '@zos/ui'
import { push } from '@zos/router'
import { setScrollMode, SCROLL_MODE_SWIPER } from '@zos/page'
import { getDraft, touchDraft, draftVersion, commitIfIdle, closeDraft } from '../utils/draft'
import { rearm } from '../utils/alarm'
import {
  nextFire,
  waterLevel,
  formatCountdown,
  formatClock,
  profileName,
  profileHours,
  WEEKDAY_SHORT,
  MAX_PROFILES,
} from '../utils/schedule'
import { W, H, PAD, ROW_H, GAP, COLOR, label, button, toggleColors, stepperRow, card } from '../utils/ui'

// The page is a vertical swiper with two screens: the water timer on top and
// the settings panel below it, so swiping up slides the settings in.

// --- Timer screen -----------------------------------------------------------
// The system status bar (app name + clock) sits on top, so the circle is
// centred a little below the middle of the screen.
const CX = Math.round(W / 2)
const CY = Math.round(H * 0.46)
const R = Math.round(Math.min(W, H) * 0.34)
const RING = 8
// Strips run under the ring, which is drawn last to hide their stepped ends.
const WATER_R = R - 2
const STRIP = 2
const SURFACE_STRIPS = 2
const TICK_MS = 1000

const WATER = {
  ring: 0x2f8cff,
  inside: 0x0d1b2e,
  top: [0x3a, 0x9b, 0xff],
  bottom: [0x0f, 0x56, 0xc4],
  surface: 0x9ad4ff,
}

// --- Settings screen --------------------------------------------------------
const PANEL_Y = H
const PANEL_TOP = PANEL_Y + 60
const CARD_ROW_H = 34
// Changes are saved once the user stops tapping for this long.
const SAVE_IDLE_MS = 1500
const INTERVALS = [5, 10, 15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240]

function mixColor(a, b, t) {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t))
  return (c[0] << 16) | (c[1] << 8) | c[2]
}

function intervalText(cfg) {
  return cfg.intervalMin >= 60 && cfg.intervalMin % 60 === 0
    ? cfg.intervalMin / 60 + ' h'
    : cfg.intervalMin + ' min'
}

function enabledText(cfg) {
  return cfg.enabled ? 'Avisos ligados' : 'Avisos desligados'
}

function hint(y, text) {
  hmUI.createWidget(hmUI.widget.TEXT, {
    x: 0,
    y,
    w: W,
    h: 32,
    text,
    text_size: 20,
    color: COLOR.muted,
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.CENTER_V,
  })
}

let timer = null

Page({
  state: {
    cfg: null,
    fire: null,
    strips: [],
    lastText: '',
    seenDraft: -1,
  },

  build() {
    this.state.cfg = getDraft()
    // Re-arming on every open repairs the alarm chain if it was ever broken.
    this.state.fire = rearm(this.state.cfg)

    setScrollMode({ mode: SCROLL_MODE_SWIPER, options: { height: H, count: 2 } })

    this.buildTimer()
    this.buildSettings()

    this.tick()
    timer = setInterval(() => this.tick(), TICK_MS)
  },

  buildTimer() {
    hmUI.createWidget(hmUI.widget.CIRCLE, { center_x: CX, center_y: CY, radius: R, color: WATER.inside })

    // Water is a stack of 2 px strips clipped to the circle. Each strip is
    // recoloured as empty, surface or water (with a light-to-deep gradient).
    for (let y = CY - WATER_R; y < CY + WATER_R; y += STRIP) {
      const dy = y + STRIP / 2 - CY
      const half = Math.floor(Math.sqrt(Math.max(0, WATER_R * WATER_R - dy * dy)))
      const rect = { x: CX - half, y, w: Math.max(1, half * 2), h: STRIP }
      const depth = (y - (CY - WATER_R)) / (2 * WATER_R)
      const widget = hmUI.createWidget(hmUI.widget.FILL_RECT, { ...rect, color: WATER.inside })
      this.state.strips.push({
        widget,
        rect,
        waterColor: mixColor(WATER.top, WATER.bottom, depth),
        color: WATER.inside,
      })
    }

    hmUI.createWidget(hmUI.widget.ARC, {
      x: CX - R,
      y: CY - R,
      w: R * 2,
      h: R * 2,
      start_angle: 0,
      end_angle: 360,
      line_width: RING,
      color: WATER.ring,
    })

    hmUI.createWidget(hmUI.widget.IMG, { x: CX - 50, y: CY - 64, src: 'drop.png' })

    this.countdown = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: CY + R + 8,
      w: W,
      h: 56,
      text: '',
      text_size: 46,
      color: COLOR.text,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    })

    hint(CY + R + 72, 'Deslize para cima: ajustes')
  },

  buildSettings() {
    const cfg = this.state.cfg
    let y = PANEL_TOP

    y = stepperRow(y, 'Intervalo', intervalText(cfg), (dir) => {
      let i = INTERVALS.indexOf(cfg.intervalMin)
      if (i < 0) i = INTERVALS.indexOf(60)
      cfg.intervalMin = INTERVALS[Math.max(0, Math.min(INTERVALS.length - 1, i + dir))]
      touchDraft()
      return intervalText(cfg)
    })

    // Summary of the day/time profiles; tapping it opens the profiles list.
    const rows = [{ text: 'Dias e horários  >', size: 26, color: COLOR.on }]
    for (let i = 0; i < MAX_PROFILES; i++) rows.push({ text: '', size: 24 })
    const cardRect = { x: PAD, y, w: W - 2 * PAD, h: 20 + rows.length * CARD_ROW_H }
    this.summary = card(cardRect, rows, CARD_ROW_H, () => push({ url: 'page/profiles' })).slice(1)
    y += cardRect.h + GAP

    const toggleRect = { x: PAD, y, w: W - 2 * PAD, h: ROW_H }
    const toggle = button(toggleRect, enabledText(cfg), () => {
      cfg.enabled = !cfg.enabled
      touchDraft()
      toggle.update(enabledText(cfg), toggleColors(cfg.enabled))
    }, toggleColors(cfg.enabled))
    y += ROW_H + 8

    hint(y, 'Salva sozinho. Deslize para baixo')
  },

  tick() {
    const now = Date.now()
    const s = this.state

    // Save settings once the user stops changing them; the countdown keeps going.
    if (commitIfIdle(SAVE_IDLE_MS)) {
      s.fire = nextFire(now, s.cfg)
    } else if (s.fire && now >= s.fire.at) {
      // The service already notified; just roll the display to the next cycle.
      s.fire = nextFire(now, s.cfg)
    }

    if (draftVersion() !== s.seenDraft) {
      s.seenDraft = draftVersion()
      this.refreshSummary()
    }

    const fire = s.fire
    this.drawWater(waterLevel(now, fire))

    let text
    if (!fire) {
      text = 'Desligado'
    } else if (now < fire.cycleStart) {
      const sameDay = new Date(fire.cycleStart).getDate() === new Date(now).getDate()
      const day = sameDay ? '' : WEEKDAY_SHORT[new Date(fire.cycleStart).getDay()] + ' '
      text = 'Início ' + day + formatClock(fire.cycleStart)
    } else {
      text = formatCountdown(fire.at - now)
    }
    if (text !== s.lastText) {
      this.countdown.setProperty(hmUI.prop.TEXT, text)
      s.lastText = text
    }
  },

  refreshSummary() {
    const profiles = this.state.cfg.profiles
    this.summary.forEach((widget, i) => {
      const p = profiles[i]
      widget.setProperty(hmUI.prop.TEXT, p ? profileName(p.days) + '   ' + profileHours(p) : '')
    })
  },

  drawWater(level) {
    const strips = this.state.strips
    const filled = Math.round(level * strips.length)
    const firstWater = strips.length - filled
    strips.forEach((strip, i) => {
      let color = WATER.inside
      if (filled > 0 && i >= firstWater) {
        color = i < firstWater + SURFACE_STRIPS ? WATER.surface : strip.waterColor
      }
      if (color !== strip.color) {
        strip.widget.setProperty(hmUI.prop.MORE, { ...strip.rect, color })
        strip.color = color
      }
    })
  },

  onDestroy() {
    if (timer) clearInterval(timer)
    timer = null
    // Leaving the app right after a change still saves it.
    closeDraft()
  },
})
