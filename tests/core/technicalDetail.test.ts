import { describe, expect, it } from 'vitest'

import { openContainer } from '../../src/core/container'
import { formatTechnicalDetail, technicalDetail } from '../../src/core/technicalDetail'
import { makeTranslator } from '../../src/i18n/translate'
import frenchMessages from '../../src/i18n/messages/fr'
import dutchMessages from '../../src/i18n/messages/nl'

const tr = makeTranslator('fr', frenchMessages)

/**
 * Le défaut mesuré : en déposant un `.png`, le pilote lisait
 *
 *     Ce fichier n'a pas pu être analysé : Error: données résiduelles à 6
 *
 * Le mot `Error:` vient du moteur JavaScript. Il n'est ni traduit ni traduisible, et il
 * arrive au moment précis où le pilote vient de confier son fichier à cet outil.
 */
describe('le détail technique ne montre plus le mot « Error »', () => {
  it('rend le message d’une panne, sans le préfixe du moteur', () => {
    expect(formatTechnicalDetail(new Error('données résiduelles à 6'), tr))
      .toBe('données résiduelles à 6')
    expect(formatTechnicalDetail(new TypeError('x n’est pas une fonction'), tr))
      .toBe('x n’est pas une fonction')
  })

  it('ôte le préfixe même quand la panne arrive déjà en chaîne', () => {
    expect(formatTechnicalDetail('Error: données résiduelles à 6', tr))
      .toBe('données résiduelles à 6')
    expect(formatTechnicalDetail('RangeError: index 7 hors de [0, 4]', tr))
      .toBe('index 7 hors de [0, 4]')
  })

  it('laisse intact ce qui n’est pas préfixé', () => {
    expect(formatTechnicalDetail('transaction avortée', tr)).toBe('transaction avortée')
    expect(formatTechnicalDetail(42, tr)).toBe('42')
  })

  it('rend une phrase plutôt que le vide : une ligne ouverte sur rien est une porte sur un mur', () => {
    expect(formatTechnicalDetail(new Error(''), tr)).toBe('la panne n’a laissé aucun message')
    expect(formatTechnicalDetail('Error:', tr)).toBe('la panne n’a laissé aucun message')
  })

  it('et cette phrase-là suit la langue du pilote', () => {
    // C'est la moitié qui compte : le détail technique n'est pas traduisible, la phrase
    // qui le remplace quand il n'y en a pas l'est.
    const dutch = makeTranslator('nl', dutchMessages)
    expect(formatTechnicalDetail(new Error(''), dutch))
      .toBe('de storing heeft geen bericht nagelaten')
    expect(formatTechnicalDetail(new Error('reste 6'), dutch)).toBe('reste 6')
  })

  it('la moitié sans langue rend le vide, pour les couches qui rangent le détail', () => {
    // `src/library/` n'a pas de traducteur : elle range `''` et l'écran comble.
    expect(technicalDetail(new Error(''))).toBe('')
    expect(technicalDetail(new Error('reste 6'))).toBe('reste 6')
  })

  it('c’est ce qu’un fichier illisible dépose dans le conteneur', async () => {
    // Le chemin réel : un `.png` déposé sur la page. `openContainer` garde les octets et
    // ne retient de la panne que ce qui se recopie dans un rapport de problème.
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const container = await openContainer(png, 'photo.png')
    expect(container.parseError).toBeDefined()
    expect(container.parseError).not.toContain('Error')
    // Les octets, eux, ressortent tels quels — c'est la promesse de l'écran d'erreur.
    expect(container.source).toEqual(png)
  })
})
