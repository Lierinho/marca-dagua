import hmUI from '@zos/ui'
import { replace } from '@zos/router'
import { setScrollMode, SCROLL_MODE_FREE } from '@zos/page'
import { getDraft, touchDraft } from '../utils/draft'
import { profileName, setProfileDay, formatHM } from '../utils/schedule'
import {
  W,
  PAD,
  ROW_H,
  GAP,
  TOP,
  COLOR,
  title,
  label,
  button,
  stepperRow,
  spacer,
} from '../utils/ui'

const TIME_STEP = 30
const DAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

let index = 0

function backToList() {
  replace({ url: 'page/profiles' })
}

// on: this profile; taken: another profile owns the day; off: no reminders.
function dayColors(cfg, d) {
  if (cfg.profiles[index].days[d]) return { normal: COLOR.on, press: COLOR.onPress }
  const taken = cfg.profiles.some((p) => p.days[d])
  return { normal: taken ? COLOR.taken : COLOR.off, press: COLOR.btnPress }
}

Page({
  onInit(params) {
    index = parseInt(params, 10) || 0
  },

  build() {
    const cfg = getDraft()
    if (index >= cfg.profiles.length) index = 0
    const profile = cfg.profiles[index]
    setScrollMode({ mode: SCROLL_MODE_FREE })

    const heading = title(TOP, profileName(profile.days))
    let y = TOP + 60

    y = label(y, index === 0 ? 'Perfil padrão' : 'Perfil ' + (index + 1))

    // Weekday toggles, Sunday first (matches Date.getDay()). Grey days belong
    // to another profile; tapping one moves it here.
    const gap = 6
    const size = Math.floor((W - 2 * PAD - 6 * gap) / 7)
    const dayButtons = DAY_LETTERS.map((letter, d) =>
      button({ x: PAD + d * (size + gap), y, w: size, h: size }, letter, () => {
        setProfileDay(cfg, index, d, !profile.days[d])
        touchDraft()
        dayButtons.forEach((b, i) => b.update(DAY_LETTERS[i], dayColors(cfg, i)))
        heading.setProperty(hmUI.prop.TEXT, profileName(profile.days))
      }, dayColors(cfg, d)),
    )
    y += size + GAP

    y = stepperRow(y, 'Início dos avisos', formatHM(profile.startMin), (dir) => {
      profile.startMin = Math.max(0, Math.min(profile.endMin - TIME_STEP, profile.startMin + dir * TIME_STEP))
      touchDraft()
      return formatHM(profile.startMin)
    })

    y = stepperRow(y, 'Fim dos avisos', formatHM(profile.endMin), (dir) => {
      profile.endMin = Math.max(profile.startMin + TIME_STEP, Math.min(1440, profile.endMin + dir * TIME_STEP))
      touchDraft()
      return formatHM(profile.endMin)
    })

    button({ x: PAD, y, w: W - 2 * PAD, h: ROW_H }, 'Concluir', backToList, {
      normal: COLOR.on,
      press: COLOR.onPress,
    })
    y += ROW_H + GAP

    // The default profile can't be removed.
    if (index > 0) {
      button({ x: PAD, y, w: W - 2 * PAD, h: ROW_H }, 'Excluir perfil', () => {
        cfg.profiles.splice(index, 1)
        touchDraft()
        backToList()
      }, { normal: COLOR.danger, press: COLOR.dangerPress })
      y += ROW_H
    }

    spacer(y)
  },
})
