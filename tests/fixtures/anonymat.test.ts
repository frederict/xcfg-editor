import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { readLayout } from '../../src/model/layout'
import { findFreeTexts } from '../../src/model/scope'
import { readZip } from '../../src/core/zip'
import { ARCHIVE, EXPORTS, FORMES, NOMS_EXPORTS } from './paths'

/**
 * Ce que les fixtures ne doivent pas porter.
 *
 * ## Pourquoi ce test existe
 *
 * Les fichiers de `exports/` sont **dérivés des configurations de vol réelles du
 * propriétaire** (`deriver-exemples.py`). C'est ce qui leur donne leur valeur — 105
 * widgets, 41 classes, un `layout` de 50 ko qu'aucun fichier écrit à la main n'égalerait
 * — et c'est aussi ce qui fait peser un risque : une valeur personnelle oubliée
 * deviendrait publique au premier `git push`, et le resterait dans l'historique.
 *
 * Le script de dérivation contrôle déjà ce qu'il produit. Il ne tourne que sur le poste
 * du propriétaire, une fois. Ce test-ci contrôle ce qui est **versionné**, à chaque
 * exécution de la suite, y compris chez quelqu'un qui n'a jamais vu les fichiers réels.
 *
 * ## Pourquoi il ne cherche pas le nom du propriétaire
 *
 * Un test qui vérifie l'absence de « Prénom Nom » devrait écrire ce nom pour le chercher
 * — et le publierait donc lui-même. Il ne protégerait par ailleurs que contre la fuite
 * qu'on avait déjà en tête. On contrôle donc des **formes** : des textes libres, des
 * coordonnées, un numéro de téléphone, une adresse électronique. Une identité qu'on
 * n'aurait pas anticipée tombe alors dans le filet des textes libres.
 */

const lireExport = (nom: string): string => readFileSync(EXPORTS + nom, 'utf8')

describe('les fixtures ne portent aucun texte écrit par un pilote', () => {
  it('le corpus versionné est bien celui qu’on croit', () => {
    // Sans cette borne, tout ce qui suit resterait vert sur un répertoire vidé.
    expect(readdirSync(EXPORTS).filter((f) => f.endsWith('.xcfg')).sort())
      .toEqual([...NOMS_EXPORTS])
    expect(readdirSync(EXPORTS).filter((f) => f.endsWith('.xczfg'))).toHaveLength(1)
  })

  for (const nom of NOMS_EXPORTS) {
    it(`${nom} : l’inventaire des textes libres de son layout est vide`, () => {
      // On se sert de l'inventaire du produit lui-même (`findFreeTexts`), qui descend
      // dans les objets imbriqués et connaît les six clés porteuses de texte libre —
      // dont `contact/fullName` et `contact/phoneNumber` d'un `WButtonPhone`, la donnée
      // la plus sensible qu'un `layout` puisse porter.
      expect(findFreeTexts(readLayout(parseJson(lireExport(nom))))).toEqual([])
    })
  }

  it('un export « pages » n’est pas réputé sûr parce qu’il est un « pages »', () => {
    // Correction d'une erreur longtemps répétée dans ce projet : le format d'export ne
    // décide de rien pour le `layout`. Un `pages` porte les mêmes six clés de texte
    // libre qu'un `backup`. Le contrôle ci-dessus vaut donc pour les cinq fichiers, et
    // le contrôle ci-dessous porte sur le texte intégral, sans égard pour le format.
    const pages = lireExport('2026-08-20_pages-00.xcfg')
    expect(pages).toContain('"exportType": "pages"')
    expect(pages).toContain('titletext')
    expect(pages).not.toMatch(/"titletext": "[^"]/)
  })
})

