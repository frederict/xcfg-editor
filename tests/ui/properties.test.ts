import { beforeAll, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { getMember } from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'
import { readLayout } from '../../src/model/layout'
import type { Widget } from '../../src/model/widget'
import {
  buildPropertyForm,
  colorToHex,
  colorToLiteral,
  loadOptionTexts,
  renderProperties,
  setFieldValue,
  type PropertyField,
  type PropertyForm
} from '../../src/ui/properties'
import { BACKUP_2026 } from '../fixtures/paths'

/**
 * Tout se joue sur des widgets réels. Un panneau de réglages engendré ne se juge pas sur
 * des données inventées : ce qu'on veut vérifier, c'est qu'il retrouve les libellés
 * relevés sur l'appareil à partir des octets que l'appareil a écrits.
 */
const source = readFileSync(BACKUP_2026, 'utf8')

/**
 * Le catalogue est désormais partitionné par langue et chargé par `import()` : le module
 * ne précharge de lui-même que la langue du navigateur — `en` sous happy-dom. Les langues
 * dont ces tests vérifient les libellés doivent donc être demandées d'abord, exactement
 * comme le panneau le fait quand un fichier déclare `Display.Language`.
 */
beforeAll(async () => {
  await Promise.all([loadOptionTexts('fr'), loadOptionTexts('de')])
})

/** Espace insécable : la typographie française du catalogue, à l'octet près. */
const NBSP = ' '

function document(): JsonNode {
  return parseJson(source)
}

function widgetAt(doc: JsonNode, orientation: 'portrait' | 'landscape', page: number, index: number): Widget {
  const widget = readLayout(doc)[orientation][page]?.widgets[index]
  if (widget === undefined) throw new Error(`pas de widget ${orientation}[${page}][${index}]`)
  return widget
}

/** La boussole de la première page paysage : la seule du corpus qui porte `windStyle`. */
function compass(doc: JsonNode): Widget {
  const widget = widgetAt(doc, 'landscape', 0, 12)
  expect(widget.shortName).toBe('WCompass')
  return widget
}

/** La boussole portrait : celle qui porte encore les vestiges `showWind` et `newWindArrow`. */
function oldCompass(doc: JsonNode): Widget {
  const widget = widgetAt(doc, 'portrait', 2, 6)
  expect(widget.shortName).toBe('WCompass')
  return widget
}

function map(doc: JsonNode): Widget {
  const widgets = readLayout(doc).landscape.flatMap((page) => page.widgets)
  const widget = widgets.find((candidate) => candidate.shortName === 'WCompMap')
  if (widget === undefined) throw new Error('pas de WCompMap')
  return widget
}

function fieldAt(form: PropertyForm, path: string): PropertyField {
  const field = form.fields.find((candidate) => candidate.path === path)
  if (field === undefined) throw new Error(`pas de champ ${path} dans ${form.shortName}`)
  return field
}

/** Les lignes du document sérialisé qui diffèrent entre deux états. */
function diffLines(before: string, after: string): string[] {
  const olds = before.split('\n')
  const news = after.split('\n')
  expect(news).toHaveLength(olds.length)
  return news.filter((line, index) => line !== olds[index])
}

describe('description du formulaire', () => {
  it('donne à la boussole ses neuf contrôles, dans l’ordre et avec les libellés du relevé', () => {
    const form = buildPropertyForm(compass(document()))

    expect(form.fields.map((field) => field.key)).toEqual([
      '_border', '_bg', '_theme', 'rotation', 'navigation_target',
      'windStyle', 'showHeading', 'showBearing', 'showBackground'
    ])
    expect(form.fields.map((field) => field.label)).toEqual([
      'Tracer frontière',
      `Transparence d'arrière-plan${NBSP}: 100%`,
      'Affichage du thème',
      'Rotation du compas',
      'Afficher la flèche',
      "Style d'indicateur de vent",
      'Montrer la flèche de cap',
      'Montrer la flèche de trajectoire',
      'Afficher le cadran d’arrière-plan'.replace('’', "'")
    ])
  })

  it('déduit le contrôle de chaque option de la boussole', () => {
    const form = buildPropertyForm(compass(document()))
    expect(Object.fromEntries(form.fields.map((f) => [f.key, f.control]))).toEqual({
      _border: 'checkbox',
      _bg: 'slider',
      _theme: 'text',
      rotation: 'enum',
      navigation_target: 'enum',
      windStyle: 'enum',
      showHeading: 'checkbox',
      showBearing: 'checkbox',
      showBackground: 'checkbox'
    })
  })

  it('expose les quatre valeurs de windStyle, dans l’ordre du menu natif', () => {
    const windStyle = fieldAt(buildPropertyForm(compass(document())), 'windStyle')
    expect(windStyle.choices).toEqual([
      { value: 'NONE', label: 'Aucun' },
      { value: 'ARROW', label: 'Flèche' },
      { value: 'ARC', label: 'Arc' },
      { value: 'WINDSOCK', label: 'Manche à air' }
    ])
    expect(windStyle.text).toBe('ARC')
    // Seule option de la boussole à porter un `?` sur l'appareil.
    expect(windStyle.help).toMatch(/Manche à air/)
    expect(buildPropertyForm(compass(document())).fields.filter((f) => f.help !== undefined))
      .toHaveLength(1)
  })

  it('fait de _bg un curseur dont le libellé porte la valeur', () => {
    const doc = document()
    const bg = fieldAt(buildPropertyForm(compass(doc)), '_bg')
    expect(bg.control).toBe('slider')
    expect(bg.label).toBe(`Transparence d'arrière-plan${NBSP}: 100%`)
    // Un pourcentage est le seul curseur dont les bornes se lisent dans les données.
    expect(bg.range).toEqual({ min: 0, max: 100 })

    setFieldValue(bg, '40')
    expect(bg.label).toBe(`Transparence d'arrière-plan${NBSP}: 40%`)
  })

  it('laisse un curseur sans bornes connues devenir un champ numérique libre', () => {
    const form = buildPropertyForm(map(document()))
    const thermals = fieldAt(form, 'thermals')
    expect(thermals.control).toBe('slider')
    // « Ne pas montrer les thermiques détectés » : aucune borne lisible, donc aucune
    // inventée — écrêter une valeur légitime au premier glissement serait pire.
    expect(thermals.range).toBeUndefined()
  })

  it('range les trois clés universelles en tête, comme le panneau natif', () => {
    const form = buildPropertyForm(compass(document()))
    expect(form.headCount).toBe(3)
    expect(form.fields.slice(0, 3).map((f) => f.key)).toEqual(['_border', '_bg', '_theme'])
  })

  it('titre le panneau du nom lisible du widget', () => {
    const form = buildPropertyForm(compass(document()))
    expect(form.title).toMatch(/^Gadget : /)
    expect(form.title).not.toMatch(/WCompass/)
  })

  it('suit la langue demandée, et retombe sur l’anglais', () => {
    const form = buildPropertyForm(compass(document()), 'de')
    expect(fieldAt(form, '_border').label).toBe('Zeichne Rahmen')
    expect(fieldAt(form, 'windStyle').choices.map((c) => c.label))
      .not.toEqual(['Aucun', 'Flèche', 'Arc', 'Manche à air'])
  })
})

describe('la langue du panneau suit le fichier, pas seulement le navigateur', () => {
  /** L'intitulé affiché d'une ligne du panneau rendu. */
  function rowLabel(element: HTMLElement, key: string): string | undefined {
    return element.querySelector<HTMLElement>(`[data-key="${key}"] .props__label`)?.textContent
      ?? undefined
  }

  it('bâtit dans la langue chargée, le dit, puis répare le panneau', async () => {
    // Le cas réel : `complète.xcfg` du corpus déclare `Display.Language: fr`. Ouvert
    // sur un navigateur d'une autre langue, `main.ts` demande une langue que le
    // préchargement n'avait pas devinée. Ici c'est l'italien, qu'aucun autre test ne
    // charge, et le navigateur de happy-dom est anglophone.
    const form = buildPropertyForm(compass(document()), 'it')
    expect(form.language).toBe('it')
    // Le formulaire ne ment pas sur ce qu'il a servi.
    expect(form.textLanguage).toBe('en')
    expect(fieldAt(form, '_border').label).toBe('Draw border')

    const panel = renderProperties({ form })
    // Premier rendu : la langue disponible, pas de panneau vide ni de clé brute.
    expect(rowLabel(panel.element, '_border')).toBe('Draw border')

    // Puis le morceau italien arrive et le panneau se refait, dans la section que
    // l'appelant a déjà insérée dans le document — `main.ts` n'a rien à rebrancher.
    await vi.waitFor(() => {
      expect(rowLabel(panel.element, '_border')).toBe('Disegna bordi')
    })
    expect(panel.form.textLanguage).toBe('it')
    expect(panel.element.querySelectorAll('.props__row')).toHaveLength(9)
  })

  it('ne refait rien quand la langue demandée est celle qui a servi', async () => {
    const form = buildPropertyForm(compass(document()), 'fr')
    expect(form.textLanguage).toBe('fr')
    const panel = renderProperties({ form })
    const row = panel.element.querySelector('[data-key="_border"]')
    await Promise.resolve()
    // Le même nœud, pas un remplaçant : aucun rendu superflu.
    expect(panel.element.querySelector('[data-key="_border"]')).toBe(row)
    expect(rowLabel(panel.element, '_border')).toBe('Tracer frontière')
  })

  it('sert l’anglais, jamais une clé de ressource, pour une langue inconnue', () => {
    // `optionsLanguage` ramène `xx` sur l'anglais : le panneau est donc déjà servi et
    // n'a rien à réparer.
    const form = buildPropertyForm(compass(document()), 'xx')
    expect(form.textLanguage).toBe('en')
    expect(fieldAt(form, '_border').label).toBe('Draw border')
  })
})

describe('la règle d’or : rien n’est masqué', () => {
  it('produit un contrôle pour une clé que le catalogue ignore, sous son nom brut', () => {
    const form = buildPropertyForm(oldCompass(document()))

    // Deux vestiges d'une version antérieure de XCTrack, que l'application n'expose plus.
    expect(form.unknownKeys).toEqual(['showWind', 'newWindArrow'])

    const showWind = fieldAt(form, 'showWind')
    expect(showWind.known).toBe(false)
    expect(showWind.label).toBe('showWind')
    expect(showWind.control).toBe('checkbox') // déduit du type JSON, faute de catalogue
    expect(showWind.text).toBe('true')

    // Et ils restent à leur place dans l'ordre du fichier, pas relégués en fin de liste.
    expect(form.fields.map((f) => f.key)).toEqual([
      '_border', '_bg', '_theme', 'rotation', 'navigation_target',
      'showWind', 'newWindArrow', 'showHeading', 'showBearing', 'showBackground'
    ])
  })

  it('ajoute à une liste une valeur courante que le catalogue ne connaît pas', () => {
    const doc = document()
    const widget = compass(doc)
    const form = buildPropertyForm(widget)
    const windStyle = fieldAt(form, 'windStyle')
    setFieldValue(windStyle, 'PENNANT') // valeur d'une version future, ou d'un fichier bricolé

    const panel = renderProperties({ form: buildPropertyForm(widget) })
    const select = panel.element.querySelector<HTMLSelectElement>('[data-key="windStyle"] select')
    expect(select).not.toBeNull()
    expect(select?.value).toBe('PENNANT')
    expect([...select!.options].map((o) => o.value))
      .toEqual(['PENNANT', 'NONE', 'ARROW', 'ARC', 'WINDSOCK'])
  })

  it('montre sans la réécrire une valeur qui n’est ni chaîne ni littéral', () => {
    const doc = document()
    const widget = compass(doc)
    // Une clé dont la valeur est un tableau : XCTrack peut en introduire à tout moment.
    if (widget.node.kind !== 'object') throw new Error('objet attendu')
    widget.node.entries.push(['"futureList"', { kind: 'array', items: [{ kind: 'literal', raw: '1' }] }])

    const field = fieldAt(buildPropertyForm(widget), 'futureList')
    expect(field.control).toBe('unknown')
    expect(setFieldValue(field, '[2]')).toBe(false)
    expect(serializeJson(widget.node)).toContain('"futureList"')
  })
})

describe('les clés composites', () => {
  it('éclate rotation en deux contrôles, le second en retrait', () => {
    const form = buildPropertyForm(map(document()))

    const value = fieldAt(form, 'rotation.value')
    const showCompass = fieldAt(form, 'rotation.showCompass')
    expect(form.fields.indexOf(showCompass)).toBe(form.fields.indexOf(value) + 1)

    // Le sous-champ principal porte le libellé traduit de l'option…
    expect(value.label).toBe('Rotation')
    expect(value.depth).toBe(0)
    expect(value.text).toBe('NORTH_AT_TOP')

    // …le subordonné porte son chemin, et s'affiche en retrait sous lui. Le catalogue
    // n'a pas de libellé à lui donner : `widgetSettingsRotationShowCompass` n'a aucune
    // traduction dans le pool de chaînes. On ne fabrique donc rien.
    expect(showCompass.label).toBe('rotation · showCompass')
    expect(showCompass.hint).toBe('Rotation')
    expect(showCompass.control).toBe('checkbox')
    expect(showCompass.depth).toBe(1)
  })

  it('ne devine pas un contrôle qu’il ne sait pas régler', () => {
    const form = buildPropertyForm(map(document()))
    // Le panneau natif présente la rotation d'une carte en liste déroulante, mais le
    // catalogue ne donne les valeurs permises que pour la rotation de la boussole, et
    // ce ne sont pas les mêmes constantes (`NORTH` contre `NORTH_AT_TOP`). Un champ
    // texte plutôt qu'une liste tronquée qui perdrait la valeur courante.
    expect(fieldAt(form, 'rotation.value').control).toBe('text')
    expect(fieldAt(form, 'rotation.value').choices).toEqual([])
  })

  it('éclate aussi une composite à trois sous-champs', () => {
    const form = buildPropertyForm(map(document()))
    const paths = form.fields.filter((f) => f.key === 'mapWidget_scale').map((f) => f.path)
    expect(paths).toEqual([
      'mapWidget_scale.value', 'mapWidget_scale.auto', 'mapWidget_scale.resetZoomPanExit'
    ])
    expect(fieldAt(form, 'mapWidget_scale.value').control).toBe('number')
    expect(fieldAt(form, 'mapWidget_scale.auto').depth).toBe(1)
  })

  it('écrit dans le sous-objet, pas dans le widget', () => {
    const doc = document()
    const widget = map(doc)
    const field = fieldAt(buildPropertyForm(widget), 'rotation.showCompass')

    expect(setFieldValue(field, 'true')).toBe(true)
    const rotation = getMember(widget.node, 'rotation')
    expect(rotation).toBeDefined()
    expect(getMember(rotation!, 'showCompass')).toEqual({ kind: 'literal', raw: 'true' })
  })
})

describe('les couleurs', () => {
  it('lit un entier signé 32 bits ARGB et le rend en #AARRGGBB', () => {
    // Vérification chiffrée du relevé : tracklog_color vaut -27091, affiché FFFF962D.
    expect(colorToHex('-27091')).toBe('#FFFF962D')
    expect(colorToLiteral('#FFFF962D')).toBe('-27091')
    expect(colorToLiteral('FF962D')).toBe('-27091') // alpha implicite
    expect(colorToLiteral('pas une couleur')).toBeUndefined()
  })

  it('présente tracklog_color comme une couleur', () => {
    const field = fieldAt(buildPropertyForm(map(document())), 'tracklog_color')
    expect(field.control).toBe('color')
    expect(field.text).toBe('-27091')
  })
})

describe('une modification ne change que ce qu’on a demandé', () => {
  it('ne touche qu’une ligne du document sérialisé', () => {
    const doc = document()
    const before = serializeJson(doc)

    const field = fieldAt(buildPropertyForm(compass(doc)), 'windStyle')
    expect(setFieldValue(field, 'WINDSOCK')).toBe(true)

    const changed = diffLines(before, serializeJson(doc))
    expect(changed).toHaveLength(1)
    expect(changed[0]).toContain('"windStyle": "WINDSOCK"')
  })

  it('ne touche qu’une ligne en modifiant un sous-champ composite', () => {
    const doc = document()
    const before = serializeJson(doc)

    const field = fieldAt(buildPropertyForm(map(doc)), 'mapWidget_scale.auto')
    expect(setFieldValue(field, 'false')).toBe(true)

    const changed = diffLines(before, serializeJson(doc))
    expect(changed).toHaveLength(1)
    expect(changed[0]).toContain('"auto": false')
  })

  it('n’écrit rien quand la valeur ne change pas — le texte source est préservé', () => {
    const doc = document()
    const before = serializeJson(doc)

    const form = buildPropertyForm(compass(doc))
    expect(setFieldValue(fieldAt(form, 'windStyle'), 'ARC')).toBe(false)
    expect(setFieldValue(fieldAt(form, '_bg'), '100')).toBe(false)
    expect(setFieldValue(fieldAt(form, '_border'), 'true')).toBe(false)

    expect(serializeJson(doc)).toBe(before)
  })

  it('produit le texte du nombre lui-même, sans passer par un number', () => {
    const doc = document()
    const field = fieldAt(buildPropertyForm(map(doc)), 'mapWidget_KK7opacity')
    // Un `40.0` saisi tel quel doit rester `40.0` : `setLiteral` ne prend qu'un texte.
    setFieldValue(field, '40.0')
    expect(serializeJson(map(doc).node)).toContain('"mapWidget_KK7opacity": 40.0')
  })
})

describe('rendu du panneau', () => {
  it('rend un contrôle par champ, dans l’ordre, avec sa clé en attribut', () => {
    const form = buildPropertyForm(compass(document()))
    const panel = renderProperties({ form })

    const rows = [...panel.element.querySelectorAll<HTMLElement>('.props__row')]
    expect(rows).toHaveLength(9)
    expect(rows.map((row) => row.dataset.key)).toEqual(form.fields.map((f) => f.path))
    // Le trait qui ferme le bloc universel de tête — le seul séparateur attesté.
    expect(panel.element.querySelectorAll('.props__rule')).toHaveLength(1)
  })

  it('applique une case à cocher au document', () => {
    const doc = document()
    const widget = compass(doc)
    const before = serializeJson(doc)
    const seen: string[] = []
    const panel = renderProperties({
      form: buildPropertyForm(widget),
      onChange: (field) => seen.push(field.path)
    })

    const box = panel.element.querySelector<HTMLInputElement>('[data-key="showHeading"] input')
    expect(box?.checked).toBe(false)
    box!.checked = true
    box!.dispatchEvent(new Event('change'))

    expect(seen).toEqual(['showHeading'])
    const changed = diffLines(before, serializeJson(doc))
    expect(changed).toHaveLength(1)
    expect(changed[0]).toContain('"showHeading": true')
  })

  it('réécrit l’intitulé d’un curseur quand sa valeur bouge', () => {
    const doc = document()
    const panel = renderProperties({ form: buildPropertyForm(compass(doc)) })
    const row = panel.element.querySelector<HTMLElement>('[data-key="_bg"]')!
    const slider = row.querySelector<HTMLInputElement>('input')!

    expect(slider.type).toBe('range')
    expect(slider.max).toBe('100')
    expect(row.querySelector('label')?.textContent).toBe(`Transparence d'arrière-plan${NBSP}: 100%`)

    slider.value = '30'
    slider.dispatchEvent(new Event('input'))
    expect(row.querySelector('label')?.textContent).toBe(`Transparence d'arrière-plan${NBSP}: 30%`)
    expect(serializeJson(compass(doc).node)).toContain('"_bg": 30')
  })

  it('déplie l’aide sous le bouton `?`', () => {
    const panel = renderProperties({ form: buildPropertyForm(compass(document())) })
    const buttons = panel.element.querySelectorAll<HTMLButtonElement>('.props__help')
    expect(buttons).toHaveLength(1)

    const help = panel.element.querySelector<HTMLElement>('.props__help-text')!
    expect(help.hidden).toBe(true)
    buttons[0]!.click()
    expect(help.hidden).toBe(false)
    expect(buttons[0]!.getAttribute('aria-expanded')).toBe('true')
  })

  it('signale une clé hors catalogue sans la cacher', () => {
    const panel = renderProperties({ form: buildPropertyForm(oldCompass(document())) })
    const row = panel.element.querySelector<HTMLElement>('[data-key="showWind"]')!
    expect(row.dataset.unknown).toBe('true')
    expect(row.querySelector('.props__badge')?.textContent).toBe('clé hors catalogue')
    expect(row.querySelector('label')?.textContent).toBe('showWind')
  })

  it('montre une pastille de la bonne couleur', () => {
    const panel = renderProperties({ form: buildPropertyForm(map(document())) })
    const row = panel.element.querySelector<HTMLElement>('[data-key="tracklog_color"]')!
    const hex = row.querySelector<HTMLInputElement>('input')!
    expect(hex.value).toBe('#FFFF962D')

    // happy-dom ne normalise pas les couleurs : on relit la notation qu'on a posée.
    const swatch = row.querySelector<HTMLElement>('.props__swatch')!
    expect(swatch.style.backgroundColor).toBe('#FF962D')

    hex.value = '#800000FF'
    hex.dispatchEvent(new Event('change'))
    expect(swatch.style.backgroundColor).toBe('#0000FF')
    expect(fieldAt(panel.form, 'tracklog_color').text).toBe(colorToLiteral('#800000FF'))
  })

  it('remet la valeur du fichier quand la couleur saisie est invalide', () => {
    const doc = document()
    const before = serializeJson(doc)
    const panel = renderProperties({ form: buildPropertyForm(map(doc)) })
    const hex = panel.element.querySelector<HTMLInputElement>('[data-key="tracklog_color"] input')!

    hex.value = 'rouge'
    hex.dispatchEvent(new Event('change'))
    expect(hex.value).toBe('#FFFF962D')
    expect(serializeJson(doc)).toBe(before)
  })
})

describe('un widget cartographique reste exploitable', () => {
  it('produit un formulaire complet, clés composites éclatées', () => {
    const form = buildPropertyForm(map(document()))

    // 43 clés de réglage dans le fichier, dont quatre composites : elles donnent
    // 2 + 2 + 3 + 3 contrôles au lieu de quatre.
    expect(form.fields).toHaveLength(49)
    expect(form.fields.filter((f) => f.field !== undefined)).toHaveLength(10)
    expect(new Set(form.fields.map((f) => f.path)).size).toBe(form.fields.length)

    // Trois clés que l'extraction n'a pas su rattacher : elles sont là quand même.
    expect(form.unknownKeys).toEqual([
      'mapWidget_pilotEdgeDistance', 'mapWidget_panningTimeout', 'mapWidget_heading_arrow_sizecoef'
    ])
    // Et tout le reste porte un libellé, pas un nom de clé nu.
    const plain = form.fields.filter((f) => f.field === undefined)
    expect(plain.filter((f) => f.label === f.key).map((f) => f.key)).toEqual(form.unknownKeys)
  })

  it('tient sur le panneau le plus fourni du corpus', () => {
    const doc = document()
    const widgets = [...readLayout(doc).portrait, ...readLayout(doc).landscape]
      .flatMap((page) => page.widgets)
    const forms = widgets.map((widget) => buildPropertyForm(widget))

    // Tous les widgets du fichier, 105 exemplaires de 37 types, produisent un formulaire
    // cohérent : chemins uniques, libellés non vides, valeur lisible.
    for (const form of forms) {
      expect(new Set(form.fields.map((f) => f.path)).size).toBe(form.fields.length)
      expect(form.fields.every((f) => f.label.length > 0)).toBe(true)
    }

    const widest = forms.reduce((a, b) => (b.fields.length > a.fields.length ? b : a))
    expect(widest.shortName).toBe('WXCAssistant')
    expect(widest.fields).toHaveLength(63)
    // Rien n'est perdu en route : autant de contrôles que de sous-valeurs réglables.
    expect(widest.unknownKeys.length).toBe(3)
  })

  it('offre un filtre au-delà d’une douzaine de contrôles, et pas en deçà', () => {
    const wide = renderProperties({ form: buildPropertyForm(map(document())) })
    expect(wide.element.querySelector('.props__filter')).not.toBeNull()

    const narrow = renderProperties({ form: buildPropertyForm(compass(document())) })
    expect(narrow.element.querySelector('.props__filter')).toBeNull()
  })

  it('filtre sur le libellé comme sur la clé, accents compris', () => {
    const panel = renderProperties({ form: buildPropertyForm(map(document())) })
    const visible = (): string[] => [...panel.element.querySelectorAll<HTMLElement>('.props__row')]
      .filter((row) => !row.hidden)
      .map((row) => row.dataset.key!)

    expect(visible()).toHaveLength(49)

    panel.filter('KK7')
    expect(visible()).toEqual([
      'mapWidget_showKK7', 'mapWidget_KK7opacity', 'mapWidget_KK7timed', 'mapWidget_KK7timedOpacity'
    ])

    panel.filter('epaisseur')
    expect(visible()).toEqual(['line_thickness'])

    panel.filter('')
    expect(visible()).toHaveLength(49)
  })
})
