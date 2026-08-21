import { readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  compareToDefault,
  defaultsFor,
  defaultsProvenance,
  defaultsTrust,
  defaultValueAt,
  DEFAULTS_VERSION_CODE,
  DEFAULTS_VERSION_NAME,
  formatDefault,
  knownWidgetCount,
  missingDefaultKeys,
  universalKeys
} from '../../src/catalog/widgetDefaults'
import { REFERENCE_VERSION_CODE } from '../../src/ui/warnings'

const here = `${dirname(fileURLToPath(import.meta.url))}/`

/**
 * Le relevé des valeurs par défaut de XCTrack.
 *
 * Ce que ces tests protègent n'est pas la table — elle est une donnée, produite sur
 * l'appareil et non par du code. C'est **le lien entre la table et ce qu'on en dit** :
 * la copie fidèle, la version annoncée, et la comparaison, qui doit se taire quand elle
 * n'a rien à dire plutôt que d'inventer un « personnalisé ».
 */
describe('le relevé des défauts est la copie fidèle de celui de docs/', () => {
  it('src/catalog/widgetDefaults.json reproduit le relevé octet pour octet', () => {
    const source = readFileSync(`${here}../../docs/reference/widget-defaults-1.0.3-beta.json`)
    const copy = readFileSync(`${here}../../src/catalog/widgetDefaults.json`)
    // Une copie qui dérive du relevé ferait mentir l'interface sur ce qu'elle compare, et
    // la dérive serait invisible : la table ne s'affiche jamais en entier.
    expect(copy.equals(source)).toBe(true)
  })

  it('la version annoncée par le module est celle que le relevé porte dans son texte', () => {
    expect(defaultsProvenance()).toContain(DEFAULTS_VERSION_NAME)
    expect(defaultsProvenance()).toContain(String(DEFAULTS_VERSION_CODE))
  })

  it('c’est la même version de référence que celle des avertissements', () => {
    // Deux constantes, une seule connaissance : le jour où l'outil est relevé sur une
    // version plus récente, elles bougent ensemble ou l'interface se contredit.
    expect(DEFAULTS_VERSION_CODE).toBe(REFERENCE_VERSION_CODE)
  })

  it('décrit les 75 types de widgets du relevé, et les huit clés écrites à la main', () => {
    expect(knownWidgetCount()).toBe(75)
    expect(universalKeys()).toEqual(['CLASS', 'X1', 'Y1', 'X2', 'Y2', '_border', '_bg', '_theme'])
  })

  it('rend le relevé d’un type connu, et rien pour un type qu’il ignore', () => {
    expect(defaultsFor('WTime')).toEqual({ _title: true, showSec: true })
    expect(defaultsFor('WCompass')?.windStyle).toBe('NONE')
    expect(defaultsFor('WCeQuiNExistePas')).toBeUndefined()
    // Pas de fuite par le prototype : `constructor` n'est pas un type de widget.
    expect(defaultsFor('constructor')).toBeUndefined()
  })

  it('descend dans une clé composite par son sous-champ', () => {
    expect(defaultValueAt('WXCAssistant', 'rotation', 'value')).toBe('NORTH_AT_TOP')
    expect(defaultValueAt('WXCAssistant', 'rotation', 'showCompass')).toBe(false)
    expect(defaultValueAt('WXCAssistant', 'mapWidget_scale', 'value')).toBe(26)
    // Un sous-champ que le relevé ne décrit pas ne vaut pas la valeur du parent.
    expect(defaultValueAt('WXCAssistant', 'rotation', 'inconnu')).toBeUndefined()
    // Une clé simple interrogée comme une composite ne rend rien non plus.
    expect(defaultValueAt('WTime', 'showSec', 'value')).toBeUndefined()
  })
})

