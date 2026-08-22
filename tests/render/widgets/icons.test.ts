import { describe, expect, it } from 'vitest'
import type { RenderSettings } from '../../../src/model/preferences'
import type { Widget } from '../../../src/model/widget'
import { drawNumeric } from '../../../src/render/widgets/numeric'
import { drawOptiPotential } from '../../../src/render/widgets/optiPotential'
import { drawCompassDigital } from '../../../src/render/widgets/compassDigital'
import { BADGE_SIZE_H, BADGE_GAP_H, badgeWidthH } from '../../../src/render/widgets/badge'
import { drawWidget } from '../../../src/render/registry'
import '../../../src/render/widgets'
import { makeTranslator } from '../../../src/i18n/translate'
import frenchMessages from '../../../src/i18n/messages/fr'

/** Notre prose, axe `ui` — jamais la langue des libellés passée à côté. */
const tr = makeTranslator('fr', frenchMessages)

/**
 * Écart 2.9 de la revue des 75 visuels — « Les icônes et pastilles de widget manquent ».
 * Quatre gadgets, tous mesurés sur
 * `docs/reference/captures-air3/2026-08-21_planche-sol-3-air-b-xcontest-navigation-a.png`
 * et sur `planche-vol-3` / `planche-competition-3` pour les états.
 */

const settings: RenderSettings = {
  fromDefaults: false, theme: 'WhiteHCTheme', titleColor: '#f44336',
  titleSizePercent: 140, titleFont: 'normal', language: { kind: 'explicit', code: 'fr' },
  altitudeUnit: 'm', speedUnit: 'km/h', verticalSpeedUnit: 'm/s',
  windSpeedUnit: 'km/h', distanceUnit: 'km', relativeDistanceUnit: 'km', airspaceAltitudeUnit: 'm'
}

function widget(shortName: string, params: Record<string, string> = {}): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([k, v]) => [
        `"${k}"`,
        v.startsWith('"') ? { kind: 'string' as const, raw: v } : { kind: 'literal' as const, raw: v }
      ])
    },
    className: `org.xcontest.XCTrack.widget.w.${shortName}`,
    shortName, x1: 0, y1: 0, x2: 10000, y2: 1000,
    border: false, background: 100, theme: ''
  }
}

describe('pastilles XContest (badge.ts)', () => {
  it('WOptiResult porte une pastille orange à gauche de sa valeur', () => {
    const el = drawNumeric(widget('WOptiResult'), settings, 'fr')
    const badge = el.querySelector('.xc-num__badge')
    expect(badge).not.toBeNull()
    // Orange relevé au pixel sur `planche-sol-3`, état au sol.
    expect(badge?.querySelector('.xc-num__badge-bg')?.getAttribute('fill')).toBe('#c45300')
    // Pas de croix : c'est le triangle non terminé qui la porte.
    expect(badge?.querySelector('.xc-num__badge-cross')).toBeNull()
  })

  it('WOptiUnfinishedTriangle porte une pastille verte, croix rouge comprise', () => {
    const el = drawNumeric(widget('WOptiUnfinishedTriangle'), settings, 'fr')
    const badge = el.querySelector('.xc-num__badge')
    expect(badge?.querySelector('.xc-num__badge-bg')?.getAttribute('fill')).toBe('#009b21')
    expect(badge?.querySelector('.xc-num__badge-cross')).not.toBeNull()
  })

  it('les autres gadgets numériques n’en portent aucune', () => {
    for (const type of ['WAltitude', 'WSpeed', 'WCompDistanceToGoal']) {
      expect(drawNumeric(widget(type), settings, 'fr').querySelector('.xc-num__badge')).toBeNull()
    }
  })

  /**
   * La pastille occupe une place FIXE et ne rétrécit pas avec la valeur : elle doit donc
   * entrer dans le budget de largeur, sans quoi la valeur déborderait de tout ce que la
   * pastille lui prend. 41 px de côté et 12 px d'écart sur une cellule de 224.
   */
  it('entre dans le budget de largeur, à sa taille relevée', () => {
    expect(BADGE_SIZE_H).toBeCloseTo(41 / 224, 2)
    expect(BADGE_GAP_H).toBeCloseTo(12 / 224, 2)
    expect(badgeWidthH('track')).toBeCloseTo(BADGE_SIZE_H + BADGE_GAP_H, 10)
    expect(badgeWidthH(undefined)).toBe(0)

    const avec = drawNumeric(widget('WOptiResult'), settings, 'fr')
    const sans = drawNumeric(widget('WCompDistanceToGoal'), settings, 'fr')
    expect(Number(avec.style.getPropertyValue('--xc-badge-h'))).toBeGreaterThan(0)
    expect(Number(sans.style.getPropertyValue('--xc-badge-h'))).toBe(0)
  })
})

