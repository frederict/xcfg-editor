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
 * L'allemand. Deux traits le distinguent des quatre autres, et tous deux se voient dans
 * ce catalogue :
 *
 * - **Le verbe part à la fin** de la subordonnée : « … die das Gerät am Boden nicht
 *   anzeigt ». C'est la démonstration qu'une phrase composée ne peut pas être une
 *   concaténation de fragments — seuls des repères nommés déplaçables tiennent.
 * - **« rétablir » se sépare nettement** : *wiederholen* pour refaire ce qu'on a annulé,
 *   *zurücklegen* / *wiederherstellen* pour replacer une entrée. On emploie ici
 *   *Wiederholen* pour le premier, alors que Word dit *Wiederherstellen* : ce serait
 *   reproduire en allemand la collision exacte que l'on corrige en français.
 *
 * Point de gabarit, pas de traduction : « masquée hors vol » est compact en français et
 * demande une subordonnée en allemand. Ce badge, très présent à l'écran, y sera **deux
 * fois plus long**.
 *
 * Les messages sont dans les neuf fichiers de domaine à côté ; ce fichier ne fait que les
 * réunir. Voir `src/i18n/domains.ts`.
 */
const de: MessageCatalog = {
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

export default de
