# Verser un message au catalogue — la marche à suivre

Ce document s'adresse à qui **extrait la prose d'un écran** vers `src/i18n/`. Il dit où
écrire, comment nommer, comment le traducteur arrive dans un module, ce qui est **déjà
tranché** et ne se rejuge pas, et ce qu'il ne faut jamais faire.

L'extraction est découpée en lots qui avancent **en parallèle**. Tout ce qui suit existe
pour qu'aucun lot n'ait à toucher le fichier d'un autre.

## 1. Votre fichier, et lui seul

Un domaine = un lot de travail = un fichier par langue. Le vôtre :

| Domaine | Écrans couverts | Fichiers |
|---|---|---|
| `app` | `main.ts`, `views.ts`, `editor.ts` | `messages/<langue>/app.ts` |
| `preferences` | `preferencesPage.ts` | `messages/<langue>/preferences.ts` |
| `library` | `libraryPanel.ts` | `messages/<langue>/library.ts` |
| `widgets` | `properties.ts`, `widgetPalette.ts`, `widgetList.ts` | `messages/<langue>/widgets.ts` |
| `versions` | `versionDiagnostic.ts`, `cleanupPanel.ts` | `messages/<langue>/versions.ts` |
| `sharing` | `sharingDialog.ts`, `warnings.ts` | `messages/<langue>/sharing.ts` |
| `pages` | `pageManager.ts`, `deviceSelector.ts` | `messages/<langue>/pages.ts` |
| `model` | la prose **hors interface** : `src/model/`, `src/library/`, `src/catalog/` | `messages/<langue>/model.ts` |
| `common` | le vocabulaire partagé — **lecture seule pour vous**, voir § 6 | `messages/<langue>/common.ts` |

Cinq fichiers à modifier pour un message : le français d'abord, puis `en`, `de`, `es`,
`nl`. Rien d'autre. **Vous ne touchez ni `index.ts`, ni `catalog.ts`, ni `domains.ts`** —
sauf le cas du § 2, qui doit rester rare.

## 2. Nommer la clé

`<préfixe>.<nomEnLowerCamelCase>` — **deux segments**, pas trois. `library.entryRestored`,
`preferences.absentFromFile`, `versions.publishedCount`.

Les préfixes de votre domaine sont déclarés dans `src/i18n/domains.ts`
(`DOMAIN_PREFIXES`), et un préfixe appartient à un domaine et à un seul : c'est ce qui
garantit qu'une clé n'existe qu'à un endroit. Un test le vérifie.

**Une famille de valeurs fermée prend son propre préfixe** : `factoryValue.same`,
`provenance.apkSurvey`, `personalKind.identity`. C'est plus lisible qu'un troisième
segment et le `grep` reste immédiat.

Si votre lot a besoin d'un préfixe non déclaré, ajoutez-le à `DOMAIN_PREFIXES` — c'est la
seule ligne partagée que vous toucherez, et le conflit éventuel est d'une ligne.

**La clé est un identifiant : elle est en anglais.** Le texte est de la prose : il est en
français, puis traduit. C'est la règle du dépôt, sans exception.

## 3. Écrire le message

```ts
// messages/fr/library.ts
'library.entryCount': {
  one: '{count} configuration rangée',
  other: '{count} configurations rangées'
}
```

- **Un nombre ⇒ un pluriel**, jamais un `s` collé en ternaire. Chaque forme est une
  **phrase entière** : l'allemand y change le verbe, l'espagnol met le verbe en tête.
- **Les repères sont nommés** — `{count}`, `{name}`, `{total}` — jamais positionnels,
  jamais concaténés. L'ordre des mots change d'une langue à l'autre.
- **La ponctuation appartient au message**, guillemets compris : « … » en français,
  “ … ” en anglais, „ … “ en allemand, ‘ … ’ en néerlandais, « … » en espagnol.