describe('« Potentiel FAI » (optiPotential.ts)', () => {
  it('dessine les trois lignes ▲ ↑ ↓, valeur et unité', () => {
    const el = drawOptiPotential(widget('WOptiUnfinishedFAIPotential'), settings, 'fr')
    const lignes = [...el.querySelectorAll('.xc-opti__line')]
    expect(lignes).toHaveLength(3)
    expect(lignes.map(l => l.querySelector('.xc-opti__glyph')?.textContent)).toEqual(['▲', '↑', '↓'])
    expect(lignes.map(l => l.querySelector('.xc-opti__value')?.textContent)).toEqual(['0,7', '2,2', '1,4'])
    expect(lignes.map(l => l.querySelector('.xc-opti__unit')?.textContent)).toEqual(['km', 'km', 'km'])
  })

  /**
   * `max`, `real` et `min` valent `true` dans le relevé des défauts : une clé ABSENTE
   * affiche sa ligne. C'est le piège des six `=== true` déjà corrigés dans ce moteur.
   */
  it('une clé absente affiche sa ligne, une clé à false la retire', () => {
    expect(drawOptiPotential(widget('WOptiUnfinishedFAIPotential', { real: 'false' }), settings, 'fr')
      .querySelectorAll('.xc-opti__line')).toHaveLength(2)
    expect(drawOptiPotential(widget('WOptiUnfinishedFAIPotential', { max: 'false', min: 'false' }), settings, 'fr')
      .querySelectorAll('.xc-opti__line')).toHaveLength(1)
  })

  it('suit la préférence d’unité de distance du fichier', () => {
    const el = drawOptiPotential(widget('WOptiUnfinishedFAIPotential'), { ...settings, distanceUnit: 'NM' }, 'fr')
    expect(el.querySelector('.xc-opti__unit')?.textContent).toBe('NM')
  })

  it('garde le point décimal hors du français', () => {
    const el = drawOptiPotential(widget('WOptiUnfinishedFAIPotential'), settings, 'en')
    expect(el.querySelector('.xc-opti__value')?.textContent).toBe('0.7')
  })
})

describe('« Boussole Point optimisé » (compassDigital.ts)', () => {
  it('dessine la flèche, la valeur teintée et le degré détaché', () => {
    const el = drawCompassDigital(widget('WCompassDigital'), settings, 'fr')
    expect(el.querySelector('.xc-compdig__arrow polygon')).not.toBeNull()
    expect(el.querySelector('.xc-compdig__value')?.textContent).toBe('140')
    expect(el.querySelector('.xc-compdig__degree')?.textContent).toBe('°')
    // La teinte est celle des valeurs négatives du vario — mesurée #ffa0a0 sur la même
    // capture que la pastille « [-27] m ». Elle suit le CÔTÉ de la flèche, tranché par le
    // rejeu du 2026-08-22 (onze observations, dont 49 rose contre 52 vert) : la flèche
    // d'exemple pointe en bas à GAUCHE, donc rose.
    expect(el.querySelector('.xc-num__row--negative')).not.toBeNull()
    expect(el.querySelector('.xc-num__row--positive')).toBeNull()
  })

  it('la flèche prend la même encre que la valeur, et non le rose en dur de style.css', () => {
    const el = drawCompassDigital(widget('WCompassDigital'), settings, 'fr')
    const arrow = el.querySelector('.xc-compdig__arrow') as SVGElement
    expect(arrow.style.fill).toBe('var(--xc-value-negative)')
  })

  it('la valeur reste un `.xc-num__value` : c’est ce qui lui donne le cerne de signe', () => {
    const el = drawCompassDigital(widget('WCompassDigital'), settings, 'fr')
    expect(el.querySelector('.xc-compdig__value')?.classList.contains('xc-num__value')).toBe(true)
  })
})

describe('l’annuaire sert les quatre dessins', () => {
  it('WOptiUnfinishedFAIPotential et WCompassDigital ne retombent plus sur le repli', () => {
    for (const type of ['WOptiUnfinishedFAIPotential', 'WCompassDigital']) {
      expect(drawWidget(widget(type), settings, 'fr', tr).className).not.toContain('xc-generic')
    }
  })
})
