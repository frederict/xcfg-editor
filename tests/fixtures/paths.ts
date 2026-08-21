import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Où vivent les fichiers `.xcfg` que les tests lisent.
 *
 * ## Pourquoi ces chemins-là, et pas ceux du poste du propriétaire
 *
 * Vingt fichiers de tests lisaient jusqu'ici `/Users/fred/DEV/XCTrack/Exemples/`, les
 * configurations de vol réelles du propriétaire — volontairement non versionnées, parce
 * qu'elles portent son nom, sa voile, ses coordonnées et le nom de la compétition à
 * laquelle il participe. Cloné ailleurs, le dépôt avait donc vingt fichiers de tests en
 * échec, et la CI rouge dès le premier commit.
 *
 * Ce n'était pas qu'une question de propreté. **La fidélité à l'octet près est
 * l'argument central du projet** : c'est la réponse à la seule question qu'un pilote pose
 * avant de confier sa configuration à un éditeur — « mes réglages seront-ils encore là
 * après ? ». Cette garantie est prouvée par ces tests. Si personne d'autre que le
 * propriétaire ne peut les exécuter, la promesse devient invérifiable par quiconque,
 * précisément là où on demande de la confiance.
 *
 * Les fixtures de `exports/` sont donc dérivées des fichiers réels, anonymisées, et
 * versionnées. `deriver-exemples.py`, à côté, dit ligne par ligne ce qui a été remplacé
 * et ce qui ne l'a pas été ; `anonymat.test.ts` contrôle le résultat à chaque exécution.
 *
 * Les chemins sont ancrés sur l'emplacement de *ce* fichier, pas sur le répertoire
 * courant du processus qui lance Vitest — un test doit passer quel que soit l'endroit
 * d'où on l'a lancé.
 *
 * ⚠️ `fileURLToPath(import.meta.url)` prend bien une **chaîne**. Lui passer un objet
 * `new URL(…)` échoue sous Vitest : l'environnement `happy-dom` remplace le `URL` global
 * par le sien, que `node:url` ne reconnaît pas — « The URL must be of scheme file ».
 */
const ICI = `${dirname(fileURLToPath(import.meta.url))}/`

/**
 * Les cinq `.xcfg` et l'archive `.xczfg` dérivés des exports réels : deux formats
 * d'export, deux millésimes de XCTrack (0.9.12.3 et 1.0.3-beta), 105 widgets et
 * 41 classes de widgets. Un remplacement à l'identique de l'ancien `Exemples/` :
 * même nombre de fichiers, même `layout` à l'octet près.
 */
export const EXPORTS = `${ICI}exports/`

/**
 * Deux fichiers écrits à la main, qui portent ce qu'aucun fichier réel du corpus ne
 * porte : `1.0E7`, `-0.0`, un entier au-delà de 2^53, deux clés de même nom, et
 * l'échappement `\\u0027` que seul Gson produisait (XCTrack 0.9.6, 2022). Ils vivent à
 * part parce que plusieurs tests balaient `EXPORTS` en entier et comptent ses fichiers.
 */
export const FORMES = `${ICI}formes/`

export const BACKUP_2026 = `${EXPORTS}2026-08-20_backup-00.xcfg`
export const PAGES_2026 = `${EXPORTS}2026-08-20_pages-00.xcfg`
export const BACKUP_2025 = `${EXPORTS}2025-07-07_backup-00.xcfg`
export const PAGES_2025 = `${EXPORTS}2025-07-07_pages-00.xcfg`
/** Le jumeau du backup 2026, à l'horodatage d'export près : c'est lui qu'enferme l'archive. */
export const BACKUP_ARCHIVE = `${EXPORTS}backup.xcfg`
export const ARCHIVE = `${EXPORTS}2026-08-20_backupwithmedia-00.xczfg`

export const FORMES_PRESERVEES = `${FORMES}formes-preservees.xcfg`
export const GSON_2022 = `${FORMES}gson-2022.xcfg`

/** Les cinq exports, dans l'ordre où `readdirSync` les rend, filtre `.xcfg` appliqué. */
export const NOMS_EXPORTS = [
  '2025-07-07_backup-00.xcfg',
  '2025-07-07_pages-00.xcfg',
  '2026-08-20_backup-00.xcfg',
  '2026-08-20_pages-00.xcfg',
  'backup.xcfg'
] as const
