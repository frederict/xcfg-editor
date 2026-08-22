import { describe, expect, it } from 'vitest'
import rawNavigationLabels from '../../src/catalog/navigationLabels.json'
import {
  NAVIGATION_CLASSES,
  hasNavigationLabel,
  navigationLabel
} from '../../src/catalog/navigationLabels'
import { pageClassLabel } from '../../src/catalog/widgetNames'

const LABELS = rawNavigationLabels as Record<string, Record<string, string>>

/**
 * Ce fichier garde une seule propriété, et c'est la promesse centrale de l'outil : **le
 * pilote lit ici les mots qu'il voit sur son instrument**, jamais les nôtres.
 *
 * Les valeurs attendues sont celles du relevé complet de XCTrack 1.0.3-beta5, sous les
 * clés de ressource `navTakeoff`, `navTriangleClosing`, `navWaypoint2`, `navCompetition`
 * et `navLivePilot`.
 */
describe('les cinq navigations, avec les mots de XCTrack', () => {
  it('nomme les cinq classes que les fichiers du corpus emploient', () => {
    expect([...NAVIGATION_CLASSES].sort()).toEqual(Object.keys(LABELS).sort())
    expect(NAVIGATION_CLASSES).toHaveLength(5)
  })

  it('dit en français ce que la chrome française de XCTrack dit', () => {
    // Quatre des cinq ont changé le 2026-08-22 : l'outil écrivait « Fermeture de
    // triangle », « Vers une balise », « Compétition » et « Vers un pilote en direct ».
    expect(navigationLabel('TaskBackToTakeoff', 'fr')).toBe('Retour au décollage')
    expect(navigationLabel('TaskTriangleClosing', 'fr')).toBe('Triangle achevant')
    expect(navigationLabel('TaskToWaypoint', 'fr')).toBe('Balises/Navigation XC')
    expect(navigationLabel('TaskCompetition', 'fr')).toBe('Manche de compétition')
    expect(navigationLabel('TaskToLivePilot', 'fr')).toBe('Pilote Live')
  })

  it('dit en anglais ce que la locale par défaut de l’APK dit', () => {
    expect(navigationLabel('TaskBackToTakeoff', 'en')).toBe('Back to takeoff')
    expect(navigationLabel('TaskTriangleClosing', 'en')).toBe('Triangle closing')
    expect(navigationLabel('TaskToWaypoint', 'en')).toBe('Waypoints / XC Navigation')
    expect(navigationLabel('TaskCompetition', 'en')).toBe('Competition task')
    expect(navigationLabel('TaskToLivePilot', 'en')).toBe('Live pilot')
  })

  it('porte l’anglais pour les cinq, faute de quoi le repli n’aurait rien à rendre', () => {
    for (const className of NAVIGATION_CLASSES) {
      expect(hasNavigationLabel(className, 'en'), className).toBe(true)
    }
  })

  it('replie sur l’anglais — et le dit — là où la mesure manque', () => {
    // Ce n'est pas un trou de notre extraction : `navLivePilot` n'est traduit que dans
    // 17 des 34 locales de l'APK. XCTrack lui-même sert alors sa locale par défaut, et
    // le pilote néerlandais lit « Live pilot » sur son appareil. On le lui montre tel
    // quel plutôt que d'inventer un mot qu'il ne retrouverait nulle part.
    expect(hasNavigationLabel('TaskToLivePilot', 'nl')).toBe(false)
    expect(navigationLabel('TaskToLivePilot', 'nl')).toBe('Live pilot')
    expect(hasNavigationLabel('TaskToWaypoint', 'da')).toBe(false)
    expect(navigationLabel('TaskToWaypoint', 'da')).toBe('Waypoints / XC Navigation')
    // Les quatre autres sont bien traduites en néerlandais, elles.
    expect(navigationLabel('TaskBackToTakeoff', 'nl')).toBe('Terug naar start')
    expect(navigationLabel('TaskTriangleClosing', 'nl')).toBe('Driehoek gesloten')
    expect(navigationLabel('TaskToWaypoint', 'nl')).toBe('Routepunten / XC Navigatie')
    expect(navigationLabel('TaskCompetition', 'nl')).toBe('Competitie taak')
  })

  it('garde le nom court pour une navigation qu’aucune version relevée ne documente', () => {
    expect(navigationLabel('TaskToSomethingNew', 'fr')).toBe('TaskToSomethingNew')
    expect(hasNavigationLabel('TaskToSomethingNew', 'fr')).toBe(false)
  })

  it('compare la langue à l’exact, comme les trois autres catalogues', () => {
    // `fr-FR` ne retombe pas sur `fr`. La limite est connue, et volontairement la même
    // partout : la corriger ici seul ferait diverger deux libellés du même écran.
    expect(navigationLabel('TaskTriangleClosing', 'fr-FR')).toBe('Triangle closing')
  })

  it('couvre les cinq classes dans les cinq langues de notre interface, repli compris', () => {
    // Aucun des cinq noms ne doit jamais retomber sur son nom de classe : ce serait un
    // identifiant Java sous les yeux du pilote.
    for (const className of NAVIGATION_CLASSES) {
      for (const language of ['fr', 'en', 'de', 'es', 'nl']) {
        expect(navigationLabel(className, language), `${className} / ${language}`)
          .not.toBe(className)
      }
    }
  })
})

describe('les quatre classes de page, avec les mots de XCTrack', () => {
  it('les lit dans le catalogue des libellés, pas dans notre prose', () => {
    // Relevées sous `wpThermalAssistantTitle`, `wpXCAssistantTitle`, `wpCompetitionTitle`
    // et `wpEmptyTitle` ; `widgetLabels.json` les porte parce que XCTrack range ses
    // classes de page dans le même paquet de ressources que ses gadgets.
    expect(pageClassLabel('WPThermalAssistant', 'fr')).toBe('Aide thermique')
    expect(pageClassLabel('WPXCAssistant', 'fr')).toBe('Aide XC')
    expect(pageClassLabel('WPCompetition', 'fr')).toBe('Compétition')
    expect(pageClassLabel('WPEmpty', 'fr')).toBe('Vide')
  })

  it('les donne dans la langue du fichier ouvert, pas dans celle du pilote', () => {
    expect(pageClassLabel('WPThermalAssistant', 'en')).toBe('Thermal Assistant')
    expect(pageClassLabel('WPThermalAssistant', 'de')).toBe('Thermik Assistent')
    expect(pageClassLabel('WPEmpty', 'es')).toBe('Vacío')
    expect(pageClassLabel('WPCompetition', 'nl')).toBe('Competitie')
  })

  it('replie sur l’anglais, puis sur le nom court', () => {
    expect(pageClassLabel('WPEmpty', 'xx')).toBe('Empty')
    // `WPMissing` est fabriqué par XCTrack à la lecture d'un fichier : jamais proposé à
    // la création, donc absent du catalogue. Il faut bien afficher quelque chose.
    expect(pageClassLabel('WPMissing', 'fr')).toBe('WPMissing')
    expect(pageClassLabel('WPFuture', 'fr')).toBe('WPFuture')
  })
})
