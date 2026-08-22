import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { UI_LANGUAGES, type UiLanguage } from '../../src/i18n/languages'
import de from '../../src/i18n/messages/de/app'
import en from '../../src/i18n/messages/en/app'
import es from '../../src/i18n/messages/es/app'
import fr from '../../src/i18n/messages/fr/app'
import nl from '../../src/i18n/messages/nl/app'
import deLabels from '../../src/catalog/preferenceCatalog/de.json'
import enLabels from '../../src/catalog/preferenceCatalog/en.json'
import esLabels from '../../src/catalog/preferenceCatalog/es.json'
import frLabels from '../../src/catalog/preferenceCatalog/fr.json'
import nlLabels from '../../src/catalog/preferenceCatalog/nl.json'

/**
 * # Enregistrer : le geste par lequel tout le travail sort de l'outil
 *
 * Les deux défauts que ce fichier garde viennent du même essai pilote, le 22 août 2026, et
 * tous deux tiennent à ce que l'outil **dit** — pas à ce qu'il calcule.
 *
 * ## 1. Le silence de l'enregistrement
 *
 * > « Rien ne confirme que le fichier est sorti. Je clique "Enregistrer", la boîte se
 * > ferme, silence. Quand mon navigateur a refusé le second téléchargement, l'outil a réagi
 * > exactement pareil. »
 *
 * **Reproduit et mesuré**, Chrome, serveur de développement, trois enregistrements de suite
 * depuis le même onglet : le premier arrive dans le dossier de téléchargements, **les deux
 * suivants n'y arrivent jamais** — ils n'apparaissent même pas dans le gestionnaire de
 * téléchargements du navigateur. Côté page, les trois sont indiscernables : même
 * `link.click()`, aucune exception, aucun événement. Un clic humain sur un vrai
 * `<a download>` est refusé de la même façon une fois l'onglet marqué : **aucun** artifice
 * de page ne rattrape le refus, et aucun ne le détecte.
 *
 * D'où la forme retenue, et ce que ces contrôles gardent :
 *
 * - un **reçu** dans la barre de tête, qui dit ce que l'outil a fait — un fichier, ce
 *   nom-là, cette taille-là, remis au navigateur — et jamais « c'est enregistré », qui
 *   serait faux une fois sur deux ;
 * - la mise en garde **à partir du deuxième** enregistrement seulement, parce que le
 *   premier passe toujours : un avertissement servi sur la situation normale s'apprend à
 *   se sauter ;
 * - l'échec que l'outil peut **constater** — la fabrication du fichier — dit dans une
 *   boîte, là où il ne produisait qu'un rejet non traité dans la console.
 *
 * ## 2. Le chemin d'export qui n'était le chemin de personne
 *
 * > « L'accueil dit "Réglages", l'appareil dit "Préférences → Export et import de la
 * > config". »
 *
 * Vérifié sur les 55 relevés d'APK du dépôt privé : « Réglages » n'existe dans aucune
 * version, et le chemin fait **trois** écrans, pas deux. Les deux derniers sont dans les
 * catalogues extraits (`src/catalog/preferenceCatalog/<langue>.json`), donc vérifiables
 * ici, langue par langue. Le premier — `menu_preferences` — n'est pas versé au dépôt
 * public ; il reste à la charge de la relecture, et le commentaire de `fr/app.ts` porte la
 * mesure.
 *
 * Même famille que `tests/ui/assembly.test.ts` : `main.ts` monte un DOM entier et branche
 * des écoutes de fenêtre, il n'est pas exécuté par les tests. Ce qui n'est pas un détail
 * d'exécution se relit donc à la source.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const main = readFileSync(path.join(here, '../..', 'src/ui/main.ts'), 'utf8')
const appCss = readFileSync(path.join(here, '../..', 'src/ui/app.css'), 'utf8')

const MESSAGES: Readonly<Record<UiLanguage, Record<string, unknown>>> = { fr, de, en, es, nl }

/** Le message d'une langue, en clair — les pluriels n'ont rien à faire ici. */
function said(language: UiLanguage, key: string): string {
  const value = MESSAGES[language][key]
  if (typeof value !== 'string') throw new Error(`${language} / ${key} n’est pas une phrase`)
  return value
}

