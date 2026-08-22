import rawMigrations from './legacyMigrations.json'
import { tierInRange } from './widgetVersions'

/**
 * **Ce que devient un réglage périmé quand l'instrument le lit — et ce que son retrait
 * changerait.** Un relevé, pas un modèle.
 *
 * ## Le fait qui a rendu cette table nécessaire
 *
 * L'éditeur a longtemps écrit, au-dessus de son nettoyage, que « XCTrack les transporte
 * sans les lire » et que « les enlever allège le fichier, c'est tout ». **Les deux
 * moitiés sont fausses**, et la validation du 22 août 2026 l'a mesuré sur un AIR³ 7.2 :
 * trois `WCompass` ne différant que par `showWind`, importés puis relus par l'appareil,
 * ressortent `windStyle: NONE` quand le réglage est absent, `NONE` quand il vaut `false`,
 * et **`ARROW` quand il vaut `true`**. Enlever `showWind: true` fait donc disparaître la
 * flèche de vent de l'instrument.
 *
 * Le mécanisme est celui-ci, et il n'a rien d'un oubli de XCTrack :
 *
 * 1. XCTrack **garde** le texte d'une page tant qu'il ne l'a pas instanciée — c'est
 *    pourquoi un fichier de 2026 traîne encore des réglages de 2022 sur ses pages
 *    portrait, qu'un appareil tenu en paysage n'affiche jamais ;
 * 2. **à la première lecture**, il les consomme : il en dérive le réglage d'aujourd'hui
 *    (`showWind` → `windStyle`, `nav_use_brackets` → `nav_label`,
 *    `mapWidget_show*` → `mapWidget_mapAppearance`) puis les efface de ce qu'il réécrit ;
 * 3. il n'y a donc **qu'un seul état du monde** où le nettoyage peut proposer quoi que ce
 *    soit : celui où l'instrument **n'a pas encore lu** ces réglages. Un fichier déjà
 *    migré ne les porte plus.
 *
 * Autrement dit : là où l'outil mord, le réglage n'est **pas** mort — il est la dernière
 * entrée dont l'instrument se servira. « Périmé » veut dire « remplacé depuis », jamais
 * « sans effet ».
 *
 * ## Un cas est un couple d'observations, jamais une valeur seule
 *
 * Pour chaque *cas* la table porte **deux mesures prises sur la même planche** et rien
 * d'autre :
 *
 * - `present` — ce que l'appareil a écrit dans le réglage successeur **avec** le réglage ;
 * - `absent` — ce qu'il écrit **sans** lui, le reste du gadget étant identique.
 *
 * Égales, le retrait est sans effet (`inert`). Différentes, il change ce que le pilote
 * verra (`live`) — et le cas porte alors un troisième renseignement, `effect` : le **nom
 * de ce que le pilote verrait changer** (`windArrowGone`), un identifiant et non une
 * phrase. La phrase, elle, vit au catalogue de messages sous `removalEffect.*`, dans les
 * cinq langues : ce fichier est un relevé, il ne porte pas la prose de l'interface. Sans
 * ce chaînon, l'écran de nettoyage n'avait que `windStyle: ARROW → NONE` à montrer, et un
 * pilote-testeur a dit le 22 août 2026 qu'il cliquait « par confiance, pas par
 * compréhension ». **Absent de la table, il n'y a pas de verdict** : `unmeasured`, et le
 * nettoyage s'abstient. C'est la même règle que partout ailleurs dans ce projet — notre
 * silence ne conclut rien —, appliquée cette fois à la seule question qui compte pour un
 * outil qui efface : *que se passe-t-il si je l'enlève ?*
 *
 * ## ⚠️ Le voisinage n'est pas un détail : c'est la borne qui a manqué
 *
 * La première version de cette table comparait le réglage à la **valeur d'usine d'un
 * gadget nu** — celle que relève `widgetDefaults.json`. C'est un raccourci, et il est
 * faux : « sans le réglage » n'est pas « sans rien ».
 *
 * Le 22 août 2026 au soir, une planche de dix cartes l'a montré sur l'appareil.
 * `mapWidget_showOpenStreet` et `mapWidget_showTerrain` **ne sont lus qu'ensemble** :
 * posé seul, ni l'un ni l'autre ne fait quoi que ce soit, et les neuf combinaisons des
 * deux donnent
 *
 * | `showOpenStreet` | `showTerrain` | `mapWidget_mapAppearance` |
 * |---|---|---|
 * | absent | quelconque | `theme=None terrain=None` |
 * | quelconque | absent | `theme=None terrain=None` |
 * | `false` | `false` | `theme=None terrain=None` |
 * | `false` | `true` | `theme=None terrain=Light` |
 * | `true` | `false` | `theme=Lightpilot terrain=None` |
 * | `true` | `true` | `theme=Lightpilot terrain=LightShading` |
 *
 * La table d'alors donnait `mapWidget_showOpenStreet: false` pour **sans effet**, parce
 * qu'un gadget nu écrit `terrain=None` comme un gadget portant `showOpenStreet: false`
 * seul. Et le nettoyage le **proposait** — sur les deux cartes de la sauvegarde de
 * référence, qui portent aussi `mapWidget_showTerrain: true`. Le retirer y rompt le
 * couple et **éteint l'ombrage du relief** que l'autre allume. L'outil s'apprêtait à
 * faire, sur les cartes, exactement ce que la mesure de `showWind` lui avait appris à ne
 * plus faire sur les compas.
 *
 * D'où la forme d'aujourd'hui : `requires` accompagne **chaque cas**, et dit clé par clé
 * dans quel voisinage le couple a été pris — une valeur attendue, ou `null` quand la
 * mesure exige que la clé soit **absente**. Hors de ce voisinage, il n'y a pas de
 * verdict. Le même réglage peut donc être sans effet ici et vivant là, et la table le dit
 * au lieu de trancher.
 *
 * Trois autres bornes, écrites dans le fichier lui-même :
 *
 * - **le palier.** Les mesures ont été prises sur 1.0.3-beta, palier 20. Un verdict
 *   `inert` ne vaut **qu'à ce palier** ; visé ailleurs, le réglage est `unmeasured` et
 *   reste en place. Un verdict `live`, lui, vaut partout : il n'y a aucune raison de
 *   parier que le danger disparaît sur une version qu'on n'a pas éprouvée.
 * - **la valeur.** Un verdict porte sur une *valeur*, pas sur un réglage. `showWind` est
 *   sans effet à `false` et vivant à `true` ; la même clé, deux sorts.
 * - **le type de gadget.** `nav_use_brackets: false` donne `nav_label: DISTANCE` sur
 *   `WCompMap` et `WXCAssistant`, et **rien du tout** sur `WThermalAssistant`, qui ne le
 *   lit pas. Un cas peut donc restreindre la liste de gadgets de son réglage.
 *
 * ## Ce qui reste à mesurer
 *
 * **L'ensemble de la table à un autre palier que 20.** C'est le seul trou qui reste, et
 * il ne se comble pas depuis un bureau : il faudrait une autre version de XCTrack sur
 * l'appareil, donc désinstaller celle qui y est — l'appareil n'est pas débridé, aucun
 * `.apk` d'une autre version n'est en main, et la désinstallation emporterait la
 * configuration du propriétaire. Ce n'est pas une mesure qui manque, c'est une mesure qui
 * a été refusée ; voir `2026-08-22-table-des-perimes.md`.
 */