describe('les fixtures ne portent ni lieu, ni numéro, ni adresse', () => {
  /**
   * Les coordonnées inventées de `Navigation.State` se reconnaissent à leur expansion
   * décimale construite sur un ou deux chiffres répétés (`45.222222222222221`). Une
   * coordonnée réelle en a bien davantage. Le contrôle porte sur **toute** valeur à
   * décimales longues, quelle que soit sa clé : trier par nom de clé raterait
   * `altSmoothed`, ou la clé qu'une version future de XCTrack ajoutera.
   *
   * ⚠️ **Trois décimales, pas six**, et le seuil compte plus qu'il n'en a l'air. Le filet
   * a commencé à `\d{6,}` et ne voyait donc rien en dessous : mesuré, un domicile réel
   * écrit `"homeLat": 50.8467` — **quatre** décimales, environ onze mètres, le bâtiment —
   * passait les vingt-deux tests de ce fichier sans un mot. C'est exactement la précision
   * qui, dit `CLAUDE.md`, a déjà coûté une purge d'historique. Cinq décimales font un
   * mètre.
   *
   * Le seuil descend donc à trois, et rien n'est perdu : c'est l'heuristique du dessous —
   * `decimales.size > 2` — qui distingue une coordonnée fabriquée d'une vraie, pas la
   * longueur. Aucune fixture ne portait de valeur à trois, quatre ou cinq décimales le
   * jour de la correction ; le filet est resserré **avant** que quelqu'un en ajoute une,
   * ce qui est le seul moment où cela ne coûte rien.
   */
  const DECIMALES_LONGUES = /"([^"]+)": (-?\d+\.\d{3,})/g

  /**
   * Deux réglages du traitement du signal, relevés dans les fichiers réels et conservés
   * tels quels : le poids d'un filtre passe-bas du vario, et le seuil de détection du
   * décollage (1.388889 m/s = 5 km/h). Ni lieu, ni identifiant.
   */
  const SANS_LIEU = new Set(['lpWeight', 'TakeoffSpeed'])

  const TELEPHONE = /(?:\+\d[\d ().-]{7,}|\b0\d(?:[ .-]?\d\d){4}\b)/
  const COURRIEL = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i

  const tousLesFichiers = (): Array<[string, string]> => [
    ...NOMS_EXPORTS.map((nom): [string, string] => [nom, lireExport(nom)]),
    ...readdirSync(FORMES).map((nom): [string, string] => [nom, readFileSync(FORMES + nom, 'utf8')])
  ]

  for (const [nom, texte] of tousLesFichiers()) {
    it(`${nom} : aucune valeur d’allure géographique`, () => {
      const suspectes: string[] = []
      for (const [, cle, brut] of texte.matchAll(DECIMALES_LONGUES)) {
        if (SANS_LIEU.has(cle!)) continue
        const decimales = new Set(brut!.split('.')[1]!)
        if (decimales.size > 2) suspectes.push(`${cle} = ${brut}`)
      }
      expect(suspectes).toEqual([])
    })

    /**
     * ⚠️ **Le témoin.** Les deux contrôles voisins sont des assertions négatives : sur un
     * fichier propre, ils sont verts en ne regardant rien, et ils resteraient verts si le
     * filet cessait de mordre. Celui-ci plante dans le texte un domicile réel à quatre
     * décimales — la valeur exacte qui traversait le filet à six — et exige qu'il soit
     * signalé. Il est refait sur **chaque** fixture : c'est le fichier qui est examiné, pas
     * seulement la constante.
     */
    it(`${nom} : le filet mord bien sur un domicile à quatre décimales`, () => {
      const pique = texte.replace('"preferences": {',
        '"preferences": {\n    "homeLat": 50.8467,\n    "homeLon": 4.3524,')
      // Sans point d'insertion — un fichier `pages` n'a pas de bloc `preferences` — on
      // pique en tête : ce qui compte est le balayage du texte, pas sa structure.
      const essai = pique === texte ? `"homeLat": 50.8467,\n${texte}` : pique

      const suspectes: string[] = []
      for (const [, cle, brut] of essai.matchAll(DECIMALES_LONGUES)) {
        if (SANS_LIEU.has(cle!)) continue
        if (new Set(brut!.split('.')[1]!).size > 2) suspectes.push(`${cle} = ${brut}`)
      }
      expect(suspectes).toContain('homeLat = 50.8467')
    })

    it(`${nom} : ni numéro de téléphone ni adresse électronique`, () => {
      // `formes-preservees.xcfg` porte volontairement un `WButtonPhone` renseigné : c'est
      // le seul fichier qui exerce cette clé, et son numéro est celui que les opérateurs
      // réservent aux exemples. Il est donc attendu, et lui seul.
      const attendu = nom === 'formes-preservees.xcfg' ? '+32 470 00 00 00' : ''
      expect(texte.replace(attendu, '')).not.toMatch(TELEPHONE)
      expect(texte).not.toMatch(COURRIEL)
    })
  }
})

describe('l’archive versionnée n’enferme rien d’autre que sa fixture', () => {
  it('ne contient que backup.xcfg, identique au fichier voisin', async () => {
    // Une archive est opaque à `git grep` : ce qu'elle enferme échappe à tout contrôle
    // textuel sur le dépôt. On la déplie donc pour la soumettre au même examen.
    const entries = await readZip(new Uint8Array(readFileSync(ARCHIVE)))
    expect(entries.map((e) => e.name)).toEqual(['backup.xcfg'])
    const dedans = new TextDecoder().decode(entries[0]!.data)
    expect(dedans).toBe(lireExport('backup.xcfg'))
    expect(findFreeTexts(readLayout(parseJson(dedans)))).toEqual([])
  })
})
