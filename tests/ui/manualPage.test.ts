import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildManualPage, layOutColumns } from '../../src/ui/manualPage'
import { loadTranslator } from '../../src/i18n'
import { UI_LANGUAGES, type UiLanguage } from '../../src/i18n/languages'

/**
 * La page du manuel : sa largeur, et son sommaire.
 *
 * Trois choses ont été demandées ensemble, et une seule mise en page les règle : la page
 * prend la largeur de l'éditeur, la place gagnée sert à un sommaire latéral collant, et le
 * manuel reste **un seul document** — ce dernier point étant le seul qui ne se voie pas à
 * l'écran, et donc celui qu'un test doit tenir.
 *
 * Ce qui est vérifié ici, et pourquoi :
 *
 * 1. **le fil devient trois boîtes, sans perdre un nœud** — le déplacement se fait sur
 *    l'arbre, à l'ouverture, et non dans les cinq fichiers HTML : une erreur d'index y
 *    escamoterait un chapitre entier sans rien casser d'autre ;
 * 2. **l'avertissement sur les données personnelles reste le premier bloc** — c'est ce que
 *    `tests/docs/manuels.test.ts` exige de la SOURCE, et le repli en une colonne suit
 *    l'ordre du document : rangé après le sommaire, il passerait sous treize liens sur le
 *    téléphone d'un pilote au décollage ;
 * 3. **le sommaire garde ses treize liens et ses ancres**, qui sont les mêmes identifiants
 *    dans les cinq langues ;
 * 4. **la pastille de retour existe et vise le sommaire** — c'est elle qui rend le
 *    sommaire atteignable quand la colonne se replie ;
 * 5. **un fragment sans sommaire s'affiche quand même**, en un seul fil ;
 * 6. **la feuille de style tient les mesures arrêtées** : 232 px de colonne, 34 px
 *    d'écart, 640 px de texte, aucune largeur portée par la page elle-même. Ni happy-dom
 *    ni jsdom ne calculent la cascade d'une feuille externe — comme pour `app.css`, le
 *    seul contrôle automatisable est la relecture de la règle.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const css = readFileSync(path.join(here, '../../docs-app/manuel.css'), 'utf8')

/**
 * Le corps de la règle nommée, accolades comprises.
 *
 * `from` sert aux sélecteurs qui paraissent deux fois — `.manual__side` est d'abord un
 * bloc du fil, puis une colonne dans la requête de média. Sans lui, `indexOf` rendrait
 * toujours le premier, et le test passerait au vert en lisant la mauvaise règle.
 */
function rule(selector: string, from = 0): string {
  const start = css.indexOf(`${selector} {`, from)
  expect(start, `règle absente : ${selector}`).toBeGreaterThan(-1)
  return css.slice(start, css.indexOf('}', start) + 1)
}

/** Le début de la requête de média qui met le manuel en deux colonnes. */
const WIDE = css.indexOf('@media (min-width: 64rem)')

/** La page construite pour une langue, telle que `main.ts` la recevrait. */
async function page(language: UiLanguage): Promise<HTMLElement> {
  const tr = await loadTranslator(language)
  return await buildManualPage(tr, () => {})
}

