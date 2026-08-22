import app from './app'
import common from './common'
import library from './library'
import model from './model'
import pages from './pages'
import preferences from './preferences'
import sharing from './sharing'
import versions from './versions'
import widgets from './widgets'

/**
 * # Le catalogue de référence
 *
 * Le français n'est pas « une langue parmi cinq » : c'est **la langue d'écriture**. Ce
 * dossier est la source de vérité du jeu de clés, et le type de tous les autres
 * catalogues en est dérivé (`src/i18n/catalog.ts`, `src/i18n/domains.ts`). Une clé
 * ajoutée ici et oubliée ailleurs est une **erreur de compilation**, pas une découverte
 * d'utilisateur.
 *
 * ## Les clés sont en anglais, la prose en français
 *
 * Règle du projet. La clé est un identifiant, elle est lue par du code ; le texte est de
 * la prose, elle est lue par un pilote.
 *
 * ## Ce fichier n'est qu'un assemblage
 *
 * Les messages vivent dans les neuf fichiers de domaine à côté — un par lot d'extraction,
 * pour que plusieurs personnes puissent en verser en parallèle sans se croiser. Voir
 * `src/i18n/domains.ts`, qui dit lequel couvre quel écran.
 *
 * **Le jeu de clés reste plat** : `t('library.entryCount')` ne dit pas de quel fichier il
 * vient, et un message qui change de domaine garde sa clé. Le domaine est une affaire de
 * fichier, jamais d'appel.
 *
 * ## Ce catalogue est un socle, pas la traduction
 *
 * Il portait d'abord les 54 messages qui **arbitraient du vocabulaire** ou qui
 * **démontraient une construction** — pluriel, phrase à repères nommés, formateur,
 * énumération. Les lots d'extraction ont versé le reste, domaine par domaine : il porte
 * aujourd'hui **toute la prose** de l'application. Le compte exact bouge à chaque lot et
 * n'est donc pas répété ici — voir `src/i18n/catalog.ts`, qui le donne avec sa date et la
 * commande qui le recalcule.
 * `src/i18n/CLAUDE.md` dit comment en ajouter un.
 *
 * Chaque clé ne doit apparaître que dans **un** domaine : la fusion ci-dessous en
 * garderait silencieusement une seule, et `tests/i18n/domains.test.ts` refuse le cas.
 */
const fr = {
  ...common,
  ...app,
  ...preferences,
  ...library,
  ...widgets,
  ...versions,
  ...sharing,
  ...pages,
  ...model
}

export default fr

/**
 * Le type du catalogue de référence. `catalog.ts` l'importe en `import type` — donc
 * effacé à la compilation — pour que les quatre autres catalogues soient typés sans
 * qu'aucun d'eux n'embarque le français à l'exécution.
 */
export type FrenchMessages = typeof fr
