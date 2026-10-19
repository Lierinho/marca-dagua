import { back, replace } from '@zos/router'
import { setScrollMode, SCROLL_MODE_FREE } from '@zos/page'
import { getDraft, touchDraft } from '../utils/draft'
import { profileName, profileHours, newProfile, MAX_PROFILES } from '../utils/schedule'
import { W, PAD, ROW_H, GAP, TOP, COLOR, title, label, button, card, spacer } from '../utils/ui'

const CARD_ROW_H = 40

// The list and the editor replace each other, so going back from either
// returns straight to the settings page.
function openProfile(index) {
  replace({ url: 'page/profile', params: String(index) })
}

Page({
  build() {
    const cfg = getDraft()
    setScrollMode({ mode: SCROLL_MODE_FREE })

    title(TOP, 'Dias e horários')
    let y = TOP + 60

    cfg.profiles.forEach((p, i) => {
      const rect = { x: PAD, y, w: W - 2 * PAD, h: 20 + 2 * CARD_ROW_H }
      card(rect, [
        { text: profileName(p.days) + (i === 0 ? '  (padrão)' : ''), size: 28 },
        { text: profileHours(p), size: 26, color: COLOR.muted },
      ], CARD_ROW_H, () => openProfile(i))
      y += rect.h + GAP
    })

    if (cfg.profiles.length < MAX_PROFILES) {
      button({ x: PAD, y, w: W - 2 * PAD, h: ROW_H }, '+ Novo perfil', () => {
        cfg.profiles.push(newProfile())
        touchDraft()
        openProfile(cfg.profiles.length - 1)
      })
      y += ROW_H + GAP
    }

    y = label(y, 'Cada dia fica em um só perfil')
    y += GAP / 2

    button({ x: PAD, y, w: W - 2 * PAD, h: ROW_H }, 'Voltar', () => back(), {
      normal: COLOR.on,
      press: COLOR.onPress,
    })
    y += ROW_H

    spacer(y)
  },
})