describe('la page du manuel — deux colonnes à partir d’un seul fil', () => {
  it('range le fragment en trois boîtes, dans l’ordre du document', async () => {
    const cols = (await page('fr')).querySelector('.manual__cols')
    expect(cols).not.toBeNull()
    expect([...(cols?.children ?? [])].map((box) => box.className)).toEqual([
      'manual__lead', 'manual__side', 'manual__text'
    ])
  })

  it('garde l’avertissement sur les données personnelles en tête', async () => {
    const built = await page('fr')
    // Un seul encadré dans l'en-tête : celui qui précède le sommaire dans le fragment.
    expect(built.querySelectorAll('.manual__lead .manual__warning')).toHaveLength(1)
    // Il est DÉPLACÉ, pas recopié : les autres avertissements du manuel restent au fil
    // de leurs chapitres, et celui-là n'y apparaît pas une seconde fois.
    const all = built.querySelectorAll('.manual__warning').length
    const inText = built.querySelectorAll('.manual__text .manual__warning').length
    expect(all).toBe(inText + 1)
  })

  it('ne perd aucun chapitre en déplaçant les nœuds', async () => {
    const built = await page('fr')
    const toc = built.querySelector('.manual__toc h2')
    expect(toc).not.toBeNull()
    expect(built.querySelectorAll('.manual__text h2[id]')).toHaveLength(13)
    // La racine ne porte plus qu'une boîte : rien n'est resté à côté des trois colonnes.
    expect(built.querySelectorAll('.manual > *')).toHaveLength(1)
    // Aucun titre de chapitre n'est resté hors de la colonne de texte. Le seul autre
    // `h2` à porter un `id` est le titre du sommaire, que la page nomme elle-même.
    const strays = [...built.querySelectorAll('.manual h2[id]')]
      .filter((heading) => heading.parentElement?.className !== 'manual__text')
      .map((heading) => heading.id)
    expect(strays).toEqual([toc?.id])
  })

  it('met le sommaire dans la colonne, avec ses treize liens', async () => {
    const built = await page('fr')
    const toc = built.querySelector('.manual__side .manual__toc')
    expect(toc).not.toBeNull()
    expect(toc?.querySelectorAll('a[href^="#"]')).toHaveLength(13)
    // Chaque lien vise un chapitre qui est bien dans la page.
    for (const link of toc?.querySelectorAll('a[href^="#"]') ?? []) {
      const target = (link.getAttribute('href') ?? '').slice(1)
      expect(built.querySelector(`#${target}`), `#${target}`).not.toBeNull()
    }
  })

  it('nomme la région de navigation par son propre titre', async () => {
    // Sans ce lien, un lecteur d'écran annonce « navigation » sans dire laquelle — et il y
    // en a plusieurs dans l'application.
    const toc = (await page('fr')).querySelector('.manual__toc')
    const labelledBy = toc?.getAttribute('aria-labelledby')
    expect(labelledBy).not.toBeNull()
    expect(toc?.querySelector(`#${labelledBy ?? ''}`)?.tagName).toBe('H2')
  })

  it('offre une pastille qui ramène au sommaire', async () => {
    const built = await page('fr')
    const jump = built.querySelector('.manual-page__jump')
    expect(jump?.textContent).toBe('Sommaire')
    // Elle vise l'ancre que la page pose sur le sommaire, et rien d'autre.
    const target = (jump?.getAttribute('href') ?? '').slice(1)
    expect(built.querySelector('.manual__toc')?.id).toBe(target)
    // Hors de `.manual`, sans quoi elle hériterait du soulignement des liens du texte.
    expect(built.querySelector('.manual .manual-page__jump')).toBeNull()
  })

  it('range les cinq langues de la même façon', async () => {
    for (const language of UI_LANGUAGES) {
      const built = await page(language)
      expect(built.querySelector('.manual__cols'), language).not.toBeNull()
      expect(built.querySelectorAll('.manual__side .manual__toc a'), language)
        .toHaveLength(13)
      expect(built.querySelectorAll('.manual__text h2[id]'), language).toHaveLength(13)
      // La pastille parle la langue du pilote — et pas la même phrase dans deux langues.
      expect(built.querySelector('.manual-page__jump')?.textContent, language)
        .toBeTruthy()
    }
  })

  it('donne aux cinq langues les mêmes ancres, dans le même ordre', async () => {
    const anchors = async (language: UiLanguage): Promise<string[]> =>
      [...(await page(language)).querySelectorAll('.manual__text h2[id]')].map((h) => h.id)
    const reference = await anchors('fr')
    for (const language of UI_LANGUAGES) {
      expect(await anchors(language), language).toEqual(reference)
    }
  })
})

