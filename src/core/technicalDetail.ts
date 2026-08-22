// `import type` : effacé à la compilation. Ce module ne dépend pas de `src/i18n/`.
import type { Translator } from '../i18n'

/**
 * # Le détail technique d'une panne, séparé de ce qu'on en dit au pilote
 *
 * `String(error)` sur un objet `Error` rend « Error: données résiduelles à 6 ». Mesuré à
 * l'écran en déposant un `.png` : le pilote lisait « Ce fichier n'a pas pu être analysé :
 * Error: données résiduelles à 6 ». Le mot `Error:` vient du moteur JavaScript, il n'est
 * ni traduit ni traduisible, et il arrive au moment précis où le pilote vient de confier
 * son fichier à cet outil.
 *
 * ## La règle
 *
 * **Le pilote reçoit une phrase ; le détail technique est replié, en second rang, jamais
 * à la place de l'explication.** Il doit rester : c'est ce qu'on recopie pour signaler un
 * problème, et le supprimer rendrait le rapport de panne inutilisable. C'est sa place et
 * son emballage qui changent, pas son existence.
 *
 * Cette fonction ne fait que la moitié technique du travail — ôter le préfixe. La moitié
 * qui compte est ailleurs : c'est la phrase que l'appelant écrit à la place.
 */

/**
 * Le message d'une panne, débarrassé du préfixe que le moteur JavaScript y colle —
 * **vide** quand il n'y a rien à dire.
 *
 * Un `Error` porte son message directement. Tout le reste — une chaîne levée, un objet
 * quelconque — passe par `String`, dont on retire le `NomDErreur:` de tête s'il y en a un.
 *
 * C'est la moitié **sans langue** du travail : elle sert aux couches qui n'ont pas de
 * traducteur sous la main et qui rangent le détail pour plus tard (`src/library/`). Ce que
 * le pilote lit passe par `formatTechnicalDetail`, juste en dessous.
 */
export function technicalDetail(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  return text.replace(/^\s*[\w$]*Error:\s*/, '').trim()
}

/**
 * Le même détail, prêt à montrer. Une panne sans message rend une **phrase** plutôt que le
 * vide : une ligne « Détail technique » ouverte sur rien serait une porte sur un mur.
 *
 * Le traducteur est **passé, jamais lu** : de `src/i18n/` ce module ne prend que le type
 * `Translator`, effacé à la compilation. Même motif que `personalProse(tr)`.
 */
export function formatTechnicalDetail(error: unknown, tr: Translator): string {
  const detail = technicalDetail(error)
  return detail === '' ? tr.t('model.noErrorMessage') : detail
}
