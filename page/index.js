import hmUI from '@zos/ui'
import { getDeviceInfo } from '@zos/device'
import { push } from '@zos/router'
import { onGesture, offGesture, GESTURE_DOWN } from '@zos/interaction'
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

const COLOR = {
  ring: 0x2f8cff,
  inside: 0x0d1b2e,
  waterTop: [0x3a, 0x9b, 0xff],
  waterBottom: [0x0f, 0x56, 0xc4],
  surface: 0x9ad4ff,
  text: 0xffffff,
  muted: 0x8a96a8,
  bg: 0x000000,
}

function mixColor(a, b, t) {
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t))
  return (c[0] << 16) | (c[1] << 8) | c[2]
}

let timer = null

function openSettings() {
  push({ url: 'page/settings' })
}

Page({
  state: {
    cfg: null,
    fire: null,
    configVersion: -1,
    strips: [],
    lastText: '',
  },

  build() {
    this.loadAndArm()

    hmUI.createWidget(hmUI.widget.CIRCLE, { center_x: CX, center_y: CY, radius: R, color: COLOR.inside })

    // Water is a stack of 2 px strips clipped to the circle. Each strip is
    // recoloured as empty, surface or water (with a light-to-deep gradient).
    for (let y = CY - WATER_R; y < CY + WATER_R; y += STRIP) {
      const dy = y + STRIP / 2 - CY
      const half = Math.floor(Math.sqrt(Math.max(0, WATER_R * WATER_R - dy * dy)))
      const rect = { x: CX - half, y, w: Math.max(1, half * 2), h: STRIP }
      const depth = (y - (CY - WATER_R)) / (2 * WATER_R)
      const widget = hmUI.createWidget(hmUI.widget.FILL_RECT, { ...rect, color: COLOR.inside })
      this.state.strips.push({
        widget,
        rect,
        waterColor: mixColor(COLOR.waterTop, COLOR.waterBottom, depth),
        color: COLOR.inside,
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
      color: COLOR.ring,
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

    // Tapping the hint also opens settings, in case the swipe is missed.
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: Math.round(W * 0.2),
      y: CY + R + 66,
      w: Math.round(W * 0.6),
      h: 40,
      radius: 20,
      normal_color: COLOR.bg,
      press_color: 0x1c2533,
      text: 'Ajustes',
      text_size: 22,
      color: COLOR.muted,
      click_func: openSettings,
    })

    // Swipe from top to bottom opens the settings.
    onGesture({
      callback: (event) => {
        if (event === GESTURE_DOWN) {
          openSettings()
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

  drawWater(level) {
    const strips = this.state.strips
    const filled = Math.round(level * strips.length)
    const firstWater = strips.length - filled
    strips.forEach((strip, i) => {
      let color = COLOR.inside
      if (filled > 0 && i >= firstWater) {
        color = i < firstWater + SURFACE_STRIPS ? COLOR.surface : strip.waterColor
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
    offGesture()
  },
})
