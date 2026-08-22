import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { UI_LANGUAGES, type UiLanguage } from '../../src/i18n/languages'

/**
 * Le manuel d'utilisation existe dans les cinq langues de `src/i18n/`, et le `README.md`
 * du dépôt aussi. Ces tests gardent ce que **la traduction fait perdre en silence**.
 *
 * Une traduction ne casse pas la compilation : elle dérive. Un chapitre sauté, une ancre
 * traduite, un sommaire qui pointe dans le vide, l'avertissement sur les données
 * personnelles descendu sous le sommaire « parce que ça se lit mieux » — rien de tout
 * cela n'échoue nulle part, et personne ne relit cinq fichiers de mille lignes à chaque
 * changement d'écran. D'où ces contrôles-ci, qui sont exactement ceux qu'un humain ne
 * refera pas.
 *
 * Ce qui est vérifié, et pourquoi :
 *
 * 1. **les cinq fichiers existent** — le repli du chargeur est le français, donc un
 *    manuel manquant ne se voit pas à l'écran : le pilote lit simplement du français ;
 * 2. **les `id` d'ancre sont identiques d'une langue à l'autre** — ce sont des
 *    identifiants, pas de la prose, et un lien profond doit marcher dans les cinq ;
 * 3. **le sommaire ne pointe nulle part ailleurs que sur ces ancres** ;
 * 4. **le fragment reste un fragment** — ni `<html>`, ni `<head>`, ni `<body>`, et il
 *    commence à `<h2>` parce que la modale porte le `<h1>` ;
 * 5. **aucune classe inventée** — la feuille de style est partagée par les cinq, une
 *    classe qui n'y est pas ne s'affiche pas ;
 * 6. **l'avertissement sur les données personnelles est avant le sommaire**, dans les
 *    cinq langues. C'est la seule chose que ce manuel doit dire même à qui ne le lira
 *    pas ;
 * 7. **l'adresse des issues GitHub est présente** dans chaque manuel et dans chaque
 *    README — c'est ce qui a été demandé, et c'est le seul chemin de retour du projet.
 *
 * Ce qui n'est **pas** vérifié ici : la justesse de la traduction. Aucun test ne la
 * voit. Elle se relit, et le vocabulaire arrêté est épinglé ailleurs, dans
 * `tests/i18n/catalog.test.ts`.
 */

/** Le texte des cinq manuels, lu tel quel : on l'inspecte, on ne l'exécute pas. */
const MANUALS = import.meta.glob<string>('../../docs-app/manuel.*.html', {
  eager: true,
  query: '?raw',
  import: 'default'
})

/** Les cinq README du dépôt. Le français est `README.md`, les autres `README.<langue>.md`. */
const READMES = import.meta.glob<string>('../../README*.md', {
  eager: true,
  query: '?raw',
  import: 'default'
})

const ISSUES_URL = 'https://github.com/frederict/xcfg-editor/issues'

/**
 * Le fragment **sans son commentaire d'en-tête**.
 *
 * L'en-tête explique justement que le fichier ne porte ni `<html>`, ni `<head>`, ni
 * `<body>` : le laisser en place ferait échouer le contrôle qu'il décrit. Les cinq
 * langues portent un en-tête de ce genre, et lui seul.
 */
function manual(language: UiLanguage): string {
  const source = MANUALS[`../../docs-app/manuel.${language}.html`]
  if (source === undefined) {
    throw new Error(`docs-app/manuel.${language}.html manque`)
  }
  return source.replaceAll(/<!--[\s\S]*?-->/g, '')
}

function readme(language: UiLanguage): string {
  const path = language === 'fr' ? '../../README.md' : `../../README.${language}.md`
  const source = READMES[path]
  if (source === undefined) throw new Error(`${path.slice(6)} manque`)
  return source
}

/** Les `id` des `<h2>`, dans l'ordre du document. */
function anchors(source: string): string[] {
  return [...source.matchAll(/<h2\s+id="([^"]+)"/g)].map((match) => match[1] ?? '')
}

/** Les cibles internes des liens du sommaire. */
function tocTargets(source: string): string[] {
  return [...source.matchAll(/href="#([^"]+)"/g)].map((match) => match[1] ?? '')
}

/** Les classes `manual*` employées par le fragment. */
function manualClasses(source: string): Set<string> {
  const found = new Set<string>()
  for (const match of source.matchAll(/class="([^"]*)"/g)) {
    for (const name of (match[1] ?? '').split(/\s+/)) {
      if (name.startsWith('manual')) found.add(name)
    }
  }
  return found
}