describe('comparer une valeur du fichier au relevé', () => {
  it('reconnaît un booléen resté au défaut, et un booléen changé', () => {
    expect(compareToDefault('WTime', 'showSec', undefined, { kind: 'literal', text: 'true' }))
      .toBe('default')
    expect(compareToDefault('WTime', 'showSec', undefined, { kind: 'literal', text: 'false' }))
      .toBe('custom')
  })

  it('reconnaît une chaîne d’énumération', () => {
    expect(compareToDefault('WCompass', 'windStyle', undefined, { kind: 'string', text: 'NONE' }))
      .toBe('default')
    expect(compareToDefault('WCompass', 'windStyle', undefined, { kind: 'string', text: 'ARC' }))
      .toBe('custom')
  })

  it('compare les nombres par leur valeur, jamais par leur texte source', () => {
    // `3.0` et `3` sont le même nombre. La fidélité à l'octet près est une affaire
    // d'écriture : un fichier qui écrit `10.0` n'a rien personnalisé pour autant.
    expect(compareToDefault('WXCAssistant', 'line_thickness', undefined,
      { kind: 'literal', text: '10' })).toBe('default')
    expect(compareToDefault('WXCAssistant', 'line_thickness', undefined,
      { kind: 'literal', text: '10.0' })).toBe('default')
    expect(compareToDefault('WXCAssistant', 'line_thickness', undefined,
      { kind: 'literal', text: '20' })).toBe('custom')
  })

  it('compare une couleur, entier signé négatif compris', () => {
    expect(compareToDefault('WXCAssistant', 'tracklog_color', undefined,
      { kind: 'literal', text: '-27091' })).toBe('default')
    expect(compareToDefault('WXCAssistant', 'tracklog_color', undefined,
      { kind: 'literal', text: '-1' })).toBe('custom')
  })

  it('descend dans un sous-champ de clé composite', () => {
    expect(compareToDefault('WXCAssistant', 'rotation', 'value',
      { kind: 'string', text: 'NORTH_AT_TOP' })).toBe('default')
    expect(compareToDefault('WXCAssistant', 'rotation', 'value',
      { kind: 'string', text: 'HEADING_AT_TOP' })).toBe('custom')
  })

  /*
   * Le cœur de l'honnêteté de la fonction : `unknown` n'est pas un repli poli, c'est un
   * troisième état. Le compter comme « personnalisé » ferait dire à l'interface que le
   * pilote a réglé `_bg` sur tous ses widgets, ce qui est faux et invérifiable.
   */
  describe('elle se tait plutôt que d’inventer', () => {
    it('sur un type de widget que le relevé ignore', () => {
      expect(compareToDefault('WInconnu', 'quoi', undefined, { kind: 'literal', text: 'true' }))
        .toBe('unknown')
    })

    it('sur les clés universelles, que le relevé a écrites lui-même', () => {
      for (const key of ['_border', '_bg', '_theme']) {
        expect(compareToDefault('WCompass', key, undefined, { kind: 'literal', text: '0' }))
          .toBe('unknown')
      }
    })

    it('sur une clé absente du relevé — vestige, ou version plus récente', () => {
      expect(compareToDefault('WCompass', 'showWind', undefined, { kind: 'literal', text: 'true' }))
        .toBe('unknown')
    })

    it('sur un désaccord de type, qui dit un format changé et non un réglage', () => {
      // Le relevé attend une chaîne `"NONE"` ; le fichier porte un littéral.
      expect(compareToDefault('WCompass', 'windStyle', undefined,
        { kind: 'literal', text: '0' })).toBe('unknown')
      // Le relevé attend un booléen ; le fichier porte une chaîne.
      expect(compareToDefault('WTime', 'showSec', undefined,
        { kind: 'string', text: 'true' })).toBe('unknown')
    })

    it('sur une valeur composée, qu’aucune sérialisation ne compare honnêtement', () => {
      expect(compareToDefault('WWebView', 'scrollSettings', undefined,
        { kind: 'array', text: '' })).toBe('unknown')
      expect(compareToDefault('WXCAssistant', 'rotation', undefined,
        { kind: 'object', text: '' })).toBe('unknown')
    })

    it('sur un littéral qui n’est ni un nombre ni un booléen', () => {
      expect(compareToDefault('WXCAssistant', 'line_thickness', undefined,
        { kind: 'literal', text: 'null' })).toBe('unknown')
      expect(compareToDefault('WTime', 'showSec', undefined,
        { kind: 'literal', text: 'null' })).toBe('unknown')
    })
  })
})

describe('ce que le relevé décrit et que le fichier ne porte pas', () => {
  it('énumère les clés manquantes dans l’ordre du relevé', () => {
    expect(missingDefaultKeys('WTime', ['_title'])).toEqual(['showSec'])
    expect(missingDefaultKeys('WTime', ['_title', 'showSec'])).toEqual([])
  })

  it('ne dit rien d’un type que le relevé ignore', () => {
    expect(missingDefaultKeys('WInconnu', [])).toEqual([])
  })
})

describe('la confiance accordée à la comparaison', () => {
  it('est entière pour un fichier de la version du relevé', () => {
    expect(defaultsTrust(DEFAULTS_VERSION_CODE)).toBe('exact')
  })

  it('est indicative pour toute autre version — les défauts changent avec elle', () => {
    expect(defaultsTrust(100029)).toBe('indicative')
    expect(defaultsTrust(100031)).toBe('indicative')
  })

  it('est indicative aussi quand le fichier ne dit pas d’où il vient', () => {
    expect(defaultsTrust(undefined)).toBe('unstated')
  })
})

describe('afficher une valeur du relevé', () => {
  it('rend la chaîne telle quelle, sans guillemets ajoutés', () => {
    expect(formatDefault('NORTH_AT_TOP')).toBe('NORTH_AT_TOP')
  })

  it('rend booléens et nombres sous la forme qu’ils ont dans le fichier', () => {
    expect(formatDefault(true)).toBe('true')
    expect(formatDefault(-27091)).toBe('-27091')
  })
})
