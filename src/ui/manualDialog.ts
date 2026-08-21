import '../../docs-app/manuel.css'
import manual from '../../docs-app/manuel.fr.html?raw'

/**
 * Le manuel d'utilisation, en modale.
 *
 * Le fragment est importé en `?raw` : c'est du **texte du projet**, figé au moment de la
 * construction, dans lequel rien de ce que le pilote ouvre n'entre jamais. C'est ce qui
 * rend `innerHTML` sans danger ici — et ce qui le rendrait dangereux ailleurs.
 *
 * Le module entier n'est atteint que par `import()` : ses 16 ko compressés ne pèsent rien
 * sur le premier écran, comme les cinq autres morceaux chargés à la demande.
 */
export function openManualDialog(): void {
  const dialog = document.createElement('dialog')
  dialog.className = 'modal modal--manual'
  dialog.setAttribute('aria-label', 'Manuel d’utilisation')

  const box = document.createElement('div')
  box.className = 'modal__box'
  const head = document.createElement('div')
  head.className = 'modal__head'
  // Le fragment commence à `h2` : le titre de la boîte est son `h1`, et la hiérarchie
  // reste continue pour qui parcourt la page au lecteur d'écran.
  const title = document.createElement('h1')
  title.className = 'modal__title'
  title.textContent = 'Manuel d’utilisation'
  const close = document.createElement('button')
  close.type = 'button'
  close.className = 'btn'
  close.textContent = 'Fermer'
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
