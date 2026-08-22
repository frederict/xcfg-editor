import type { MessageCatalog } from '../../catalog'
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
 * L'anglais. C'est **la langue détectrice** : elle est la première à traduire, parce
 * qu'elle force à trancher les collisions du français — *default* ou *fault*, *redo* ou
 * *reset* ou *restore*, *survey* ou *catalogue* ou *measured*. Les trois autres langues se
 * traduisent ensuite sur un vocabulaire déjà arrêté.
 *
 * Deux pièges relevés et évités ici :
 *
 * - **« réglages réglés »** devient *settings set* si on traduit mot à mot. La phrase est
 *   donc reconstruite : *You have set 30 of the 93 settings XCTrack offers*.
 * - **« rang »** ne se dit pas *rank*, qui ferait croire à un classement par mérite ;
 *   c'est *layer* ou *stacking order*. Aucun message de ce socle ne le porte encore, mais
 *   la décision est prise.
 *
 * À zéro, l'anglais met le pluriel : « 0 settings ». C'est ce que les huit copies de
 * `plural()` du dépôt, écrites en `count > 1`, auraient rendu faux.
 *
 * Les messages sont dans les neuf fichiers de domaine à côté ; ce fichier ne fait que les
 * réunir. Voir `src/i18n/domains.ts`.
 */
const en: MessageCatalog = {
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

export default en
