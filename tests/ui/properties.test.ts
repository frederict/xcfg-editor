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
import { BACKUP_2025, BACKUP_2026 } from '../fixtures/paths'
import { DEFAULTS_VERSION_CODE, DEFAULTS_VERSION_NAME } from '../../src/catalog/widgetDefaults'

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

/* ================================================================================== */
/*                     consultation : lire des réglages sans les toucher              */
/* ================================================================================== */

/**
 * Le fichier de référence vient de la version même du relevé des défauts (versionCode
 * 100030) : sa comparaison est exacte. `BACKUP_2025`, lui, vient de 0.9.12.3 — c'est le
 * cas où l'interface doit dire que la comparaison n'est qu'indicative.
 */
const OLD_SOURCE = readFileSync(BACKUP_2025, 'utf8')

function oldDocument(): JsonNode {
  return parseJson(OLD_SOURCE)
}

function readOnlyPanel(widget: Widget, options: Record<string, unknown> = {}) {
  return renderProperties({ form: buildPropertyForm(widget), readOnly: true, ...options })
}

function rowsOf(panel: { element: HTMLElement }): HTMLElement[] {
  return [...panel.element.querySelectorAll<HTMLElement>('.props__row')]
}

function visibleKeys(panel: { element: HTMLElement }): string[] {
  return rowsOf(panel).filter((row) => !row.hidden).map((row) => row.dataset.key!)
}

describe('le panneau de consultation ne peut pas modifier le document', () => {
  it('ne construit aucun contrôle de formulaire — rien à désactiver, rien à réactiver', () => {
    const panel = readOnlyPanel(map(document()))
    expect(panel.readOnly).toBe(true)
    expect(panel.element.dataset.mode).toBe('lecture')

    // Le champ de filtrage est le seul `input` admis : il ne touche pas au document, il
    // masque des lignes. Tout le reste — cases, listes, curseurs, champs texte — est
    // absent, et non désactivé : un contrôle grisé se réactive, une absence non.
    const inputs = [...panel.element.querySelectorAll<HTMLInputElement>('input')]
    expect(inputs.map((input) => input.type)).toEqual(['search'])
    expect(inputs[0]!.className).toBe('props__filter')

    expect(panel.element.querySelectorAll('select')).toHaveLength(0)
    expect(panel.element.querySelectorAll('textarea')).toHaveLength(0)
    expect(panel.element.querySelectorAll('[contenteditable]')).toHaveLength(0)
    expect(panel.element.querySelectorAll('form')).toHaveLength(0)
  })

  it('ne comporte que des boutons inoffensifs : l’aide, et le filtre des différences', () => {
    const panel = readOnlyPanel(map(document()))
    const classes = new Set(
      [...panel.element.querySelectorAll<HTMLButtonElement>('button')]
        .flatMap((button) => [...button.classList])
    )
    // Aucun bouton qui écrirait : `props__help` déplie une aide, `props__defaults-only`
    // masque des lignes.
    expect([...classes].every((name) => /^(btn|props__help|props__defaults-only)$/.test(name)))
      .toBe(true)
  })

  it('résiste à une tentative de modification par tous les moyens du DOM', () => {
    const doc = oldDocument()
    const widget = readLayout(doc).landscape.flatMap((page) => page.widgets)
      .find((one) => one.shortName === 'WCompMap')!
    const before = serializeJson(doc)

    let called = 0
    // `onChange` est fourni **exprès** : le contrat n'est pas « l'appelant s'abstient »,
    // c'est « le panneau ne le rappelle jamais ».
    const panel = readOnlyPanel(widget, { onChange: () => { called += 1 } })

    const events = ['input', 'change', 'click', 'keydown', 'keyup', 'blur', 'focus', 'pointerdown']
    for (const node of panel.element.querySelectorAll<HTMLElement>('*')) {
      // On force une valeur là où il pourrait y en avoir une — la seule cible réelle est
      // le champ de filtre, et il ne mène nulle part.
      if ('value' in node) (node as unknown as { value: string }).value = 'XXX'
      if ('checked' in node) (node as unknown as { checked: boolean }).checked = true
      node.setAttribute('contenteditable', 'true')
      node.textContent = node.textContent === '' ? node.textContent : node.textContent
      for (const type of events) node.dispatchEvent(new Event(type, { bubbles: true }))
    }

    expect(called).toBe(0)
    // La preuve : le document sérialisé, octet pour octet.
    expect(serializeJson(doc)).toBe(before)
  })

  it('le panneau d’édition, lui, garde ses contrôles : la lecture seule est un mode, pas une régression', () => {
    const panel = renderProperties({ form: buildPropertyForm(compass(document())) })
    expect(panel.readOnly).toBe(false)
    expect(panel.element.dataset.mode).toBe('edition')
    expect(panel.element.querySelectorAll('input').length).toBeGreaterThan(0)
    expect(panel.element.querySelectorAll('.props__value')).toHaveLength(0)
  })
})

