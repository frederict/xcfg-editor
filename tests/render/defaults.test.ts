import { describe, expect, it } from 'vitest'
import type { Widget } from '../../src/model/widget'
import { widgetBoolean, widgetNumber, widgetString } from '../../src/render/defaults'
import { defaultValueAt } from '../../src/catalog/widgetDefaults'

/**
 * Le rendu ne consultait **jamais** les valeurs par défaut de XCTrack : c'est la cause
 * commune des cinq familles d'écarts du § 1.4 de
 * `docs/reference/2026-08-21-revue-visuels.md`. Ces tests fixent la règle de lecture ;
 * ceux de `title.test.ts` et `widgets/statusLine.test.ts` en vérifient les effets à
 * l'écran.
 */

function widget(shortName: string, params: Record<string, string> = {}): Widget {
  return {
    node: {
      kind: 'object',
      entries: Object.entries(params).map(([key, value]) => [
        `"${key}"`,
        value.startsWith('"') ? { kind: 'string' as const, raw: value } : { kind: 'literal' as const, raw: value }
      ])
    },
    className: `org.xcontest.XCTrack.widget.w.${shortName}`,
    shortName, x1: 0, y1: 0, x2: 2500, y2: 3000,
    border: false, background: 100, theme: ''
  }
}

describe('valeurs par défaut vues du rendu', () => {
  describe('ce que le fichier écrit l’emporte toujours', () => {
    it('rend le booléen du fichier même quand il contredit le relevé', () => {
      // Le relevé donne `showGps: true` à WStatusLine ; un fichier a le droit de dire
      // l'inverse, et c'est lui qui commande.
      expect(defaultValueAt('WStatusLine', 'showGps')).toBe(true)
      expect(widgetBoolean(widget('WStatusLine', { showGps: 'false' }), 'showGps')).toBe(false)
    })

    it('rend le nombre du fichier même quand il contredit le relevé', () => {
      expect(widgetNumber(widget('WGlide', { avg: '8000' }), 'avg')).toBe(8000)
    })

    it('rend la chaîne du fichier même quand elle contredit le relevé', () => {
      expect(widgetString(widget('WAirSpeed', { speed_type: '"IAS"' }), 'speed_type')).toBe('IAS')
    })
  })

  describe('une clé absente prend la valeur du relevé', () => {
    it('complète un booléen', () => {
      expect(widgetBoolean(widget('WStatusLine'), 'showSensors')).toBe(true)
      expect(widgetBoolean(widget('WStatusLine'), 'showTime')).toBe(false)
    })

    it('complète un nombre', () => {
      expect(widgetNumber(widget('WVerticalSpeed'), 'avg')).toBe(2000)
    })

    it('complète une chaîne', () => {
      expect(widgetString(widget('WNextTurnpointAlt'), 'altitude')).toBe('AGL')
    })
  })

  describe('« rien à en dire » reste un troisième état', () => {
    it('rend undefined pour un type que le relevé ignore', () => {
      expect(widgetBoolean(widget('WInventeEn2027'), 'showGps')).toBeUndefined()
      expect(widgetNumber(widget('WInventeEn2027'), 'avg')).toBeUndefined()
      expect(widgetString(widget('WInventeEn2027'), 'speed_type')).toBeUndefined()
    })

    it('rend undefined pour une clé que le relevé ne décrit pas', () => {
      expect(widgetBoolean(widget('WAltitude'), 'use_brackets')).toBeUndefined()
      expect(widgetNumber(widget('WAltitude'), 'avg')).toBeUndefined()
    })

    it('ne convertit jamais un défaut d’un type dans un autre', () => {
      // `_units` est une chaîne dans le relevé : la demander en booléen ou en nombre ne
      // doit pas produire une valeur, sans quoi une clé changée de type ferait dessiner
      // n'importe quoi.
      expect(defaultValueAt('WAltitude', '_units')).toBe('SYS_UNIT')
      expect(widgetBoolean(widget('WAltitude'), '_units')).toBeUndefined()
      expect(widgetNumber(widget('WAltitude'), '_units')).toBeUndefined()
      expect(widgetString(widget('WAltitude'), '_units')).toBe('SYS_UNIT')
    })
  })
})
