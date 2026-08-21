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

  it('déclare les huit clés d’unité, et borne chacune sur le relevé', () => {
    const keys = Object.keys(domains.domains.units.keys)
    expect(keys).toHaveLength(8)
    for (const key of keys) {
      expect(domains.isUnitKey(key)).toBe(true)
      expect(domains.unitDomain(key)?.length, key).toBeGreaterThan(1)
    }
    // Le relevé de l'appareil, dans son ordre : ni trié ni complété.
    expect(domains.unitDomain('Unit.Distance')?.map((one) => one.value))
      .toEqual(['m,km', 'mi', 'yd,mi', 'nm'])
    expect(domains.unitDomain('Unit.RelativeDistance')?.map((one) => one.value))
      .toEqual(['km', 'nm', 'mi'])
    expect(domains.unitDomain('Unit.VerticalSpeed')?.map((one) => one.value))
      .toEqual(['m/s', 'ft/min', '100ft/min'])
    // `null` pour un réglage qui n'est pas une unité : un tableau vide se lirait
    // « aucune valeur permise », ce qui n'est jamais ce qu'on veut dire.
    expect(domains.isUnitKey('Display.Theme')).toBe(false)
    expect(domains.unitDomain('Display.Theme')).toBeNull()
  })

  it('sépare ce que le fichier porte de ce que l’écran affiche', () => {
    // Le piège mesuré : l'appareil affiche « m, km » et écrit « m,km ». Écrire
    // l'espace produirait une valeur que XCTrack refuse.
    const distance = domains.unitDomain('Unit.Distance') ?? []
    expect(distance[0]).toEqual({ value: 'm,km', label: 'm, km' })
    expect(distance[2]).toEqual({ value: 'yd,mi', label: 'yd, mi' })
  })

  it('dit que ce domaine est relevé à la main, et sur quoi', () => {
    // C'est la seule donnée du fichier qui ne sorte ni d'un APK ni d'un `.xcfg` :
    // sans sa provenance, elle passerait pour une propriété de XCTrack.
    const source = domains.unitDomainSource()
    expect(source.basis).toBe('measured')
    expect(source.device).toContain('AIR3')
    expect(source.versionName).toBeTruthy()
    expect(source.method).toBeTruthy()
    expect(source.caveats.length).toBeGreaterThan(0)
  })

  it('propose au moins ce que les fichiers réels portent', () => {
    // Une liste fermée qui ne contiendrait pas une valeur observée retirerait au
    // pilote une valeur que son appareil accepte : c'est l'inverse du service rendu.
    for (const key of Object.keys(domains.domains.units.keys)) {
      const offered = new Set((domains.unitDomain(key) ?? []).map((one) => one.value))
      for (const seen of domains.unitObserved(key)) {
        expect(offered.has(seen), `${key} = ${seen}`).toBe(true)
      }
    }
  })

  it('n’a observé que des valeurs faites de codes du vocabulaire', () => {
    // `Unit.Distance` vaut `m,km` : une échelle, deux codes séparés par une virgule.
    // Chaque morceau doit rester un code connu, sinon le vocabulaire est incomplet.
    const vocabulary = new Set(domains.unitVocabulary())
    for (const key of Object.keys(domains.domains.units.keys)) {
      const values = [...domains.unitObserved(key),
        ...(domains.unitDomain(key) ?? []).map((one) => one.value)]
      for (const value of values) {
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
    expect(binding.longPress).toBe(false)
    expect(binding.name).toBeNull()
  })

  it('rend un appui simple tel quel', () => {
    expect(domains.decodeKeyBinding(24)).toEqual({
      raw: 24, unset: false, code: 24, name: 'KEYCODE_VOLUME_UP', longPress: false,
    })
  })

  it('sépare la touche de l’appui long', () => {
    expect(domains.decodeKeyBinding(16_777_240)).toEqual({
      raw: 16_777_240, unset: false, code: 24, name: 'KEYCODE_VOLUME_UP',
      longPress: true,
    })
    expect(domains.decodeKeyBinding(16_777_482)).toEqual({
      raw: 16_777_482, unset: false, code: 266, name: 'KEYCODE_STEM_2',
      longPress: true,
    })
  })

  it('dit que le sens du bit est mesuré, et sur quoi', () => {
    // Ce fut une déduction. L'écran natif de XCTrack affiche « Appui long :
    // Augmenter le volume » pour 16777240 : l'interface peut donc écrire le mot.
    expect(LONG_PRESS_BIT_BASIS).toBe('measured')
    expect(domains.domains.keyCodes.longPressBitBasis).toBe('measured')
    const evidence = domains.domains.keyCodes.longPressBitEvidence
    expect(evidence.length).toBeGreaterThan(2)
    expect(evidence[0]).toContain('écran natif')
    // Ce qui reste non vérifié ne disparaît pas de la liste des preuves.
    expect(evidence.join('\n')).toContain('un seul appareil')
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

describe('les touches que le boîtier porte vraiment', () => {
  it('rend le relevé du modèle que le fichier déclare', () => {
    const survey = domains.hardwareKeysFor('AIR3 AIR3-7.2 8.1.0')
    expect(survey?.deviceId).toBe('air3-7.2')
    expect(survey?.basis).toBe('measured')
    expect(survey?.keys.map((one) => one.code)).toEqual([24, 25, 26])
    // Le nom Android vient de la table lue, jamais de la saisie à la main.
    expect(survey?.keys.map((one) => one.name))
      .toEqual(['KEYCODE_VOLUME_UP', 'KEYCODE_VOLUME_DOWN', 'KEYCODE_POWER'])
    expect(survey?.caveats.join('\n')).toContain('sn7326-key')
  })

  it('rend `null` sur un modèle qui n’a pas été relevé, jamais un voisin', () => {
    // Le parc n'est pas homogène : les AIR³ récents portent plus de touches que le
    // 7.2. Se rabattre sur lui ferait dire d'un boîtier ce qui a été relevé sur un
    // autre — et l'interface se tairait moins qu'elle ne le doit.
    expect(domains.hardwareKeysFor('AIR3 AIR3-7.3 11')).toBeNull()
    expect(domains.hardwareKeysFor('AIR3 AIR3-7.35 11')).toBeNull()
    expect(domains.hardwareKeysFor('Pixel 8')).toBeNull()
    expect(domains.hardwareKeysFor(undefined)).toBeNull()
  })

  it('ne relève qu’un modèle, et le dit plutôt que de le laisser croire', () => {
    // Si un jour un second appareil est relevé, ce test tombe et le texte de
    // l'interface doit être relu : « le modèle du relevé » n'aura plus de sens au
    // singulier.
    expect(domains.domains.keyCodes.hardwareKeys).toHaveLength(1)
  })
})

describe('mémoire du chargement', () => {
  it('rend le même catalogue à deux appels', async () => {
    expect(await loadPreferenceDomains()).toBe(domains)
  })
})