describe('le reçu d’enregistrement — le succès se voit', () => {
  it('vit DANS la barre de tête, qui est collante', () => {
    // Posé sous la barre, il serait hors champ dès que le pilote a fait défiler sa page —
    // c'est-à-dire au moment même où il enregistre, après vingt minutes de travail.
    expect(main).toContain('bar.append(brand, actions, receipt)')
    expect(appCss).toContain('.app-bar__receipt {')
    // Une ligne entière de la barre : c'est ce que `flex-wrap: wrap` de `.app-bar` permet.
    expect(appCss).toMatch(/\.app-bar__receipt \{[^}]*flex: 1 0 100%/)
  })

  it('s’annonce comme un état, jamais comme une alerte', () => {
    // Un enregistrement qui réussit est la situation normale. `role="alert"` sur une
    // situation normale apprend à ignorer les alertes — la doctrine du dépôt.
    expect(main).toContain("receipt.setAttribute('role', 'status')")
    expect(main).not.toContain("receipt.setAttribute('role', 'alert')")
  })

  it('n’est pas une modale : rien à fermer pour continuer', () => {
    // Il se ferme si on veut, il ne bloque rien.
    expect(main).not.toMatch(/receipt[^\n]*showModal\(\)/)
    expect(main).toContain('function clearReceipt(): void')
  })

  it('nomme le fichier et sa taille, dans les cinq langues', () => {
    for (const language of UI_LANGUAGES) {
      const text = said(language, 'app.exportHandedOver')
      expect(text, `${language} / app.exportHandedOver`).toContain('{name}')
      expect(text, `${language} / app.exportHandedOver`).toContain('{size}')
    }
  })

  it('la taille passe par le formateur de la langue, jamais par une unité écrite en dur', () => {
    expect(main).toContain('size: tr.format.byteSize(lastReceipt.byteLength)')
  })

  it('ne sert la mise en garde qu’à partir du DEUXIÈME enregistrement', () => {
    // Mesuré : le premier téléchargement d'un onglet passe toujours. Servir la mise en
    // garde dès celui-là en ferait du décor, et le pilote la sauterait le jour où elle
    // compte.
    expect(main).toContain('if (lastReceipt.ordinal > 1)')
    expect(main).toContain("tr.t('app.exportRefusedHint')")
    for (const language of UI_LANGUAGES) {
      expect(said(language, 'app.exportRefusedHint').length, language).toBeGreaterThan(60)
    }
  })

  it('le compte est celui de l’onglet, et ne repart pas à l’ouverture d’un fichier', () => {
    // C'est l'onglet que le navigateur compte, pas le document : remettre `deliveries` à
    // zéro en fermant un document ferait taire la mise en garde juste quand elle vaut.
    const closing = main.slice(
      main.indexOf('function closeDocument(): void'),
      main.indexOf('function buildSession(')
    )
    expect(closing).toContain('clearReceipt()')
    expect(closing).not.toContain('deliveries = 0')
  })

  it('suit la langue du pilote après coup', () => {
    // `installChromeProse` se rejoue à chaque changement de langue. Sans cette ligne, le
    // reçu resterait dans la langue d'avant.
    const chrome = main.slice(
      main.indexOf('function installChromeProse'),
      main.indexOf('/* ------------------------------------------------- le reçu')
    )
    expect(chrome).toContain('renderReceipt()')
  })
})

