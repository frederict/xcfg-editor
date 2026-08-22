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
 * L'espagnol. Il partage avec le français la catégorie de pluriel `many` au million, sans
 * qu'aucune forme change pour autant — d'où le repli sur `other` dans `pluralForm`.
 *
 * Il met souvent le verbe en tête là où le français le met après le nombre : « falta 1
 * línea » / « faltan 2 líneas ». C'est la démonstration la plus nette que les 23 accords
 * écrits en ternaire (`${n} absente${n > 1 ? 's' : ''}`) ne survivent pas à la traduction :
 * ce n'est pas un `s` qui change, c'est le premier mot de la phrase.
 *
 * Il ne sépare pas les milliers sous 10 000 : `Intl` écrit « 1059 » et non « 1 059 ».
 * C'est la règle de la langue, pas un défaut de formatage.
 *
 * Les messages sont dans les neuf fichiers de domaine à côté ; ce fichier ne fait que les
 * réunir. Voir `src/i18n/domains.ts`.
 */
const es: MessageCatalog = {
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

export default es
