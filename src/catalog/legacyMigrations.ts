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
 * ## Ce que cette table dit, et ce qu'elle refuse de dire
 *
 * Pour chaque couple *(réglage, valeur)* elle porte **deux mesures** et rien d'autre :
 *
 * - `present` — ce que l'appareil a écrit dans le réglage successeur **avec** le réglage ;
 * - `absent` — ce qu'il écrit **sans** lui, c'est-à-dire la valeur d'usine relevée par
 *   `widgetDefaults.json` sur un gadget posé nu.
 *
 * Égales, le retrait est sans effet (`inert`). Différentes, il change ce que le pilote
 * verra (`live`). **Absent de la table, il n'y a pas de verdict** : `unmeasured`, et le
 * nettoyage s'abstient. C'est la même règle que partout ailleurs dans ce projet — notre
 * silence ne conclut rien —, appliquée cette fois à la seule question qui compte pour un
 * outil qui efface : *que se passe-t-il si je l'enlève ?*
 *
 * Trois bornes, écrites dans le fichier lui-même :
 *
 * - **le palier.** Les mesures ont été prises sur 1.0.3-beta, palier 20. Un verdict
 *   `inert` ne vaut **qu'à ce palier** ; visé ailleurs, le réglage est `unmeasured` et
 *   reste en place. Un verdict `live`, lui, vaut partout : il n'y a aucune raison de
 *   parier que le danger disparaît sur une version qu'on n'a pas éprouvée.
 * - **le voisinage.** `requires` dit ce que le gadget portait d'autre quand la mesure a
 *   été prise — `newWindArrow: false` n'a jamais été lu qu'aux côtés de `showWind: true`.
 *   Hors de ce voisinage, pas de verdict.
 * - **la valeur.** Un verdict porte sur une *valeur*, pas sur un réglage. `showWind` est
 *   sans effet à `false` et vivant à `true` ; la même clé, deux sorts.
 *
 * ## Ce qui reste à mesurer
 *
 * Quatre trous connus, tous notés dans le fichier : `newWindArrow: true`,
 * `mapWidget_showOpenStreet: true`, `mapWidget_showTerrain: false`, et l'ensemble de la
 * table à un autre palier que 20. Chacun coûte un aller-retour sur l'appareil, et
 * l'absence de mesure ne coûte au pilote que quelques octets laissés dans son fichier.
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
  /** Ce qu'il écrit **sans** lui — la valeur d'usine du successeur. */
  absent?: string
}

export interface MeasuredValue {
  present: string
  absent: string
  verdict: 'inert' | 'live'
}

export interface Migration {
  successor: string
  widgets: string[]
  requires?: Record<string, string>
  measure: string
  values: Record<string, MeasuredValue>
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
   * du **même gadget** : c'est ce qui permet de vérifier le voisinage (`requires`) dans
   * lequel la mesure a été prise.
   *
   * Tout ce qui sort du relevé rend `unmeasured` : un réglage absent de la table, un type
   * de gadget sur lequel il n'a pas été porté, une valeur jamais éprouvée, un palier autre
   * que celui des mesures, un voisinage qui ne correspond pas. Un seul cas fait exception
   * à la borne du palier : un `live` reste `live` à tout palier, parce qu'un danger mesuré
   * ne s'oublie pas parce qu'on regarde ailleurs.
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
    const measured = Object.prototype.hasOwnProperty.call(migration.values, value)
      ? migration.values[value]
      : undefined
    if (measured === undefined) return { verdict: 'unmeasured' }

    const known: RemovalCase = {
      verdict: measured.verdict,
      successor: migration.successor,
      present: measured.present,
      absent: measured.absent
    }
    // Un danger mesuré vaut partout : ni le palier visé ni le voisinage ne l'effacent.
    if (measured.verdict === 'live') return known

    if (!tierInRange(this.file._measuredTiers, tier)) return { verdict: 'unmeasured' }
    for (const [neighbour, expected] of Object.entries(migration.requires ?? {})) {
      if (sibling(neighbour) !== expected) return { verdict: 'unmeasured' }
    }
    return known
  }
}

/** Le relevé du dépôt : celui qu'emploie le nettoyage quand on ne lui en donne pas d'autre. */
export const MEASURED_MIGRATIONS = new MigrationTable(rawMigrations as MigrationsFile)