describe('le manuel dans les cinq langues', () => {
  it('existe pour chacune des cinq langues de l’interface', () => {
    for (const language of UI_LANGUAGES) {
      expect(() => manual(language), `manuel.${language}.html`).not.toThrow()
    }
  })

  it('porte les treize chapitres et le sommaire, dans les cinq langues', () => {
    const reference = anchors(manual('fr'))
    // Le sommaire est un `<h2>` sans `id` : les treize autres en ont un.
    expect(reference).toHaveLength(13)
    for (const language of UI_LANGUAGES) {
      expect(anchors(manual(language)), `manuel.${language}.html`).toEqual(reference)
    }
  })

  it('garde les mêmes ancres — ce sont des identifiants, pas de la prose', () => {
    // Écrit à part de l'égalité ci-dessus pour que l'échec nomme le vrai reproche : une
    // ancre traduite casse tout lien profond venu d'ailleurs, pas seulement le sommaire.
    for (const language of UI_LANGUAGES) {
      for (const anchor of anchors(manual(language))) {
        expect(anchor, `manuel.${language}.html`).toMatch(/^m-[a-z]+$/)
      }
    }
  })

  it('n’a aucun lien de sommaire qui pointe dans le vide', () => {
    for (const language of UI_LANGUAGES) {
      const source = manual(language)
      const known = new Set(anchors(source))
      for (const target of tocTargets(source)) {
        expect(known.has(target), `manuel.${language}.html → #${target}`).toBe(true)
      }
    }
  })

  it('reste un fragment, et commence à h2', () => {
    for (const language of UI_LANGUAGES) {
      const source = manual(language)
      expect(source, `manuel.${language}.html`).not.toMatch(/<\/?(?:html|head|body)\b/)
      expect(source, `manuel.${language}.html`).not.toMatch(/<h1\b/)
      // La racine du fragment porte elle-même la classe de la feuille de style.
      expect(source, `manuel.${language}.html`).toMatch(/<div class="manual">/)
    }
  })

  it('n’invente aucune classe hors de la feuille de style partagée', () => {
    const allowed = manualClasses(manual('fr'))
    for (const language of UI_LANGUAGES) {
      for (const name of manualClasses(manual(language))) {
        expect(allowed.has(name), `manuel.${language}.html → .${name}`).toBe(true)
      }
    }
  })

  /**
   * Les figures du manuel, et le seul répertoire qui les publie.
   *
   * Le fragment est importé **en `?raw`** : Vite ne le regarde pas et ne réécrit aucune
   * URL. Une image rangée à côté du fragment, ou dans `captures/`, ne serait donc jamais
   * copiée dans `dist/` — mesuré : `vite build` n'émet qu'`index.html` et `assets/`. Le
   * manuel montrerait deux cadres cassés **en production, et seulement là**, ce qui est la
   * panne qu'aucune relecture n'attrape.
   *
   * D'où `public/`, le seul répertoire que Vite recopie tel quel, et d'où ce test : il
   * échoue le jour où une figure est déplacée, renommée, ou ajoutée sans son fichier.
   */
  it('ne montre que des figures publiées par `public/`, dans les cinq langues', () => {
    const missing: string[] = []
    for (const language of UI_LANGUAGES) {
      for (const match of manual(language).matchAll(/<img[^>]+src="([^"]+)"/g)) {
        const src = match[1] ?? ''
        expect(src.startsWith('manuel/'), `manuel.${language}.html → ${src}`).toBe(true)
        // `process.cwd()` est la racine du dépôt : Vitest s'y lance, et c'est aussi
        // depuis là que `vite build` recopie `public/`.
        if (!existsSync(resolve(process.cwd(), 'public', src))) missing.push(src)
      }
    }
    expect(missing, 'figures citées sans fichier dans public/').toEqual([])
  })

  /**
   * Une figure française dans le manuel allemand serait un mensonge illustré : le lecteur
   * y chercherait des mots qui ne sont nulle part à son écran. Les dix fichiers existent,
   * un par langue et par figure ; ce test dit que chaque manuel prend les siens.
   */
  it('prend la figure de SA langue, et le même nombre partout', () => {
    const reference = [...manual('fr').matchAll(/<img[^>]+src="manuel\/([^".]+)\./g)]
      .map((match) => match[1] ?? '')
    expect(reference.length, 'le manuel français a perdu ses figures').toBeGreaterThan(0)
    for (const language of UI_LANGUAGES) {
      const names = [...manual(language).matchAll(/<img[^>]+src="manuel\/([^".]+)\.([a-z]{2})\.png"/g)]
      expect(names.map((m) => m[1]), `manuel.${language}.html : figures`).toEqual(reference)
      for (const [, name, tag] of names) {
        expect(tag, `manuel.${language}.html → ${name}`).toBe(language)
      }
    }
  })

  it('dit les données personnelles AVANT le sommaire, dans les cinq langues', () => {
    for (const language of UI_LANGUAGES) {
      const source = manual(language)
      const warning = source.indexOf('manual__warning')
      const toc = source.indexOf('manual__toc')
      expect(warning, `manuel.${language}.html : aucun encadré d’avertissement`)
        .toBeGreaterThan(-1)
      expect(warning, `manuel.${language}.html : l’avertissement est passé sous le sommaire`)
        .toBeLessThan(toc)
    }
  })

  it('donne l’adresse des issues GitHub dans son dernier chapitre', () => {
    for (const language of UI_LANGUAGES) {
      const source = manual(language)
      expect(source, `manuel.${language}.html`).toContain(ISSUES_URL)
      // Dans le chapitre 13, pas ailleurs : c'est là que le lecteur la cherchera.
      expect(source.indexOf(ISSUES_URL), `manuel.${language}.html`)
        .toBeGreaterThan(source.indexOf('id="m-avis"'))
    }
  })
})

