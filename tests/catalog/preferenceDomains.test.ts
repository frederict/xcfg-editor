import { describe, expect, it } from 'vitest'
import {
  LONG_PRESS_BIT_BASIS,
  loadPreferenceDomains,
  type PreferenceDomainCatalog,
} from '../../src/catalog/preferenceDomains'

const domains: PreferenceDomainCatalog = await loadPreferenceDomains()

describe('vocabulaire des unités', () => {
  it('porte les codes que les fichiers écrivent', () => {
    const vocabulary = domains.unitVocabulary()
    expect(vocabulary).toContain('m')
    expect(vocabulary).toContain('km/h')
    expect(vocabulary).toContain('m/s')
    expect(vocabulary).toContain('FL')
    expect(vocabulary.length).toBeGreaterThan(10)
  })

  it('dit d’où il vient, et combien de relevés ne l’ont pas livré', () => {
    const source = domains.domains.units.vocabularySource
    expect(source.enum).toBeTruthy()
    expect(source.versionCode).toBeGreaterThan(0)
    // L'énumération n'est pas retrouvée dans toutes les versions : le taire ferait
    // passer le vocabulaire pour une constante de XCTrack.
    expect(source.surveysWithout).toBeGreaterThan(0)
  })

  it('déclare les huit clés d’unité, et n’en borne aucune', () => {
    const keys = Object.keys(domains.domains.units.keys)
    expect(keys).toHaveLength(8)
    for (const key of keys) {
      expect(domains.isUnitKey(key)).toBe(true)
      // Aucune source lisible ne donne le domaine par clé : `null`, jamais un
      // tableau vide qui se lirait comme « aucune valeur permise ».
      expect(domains.unitDomain(key), key).toBeNull()
    }
    expect(domains.isUnitKey('Display.Theme')).toBe(false)
    expect(domains.unitDomain('Display.Theme')).toBeNull()
  })

  it('n’a observé que des valeurs faites de codes du vocabulaire', () => {
    // `Unit.Distance` vaut `m,km` : une échelle, deux codes séparés par une virgule.
    // Chaque morceau doit rester un code connu, sinon le vocabulaire est incomplet.
    const vocabulary = new Set(domains.unitVocabulary())
    for (const key of Object.keys(domains.domains.units.keys)) {
      for (const value of domains.unitObserved(key)) {
        for (const code of value.split(',')) {
          expect(vocabulary.has(code), `${key} = ${value}`).toBe(true)
        }
      }
    }
  })

  it('rend une liste vide, pas une erreur, pour une clé qu’aucun fichier ne porte', () => {
    expect(domains.unitObserved('Unit.Inconnue')).toEqual([])
  })
})

describe('codes de touche', () => {
  it('nomme les codes qu’un fichier réel porte', () => {
    expect(domains.keyCodeName(24)).toBe('KEYCODE_VOLUME_UP')
    expect(domains.keyCodeName(25)).toBe('KEYCODE_VOLUME_DOWN')
    expect(domains.keyCodeName(27)).toBe('KEYCODE_CAMERA')
    expect(domains.keyCodeName(266)).toBe('KEYCODE_STEM_2')
  })

  it('rend `null` — jamais un nom inventé — pour un code hors de la table', () => {
    expect(domains.keyCodeName(99_999)).toBeNull()
  })

  it('livre la table entière, triée, avec le niveau d’API qui la date', () => {
    const codes = domains.keyCodes()
    expect(codes.length).toBeGreaterThan(300)
    for (let i = 1; i < codes.length; i += 1) {
      expect(codes[i]!.code).toBeGreaterThan(codes[i - 1]!.code)
    }
    expect(domains.domains.keyCodes.androidApiLevel).toBeGreaterThan(20)
  })
})

describe('relecture d’une liaison de touche', () => {
  it('reconnaît l’absence de touche', () => {
    const binding = domains.decodeKeyBinding(-1)
    expect(binding.unset).toBe(true)
    expect(binding.modified).toBe(false)
    expect(binding.name).toBeNull()
  })

  it('rend un appui simple tel quel', () => {
    expect(domains.decodeKeyBinding(24)).toEqual({
      raw: 24, unset: false, code: 24, name: 'KEYCODE_VOLUME_UP', modified: false,
    })
  })

  it('ôte le bit de modificateur et retrouve la touche', () => {
    expect(domains.decodeKeyBinding(16_777_240)).toEqual({
      raw: 16_777_240, unset: false, code: 24, name: 'KEYCODE_VOLUME_UP',
      modified: true,
    })
    expect(domains.decodeKeyBinding(16_777_482)).toEqual({
      raw: 16_777_482, unset: false, code: 266, name: 'KEYCODE_STEM_2',
      modified: true,
    })
  })

  it('dit que le sens du bit est déduit, pas lu', () => {
    // L'interface doit pouvoir écrire « appui long (déduit) » : présenter la lecture
    // comme un constat serait un mensonge dans une configuration de vol.
    expect(LONG_PRESS_BIT_BASIS).toBe('inferred')
    expect(domains.domains.keyCodes.longPressBitBasis).toBe('inferred')
    expect(domains.domains.keyCodes.longPressBitEvidence.length).toBeGreaterThan(2)
  })

  it('relit toutes les valeurs observées en touches connues', () => {
    // L'invariant qui éprouve la lecture du bit sur le corpus entier : si une seule
    // valeur ne retombait pas sur un code Android connu, la lecture serait fausse.
    const { unsetValue, keys } = domains.domains.keyCodes
    expect(Object.keys(keys)).toHaveLength(15)
    for (const [key, entry] of Object.entries(keys)) {
      for (const value of entry.observed) {
        const binding = domains.decodeKeyBinding(value)
        if (value === unsetValue) {
          expect(binding.unset, `${key} = ${value}`).toBe(true)
          continue
        }
        expect(binding.name, `${key} = ${value}`).not.toBeNull()
      }
      expect(domains.isKeyBindingKey(key)).toBe(true)
    }
    expect(domains.isKeyBindingKey('Keys.MapPanStepSize')).toBe(false)
  })
})

describe('mémoire du chargement', () => {
  it('rend le même catalogue à deux appels', async () => {
    expect(await loadPreferenceDomains()).toBe(domains)
  })
})