describe('le reçu d’enregistrement — l’échec se dit', () => {
  it('les deux chemins de livraison rapportent ce qui rate', () => {
    // `void deliver(…)` sans `catch` ne produisait qu'un rejet non traité dans la console :
    // pour le pilote, un échec de fabrication ressemblait trait pour trait à un succès.
    expect(main).toContain('.catch(tellDeliveryFailed)')
    expect([...main.matchAll(/\.catch\(tellDeliveryFailed\)/g)]).toHaveLength(2)
    expect(main).toContain('function tellDeliveryFailed(error: unknown): void')
  })

  it('la boîte d’échec dit que la configuration n’a pas bougé, dans les cinq langues', () => {
    for (const language of UI_LANGUAGES) {
      expect(said(language, 'app.exportFailedTitle').length, language).toBeGreaterThan(10)
      expect(said(language, 'app.exportFailedMessage').length, language).toBeGreaterThan(30)
    }
  })

  it('l’URL de l’objet n’est plus révoquée dans la foulée du clic', () => {
    // Relevé à l'horloge : `link.click()` et `URL.revokeObjectURL(url)` portaient la MÊME
    // valeur de `performance.now()`. Le navigateur n'a alors aucune garantie d'avoir fini
    // de lire le `Blob`. La révocation attend désormais la livraison suivante.
    expect(main).not.toMatch(/link\.click\(\)\s*\n\s*URL\.revokeObjectURL\(url\)/)
    expect(main).toContain('if (deliveredUrl !== undefined) URL.revokeObjectURL(deliveredUrl)')
  })

  it('la livraison ne touche toujours pas aux octets — la fidélité tient', () => {
    // Le reçu s'ajoute au chemin d'export ; il ne le réécrit pas.
    expect(main).toMatch(/produced \?\? await exportContainer\(current\.container\)/)
  })
})

/* ==================================================================================== */

/** Les libellés de XCTrack extraits de l'APK, langue par langue. */
const APK_LABELS: Readonly<Record<UiLanguage, Record<string, string>>> = {
  fr: frLabels.strings,
  de: deLabels.strings,
  en: enLabels.strings,
  es: esLabels.strings,
  nl: nlLabels.strings
}

/**
 * Les deux écrans du chemin d'export que le dépôt public peut prouver.
 *
 * Le troisième — `menu_preferences`, « Préférences » en français — vit dans les ressources
 * de chrome de l'APK, qui ne sont pas versées ici. Il est mesuré (55 relevés, stable de
 * 0.9.6 à 1.0.3-beta) et écrit dans le commentaire de `fr/app.ts`.
 */
const EXPORT_PATH_KEYS = ['prefShareConfig', 'prefExportConfig'] as const

/**
 * Le libellé que XCTrack affiche pour cet écran, dans cette langue.
 *
 * Il **lève** quand la clé manque au catalogue : un libellé absent rendrait vacants les
 * contrôles qui suivent, et un contrôle vacant est pire que pas de contrôle du tout.
 */
function labelOf(language: UiLanguage, key: string): string {
  const label = APK_LABELS[language][key]
  if (label === undefined) throw new Error(`${key} manque au catalogue ${language}`)
  return label
}

/** Les deux endroits où l'application dit au pilote comment sortir son fichier. */
const PATH_MESSAGES = ['landing.stepDeviceText', 'app.unreadableMessage'] as const

describe('le chemin d’export cité par l’application est celui de l’appareil', () => {
  it.each(PATH_MESSAGES)('« %s » cite les deux écrans mesurés, dans les cinq langues', (key) => {
    const missing: Record<string, string[]> = {}
    for (const language of UI_LANGUAGES) {
      const text = said(language, key)
      const absent = EXPORT_PATH_KEYS
        .map((label) => labelOf(language, label))
        .filter((label) => !text.includes(label))
      if (absent.length > 0) missing[language] = absent
    }
    expect(missing, 'libellés d’écran absents du message, par langue').toEqual({})
  })

  it('n’invente plus d’écran « Réglages » sur l’instrument', () => {
    // Le mot n'existe dans aucune des 55 versions relevées, et le pilote d'essai l'a
    // cherché un moment sur son AIR³. Il reste employé par NOTRE barre de tête
    // (`app.settings`), qui est une autre chose : le contrôle ne porte que sur les deux
    // phrases qui décrivent l'appareil.
    for (const key of PATH_MESSAGES) {
      expect(said('fr', key), key).not.toContain('Réglages')
    }
  })

  it('les deux phrases disent le même chemin, mot pour mot', () => {
    // Deux formulations d'un même chemin divergent à la première retouche, et le pilote
    // qui lit la seconde après la première croit avoir raté un écran.
    for (const language of UI_LANGUAGES) {
      for (const label of EXPORT_PATH_KEYS.map((k) => labelOf(language, k))) {
        expect(
          PATH_MESSAGES.every((key) => said(language, key).includes(label)),
          `${language} : « ${label} » manque à l’une des deux phrases`
        ).toBe(true)
      }
    }
  })
})