describe('le README dans les cinq langues', () => {
  it('existe pour chacune des cinq langues', () => {
    for (const language of UI_LANGUAGES) {
      expect(() => readme(language), `README ${language}`).not.toThrow()
    }
  })

  it('mène aux quatre autres langues depuis chaque langue', () => {
    for (const language of UI_LANGUAGES) {
      const source = readme(language)
      for (const other of UI_LANGUAGES) {
        if (other === language) continue
        const link = other === 'fr' ? '(README.md)' : `(README.${other}.md)`
        expect(source, `README ${language} → ${other}`).toContain(link)
      }
    }
  })

  it('invite aux retours GitHub, dans les cinq langues', () => {
    for (const language of UI_LANGUAGES) {
      expect(readme(language), `README ${language}`).toContain(ISSUES_URL)
    }
  })

  /**
   * Les sept écrans, et lesquels sont traduits.
   *
   * **Six existent en cinq exemplaires** — `<nom>.<langue>.png` — parce que le texte y est
   * le sujet : un panneau de réglages, une boîte de choix, le manuel. Chaque README montre
   * les siens ; montrer une capture française à un lecteur allemand ferait de l'image un
   * mensonge illustré, ce qu'aucun autre test ne verrait.
   *
   * **`editeur-paysage.png` n'en a qu'un.** Son sujet est une page dessinée, une règle
   * graduée et la plaque qui la porte : la même géométrie dans les cinq langues. Les cinq
   * légendes le disent au lecteur — c'est cette phrase-là, et non le fichier, qui empêche
   * qu'on la prenne pour un oubli.
   */
  const LOCALISED_SHOTS = [
    'panneau-gadget',
    'reglages-generaux',
    'version-et-nettoyage',
    'enregistrer-et-partager',
    'bibliotheque',
    'manuel'
  ]

  it('montre les sept captures, chacune dans la langue de son README', () => {
    for (const language of UI_LANGUAGES) {
      const source = readme(language)
      expect(source, `README ${language} → editeur-paysage`).toContain(
        'captures/editeur-paysage.png'
      )
      for (const shot of LOCALISED_SHOTS) {
        expect(source, `README ${language} → ${shot}`).toContain(
          `captures/${shot}.${language}.png`
        )
      }
    }
  })

  it('ne montre pas la capture d’une autre langue', () => {
    for (const language of UI_LANGUAGES) {
      const source = readme(language)
      for (const shot of LOCALISED_SHOTS) {
        for (const other of UI_LANGUAGES) {
          if (other === language) continue
          expect(source, `README ${language} → ${shot}.${other}`).not.toContain(
            `captures/${shot}.${other}.png`
          )
        }
      }
    }
  })

  it('ne recopie pas les recettes de capture hors du README français', () => {
    // Elles s'adressent à qui refait l'image, elles sont en français, et cinq copies
    // dériveraient. Une recette traduite serait une recette qui ment sur l'écran.
    for (const language of UI_LANGUAGES) {
      if (language === 'fr') continue
      expect(readme(language), `README ${language}`).not.toContain('REFAIRE CETTE CAPTURE')
    }
  })
})
