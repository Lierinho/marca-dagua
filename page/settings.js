import hmUI from '@zos/ui'
import { getDeviceInfo } from '@zos/device'
import { back } from '@zos/router'
import { setScrollMode, SCROLL_MODE_FREE } from '@zos/page'
import { loadConfig, saveConfig } from '../utils/storage'
import { rearm } from '../utils/alarm'
import { formatHM } from '../utils/schedule'

const { width: W } = getDeviceInfo()

const PAD = 16
const BTN = 84
const ROW_H = 68
const TIME_STEP = 30
const INTERVALS = [5, 10, 15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240]
const DAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const COLOR = {
  bg: 0x000000,
  text: 0xffffff,
  muted: 0x8a96a8,
  btn: 0x1c2533,
  btnPress: 0x2f3b4d,
  on: 0x2f8cff,
  onPress: 0x1e78e6,
  off: 0x3a2328,
}

let cfg = null
let dirty = false
let saved = false

function persist() {
  cfg.anchor = Date.now()
  saveConfig(cfg)
  rearm(cfg)
  getApp().globalData.configVersion++
  dirty = false
  saved = true
}

function label(y, text) {
  hmUI.createWidget(hmUI.widget.TEXT, {
    x: 0,
    y,
    w: W,
    h: 34,
    text,
    text_size: 24,
    color: COLOR.muted,
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.CENTER_V,
  })
  return y + 38
}

function button(rect, text, onClick, active) {
  return hmUI.createWidget(hmUI.widget.BUTTON, {
    ...rect,
    radius: Math.round(rect.h / 2),
    normal_color: active === undefined ? COLOR.btn : active ? COLOR.on : COLOR.off,
    press_color: active ? COLOR.onPress : COLOR.btnPress,
    text,
    text_size: 30,
    color: COLOR.text,
    click_func: onClick,
  })
}

// A "− value +" row; `step(dir)` mutates cfg and returns the new display text.
function stepperRow(y, title, valueText, step) {
  y = label(y, title)
  const value = hmUI.createWidget(hmUI.widget.TEXT, {
    x: PAD + BTN,
    y,
    w: W - 2 * (PAD + BTN),
    h: ROW_H,
    text: valueText,
    text_size: 38,
    color: COLOR.text,
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.CENTER_V,
  })
  const onStep = (dir) => () => {
    value.setProperty(hmUI.prop.TEXT, step(dir))
    dirty = true
  }
  button({ x: PAD, y, w: BTN, h: ROW_H }, '-', onStep(-1))
  button({ x: W - PAD - BTN, y, w: BTN, h: ROW_H }, '+', onStep(1))
  return y + ROW_H + 18
}

function intervalText() {
  return cfg.intervalMin >= 60 && cfg.intervalMin % 60 === 0
    ? cfg.intervalMin / 60 + ' h'
    : cfg.intervalMin + ' min'
}

function enabledText() {
  return cfg.enabled ? 'Avisos ligados' : 'Avisos desligados'
}

Page({
  build() {
    cfg = loadConfig()
    dirty = false
    saved = false
    setScrollMode({ mode: SCROLL_MODE_FREE })

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 0,
      y: 16,
      w: W,
      h: 48,
      text: 'Ajustes',
      text_size: 34,
      color: COLOR.text,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
    })
    let y = 76

    y = stepperRow(y, 'Intervalo', intervalText(), (dir) => {
      let i = INTERVALS.indexOf(cfg.intervalMin)
      if (i < 0) i = INTERVALS.indexOf(60)
      i = Math.max(0, Math.min(INTERVALS.length - 1, i + dir))
      cfg.intervalMin = INTERVALS[i]
      return intervalText()
    })

    // Weekday toggles, Sunday first (matches Date.getDay()).
    y = label(y, 'Dias da semana')
    const gap = 6
    const size = Math.floor((W - 2 * PAD - 6 * gap) / 7)
    DAY_LETTERS.forEach((letter, d) => {
      const rect = { x: PAD + d * (size + gap), y, w: size, h: size }
      const btn = button(rect, letter, () => {
        cfg.days[d] = !cfg.days[d]
        dirty = true
        btn.setProperty(hmUI.prop.MORE, {
          ...rect,
          radius: Math.round(size / 2),
          normal_color: cfg.days[d] ? COLOR.on : COLOR.off,
          press_color: cfg.days[d] ? COLOR.onPress : COLOR.btnPress,
          text: letter,
          text_size: 30,
          color: COLOR.text,
        })
      }, cfg.days[d])
    })
    y += size + 18

    y = stepperRow(y, 'Início dos avisos', formatHM(cfg.startMin), (dir) => {
      cfg.startMin = Math.max(0, Math.min(cfg.endMin - TIME_STEP, cfg.startMin + dir * TIME_STEP))
      return formatHM(cfg.startMin)
    })

    y = stepperRow(y, 'Fim dos avisos', formatHM(cfg.endMin), (dir) => {
      cfg.endMin = Math.max(cfg.startMin + TIME_STEP, Math.min(1440, cfg.endMin + dir * TIME_STEP))
      return formatHM(cfg.endMin)
    })

    const toggleRect = { x: PAD, y, w: W - 2 * PAD, h: ROW_H }
    const toggle = button(toggleRect, enabledText(), () => {
      cfg.enabled = !cfg.enabled
      dirty = true
      toggle.setProperty(hmUI.prop.MORE, {
        ...toggleRect,
        radius: Math.round(ROW_H / 2),
        normal_color: cfg.enabled ? COLOR.on : COLOR.off,
        press_color: cfg.enabled ? COLOR.onPress : COLOR.btnPress,
        text: enabledText(),
        text_size: 30,
        color: COLOR.text,
      })
    }, cfg.enabled)
    y += ROW_H + 18

    button({ x: PAD, y, w: W - 2 * PAD, h: ROW_H }, 'Salvar', () => {
      persist()
      back()
    })
    y += ROW_H

    // Spacer so the last button can scroll clear of the screen edge.
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 0, y, w: W, h: 40, color: COLOR.bg })
  },

  onDestroy() {
    // Swiping back without tapping "Salvar" still keeps the changes.
    if (dirty && !saved) persist()
  },
})