describe('la consultation sépare ce que le pilote a réglé de ce que XCTrack a posé', () => {
  it('marque chaque ligne d’un des trois états, et de rien d’autre', () => {
    const panel = readOnlyPanel(compass(document()))
    const states = rowsOf(panel).map((row) => row.dataset.default)
    expect(states).toHaveLength(9)
    expect(states.every((state) => ['custom', 'default', 'unknown'].includes(state!))).toBe(true)
  })

  it('les trois clés universelles sont « hors relevé » : le relevé les a écrites lui-même', () => {
    const panel = readOnlyPanel(compass(document()))
    for (const key of ['_border', '_bg', '_theme']) {
      const row = panel.element.querySelector<HTMLElement>(`[data-key="${key}"]`)!
      expect(row.dataset.default).toBe('unknown')
      expect(row.querySelector('.props__origin')?.textContent).toBe('hors relevé')
    }
  })

  it('la boussole du corpus : quatre réglages du pilote sur six comparables', () => {
    const form = buildPropertyForm(compass(document()))
    expect(form.defaultsKnown).toBe(true)
    // Neuf contrôles ; les trois clés universelles ne se comparent pas.
    expect(form.fields).toHaveLength(9)
    expect(form.comparableCount).toBe(6)
    expect(form.customizedCount).toBe(4)

    expect(form.fields.map((field) => `${field.path}:${field.defaultState}`)).toEqual([
      '_border:unknown', '_bg:unknown', '_theme:unknown',
      'rotation:custom', 'navigation_target:custom', 'windStyle:custom',
      'showHeading:default', 'showBearing:custom', 'showBackground:default'
    ])
  })

  it('affiche la valeur du relevé sur la ligne qui s’en écarte', () => {
    // La boussole du corpus dessine le vent en arc ; XCTrack n'en dessine aucun par défaut.
    const panel = readOnlyPanel(compass(document()))
    const row = panel.element.querySelector<HTMLElement>('[data-key="windStyle"]')!
    expect(row.dataset.default).toBe('custom')
    const mark = row.querySelector<HTMLElement>('.props__origin')!
    // Le défaut se dit dans la langue du panneau, comme la valeur juste à côté : la
    // constante du fichier reste dans l'infobulle, pour qui compare deux sauvegardes.
    const none = fieldAt(panel.form, 'windStyle').choices.find((one) => one.value === 'NONE')!
    expect(mark.textContent).toBe(`≠ défaut ${none.label}`)
    expect(mark.title).toContain('XCTrack écrit « NONE »')

    const bool = panel.element.querySelector<HTMLElement>('[data-key="showBearing"] .props__origin')!
    expect(bool.textContent).toBe('≠ défaut Non')

    const same = panel.element.querySelector<HTMLElement>('[data-key="showBackground"]')!
    expect(same.dataset.default).toBe('default')
    expect(same.querySelector('.props__origin')?.textContent).toBe('= défaut')
  })

  it('c’est sur un widget chargé que la distinction paie : 63 réglages, 17 du pilote', () => {
    const doc = document()
    const widget = readLayout(doc).landscape.flatMap((page) => page.widgets)
      .find((one) => one.shortName === 'WXCAssistant')!
    const form = buildPropertyForm(widget)

    // Le cas que la fonction doit servir : aligner 63 lignes sans hiérarchie ne dit rien,
    // en désigner 17 répond à la question qu'on se pose devant la page d'un autre pilote.
    expect(form.fields).toHaveLength(63)
    expect(form.comparableCount).toBe(60)
    expect(form.customizedCount).toBe(17)

    const panel = renderProperties({ form, readOnly: true })
    expect(panel.element.querySelector('.props__defaults-count')?.textContent)
      .toBe('17 réglages personnalisés sur 60 comparés.')
  })

  it('compte les personnalisés sur les contrôles comparables, jamais sur le total', () => {
    const form = buildPropertyForm(map(document()))
    expect(form.fields).toHaveLength(49)
    expect(form.comparableCount).toBe(46)
    expect(form.customizedCount).toBe(4)

    const comparable = form.fields.filter((field) => field.defaultState !== 'unknown')
    expect(comparable).toHaveLength(form.comparableCount)
    expect(comparable.filter((field) => field.defaultState === 'custom'))
      .toHaveLength(form.customizedCount)
  })

  it('un type que le relevé ignore ne devient pas « tout personnalisé »', () => {
    const doc = document()
    const widget = readLayout(doc).landscape.flatMap((page) => page.widgets)
      .find((one) => one.shortName === 'WCompass')!
    // On force un type inconnu du relevé en interrogeant le formulaire sous un autre nom.
    const form = buildPropertyForm({ node: widget.node, shortName: 'WPasDansLeReleve' })
    expect(form.defaultsKnown).toBe(false)
    expect(form.comparableCount).toBe(0)
    expect(form.customizedCount).toBe(0)
    expect(form.fields.every((field) => field.defaultState === 'unknown')).toBe(true)

    const panel = renderProperties({ form, readOnly: true })
    expect(panel.element.querySelector('.props__defaults-count')?.textContent)
      .toContain('ne décrit pas ce type de widget')
    // Pas de filtre « seulement ce qui diffère » : il ne laisserait rien à l'écran.
    expect(panel.element.querySelector('.props__defaults-only')).toBeNull()
  })

  it('le filtre des différences ne laisse que les personnalisés, et se compose avec la recherche', () => {
    const form = buildPropertyForm(map(document()))
    const panel = renderProperties({ form, readOnly: true })
    const custom = form.fields.filter((field) => field.defaultState === 'custom').map((f) => f.path)
    expect(custom.length).toBeGreaterThan(0)

    expect(visibleKeys(panel)).toHaveLength(form.fields.length)

    const only = panel.element.querySelector<HTMLButtonElement>('.props__defaults-only')!
    only.click()
    expect(only.getAttribute('aria-pressed')).toBe('true')
    expect(only.textContent).toBe('Tout afficher')
    expect(visibleKeys(panel)).toEqual(custom)

    // Les deux filtres se composent : chercher DANS ce qui diffère, et non à la place.
    panel.filter('KK7')
    expect(visibleKeys(panel).every((key) => custom.includes(key))).toBe(true)
    expect(visibleKeys(panel).every((key) => /KK7/i.test(key))).toBe(true)

    panel.filter('')
    only.click()
    expect(only.getAttribute('aria-pressed')).toBe('false')
    expect(visibleKeys(panel)).toHaveLength(form.fields.length)
  })

  it('rend les valeurs en toutes lettres plutôt qu’en texte source', () => {
    const panel = readOnlyPanel(compass(document()))
    const value = (key: string): string =>
      panel.element.querySelector<HTMLElement>(`[data-key="${key}"] .props__value`)!.textContent!

    // Un booléen se lit, il ne se coche pas.
    expect(['Oui', 'Non']).toContain(value('showHeading'))
    // Une énumération montre son libellé traduit, pas la constante du fichier.
    expect(value('windStyle')).not.toBe('')
    expect(fieldAt(panel.form, 'windStyle').choices.map((c) => c.label))
      .toContain(value('windStyle'))
  })

  it('montre la pastille d’une couleur sans champ de saisie', () => {
    const panel = readOnlyPanel(map(document()))
    const row = panel.element.querySelector<HTMLElement>('[data-key="tracklog_color"]')!
    expect(row.querySelector('input')).toBeNull()
    expect(row.querySelector('.props__hexText')?.textContent).toBe('#FFFF962D')
    expect(row.querySelector<HTMLElement>('.props__swatch')!.style.backgroundColor).toBe('#FF962D')
  })
})

