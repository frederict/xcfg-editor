import { describe, expect, it } from 'vitest'
import { WIDGET_NAMES, readableName } from '../../src/catalog/widgetNames'

describe('noms lisibles', () => {
  it('rend le libellé officiel dans la langue demandée', () => {
    // Libellés extraits de resources.arsc (tools/extract-widget-labels.py), pas la
    // traduction maison : « Altitude GPS », pas « Altitude ».
    expect(readableName('WAltitude', 'fr')).toBe('Altitude GPS')
    expect(readableName('WAltitude', 'en')).toBe('GPS Alt')
    expect(readableName('WFL', 'fr')).toBe('Niveau de vol')
  })

  it('retombe sur l’anglais si la langue demandée n’a pas de traduction connue', () => {
    // 'xx' n'existe dans aucune des 34 locales du catalogue : doit retomber sur 'en'.
    expect(readableName('WAltitude', 'xx')).toBe('GPS Alt')
  })

  it('nomme les six widgets dont la clé de titre n’obéit à aucune convention', () => {
    // Ces six-là s'affichaient sous leur nom de classe brut : `extract-widget-labels.py`
    // devinait la clé du libellé par convention (`w<Stem>Title`) et aucune ne s'y
    // conforme. Elle est désormais lue dans le registre de l'écran d'ajout, où elle est
    // un argument du constructeur. Les libellés français sont ceux relevés sur l'AIR³,
    // `docs/reference/edition-native-exploration.md` § 3.3.
    expect(readableName('WAltitudeMaximum', 'fr')).toBe('Altitude maxi')
    expect(readableName('WButtonCamera', 'fr')).toBe('Bouton appli camera')
    expect(readableName('WButtonVario', 'fr')).toBe('Bouton Vario')
    expect(readableName('WCompPercentage', 'fr')).toBe('% de la section vitesse')
    expect(readableName('WExternalData', 'fr')).toBe('Affichage des données externes')
    expect(readableName('WWebView', 'fr')).toBe('Page web')
    // Et en anglais, la langue source des ressources.
    expect(readableName('WAltitudeMaximum', 'en')).toBe('Max altitude')
    expect(readableName('WButtonVario', 'en')).toBe('Vario button')
    expect(readableName('WWebView', 'en')).toBe('Web page')
    // Aucun ne retombe plus sur son nom de classe, dans aucune des 34 locales.
    for (const shortName of ['WAltitudeMaximum', 'WButtonCamera', 'WButtonVario']) {
      expect(readableName(shortName, 'de'), shortName).not.toBe(shortName)
    }
  })

  it('retombe sur le nom de classe pour les deux types encore non résolus', () => {
    // Le repli sur le nom de classe n'est pas mort avec les six : `WProFallback` et
    // `WPMissing` sont les deux types que XCTrack fabrique lui-même à la lecture d'un
    // fichier (§ 3.3). Ils ne sont proposés ni à l'ajout d'un widget ni à la création
    // d'une page, donc absents du registre — et absents aussi de la table manuelle.
    // Un fichier peut malgré tout en contenir : il faut bien afficher quelque chose.
    expect(readableName('WProFallback', 'fr')).toBe('WProFallback')
    expect(readableName('WPMissing', 'fr')).toBe('WPMissing')
  })

  it('retombe sur le nom de classe pour un type totalement inconnu', () => {
    expect(readableName('WQuelqueChoseDeNouveau', 'fr')).toBe('WQuelqueChoseDeNouveau')
  })

  it('couvre au moins les 37 types du corpus dans la table de repli manuelle', () => {
    expect(Object.keys(WIDGET_NAMES).length).toBeGreaterThanOrEqual(37)
    // …mais aucune de ces 37 entrées ne sert plus : toutes sont désormais couvertes
    // par le catalogue officiel, qui passe avant. La table est dormante, et le test
    // le dit plutôt que de laisser croire à un repli encore actif.
    for (const shortName of Object.keys(WIDGET_NAMES)) {
      expect(readableName(shortName, 'en'), shortName).not.toBe(WIDGET_NAMES[shortName])
    }
  })
})
