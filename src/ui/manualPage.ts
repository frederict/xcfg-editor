import '../../docs-app/manuel.css'
import { UI_FALLBACK_LANGUAGE, type Translator, type UiLanguage } from '../i18n'

/**
 * Le manuel d'utilisation, en pleine page, dans la langue du pilote.
 *
 * **Une page, pas une modale.** Treize chapitres ne se lisent pas dans une boîte : on y
 * revient, on cherche, on garde sa place. Une vue à part rend le défilement au navigateur
 * et laisse le manuel occuper toute la largeur qu'il mérite.
 *
 * Le fragment est importé en `?raw` : c'est du **texte du projet**, figé au moment de la
 * construction, dans lequel rien de ce que le pilote ouvre n'entre jamais. C'est ce qui
 * rend `innerHTML` sans danger ici — et ce qui le rendrait dangereux ailleurs.
 *
 * ## Un morceau par langue, un seul téléchargé
 *
 * `import.meta.glob` **sans `eager`** rend un objet de chargeurs, pas des contenus : Vite
 * émet un morceau par fragment, et seul celui qu'on appelle part sur le réseau. Les cinq
 * manuels pèsent ensemble 80 ko compressés ; un pilote qui ouvre l'aide en télécharge
 * **un**. Un `eager: true` les collerait tous les cinq dans ce module — pour une
 * application qu'on ouvre parfois en 3G au décollage, l'écart n'est pas un détail.
 *
 * Le module entier n'est de toute façon atteint que par `import()`, comme les cinq autres
 * morceaux chargés à la demande : le premier écran ne paie rien.
 */
const MANUALS = import.meta.glob<string>('../../docs-app/manuel.*.html', {
  query: '?raw', import: 'default'
})

/** Le chargeur de la langue demandée, ou celui du repli si elle n'a pas de manuel. */
function manualLoader(language: UiLanguage): (() => Promise<string>) | undefined {
  return MANUALS[`../../docs-app/manuel.${language}.html`]
    ?? MANUALS[`../../docs-app/manuel.${UI_FALLBACK_LANGUAGE}.html`]
}

export async function buildManualPage(
  tr: Translator, onClose: () => void
): Promise<HTMLElement> {
  const load = manualLoader(tr.language)
  if (load === undefined) throw new Error(`aucun manuel pour ${tr.language}`)
  const manual = await load()

  const page = document.createElement('section')
  page.className = 'manual-page'

  const head = document.createElement('div')
  head.className = 'manual-page__head'
  const title = document.createElement('h1')
  title.className = 'manual-page__title'
  title.textContent = tr.t('app.manualTitle')
  const back = document.createElement('button')
  back.type = 'button'
  back.className = 'btn'
  back.textContent = tr.t('app.manualBack')
  back.addEventListener('click', onClose)
  head.append(title, back)

  // Le fragment porte lui-même `class="manual"`, qui est la racine de sa feuille de
  // style : l'envelopper d'un second conteneur de même classe dupliquerait ses marges.
  const body = document.createElement('div')
  body.innerHTML = manual

  page.append(head, body)
  return page
}