/** Ce qu'on sait du retrait d'un réglage périmé. */
export type RemovalVerdict = 'inert' | 'live' | 'unmeasured'

/** Le verdict, et de quoi l'expliquer au pilote. */
export interface RemovalCase {
  verdict: RemovalVerdict
  /** Le réglage d'aujourd'hui que XCTrack en tire. Absent quand rien n'est mesuré. */
  successor?: string
  /** Ce que l'appareil a écrit **avec** le réglage. */
  present?: string
  /** Ce qu'il écrit **sans** lui, le reste du gadget étant identique. */
  absent?: string
  /**
   * **Ce que le pilote verrait changer**, sous forme d'identifiant : `windArrowGone`.
   * L'interface le traduit (`removalEffect.*`) pour dire en français ce que
   * `windStyle: ARROW → NONE` veut dire sur un compas. Porté par les seuls cas dont le
   * retrait change quelque chose ; `undefined` partout ailleurs.
   */
  effect?: string
}

/**
 * Le voisinage d'une mesure : pour chaque clé du **même gadget**, ce que le relevé exige.
 * Une chaîne — le texte source de la valeur attendue — ou `null` : la clé doit être
 * **absente**. Une clé qu'un cas ne nomme pas n'entre pas dans la comparaison.
 */
export type Neighbourhood = Record<string, string | null>

/** Un couple d'observations : le même gadget avec le réglage, puis sans lui. */
export interface MeasuredCase {
  /** Le texte source de la valeur portée par le fichier — `true`, `false`, un nombre. */
  value: string
  /** Le voisinage dans lequel le couple a été pris. Vide : le gadget était nu. */
  requires?: Neighbourhood
  /**
   * Les gadgets sur lesquels **ce cas-là** a été pris, quand ils ne sont pas tous ceux du
   * réglage. `nav_use_brackets: false` en a besoin : deux classes de gadgets le lisent,
   * une troisième l'ignore, et les deux cas ne peuvent pas porter le même verdict.
   */
  widgets?: string[]
  present: string
  absent: string
  verdict: 'inert' | 'live'
  /**
   * L'identifiant de la conséquence, obligatoire dès que `verdict` vaut `'live'` — un
   * test le vérifie. Un relevé qui sait qu'un retrait change quelque chose sans savoir le
   * dire au pilote laisserait l'interface le montrer en langage de machine, ce qui est
   * exactement le défaut relevé le 22 août 2026.
   */
  effect?: string
}

