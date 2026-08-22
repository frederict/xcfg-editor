import { describe, expect, it } from 'vitest'
import rawHardwareKeyLabels from '../../src/catalog/hardwareKeyLabels.json'
import {
  HARDWARE_KEY_RESOURCES,
  hardwareKeyLabel,
  hasHardwareKeyLabel
} from '../../src/catalog/hardwareKeyLabels'
import { loadPreferenceDomains } from '../../src/catalog/preferenceDomains'

const LABELS = rawHardwareKeyLabels as Record<string, Record<string, string>>

/**
 * Ce fichier garde une seule propriété, la même que `navigationLabels.test.ts` : **le
 * pilote lit ici les mots qu'il voit sur son instrument**, jamais les nôtres.
 *
 * Les valeurs attendues sont celles du relevé complet de XCTrack 1.0.3-beta5, sous les
 * clés de ressource `keyVolumeUp`, `keyVolumeDown` et `keyPower`.
 */
describe('les touches physiques, avec les mots de XCTrack', () => {
  it('n’apparie que les trois codes dont une touche a été pressée', () => {
    // ⚠️ Trois, et pas un de plus. XCTrack nomme une trentaine de touches ; **aucune
    // mesure** ne dit lequel de ces mots son écran choisit pour un code donné, et le
    // `.dex` est obfusqué. Ajouter un code ici serait deviner.
    expect(Object.keys(HARDWARE_KEY_RESOURCES).map(Number)).toEqual([24, 25, 26])
    expect(Object.values(HARDWARE_KEY_RESOURCES).sort()).toEqual(Object.keys(LABELS).sort())
  })

  it('dit en français ce que la chrome française de XCTrack dit', () => {
    // ⚠️ Les trois ont changé le 2026-08-22 : l'outil écrivait « volume haut », « volume
    // bas » et « marche/arrêt » — notre prose, française dans les cinq interfaces, et
    // introuvable sur l'appareil. L'écran natif de réglage des touches affiche, lui,
    // « Appui long : Augmenter le volume » sur la ligne portant 16777240.
    expect(hardwareKeyLabel(24, 'fr')).toBe('Augmenter le volume')
    expect(hardwareKeyLabel(25, 'fr')).toBe('Diminuer le volume')
    expect(hardwareKeyLabel(26, 'fr')).toBe('Mise en route')
  })

  it('dit dans les quatre autres langues ce que l’APK dit, sans rien lisser', () => {
    // L'allemand écrit un signe là où le français fait une phrase, et le néerlandais
    // garde « Power » : ce sont les mots de XCTrack, on les recopie tels quels.
    expect(hardwareKeyLabel(24, 'en')).toBe('Volume Up')
    expect(hardwareKeyLabel(24, 'de')).toBe('Lautstärke +')
    expect(hardwareKeyLabel(24, 'es')).toBe('Subir volumen')
    expect(hardwareKeyLabel(24, 'nl')).toBe('Volume omhoog')
    expect(hardwareKeyLabel(26, 'de')).toBe('Power')
    expect(hardwareKeyLabel(26, 'nl')).toBe('Power')
    expect(hardwareKeyLabel(26, 'es')).toBe('Encendido')
  })

  it('porte les trois dans les 32 langues du relevé, l’anglais compris', () => {
    for (const [code, resource] of Object.entries(HARDWARE_KEY_RESOURCES)) {
      expect(Object.keys(LABELS[resource] ?? {}), resource).toHaveLength(32)
      // Sans l'anglais, le repli n'aurait rien à rendre.
      expect(hasHardwareKeyLabel(Number(code), 'en'), resource).toBe(true)
    }
  })

  it('replie sur l’anglais, puis sur rien du tout', () => {
    // Une langue que l'APK ne porte pas : XCTrack sert alors sa locale par défaut, et le
    // pilote lit « Volume Up » sur son appareil. On le lui montre tel quel.
    expect(hasHardwareKeyLabel(24, 'is')).toBe(false)
    expect(hardwareKeyLabel(24, 'is')).toBe('Volume Up')
    // Comparaison exacte de la langue, comme dans les quatre autres catalogues.
    expect(hardwareKeyLabel(24, 'fr-FR')).toBe('Volume Up')
    // ⚠️ Et `null`, jamais un mot inventé, pour un code que nous ne savons pas nommer :
    // 266 est celui que le pilote presse le plus en compétition, et rien ne l'explique.
    expect(hardwareKeyLabel(266, 'fr')).toBeNull()
    expect(hardwareKeyLabel(27, 'fr')).toBeNull()
    expect(hasHardwareKeyLabel(266, 'fr')).toBe(false)
  })

  it('nomme toutes les touches que le relevé matériel dit avoir pressées', async () => {
    // L'invariant qui tient l'écran : une touche pressée à la main **doit** avoir un mot
    // de XCTrack, sinon la page retomberait sur le nom Android en disant « nous n'avons
    // pas relevé celle-ci » — ce qui serait faux.
    const domains = await loadPreferenceDomains()
    for (const survey of domains.hardwareKeySurveys()) {
      for (const key of survey.keys) {
        expect(hardwareKeyLabel(key.code, 'en'), `${survey.deviceId} / ${key.name}`)
          .not.toBeNull()
      }
    }
  })
})
