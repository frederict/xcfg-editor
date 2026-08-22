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
 * Les valeurs attendues sont celles du relevé complet de XCTrack 1.0.3-beta5.
 *
 * ⚠️ **La table n'est plus déduite depuis le 2026-08-22 : elle est lue.** Ce fichier
 * n'appariait que trois codes, en disant pourquoi — « le `.dex` est obfusqué ». La
 * seconde moitié de la phrase était fausse : l'obfuscation renomme les classes, elle ne
 * cache pas les entiers. La classe `th4` de l'APK installé (1.0.3-beta, `versionCode`
 * 100 030) construit une table de 24 paires `(code, ressource)` que sa méthode
 * `a(Integer)` consulte pour nommer une touche à l'écran ; 21 d'entre elles portent un
 * code Android, et ce sont celles-ci.
 */
describe('les touches physiques, avec les mots de XCTrack', () => {
  it('apparie les 21 codes de la table que XCTrack consulte', () => {
    // ⚠️ Ni un de plus, ni un de moins : chaque entrée affirme que l'écran de XCTrack
    // emploie ce mot-là pour ce code-là, et c'est le bytecode qui le dit.
    expect(Object.keys(HARDWARE_KEY_RESOURCES).map(Number)).toEqual([
      3, 4, 5, 6, 19, 20, 21, 22, 23, 24, 25, 26, 27, 61, 62, 64, 66, 82, 85, 87, 88
    ])
    expect(Object.values(HARDWARE_KEY_RESOURCES).sort()).toEqual(Object.keys(LABELS).sort())
  })

  /**
   * ⚠️ **Le contrôle qui donne confiance dans les vingt autres.** Chaque paire lue dans le
   * bytecode tombe sur la constante `KEYCODE_*` que le nom de sa ressource annonce — 3 sur
   * `keyHome`, 19 sur `keyUp`, 64 (`KEYCODE_EXPLORER`) sur `keyBrowser`. Une lecture
   * fautive du bytecode n'aurait pas produit vingt et une coïncidences.
   */
  it('tombe, code par code, sur la constante Android que la table d’Android nomme', async () => {
    const domains = await loadPreferenceDomains()
    const expected: Record<number, string> = {
      3: 'KEYCODE_HOME', 4: 'KEYCODE_BACK', 5: 'KEYCODE_CALL', 6: 'KEYCODE_ENDCALL',
      19: 'KEYCODE_DPAD_UP', 20: 'KEYCODE_DPAD_DOWN', 21: 'KEYCODE_DPAD_LEFT',
      22: 'KEYCODE_DPAD_RIGHT', 23: 'KEYCODE_DPAD_CENTER', 24: 'KEYCODE_VOLUME_UP',
      25: 'KEYCODE_VOLUME_DOWN', 26: 'KEYCODE_POWER', 27: 'KEYCODE_CAMERA',
      61: 'KEYCODE_TAB', 62: 'KEYCODE_SPACE', 64: 'KEYCODE_EXPLORER', 66: 'KEYCODE_ENTER',
      82: 'KEYCODE_MENU', 85: 'KEYCODE_MEDIA_PLAY_PAUSE', 87: 'KEYCODE_MEDIA_NEXT',
      88: 'KEYCODE_MEDIA_PREVIOUS'
    }
    for (const code of Object.keys(HARDWARE_KEY_RESOURCES).map(Number)) {
      expect(domains.keyCodeName(code), String(code)).toBe(expected[code])
    }
  })

  /**
   * ⚠️ **Le mot de XCTrack n'est pas ce que le boîtier porte.** Le code 27 s'appelle
   * « Caméra » chez XCTrack et sort, sur l'AIR³ 7.2, du premier des deux boutons sous
   * l'appareil — qui n'est pas un déclencheur photo. Le nom vient de l'APK, la touche du
   * relevé matériel, et les confondre ferait dire à l'un ce que l'autre a mesuré.
   */
  it('nomme 27 « Caméra », le mot de XCTrack, et pas un mot de nous', () => {
    expect(hardwareKeyLabel(27, 'fr')).toBe('Caméra')
    expect(hardwareKeyLabel(27, 'en')).toBe('Camera')
    expect(hardwareKeyLabel(27, 'de')).toBe('Kamera')
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

  it('porte chacune dans les langues du relevé, l’anglais compris', () => {
    // Dix-huit sont traduites dans 32 locales ; les trois touches de média le sont moins,
    // et cela se constate plutôt que de se lisser.
    const fewer: Record<string, number> = {
      keyMediaPlayPause: 28, keyMediaNext: 30, keyMediaPrev: 30
    }
    for (const [code, resource] of Object.entries(HARDWARE_KEY_RESOURCES)) {
      expect(Object.keys(LABELS[resource] ?? {}), resource)
        .toHaveLength(fewer[resource] ?? 32)
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
    expect(hasHardwareKeyLabel(266, 'fr')).toBe(false)
    // ⚠️ Et les touches de clavier gardent leur nom Android : pour 51, XCTrack affiche le
    // caractère « W », que rend une **autre** table, consultée avant celle-ci. Aucun
    // boîtier relevé ne porte de telle touche ; le jour où l'un en portera, il faudra
    // lire cette table-là aussi.
    expect(hardwareKeyLabel(51, 'fr')).toBeNull()
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