describe('la page du manuel — un fragment sans sommaire', () => {
  /**
   * Le repli. Aucun des cinq manuels n'est dans ce cas aujourd'hui ; le jour où l'un le
   * sera — une langue en cours d'écriture, un chapitre unique —, il doit s'afficher tel
   * quel plutôt que de faire échouer l'ouverture de l'aide.
   */
  it('affiche le manuel en un seul fil, sans rien déplacer', () => {
    const root = document.createElement('div')
    root.className = 'manual'
    const title = document.createElement('h2')
    title.id = 'm-seul'
    title.textContent = 'Seul'
    root.append(title, document.createElement('p'))

    expect(layOutColumns(root)).toBeUndefined()
    expect(root.querySelector('.manual__cols')).toBeNull()
    // Rien n'a bougé : le chapitre est toujours là, au même endroit.
    expect(root.firstElementChild).toBe(title)
    expect(root.querySelectorAll('h2[id]')).toHaveLength(1)
  })
})

describe('manuel.css — la largeur, et la colonne du sommaire', () => {
  it('ne borne plus la page : la largeur est celle de `.content` de l’éditeur', () => {
    // C'est TOUT le correctif de largeur. `.manual-page { max-width: 52rem }` faisait du
    // manuel une colonne de 832 px au milieu d'un éditeur de 1180 px.
    const box = rule('.manual-page')
    expect(box).not.toContain('max-width')
    // Ni rembourrage latéral : `.content` en pose déjà, et le doubler rétrécirait.
    expect(box).toContain('padding: 0 0 4rem;')
  })

  it('tient les trois mesures de la maquette validée', () => {
    const cols = rule('.manual__cols')
    // 232 px de colonne, 34 px d'écart, 640 px de texte — en rem, pour suivre la taille
    // de police du navigateur.
    expect(cols).toContain('grid-template-columns: 14.5rem minmax(0, 1fr);')
    expect(cols).toContain('column-gap: 2.125rem;')
    expect(css).toMatch(/\.manual__lead,\s*\n\.manual__text,\s*\n\.manual__side \{[^}]*max-width: 40rem;/)
  })

  it('colle le sommaire sous la barre de tête, sans passer dessous', () => {
    // `.manual__side` paraît trois fois : la mesure du fil, le placement dans la grille,
    // puis la colonne collante. On part d'après le placement pour lire la bonne.
    const side = rule('.manual__side', css.indexOf('grid-row: 1 / span 2;'))
    expect(side).toContain('position: sticky;')
    // 4,5 rem = 72 px : la barre de tête est collante et haute de 56 px.
    expect(side).toContain('top: 4.5rem;')
    // Fenêtre courte : la colonne défile pour son compte plutôt que de déborder.
    expect(side).toContain('overflow-y: auto;')
    expect(side).toContain('max-height: calc(100vh - 6rem);')
  })

  it('donne aux chapitres la marge de défilement de cette même barre', () => {
    // Sans elle, un chapitre atteint depuis le sommaire arrive DERRIÈRE la barre.
    expect(rule('.manual h2')).toContain('scroll-margin-top: 4.5rem;')
    expect(rule('.manual__toc')).toContain('scroll-margin-top: 4.5rem;')
  })

  it('écrit la colonne comme un enrichissement, pas comme un état à défaire', () => {
    // Une colonne d'abord, deux ensuite : le repli est l'état de base, donc aucune règle
    // du téléphone n'a à annuler une règle du grand écran.
    expect(WIDE, 'la mise en colonnes n’est plus sous une requête de média')
      .toBeGreaterThan(-1)
    expect(css.indexOf('.manual__cols'), 'la grille est posée hors de la requête')
      .toBeGreaterThan(WIDE)
    // Et la pastille de retour est visible par défaut, masquée seulement en grand.
    expect(rule('.manual-page__jump')).toContain('display: inline-flex;')
    expect(css.slice(WIDE)).toContain('.manual-page__jump { display: none; }')
  })

  it('marque le chapitre courant sans introduire de couleur nouvelle', () => {
    // La feuille n'admet qu'une teinte, l'ambre des avertissements. Le filet la reprend
    // par sa variable ; toute valeur écrite en dur ferait de ce fichier l'exception.
    const current = css.slice(css.indexOf(".manual__toc li:has(> a[aria-current='location'])"))
    expect(current).toContain('background: var(--app-flag-line);')
    expect(rule(".manual__toc a[aria-current='location']")).toContain('font-weight: 600;')
  })
})
