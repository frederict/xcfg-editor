import { describe, expect, it } from 'vitest'

import { openContainer } from '../../src/core/container'
import { formatTechnicalDetail } from '../../src/core/technicalDetail'

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
    expect(formatTechnicalDetail(new Error('données résiduelles à 6')))
      .toBe('données résiduelles à 6')
    expect(formatTechnicalDetail(new TypeError('x n’est pas une fonction')))
      .toBe('x n’est pas une fonction')
  })

  it('ôte le préfixe même quand la panne arrive déjà en chaîne', () => {
    expect(formatTechnicalDetail('Error: données résiduelles à 6'))
      .toBe('données résiduelles à 6')
    expect(formatTechnicalDetail('RangeError: index 7 hors de [0, 4]'))
      .toBe('index 7 hors de [0, 4]')
  })

  it('laisse intact ce qui n’est pas préfixé', () => {
    expect(formatTechnicalDetail('transaction avortée')).toBe('transaction avortée')
    expect(formatTechnicalDetail(42)).toBe('42')
  })

  it('rend une phrase plutôt que le vide : une ligne ouverte sur rien est une porte sur un mur', () => {
    expect(formatTechnicalDetail(new Error(''))).toBe('la panne n’a laissé aucun message')
    expect(formatTechnicalDetail('Error:')).toBe('la panne n’a laissé aucun message')
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