export interface Migration {
  successor: string
  /** Tous les gadgets couverts, cas confondus. */
  widgets: string[]
  measure: string
  cases: MeasuredCase[]
}

export interface MigrationsFile {
  _source: string
  _methode: string
  _limite: string
  _measuredTiers: string
  _measuredVersionCode: number
  _measuredVersionName: string
  migrations: Record<string, Migration>
}

/**
 * Le relevé chargé. **Injectable comme `VersionDatabase`** : le nettoyage le reçoit en
 * argument, et les tests de fidélité — qui n'ont rien à dire d'un aller-retour sur
 * l'appareil — en fabriquent un pour leurs clés de laboratoire. Un relevé qu'on ne peut
 * pas remplacer forcerait à mêler deux questions dans les mêmes tests.
 */
export class MigrationTable {
  constructor(private readonly file: MigrationsFile) {}

  /** Le palier sur lequel les mesures ont été prises. */
  get measuredTiers(): string {
    return this.file._measuredTiers
  }

  /** La version de XCTrack qui a rendu ces valeurs. */
  get versionName(): string {
    return this.file._measuredVersionName
  }

  /** La provenance du relevé, telle qu'il la porte : à afficher, jamais à réécrire. */
  get provenance(): string {
    return this.file._source
  }

  /** Les réglages périmés dont le devenir a été mesuré. */
  measuredKeys(): string[] {
    return Object.keys(this.file.migrations).sort()
  }

  /** Ce que le relevé dit de ce réglage, ou `undefined` s'il n'en dit rien. */
  migrationOf(key: string): Migration | undefined {
    return Object.prototype.hasOwnProperty.call(this.file.migrations, key)
      ? this.file.migrations[key]
      : undefined
  }

  /**
   * Ce que le retrait de ce réglage ferait, **mesuré**.
   *
   * `value` est le texte source de la valeur portée par le fichier — `true`, `false`, ou
   * le texte d'un nombre. `sibling` rend, de la même façon, la valeur d'un autre réglage
   * du **même gadget**, et `undefined` quand le gadget ne le porte pas : c'est ce qui
   * permet de retrouver le voisinage (`requires`) dans lequel la mesure a été prise.
   *
   * Tout ce qui sort du relevé rend `unmeasured` : un réglage absent de la table, un type
   * de gadget sur lequel il n'a pas été porté, une valeur jamais éprouvée, **un voisinage
   * jamais éprouvé**, un palier autre que celui des mesures. Un seul cas fait exception à
   * la borne du palier : un `live` reste `live` à tout palier, parce qu'un danger mesuré
   * ne s'oublie pas parce qu'on regarde ailleurs.
   *
   * ⚠️ Le voisinage, lui, **ne connaît pas cette exception**, et c'est voulu : un `live`
   * mesuré ailleurs ne décrit pas ce gadget-ci. L'annoncer quand même ferait lire au
   * pilote une conséquence qui n'est pas la sienne — et le réglage serait de toute façon
   * laissé en place, `unmeasured` comme `live`. On préfère « personne ne l'a mesuré » à
   * une phrase juste ailleurs.
   */
  removalVerdict(
    shortName: string,
    key: string,
    value: string | undefined,
    tier: number,
    sibling: (key: string) => string | undefined
  ): RemovalCase {
    const migration = this.migrationOf(key)
    if (migration === undefined) return { verdict: 'unmeasured' }
    if (!migration.widgets.includes(shortName)) return { verdict: 'unmeasured' }
    if (value === undefined) return { verdict: 'unmeasured' }

    const measured = migration.cases.find((one) => matches(one, shortName, value, sibling))
    if (measured === undefined) return { verdict: 'unmeasured' }

    const known: RemovalCase = {
      verdict: measured.verdict,
      successor: migration.successor,
      present: measured.present,
      absent: measured.absent,
      ...(measured.effect === undefined ? {} : { effect: measured.effect })
    }
    // Un danger mesuré vaut à tous les paliers : seul « sans effet » se borne au sien.
    if (measured.verdict === 'live') return known
    if (!tierInRange(this.file._measuredTiers, tier)) return { verdict: 'unmeasured' }
    return known
  }
}

/**
 * Ce cas décrit-il ce gadget-là ? Trois conditions, et la troisième est celle qui a
 * manqué jusqu'au 22 août 2026 : le **voisinage**, clé par clé, `null` valant « cette
 * clé doit être absente ».
 */
function matches(
  one: MeasuredCase, shortName: string, value: string,
  sibling: (key: string) => string | undefined
): boolean {
  if (one.value !== value) return false
  if (one.widgets !== undefined && !one.widgets.includes(shortName)) return false
  for (const [neighbour, expected] of Object.entries(one.requires ?? {})) {
    const carried = sibling(neighbour)
    if (expected === null ? carried !== undefined : carried !== expected) return false
  }
  return true
}

/** Le relevé du dépôt : celui qu'emploie le nettoyage quand on ne lui en donne pas d'autre. */
export const MEASURED_MIGRATIONS = new MigrationTable(rawMigrations as MigrationsFile)
