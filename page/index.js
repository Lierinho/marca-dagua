import hmUI from '@zos/ui'
import { getDeviceInfo } from '@zos/device'
import { push } from '@zos/router'
import { onGesture, offGesture, GESTURE_UP } from '@zos/interaction'
import { loadConfig } from '../utils/storage'
import { rearm } from '../utils/alarm'
import {
  nextFire,
  waterLevel,
  formatCountdown,
  formatClock,
  WEEKDAY_SHORT,
} from '../utils/schedule'

const { width: W, height: H } = getDeviceInfo()

const CX = Math.round(W / 2)
const CY = Math.round(H * 0.43)
const R = Math.round(Math.min(W, H) * 0.36)
const RING = 8
const WATER_R = R - RING - 4
const STRIP = 4
const TICK_MS = 250

const COLOR = {
  bg: 0x000000,
  ring: 0x2f8cff,
  inside: 0x0b1a2b,
  water: 0x1e78e6,
  surface: 0x6cb8ff,
  text: 0xffffff,
  muted: 0x8a96a8,
}

let timer = null

Page({
  state: {
    cfg: null,
    fire: null,
    configVersion: -1,
    strips: [],
    phase: 0,
  },

  build() {
    this.loadAndArm()

    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 0, y: 0, w: W, h: H, color: COLOR.bg })

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: Math.max(8, CY - R - 56),
      w: W,
      h: 44,
      text: "Marca d'Água",
      text_size: 30,
      color: COLOR.text,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    })

    hmUI.createWidget(hmUI.widget.CIRCLE, { center_x: CX, center_y: CY, radius: R, color: COLOR.ring })
    hmUI.createWidget(hmUI.widget.CIRCLE, { center_x: CX, center_y: CY, radius: R - RING, color: COLOR.inside })

    // Water is a stack of horizontal strips clipped to the circle; showing or
    // hiding them from the bottom up draws the level.
    for (let y = CY - WATER_R; y < CY + WATER_R; y += STRIP) {
      const dy = y + STRIP / 2 - CY
      const half = Math.floor(Math.sqrt(Math.max(0, WATER_R * WATER_R - dy * dy)))
      const rect = { x: CX - half, y, w: half * 2, h: STRIP }
      const widget = hmUI.createWidget(hmUI.widget.FILL_RECT, { ...rect, color: COLOR.water })
      widget.setProperty(hmUI.prop.VISIBLE, false)
      this.state.strips.push({ widget, rect, visible: false, surface: false })
    }

    hmUI.createWidget(hmUI.widget.IMG, { x: CX - 48, y: CY - 60, src: 'drop.png' })

    this.countdown = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: CY + R + 10,
      w: W,
      h: 56,
      text: '',
      text_size: 46,
      color: COLOR.text,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    })

    // Tapping the hint also opens settings, in case the swipe is missed.
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: Math.round(W * 0.2),
      y: CY + R + 70,
      w: Math.round(W * 0.6),
      h: 40,
      radius: 20,
      normal_color: COLOR.bg,
      press_color: 0x1c2533,
      text: 'Ajustes',
      text_size: 22,
      color: COLOR.muted,
      click_func: () => push({ url: 'page/settings' }),
    })

    onGesture({
      callback: (event) => {
        if (event === GESTURE_UP) {
          push({ url: 'page/settings' })
          return true
        }
        return false
      },
    })

    this.tick()
    timer = setInterval(() => this.tick(), TICK_MS)
  },

  loadAndArm() {
    this.state.cfg = loadConfig()
    this.state.configVersion = getApp().globalData.configVersion
    // Re-arming on every open repairs the alarm chain if it was ever broken.
    this.state.fire = rearm(this.state.cfg)
  },

  tick() {
    const now = Date.now()
    const s = this.state

    if (getApp().globalData.configVersion !== s.configVersion) {
      s.cfg = loadConfig()
      s.configVersion = getApp().globalData.configVersion
      s.fire = nextFire(now, s.cfg)
    } else if (s.fire && now >= s.fire.at) {
      // The service already notified; just roll the display to the next cycle.
      s.fire = nextFire(now, s.cfg)
    }

    const fire = s.fire
    const waiting = !fire || now < fire.cycleStart
    s.phase += 0.35
    const wave = waiting ? 0 : Math.sin(s.phase) * 3
    this.drawWater(waterLevel(now, fire), wave)

    let text
    if (!fire) {
      text = 'Desligado'
    } else if (waiting) {
      const sameDay = new Date(fire.cycleStart).getDate() === new Date(now).getDate()
      const day = sameDay ? '' : WEEKDAY_SHORT[new Date(fire.cycleStart).getDay()] + ' '
      text = 'Início ' + day + formatClock(fire.cycleStart)
    } else {
      text = formatCountdown(fire.at - now)
    }
    if (text !== this.lastText) {
      this.countdown.setProperty(hmUI.prop.TEXT, text)
      this.lastText = text
    }
  },

  drawWater(level, wave) {
    const surfaceY = CY + WATER_R - level * 2 * WATER_R + wave
    let surfaceFound = false
    this.state.strips.forEach((strip) => {
      const visible = level > 0 && strip.rect.y + STRIP > surfaceY
      const surface = visible && !surfaceFound
      if (surface) surfaceFound = true

      if (visible !== strip.visible) {
        strip.widget.setProperty(hmUI.prop.VISIBLE, visible)
        strip.visible = visible
      }
      if (visible && surface !== strip.surface) {
        strip.widget.setProperty(hmUI.prop.MORE, {
          ...strip.rect,
          color: surface ? COLOR.surface : COLOR.water,
        })
        strip.surface = surface
      }
    })
  },

  onDestroy() {
    if (timer) clearInterval(timer)
    timer = null
    offGesture()
  },
})