describe('ce que la consultation dit quand le fichier vient d’une autre version', () => {
  it('annonce une comparaison exacte pour un fichier de la version du relevé', () => {
    const panel = readOnlyPanel(compass(document()), { fileVersionCode: DEFAULTS_VERSION_CODE })
    const box = panel.element.querySelector<HTMLElement>('.props__defaults')!
    expect(box.dataset.trust).toBe('exact')
    const note = box.querySelector('.props__defaults-note')!.textContent!
    expect(note).toContain(DEFAULTS_VERSION_NAME)
    expect(note).toContain('la version même de ce fichier')
    expect(note).not.toContain('indicative')
  })

  it('avertit que la comparaison n’est qu’indicative pour une autre version', () => {
    const doc = oldDocument()
    const widget = readLayout(doc).landscape.flatMap((page) => page.widgets)
      .find((one) => one.shortName === 'WCompass')!
    const panel = readOnlyPanel(widget, { fileVersionCode: 91230, fileVersionName: '0.9.12.3' })

    const box = panel.element.querySelector<HTMLElement>('.props__defaults')!
    expect(box.dataset.trust).toBe('indicative')
    const note = box.querySelector('.props__defaults-note')!.textContent!
    expect(note).toContain('0.9.12.3')
    expect(note).toContain('91230')
    expect(note).toContain('indicative')
    // La comparaison n'est pas supprimée pour autant : elle reste faite, et dite.
    expect(box.dataset.comparable).not.toBe('0')
  })

  it('avertit aussi quand le fichier ne dit pas d’où il vient', () => {
    const panel = readOnlyPanel(compass(document()))
    const box = panel.element.querySelector<HTMLElement>('.props__defaults')!
    expect(box.dataset.trust).toBe('unstated')
    expect(box.querySelector('.props__defaults-note')!.textContent)
      .toContain('ne dit pas de quelle version il vient')
  })

  it('signale les réglages du relevé que le widget ne porte pas — la trace d’une autre version', () => {
    const doc = oldDocument()
    const widget = readLayout(doc).landscape.flatMap((page) => page.widgets)
      .find((one) => one.shortName === 'WCompass')!
    const form = buildPropertyForm(widget)

    // `windStyle` n'existait pas en 0.9.12.3 ; en regard, `showWind` et `newWindArrow` y
    // vivent encore et sont deux vestiges que le relevé de 1.0.3-beta ne connaît plus.
    expect(form.missingDefaults).toEqual(['windStyle'])
    expect(form.fields.map((field) => field.path)).toContain('showWind')
    expect(fieldAt(form, 'showWind').defaultState).toBe('unknown')

    const panel = renderProperties({ form, readOnly: true, fileVersionCode: 91230 })
    const note = panel.element.querySelector('.props__defaults-note')!.textContent!
    expect(note).toContain('1 réglage du relevé ne figure pas dans ce widget (windStyle)')
    expect(note).toContain('indicative')
  })
})
