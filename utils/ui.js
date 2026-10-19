// Shared widgets for the settings pages.
import hmUI from '@zos/ui'
import { getDeviceInfo } from '@zos/device'

export const { width: W, height: H } = getDeviceInfo()

export const PAD = 16
export const BTN = 84
export const ROW_H = 68
export const GAP = 18
// Top of the content, below the system status bar.
export const TOP = 64

export const COLOR = {
  bg: 0x000000,
  text: 0xffffff,
  muted: 0x8a96a8,
  btn: 0x1c2533,
  btnPress: 0x2f3b4d,
  on: 0x2f8cff,
  onPress: 0x1e78e6,
  off: 0x3a2328,
  taken: 0x262c36,
  danger: 0x8a2a2a,
  dangerPress: 0xa83838,
}

export function title(y, text) {
  return hmUI.createWidget(hmUI.widget.TEXT, {
    x: 0,
    y,
    w: W,
    h: 48,
    text,
    text_size: 32,
    color: COLOR.text,
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.CENTER_V,
  })
}

export function label(y, text) {
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

function buttonProps(rect, text, normal, press, textSize) {
  return {
    ...rect,
    radius: Math.round(Math.min(rect.h, rect.w) / 2),
    normal_color: normal,
    press_color: press,
    text,
    text_size: textSize || 30,
    color: COLOR.text,
  }
}

// Pill button whose colour and text can be changed later with `update`.
export function button(rect, text, onClick, colors) {
  const c = colors || { normal: COLOR.btn, press: COLOR.btnPress }
  const widget = hmUI.createWidget(hmUI.widget.BUTTON, {
    ...buttonProps(rect, text, c.normal, c.press, c.textSize),
    click_func: onClick,
  })
  return {
    widget,
    update(newText, newColors) {
      widget.setProperty(
        hmUI.prop.MORE,
        buttonProps(rect, newText, newColors.normal, newColors.press, newColors.textSize),
      )
    },
  }
}

export function toggleColors(on) {
  return on ? { normal: COLOR.on, press: COLOR.onPress } : { normal: COLOR.off, press: COLOR.btnPress }
}

// A "− value +" row; `step(dir)` applies the change and returns the new text.
export function stepperRow(y, caption, valueText, step) {
  y = label(y, caption)
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
  const onStep = (dir) => () => value.setProperty(hmUI.prop.TEXT, step(dir))
  button({ x: PAD, y, w: BTN, h: ROW_H }, '-', onStep(-1))
  button({ x: W - PAD - BTN, y, w: BTN, h: ROW_H }, '+', onStep(1))
  return y + ROW_H + GAP
}

// Tappable rounded box holding text rows; every part opens `onClick`.
// rows: [{ text, size, color, align }] laid out top to bottom, `rowH` each.
export function card(rect, rows, rowH, onClick) {
  hmUI.createWidget(hmUI.widget.BUTTON, {
    ...rect,
    radius: 24,
    normal_color: COLOR.btn,
    press_color: COLOR.btnPress,
    text: '',
    click_func: onClick,
  })
  return rows.map((row, i) => {
    const text = hmUI.createWidget(hmUI.widget.TEXT, {
      x: rect.x + 20,
      y: rect.y + 10 + i * rowH,
      w: rect.w - 40,
      h: rowH,
      text: row.text,
      text_size: row.size || 26,
      color: row.color || COLOR.text,
      align_h: row.align || hmUI.align.LEFT,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.ELLIPSIS,
    })
    text.addEventListener(hmUI.event.CLICK_UP, onClick)
    return text
  })
}

// Bottom spacer so the last control can scroll clear of the screen edge.
export function spacer(y) {
  hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 0, y, w: W, h: 40, color: COLOR.bg })
}
