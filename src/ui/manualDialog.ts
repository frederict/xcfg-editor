import '../../docs-app/manuel.css'
import { UI_FALLBACK_LANGUAGE, type Translator, type UiLanguage } from '../i18n'

/**
 * Le manuel d'utilisation, en modale, dans la langue du pilote.
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

export async function openManualDialog(tr: Translator): Promise<void> {
  const load = manualLoader(tr.language)
  if (load === undefined) throw new Error(`aucun manuel pour ${tr.language}`)
  const manual = await load()
  const dialog = document.createElement('dialog')
  dialog.className = 'modal modal--manual'
  dialog.setAttribute('aria-label', tr.t('app.manualTitle'))

  const box = document.createElement('div')
  box.className = 'modal__box'
  const head = document.createElement('div')
  head.className = 'modal__head'
  // Le fragment commence à `h2` : le titre de la boîte est son `h1`, et la hiérarchie
  // reste continue pour qui parcourt la page au lecteur d'écran.
  const title = document.createElement('h1')
  title.className = 'modal__title'
  title.textContent = tr.t('app.manualTitle')
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'btn'
  close.textContent = tr.t('app.close')
  const dismiss = (): void => { dialog.close(); dialog.remove() }
  close.addEventListener('click', dismiss)
  head.append(title, close)

  // Le fragment porte lui-même `class="manual"`, qui est la racine de sa feuille de
  // style : l'envelopper d'un second conteneur de même classe dupliquerait ses marges.
  const body = document.createElement('div')
  body.innerHTML = manual

  box.append(head, body)
  dialog.append(box)
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); dismiss() })
  document.body.append(dialog)
  dialog.showModal()
  close.focus()
}