- **Un `number` est mis en forme par la langue, une `string` est recopiée telle quelle.**
  C'est ce qui protège les identifiants : `versionCode`, `1.0.3-beta`, un rang lu dans une
  clé du fichier se passent en **`string`** — « 100 030 » ne se trouve dans aucun fichier
  XCTrack.

À l'appel :

```ts
tr.t('library.entryCount', { count: entries.length })
tr.t('library.storedLine', {
  name: entry.name,
  size: tr.format.byteSize(entry.byteLength),
  when: tr.format.dateTime(entry.storedAt) ?? tr.t('common.unknownDate')
})
```

Le compilateur refuse une clé inconnue, un repère manquant, un argument inutile, et un
`count` qui n'est pas un nombre. Il ne voit pas un repère **oublié dans une traduction** :
c'est `tests/i18n/catalog.test.ts` qui l'attrape.

## 4. Les formateurs — rien à la main

`tr.format` : `number`, `decimal`, `percent`, `millimeters`, `inches`, `byteSize`,
`dateTime`, `date`, `list`.

- Jamais de `.replace('.', ',')`, jamais de `toLocaleString('fr-FR')`, jamais de nom de
  mois écrit en dur, jamais `o` / `ko` / `Mo` en dur — ils s'écrivent `B` / `kB` / `MB`
  ailleurs.
