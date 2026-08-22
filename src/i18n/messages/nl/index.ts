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
 * Le néerlandais. Comme l'allemand, il renvoie le verbe en fin de subordonnée — même
 * démonstration, même exigence de repères nommés déplaçables.
 *
 * Il sépare naturellement deux mots que le français confond : *opnieuw doen* (refaire)
 * et *terugplaatsen* / *herstellen* (replacer). Il sépare aussi *opslaan* (enregistrer
 * dans un fichier) de *downloaden* (télécharger), là où le français dit « enregistrer »
 * pour les deux — c'est la troisième collision relevée, et elle n'apparaît pas encore
 * dans ce socle.
 *
 * À zéro, le néerlandais met le pluriel : « 0 instellingen ».
 *
 * Les messages sont dans les neuf fichiers de domaine à côté ; ce fichier ne fait que les
 * réunir. Voir `src/i18n/domains.ts`.
 */
const nl: MessageCatalog = {
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

export default nl
