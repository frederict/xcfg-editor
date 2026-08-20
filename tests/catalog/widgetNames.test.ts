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

  it('retombe sur la table manuelle pour un widget absent du catalogue officiel', () => {
    // WButtonVario fait partie des 8 widgets non résolus par extract-widget-labels.py
    // (voir KNOWN_UNRESOLVED) : ni dans widgetLabels.json, ni dans WIDGET_NAMES —
    // repli final sur le nom de classe brut.
    expect(readableName('WButtonVario', 'fr')).toBe('WButtonVario')
  })

  it('retombe sur le nom de classe pour un type totalement inconnu', () => {
    expect(readableName('WQuelqueChoseDeNouveau', 'fr')).toBe('WQuelqueChoseDeNouveau')
  })

  it('couvre au moins les 37 types du corpus dans la table de repli manuelle', () => {
    expect(Object.keys(WIDGET_NAMES).length).toBeGreaterThanOrEqual(37)
  })
})