- `list(items)` rend « a, b et c », « a, b, and c » (virgule d'Oxford), « a, b y c ».
  `list(items, 'or')` rend l'alternative. Il remplace le `frenchList()` de
  `versionDiagnostic.ts`.
- ⚠️ `list` est pour une **énumération dans une phrase**. Une colonne de données — des
  noms de fichiers alignés — se joint par `', '` : « coupe.wpt et autre.wpt » ferait lire
  une prose là où il y a une liste.
- `dateTime` rend `undefined` quand la date est illisible. Le mot à afficher alors est de
  la prose : `tr.t('common.unknownDate')`.

## 5. Comment le traducteur arrive dans un module

**Il est passé, jamais lu.** Aucun module ne va chercher la langue courante.

**Un écran de `src/ui/`** le reçoit dans son objet d'options, à côté du reste :

```ts
export interface LibraryPanelOptions {
  readonly tr: Translator
  …
}
```

`main.ts` détient le traducteur (`loadTranslator`) et le passe à chaque constructeur. Le
lot `app` possède `main.ts` : s'il n'a pas encore ajouté `tr` à l'appel de votre écran,
ajoutez-le — c'est **une ligne**, et un conflit d'une ligne se règle en le lisant.

**Une couche sous l'interface** — `src/model/`, `src/library/`, `src/catalog/`,
`src/render/` — reçoit le traducteur **en argument** et n'importe de `src/i18n/` que des
**types** (`import type { Translator }`, effacé à la compilation). C'est la décision
arrêtée, contre l'alternative « rendre des clés que l'appelant traduirait » : cette
seconde voie ferait remonter dans chaque écran le pluriel, les repères et les formateurs,
c'est-à-dire tout ce que le socle existe pour tenir. C'est aussi le motif que le dépôt
emploie déjà — `resolveLanguage` reçoit `navigator.language` au lieu de le lire.

**L'exemple à copier : `src/model/personalData.ts`.** Il expose `personalProse(tr)`, un
objet de six fonctions ; un écran qui affiche cinquante lignes le construit une fois.
`tests/i18n/domains.test.ts` refuse tout `import` de valeur de `src/i18n/` dans ces
couches.

**Une couche qui remplace de la prose par un traducteur pendant que des écrans emploient
encore l'ancienne constante française** : gardez les deux, marquez l'ancienne « héritée »,
et ajoutez le test qui vérifie que le catalogue français dit **exactement** ce qu'elle
dit. `personalData.test.ts` en donne le modèle. Aucune dérive n'est alors possible, et le
jour de la bascule il n'y a rien à relire.

## 6. Ce qui est déjà tranché — ne le rejugez pas

**Le vocabulaire**, arrêté par 23 commits de relecture et épinglé par des tests :

| À écrire | Jamais |
|---|---|
| **valeur d'usine** | « défaut », qui se lit *anomalie* |
| **réglage** (une préférence), **ligne du fichier** (une entrée) | « clé » |
| **périmé**, **angle mort**, **inconnu** (statuts du diagnostic) | d'autres mots pour ces trois-là |
| **gadget** en français ; *widget* en `en`, `nl`, `es` ; *Widget* en allemand | l'inverse, dans un sens ou dans l'autre |
| **Rétablir** (refaire), **Zoom 100 %** (le zoom), **replacée** (la bibliothèque) | un même mot pour ces trois gestes |
| l'interface parle **au** pilote — « écrit par vous » | parler **de** lui — « écrit par le pilote » |

Le mot *gadget* est **mesuré** : la chrome française de XCTrack dit « Gadget » là où le
pilote pose un gadget sur une page ; les chromes allemande, néerlandaise et espagnole
disent « Widget », sur les 55 versions relevées. Voir `messages/fr/common.ts`.

**La mécanique** : `Intl.PluralRules` pour le pluriel (`PluralForms`), `Intl.NumberFormat`
et `Intl.DateTimeFormat` pour les nombres, tailles et dates, `Intl.ListFormat` pour les
énumérations. Les huit copies de `plural()` et les sept formateurs figés du dépôt sont
déjà remplacés.

**Les deux axes de langue** (`src/i18n/axes.ts`) : *notre prose* suit le choix du pilote,
*les libellés de XCTrack* suivent le fichier ouvert. Ils ne se confondent jamais.

## 7. Ce qu'il ne faut jamais faire

1. **Traduire un libellé de XCTrack.** Les noms de gadgets, d'options et de préférences
   viennent des catalogues extraits de l'APK et suivent l'axe `labels`. Un libellé
   « traduit » serait un mot que le pilote ne trouvera **nulle part** sur son appareil.
2. **Concaténer des fragments de phrase.** `'Il reste ' + n + ' page' + (n > 1 ? 's' : '')`
   n'a pas d'équivalent en allemand.
3. **Écrire `count > 1`.** C'est la règle française et elle seule : à zéro, les quatre
   autres langues mettent le pluriel.
4. **Passer un identifiant en `number`.** Il serait mis en forme, et « 100 030 » ne se
   retrouve dans aucun fichier XCTrack.
5. **Inventer un terme technique dans une langue qu'on n'a pas mesurée.** Si la mesure
   manque, dites-le et laissez le mot dehors — c'est ce que le socle a fait pour *gadget*
   jusqu'à ce qu'on le mesure.
6. **Verser un mot dans `common.ts` « au cas où ».** C'est le seul fichier que plusieurs
   lots peuvent vouloir toucher. Un mot n'y entre que s'il est **déjà** employé par deux
   domaines. Deux clés voisines dans deux domaines coûtent moins cher qu'un conflit ici.
7. **Faire dépendre `src/model/`, `src/library/`, `src/catalog/` ou `src/render/` de
   `src/i18n/`** autrement que par un `import type`.
8. **Réécrire une formulation validée** en passant. L'extraction déplace du texte ; elle
   ne le rejuge pas. Un mot qui vous paraît faux se signale, il ne se corrige pas dans le
   même commit.

## 8. Avant de commiter

```sh
npx tsc --noEmit     # aucune clé ne manque, aucune forme ne diverge
npx vitest run       # repères, coïncidences, vocabulaire, découpage
```

`tsc` répond déjà « aucune traduction ne manque » : le type de chaque domaine est dérivé
du français. Les tests couvrent ce qu'un type ne voit pas — un `{total}` disparu d'une
phrase allemande, une traduction recopiée du français, un mot d'une langue passé dans une
autre.

`git add` **nominatif**, jamais `-A`. Commit en français, format Conventional Commits.
