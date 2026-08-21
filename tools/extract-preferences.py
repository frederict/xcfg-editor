#!/usr/bin/env python3
"""Extrait le catalogue des préférences générales de XCTrack depuis un APK décompressé.

Régénère `src/catalog/preferenceCatalog/` : pour chaque clé de la section `preferences`
d'un fichier `.xcfg`, ce que l'APK en dit — son libellé traduit, son aide, son type de
contrôle, ses valeurs permises, sa valeur par défaut, sa famille, et l'écran de réglages
où XCTrack la présente. Aucune dépendance tierce.

Usage :
    python3 tools/extract-preferences.py [chemin_du_dossier_apk_decompile]

Les briques de lecture ne sont pas réécrites : le parseur `resources.arsc` vient de
`tools/extract-widget-labels.py`, le lecteur `.dex` et le simulateur de registres de
`tools/extract-widget-options.py`, la lecture du manifeste de
`tools/extract-version-schema.py`.

## Les préférences ne sont pas des options de widget

`extract-widget-options.py` doit reconstituer l'appariement « clé ↔ libellé » dans le
bytecode, parce que les réglages d'un widget sont construits en Java. **Ce n'est pas le
cas des préférences générales** : XCTrack les déclare dans des `PreferenceScreen` XML
(`res/xml/preferences_*.xml`), où la clé et le libellé sont deux attributs du *même*
élément. L'appariement s'y lit sans détour, et c'est la source la plus sûre du projet.

Elle ne suffit pas seule : le XML donne le libellé mais pas le type de la valeur écrite
dans le fichier, ni la valeur par défaut réelle, ni ce qui distingue une préférence
exportée d'une préférence locale. Tout cela est dans le `<clinit>` de la classe de
configuration. **Deux sources, lues séparément, croisées à la fin.**

### Source 1 — les écrans de réglages (`res/*.xml`, format AXML binaire)

    <ListPreference android:key="Display.Theme"
                    android:title="@string/prefDisplayTheme"
                    android:entries="@array/themeNames"
                    android:entryValues="@array/themeValues" />

On en tire : la clé, le libellé, l'aide (`summary`), le type de contrôle (le nom de
l'élément), les valeurs permises d'une liste, les bornes d'un curseur, l'unité, et la
**place de la ligne** dans l'arborescence des écrans — écran, catégorie, rang.

⚠️ Le dossier `res/` d'un APK est **plat**, et l'obfuscation y met des noms qui ne
diffèrent que par la casse : `res/Ft.xml` est l'écran « Export et import de la config »,
`res/FT.xml` une mise en page d'AndroidX. Dépaqueté sur un système de fichiers insensible
à la casse — macOS, Windows —, le second arrive sous le nom `Ft-1.xml`, et 286 fichiers
sont dans ce cas. Se fier au nom fait tomber six écrans sur dix-neuf à côté : trois sur
une animation, un sur une mise en page. On balaie donc tout `res/`, on ne garde que les
fichiers dont la racine est `PreferenceScreen` — **c'est le document qui fait autorité,
pas son nom** — et on leur rattache ensuite le nom de ressource, en minuscules et dans le
seul type `xml`, où aucune collision ne subsiste.

### Source 2 — la classe de configuration (`classes*.dex`)

Son `<clinit>` construit chaque préférence :

    new yd0("Display.Theme", "WhiteTheme")          // chaîne, défaut "WhiteTheme"
    new k24("Sensors.AcousticVario.Volume", 100)    // entier, défaut 100
    new yd0("Display.Orientation", sc1.b)           // énumération, défaut LANDSCAPE
    new yd0("Devel.StrictMode", false, gp6.b)       // booléen, portée INTERNAL

Le **type de la valeur** ne se devine pas depuis les arguments : il se lit dans le
prototype du constructeur invoqué (`(Ljava/lang/String;Z)V` → booléen,
`(Ljava/lang/String;F)V` → flottant…). C'est la même idée que « l'appariement est lu,
pas deviné », appliquée au type.

Le dernier argument, quand il est présent, est une constante de l'énumération de
**portée** : `PUBLIC`, `INTERNAL`, `SECURE`. Elle décide de ce qu'un export emporte, et
c'est le contrôle croisé le plus net de toute l'extraction : les 136 clés `PUBLIC` de la
classe de configuration sont **exactement** les 136 clés du fichier de sauvegarde réel
du propriétaire. Ni une de plus, ni une de moins.

Rien n'est nommé en dur : ni la classe de configuration (obfusquée en `a`), ni la classe
racine des préférences (`fp6`), ni l'énumération de portée (`gp6`). Les trois se
découvrent — voir `ConfigReader._scope_enum`, `_read_declarations` et
`_preference_root`.

⚠️ **Cette énumération a varié, et rien ne dit qu'elle ne variera plus.** La `0.9.6.2`
de 2022 en porte une quatrième constante (`SENSITIVE`) ; de la `0.9.9.1` à la
`0.9.10.3`, elle n'existe pas du tout. La reconnaissance se fait donc par inclusion, et
un repli reconnaît la classe de configuration sans elle. Ces deux points, et le
garde-fou qui les accompagne, sont la matière de `ExtractionFailed` : **un relevé sans
aucune préférence déclarée est une panne, pas un résultat.**

Deux formes de déclaration coexistent, et la seconde a longtemps échappé au relevé :

    new yd0("Display.Theme", "WhiteTheme")   // la clé est au site de construction
    new yd0()                                // la clé est dans le constructeur

La seconde est traitée par `_fixed_key_declarations`, qui lit l'appel relayé à
l'ancêtre — c'est là que se trouvent la clé, la fabrique du défaut *et* la portée.

### Source 3 — ce que la configuration lit à même Android (`directReads`)

Certaines clés ne passent par aucun objet de préférence : la classe de configuration les
lit directement dans les préférences partagées (`prefs.getStringSet("Sensors.ExtTypes",
…)`). Ni `<clinit>`, ni `PreferenceScreen` : les deux sources croisées les manquent
toutes les deux. `ConfigReader._direct_reads` les relève, avec le nom de l'accesseur
Android — qui donne le type — et le fait de savoir si la version les réécrit.

Elles sont publiées **à part**, sous `directReads`, et non dans la table des
préférences : on n'a lu ni leur portée, ni — pour les vingt-quatre de la 1.0.3-beta5,
sans exception — la moindre écriture. Les ranger avec les autres les dirait exportables
sans que rien ne l'ait mesuré.

## Ce que la méthode ne donne pas

**Quarante-neuf clés d'un fichier réel n'ont pas de libellé, et c'est mesuré, pas subi.**
Elles ne sont dans aucun `PreferenceScreen` parce que XCTrack les règle ailleurs :

- un écran à lui (`AirspacesActivity` et ses onglets, `MapsActivity`,
  `EventMappingActivity`, l'éditeur de sons) construit ses contrôles en code, et n'y
  passe pas la clé mais un *accesseur* — une lambda numérotée. Le libellé et la clé ne
  sont plus arguments du même appel : l'appariement redeviendrait une déduction, et ce
  catalogue n'en fait pas ;
- d'autres ne sont **pas des réglages** mais de l'état sérialisé (`Navigation.State`,
  `Airspace.State2`, `Sounds`, `EventMappingJs`, `Sensors.Configuration`,
  `Maverick.Layout`, `ActiveLook.Layout`, `Airspace.ClassColors`,
  `Sound.AcousticVario.CustomProfile`). Aucun libellé ne leur correspond, parce
  qu'aucune ligne d'écran ne les affiche.

Ces clés figurent quand même au catalogue, avec `label: null`. Un éditeur doit savoir
qu'il les rencontrera, et qu'il ne doit pas y toucher faute de savoir les décrire.

De même, les **dépendances entre préférences** (une case qui en grise trois autres) ne
sont écrites nulle part dans les ressources. Le catalogue ne les invente pas.

## La partition par langue

Même découpage que `extract-widget-options.py`, et pour la même raison : les traductions
pèsent plus que tout le reste et un pilote n'en lit qu'une.

`base.json` porte ce qui ne dépend d'aucune langue — les préférences, l'arborescence des
écrans, les valeurs permises, les portées, les défauts. `<langue>.json` ne porte que les
textes, **repli anglais fusionné** là où la langue ne traduit pas : l'anglais est la
seule langue complète, et résoudre le repli à la génération évite de télécharger un
second fichier à l'exécution.

Les libellés des valeurs d'une liste (`android:entries`) sont des **tableaux traduits** :
ils vivent dans les fichiers de langue, à côté des textes, sous `arrays`.

Un quatrième fichier sort d'ici, et il ne vit pas dans `src/catalog/` :
`src/model/personalKeys.json`, le sous-ensemble « personnel » du catalogue — 44 clés avec
leur nature, leur base et leur raison, 7,3 Ko. Il alimente `src/model/personalData.ts`,
qui répond à « qu'y a-t-il de personnel dans ce fichier ? » pour quatre écrans, dont trois
n'ont pas le catalogue sous la main et ne doivent pas charger ses 96 Ko pour le savoir.
Il est **extrait**, jamais recopié : un test le compare à `base.json` à chaque exécution.
"""
from __future__ import annotations

import importlib.util
import json
import struct
import sys
from collections import Counter, defaultdict
from pathlib import Path

# L'import par chemin des scripts frères laisserait un `tools/__pycache__/` dans le
# dépôt : on s'en passe, ce script tourne une fois par version de XCTrack.
sys.dont_write_bytecode = True

PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Langue de repli : celle des ressources par défaut de l'APK, et la seule qui traduise
# tout. Même choix que les deux autres catalogues.
FALLBACK_LANGUAGE = "en"


def _load(name: str):
    path = PROJECT_ROOT / "tools" / f"{name}.py"
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


LABELS = _load("extract-widget-labels")
OPTIONS = _load("extract-widget-options")
SCHEMA = _load("extract-version-schema")

ResourceTable = LABELS.ResourceTable
parse_config_locale = LABELS.parse_config_locale
short = OPTIONS.short


def round_float(value: float) -> float:
    """Un flottant 32 bits rendu à sa précision réelle.

    Les défauts et les bornes de l'APK sont des `float` 32 bits ; élargis en 64 bits ils
    prennent une traîne (`0.2` devient `0.20000000298023224`) qui n'existe nulle part
    dans XCTrack et qu'un éditeur afficherait telle quelle. Sept chiffres significatifs,
    c'est exactement ce qu'un `float` 32 bits distingue : la conversion est déterministe,
    donc la régénération reste reproductible à l'octet près.
    """
    return float(f"{value:.7g}")


# --------------------------------------------------------------------------
# Tableaux de ressources (`@array/...`), qui portent les valeurs des listes
# --------------------------------------------------------------------------

class ArrayTable:
    """Les ressources de type `array`, par locale.

    `ResourceTable` ne décode que les entrées simples : une entrée « complexe »
    (tableau, style) lui rend `None`. Les `android:entries` d'une `ListPreference` en
    sont, il faut donc décoder le `ResTable_map_entry` — un en-tête de 8 octets par
    valeur, suivi du `Res_value` habituel.
    """

    def __init__(self, table: ResourceTable):
        self.table = table
        self.type_id = table.type_pool["strings"].index("array") + 1
        self.by_locale: dict[str, dict[str, list[str]]] = {}
        self.name_by_id: dict[int, str] = {}
        data = table.data
        for off in table.type_chunks:
            if data[off + 8] != self.type_id:
                continue
            flags = data[off + 9]
            entry_count = struct.unpack_from("<I", data, off + 12)[0]
            entries_start = struct.unpack_from("<I", data, off + 16)[0]
            cfg_off = off + 20
            cfg_size = struct.unpack_from("<I", data, cfg_off)[0]
            locale = parse_config_locale(data[cfg_off:cfg_off + cfg_size])
            offsets_start = cfg_off + cfg_size
            base = off + entries_start
            sparse = bool(flags & 0x01)
            offset16 = bool(flags & 0x02)
            bucket = self.by_locale.setdefault("en" if locale == "" else locale, {})
            for index in range(entry_count):
                if sparse:
                    idx, rel = struct.unpack_from("<HH", data, offsets_start + index * 4)
                    rel *= 4
                elif offset16:
                    rel = struct.unpack_from("<H", data, offsets_start + index * 2)[0]
                    if rel == 0xFFFF:
                        continue
                    rel *= 4
                    idx = index
                else:
                    rel = struct.unpack_from("<I", data, offsets_start + index * 4)[0]
                    if rel == 0xFFFFFFFF:
                        continue
                    idx = index
                decoded = self._entry(base + rel)
                if decoded is None:
                    continue
                name, values = decoded
                bucket[name] = values
                self.name_by_id[0x7F000000 | (self.type_id << 16) | idx] = name

    def _entry(self, off: int):
        data = self.table.data
        entry_size, flags = struct.unpack_from("<HH", data, off)
        key_index = struct.unpack_from("<I", data, off + 4)[0]
        if not (flags & 0x0001):  # pas une entrée complexe : ce n'est pas un tableau
            return None
        count = struct.unpack_from("<I", data, off + 12)[0]
        cursor = off + entry_size
        values: list[str] = []
        for _ in range(count):
            value_size, _res0, value_type = struct.unpack_from("<HBB", data, cursor + 4)
            value_data = struct.unpack_from("<I", data, cursor + 8)[0]
            if value_type == 0x03:  # chaîne du pool global
                values.append(self.table.global_pool["strings"][value_data])
            else:
                values.append("")
            cursor += 4 + value_size
        return self.table.key_pool["strings"][key_index], values

    def name_of(self, resource_id: int) -> str | None:
        return self.name_by_id.get(resource_id)

    def texts(self, name: str, language: str) -> list[str] | None:
        bucket = self.by_locale.get(language)
        if bucket is None:
            return None
        return bucket.get(name)


# --------------------------------------------------------------------------
# XML binaire (AXML) : les écrans de réglages
# --------------------------------------------------------------------------

CHUNK_STRING_POOL = 0x0001
CHUNK_RESOURCE_MAP = 0x0180
CHUNK_START_ELEMENT = 0x0102
CHUNK_END_ELEMENT = 0x0103

# `Res_value::dataType`, pour les seuls types qu'un écran de réglages emploie.
VALUE_REFERENCE = 0x01
VALUE_STRING = 0x03
VALUE_FLOAT = 0x04
VALUE_DEC = 0x10
VALUE_HEX = 0x11
VALUE_BOOL = 0x12


class Element:
    """Un élément d'un écran de réglages, avec ses attributs déjà typés."""

    def __init__(self, tag: str, attributes: dict, depth: int):
        self.tag = tag
        self.attributes = attributes
        self.depth = depth

    def text(self, name: str) -> str | None:
        value = self.attributes.get(name)
        return value[1] if value is not None and value[0] == "string" else None

    def reference(self, name: str) -> int | None:
        value = self.attributes.get(name)
        return value[1] if value is not None and value[0] == "reference" else None

    def number(self, name: str):
        value = self.attributes.get(name)
        if value is None or value[0] not in ("int", "float"):
            return None
        return value[1]

    def boolean(self, name: str) -> bool | None:
        value = self.attributes.get(name)
        return value[1] if value is not None and value[0] == "boolean" else None


def parse_preference_xml(path: Path) -> list[Element] | None:
    """Rend les éléments d'un `PreferenceScreen`, dans l'ordre du document.

    Rend `None` si le fichier n'est pas un XML binaire ou si sa racine n'est pas un
    `PreferenceScreen` : c'est ce test-là, et non le nom du fichier, qui décide.
    """
    data = path.read_bytes()
    if len(data) < 8:
        return None
    chunk_type, header_size, _total = struct.unpack_from("<HHI", data, 0)
    if chunk_type != 0x0003:
        return None
    pool: list[str] = []
    elements: list[Element] = []
    depth = 0
    offset = header_size
    while offset + 8 <= len(data):
        chunk_type, chunk_header, chunk_size = struct.unpack_from("<HHI", data, offset)
        if chunk_size <= 0:
            break
        if chunk_type == CHUNK_STRING_POOL:
            pool = LABELS.parse_string_pool(data, offset)["strings"]
        elif chunk_type == CHUNK_END_ELEMENT:
            depth -= 1
        elif chunk_type == CHUNK_START_ELEMENT:
            base = offset + chunk_header
            name_index = struct.unpack_from("<I", data, base + 4)[0]
            attr_start, attr_size, attr_count = struct.unpack_from("<HHH", data, base + 8)
            attributes: dict[str, tuple[str, object]] = {}
            for index in range(attr_count):
                at = base + attr_start + index * attr_size
                attr_name = struct.unpack_from("<I", data, at + 4)[0]
                value_type = data[at + 15]
                raw = struct.unpack_from("<I", data, at + 16)[0]
                label = pool[attr_name] if attr_name < len(pool) else ""
                if value_type == VALUE_STRING:
                    attributes[label] = ("string", pool[raw] if raw < len(pool) else "")
                elif value_type == VALUE_REFERENCE:
                    attributes[label] = ("reference", raw)
                elif value_type == VALUE_BOOL:
                    attributes[label] = ("boolean", raw != 0)
                elif value_type == VALUE_FLOAT:
                    attributes[label] = ("float",
                                         round_float(struct.unpack("<f", struct.pack("<I", raw))[0]))
                elif value_type in (VALUE_DEC, VALUE_HEX):
                    # Les bornes négatives d'un curseur (`min="-100"`) arrivent en
                    # complément à deux sur 32 bits : `4294967196` est `-100`.
                    attributes[label] = ("int", raw - 0x100000000 if raw >= 0x80000000 else raw)
                else:
                    attributes[label] = ("other", raw)
            if not elements and (pool[name_index] if name_index < len(pool) else "") != "PreferenceScreen":
                return None
            elements.append(Element(pool[name_index] if name_index < len(pool) else "",
                                    attributes, depth))
            depth += 1
        offset += chunk_size
    return elements or None


def discover_screens(apk_dir: Path, table: ResourceTable) -> list[tuple[str, Path, list[Element]]]:
    """Les écrans de réglages, avec leur nom de ressource quand il se retrouve.

    Balayage de tout `res/`, filtre sur la racine `PreferenceScreen`, puis rattachement
    au nom de ressource par le chemin déclaré dans `resources.arsc` — au suffixe `-N`
    près, que le dépaquetage ajoute en cas de collision de noms courts. Un écran dont le
    nom de ressource ne se retrouve pas garde le nom de son fichier : il vaut mieux un
    identifiant opaque qu'un écran perdu.
    """
    xml_type_id = table.type_pool["strings"].index("xml") + 1
    # Nom de fichier en minuscules -> nom de ressource, pour le seul type `xml`. Les 286
    # collisions de l'APK opposent toujours des types différents (`res/FT.xml`, une mise
    # en page, contre `res/Ft.xml`, un écran de réglages) ; à l'intérieur du type `xml`,
    # il n'y en a aucune. Ranger par minuscules est donc sans ambiguïté ici, et ne dépend
    # pas de la casse que le dépaquetage a retenue.
    declared: dict[str, str] = {}
    for off in table.type_chunks:
        type_id, _locale, entries = table._parse_type_chunk(off)
        if type_id != xml_type_id:
            continue
        for _index, (key_index, value) in entries.items():
            if isinstance(value, str):
                declared[Path(value).stem.lower()] = table.key_pool["strings"][key_index]

    screens: list[tuple[str, Path, list[Element]]] = []
    for path in sorted((apk_dir / "res").glob("*.xml")):
        try:
            elements = parse_preference_xml(path)
        except (struct.error, IndexError, UnicodeDecodeError):
            continue
        if elements is None:
            continue
        stem = path.stem
        # `Ft-1.xml` est le second fichier à revendiquer le nom `ft` sur un système de
        # fichiers insensible à la casse.
        head, _dash, tail = stem.rpartition("-")
        base_stem = head if head and tail.isdigit() else stem
        screens.append((declared.get(base_stem.lower(), stem), path, elements))
    screens.sort(key=lambda entry: entry[0])
    return screens


# --------------------------------------------------------------------------
# La classe de configuration : type, défaut et portée de chaque préférence
# --------------------------------------------------------------------------

class Dex(OPTIONS.Dex):
    """Le lecteur `.dex` du catalogue d'options, plus les prototypes de méthode.

    Le prototype est ce qui donne le **type** d'une préférence sans le deviner : la même
    classe `yd0` sert au booléen, au flottant, à la chaîne et à l'énumération, et seul le
    constructeur invoqué les distingue.
    """

    def __init__(self, path: Path):
        super().__init__(path)
        self.proto_ids_size, self.proto_ids_off = struct.unpack_from("<II", self.data, 72)

    def parameter_types(self, method_idx: int) -> list[str]:
        _cls, proto_idx, _name = struct.unpack_from("<HHI", self.data,
                                                    self.method_ids_off + method_idx * 8)
        _shorty, _ret, params_off = struct.unpack_from("<III", self.data,
                                                       self.proto_ids_off + proto_idx * 12)
        if params_off == 0:
            return []
        count = struct.unpack_from("<I", self.data, params_off)[0]
        return [self.type_name(struct.unpack_from("<H", self.data, params_off + 4 + i * 2)[0])
                for i in range(count)]


# Une clé de préférence : un ou plusieurs segments, points comme séparateurs. Les clés
# internes commencent par `_` (`_temp.brightness`) ; elles sont déclarées comme les
# autres et gardent la même forme.
def looks_like_key(value: str) -> bool:
    return bool(value) and len(value) <= 64 and all(
        segment and (segment[0].isalpha() or segment[0] == "_")
        and all(c.isalnum() or c in "_-" for c in segment)
        for segment in value.split("."))


def float_of(bits: int) -> float:
    return round_float(struct.unpack("<f", struct.pack("<i", bits))[0])


FUNCTION0 = "Lkotlin/jvm/functions/Function0;"


def is_type_token(type_name: str, scope_enum: str | None) -> bool:
    """Vrai pour le paramètre qui porte le type à désérialiser d'une préférence JSON.

    XCTrack le passe soit en `Class`, soit en jeton de type obfusqué (`kg4`). On
    reconnaît le second par élimination : une classe de l'application, ni la chaîne, ni
    l'énumération de portée, ni la fabrique de défaut.
    """
    return (type_name.startswith("L")
            and type_name != scope_enum
            and type_name != FUNCTION0
            and not type_name.startswith(("Ljava/", "Lkotlin/", "Landroid")))


# --------------------------------------------------------------------------
# Reconnaître la classe de configuration — et ne jamais échouer en silence
# --------------------------------------------------------------------------

class ExtractionFailed(RuntimeError):
    """Une lecture qui n'a pas abouti, **levée** plutôt que rendue vide.

    C'est le garde-fou central de ce script. Un extracteur qui ne reconnaît plus ce
    qu'il cherche rend, s'il se tait, un catalogue *plausible* : les écrans de
    réglages sont toujours lus, donc il reste des préférences, avec des libellés et
    des écrans — simplement plus de type, plus de défaut, plus de portée, et un tiers
    des clés manquantes. Rien ne le distingue à l'œil d'une version qui avait
    réellement moins de réglages.

    C'est arrivé, et on peut le dater : la `0.9.6.2` de 2022 porte une **quatrième**
    constante de portée (`SENSITIVE`). L'égalité stricte n'y reconnaissait plus
    l'énumération, la classe de configuration n'était plus trouvée, et le relevé
    tombait à 105 préférences au lieu de 203 avec `declaredCount = 0` — sans un mot.
    67 clés d'un `.xcfg` réel de cette version manquaient à son propre relevé.

    D'où la règle : un relevé sans **aucune** préférence déclarée n'est pas un
    résultat, c'est une panne. On lève, l'appelant décide. `extract-version-schema.py`
    la rattrape par section et l'inscrit dans `errors` ; `main()` s'arrête sans rien
    écrire, plutôt que de remplacer un catalogue juste par un catalogue vide.
    """


# Les trois portées que XCTrack a toujours eues — mais pas les seules qu'il ait jamais
# portées. La reconnaissance se fait donc par **inclusion**, jamais par égalité : la
# `0.9.6.2` en a quatre (`SENSITIVE`), et rien ne dit qu'une version future n'en
# ajoutera pas une cinquième. Sur une version qui en a exactement trois, l'inclusion
# et l'égalité donnent la même réponse : la correction ne déplace rien de ce qui
# marchait.
SCOPE_CONSTANTS = frozenset({"PUBLIC", "INTERNAL", "SECURE"})


# Combien de clés d'un `<clinit>` doivent se retrouver dans les écrans de réglages pour
# qu'on tienne la classe pour celle de la configuration, **quand aucune énumération de
# portée n'existe** — c'est le cas de la `0.9.9.1` à la `0.9.10.3`, où la notion n'était
# pas encore née et où `SECURE` n'apparaît nulle part dans le bytecode.
#
# Cinq suffisent largement à écarter le seul concurrent sérieux : le `<clinit>` d'une
# table d'icônes construit neuf cents objets sur des noms en forme de clé
# (`md_battery_full`), et pas un seul ne figure dans un `PreferenceScreen`.
SCREEN_OVERLAP_MINIMUM = 5


# Les préférences partagées d'Android, et les accesseurs qui nomment une clé. `getAll`
# est écarté : il ne nomme rien.
SHARED_PREFERENCES = "Landroid/content/SharedPreferences;"
SHARED_EDITOR = "Landroid/content/SharedPreferences$Editor;"
SHARED_READERS = frozenset({"getString", "getStringSet", "getBoolean", "getInt",
                            "getLong", "getFloat"})
SHARED_WRITERS = frozenset({"putString", "putStringSet", "putBoolean", "putInt",
                            "putLong", "putFloat"})


def scope_enum_of(enums: dict[str, dict]) -> str | None:
    """L'énumération de portée parmi les énumérations de l'APK, ou `None`.

    Critère : ses constantes **contiennent** `PUBLIC`, `INTERNAL` et `SECURE`. La plus
    petite gagne, pour qu'une énumération qui les recouvrirait par accident en portant
    cinquante constantes ne passe jamais devant la vraie.

    Fonction libre plutôt que méthode : elle se teste sur une table écrite à la main,
    sans APK — voir `--self-test`.
    """
    candidates = [(len(table["order"]), name) for name, table in sorted(enums.items())
                  if SCOPE_CONSTANTS <= set(table["order"])]
    return min(candidates)[1] if candidates else None


def _guard_declarations(reader, apk_dir: Path) -> None:
    """Refuse un relevé sans aucune préférence déclarée. Voir `ExtractionFailed`.

    Fonction libre, appelée par `ConfigReader.__init__` : elle se déclenche ainsi sur
    une instance construite à la main, donc s'éprouve sans APK.
    """
    if reader.declarations:
        return
    scope = short(reader.scope_enum) if reader.scope_enum else "aucune"
    raise ExtractionFailed(
        f"{apk_dir.name} : aucune préférence déclarée. La classe de configuration n'a "
        f"pas été reconnue (énumération de portée : {scope} ; clés d'écrans "
        f"disponibles : {len(reader.screen_keys)}). Un catalogue sans déclaration n'a "
        "ni type, ni défaut, ni portée : il ne doit pas être publié.")


class ConfigReader:
    """Lit le `<clinit>` de la classe de configuration : clé, type, défaut, portée."""

    def __init__(self, apk_dir: Path, screen_keys: set[str] | None = None):
        self.dexes = [Dex(path) for path in sorted(apk_dir.glob("classes*.dex"))]
        self.owner: dict[str, tuple[Dex, int]] = {}
        self.parent: dict[str, str | None] = {}
        self.class_methods: dict[str, list] = {}
        for dex in self.dexes:
            for name, parent, cdata_off in dex.class_defs():
                self.owner[name] = (dex, cdata_off)
                self.parent[name] = parent
                self.class_methods[name] = list(dex.methods(cdata_off))
        self.enums = OPTIONS.Extractor._enum_tables(self)
        # {dex: {index de méthode: offset de code}}, rempli à la demande.
        self._code_offsets: dict[str, dict[int, int]] = {}
        # Les clés que les écrans de réglages déclarent : une vérité lue **sans** le
        # bytecode, donc utilisable pour le reconnaître.
        self.screen_keys: set[str] = set(screen_keys or ())

        self.scope_enum = self._scope_enum()
        self.criterion = ""
        self.config_class, raw = self._read_declarations()
        self.constructions: list = self._constructions_of(self.config_class)
        self.preference_root = self._preference_root(raw)
        raw = raw + self._fixed_key_declarations(raw)
        self.declarations = self._resolve(raw)
        self.direct_reads = self._direct_reads()

        # Le garde-fou. Voir `ExtractionFailed` : zéro déclaration n'est pas un relevé
        # maigre, c'est une reconnaissance qui a échoué, et elle doit s'entendre.
        _guard_declarations(self, apk_dir)

    # -- découverte --------------------------------------------------------
    def _scope_enum(self) -> str | None:
        """L'énumération de portée : elle porte `PUBLIC`, `INTERNAL` et `SECURE`.

        C'est elle qu'on cherche en premier, parce qu'elle sert ensuite à reconnaître la
        classe de configuration : ces trois constantes réunies sont une signature
        qu'aucune autre énumération de l'APK ne porte. Elle peut manquer — voir
        `_read_declarations`.
        """
        return scope_enum_of(self.enums)

    def _read_declarations(self) -> tuple[str, list]:
        """La classe dont le `<clinit>` déclare les préférences.

        On ne nomme pas `Lorg/xcontest/XCTrack/config/a;` en dur : l'obfuscation le
        renomme à chaque construction. Le critère est fonctionnel, et il tient en deux
        conditions — la seconde n'est pas un raffinement, c'est elle qui fait tout le
        travail :

        1. le `<clinit>` construit des objets dont un argument est une chaîne en forme de
           clé de préférence ;
        2. **au moins une** de ces constructions reçoit l'énumération de portée.

        Sans la seconde, le `<clinit>` d'une table d'icônes gagne le concours : il
        construit neuf cents objets sur des noms qui ressemblent à des clés. Aucune de ses
        constructions ne parle de portée.

        **Sauf que la portée n'a pas toujours existé.** De la `0.9.9.1` à la `0.9.10.3`,
        `SECURE` n'est nulle part dans le bytecode : la condition 2 y est impossible à
        remplir et l'ancienne lecture rendait zéro déclaration, sans rien dire. On
        retombe alors sur un critère qui ne dépend d'aucun nommage et qu'aucune table
        d'icônes ne peut passer : **les clés du `<clinit>` doivent se retrouver dans les
        `PreferenceScreen`**, au moins `SCREEN_OVERLAP_MINIMUM` fois.

        L'ordre compte : quand l'énumération existe, c'est le critère d'origine qui est
        appliqué, tel quel.
        """
        for criterion in ("scope", "screens"):
            if criterion == "scope" and self.scope_enum is None:
                continue
            if criterion == "screens" and not self.screen_keys:
                continue
            found = self._best_clinit(criterion)
            if found[1]:
                self.criterion = criterion
                return found
        return ("", [])

    def _best_clinit(self, criterion: str) -> tuple[str, list]:
        """Le `<clinit>` le plus fourni qui passe `criterion`, et ses constructions."""
        best: tuple[str, list] = ("", [])
        for name, methods in sorted(self.class_methods.items()):
            dex, _cdata = self.owner[name]
            for _idx, method_name, code_off in methods:
                if method_name != "<clinit>" or code_off == 0:
                    continue
                found: list = []

                def on_new(cls, method_idx, args, dex=dex, found=found):
                    types = dex.parameter_types(method_idx)
                    keys = [a[1] for a, t in zip(args, types)
                            if t == "Ljava/lang/String;" and a and a[0] == "str"
                            and looks_like_key(a[1])]
                    if keys:
                        found.append((cls, keys[0], types, args))

                try:
                    OPTIONS.simulate(dex, code_off, on_new)
                except (struct.error, IndexError, KeyError):
                    continue
                if criterion == "scope":
                    qualified = any(self.scope_enum in types
                                    for _c, _k, types, _a in found)
                else:
                    overlap = {key for _c, key, _t, _a in found} & self.screen_keys
                    qualified = len(overlap) >= SCREEN_OVERLAP_MINIMUM
                if not qualified:
                    break
                if len(found) > len(best[1]):
                    best = (name, found)
                break
        return best

    # -- les clés qui ne sont pas au site de construction ------------------
    def _constructions_of(self, config_class: str) -> list:
        """Toutes les constructions du `<clinit>` retenu, **clé ou pas**.

        `_best_clinit` ne garde que celles dont un argument est une clé ; il en existe
        d'autres, et l'une d'elles porte une préférence bien réelle — voir
        `_fixed_key_declarations`.
        """
        if not config_class:
            return []
        dex, _cdata = self.owner[config_class]
        for idx, method_name, code_off in self.class_methods[config_class]:
            if method_name != "<clinit>" or code_off == 0:
                continue
            found: list = []

            def on_new(cls, method_idx, args, dex=dex, found=found):
                found.append((cls, method_idx, dex.parameter_types(method_idx), args))

            try:
                OPTIONS.simulate(dex, code_off, on_new)
            except (struct.error, IndexError, KeyError):
                return []
            return found
        return []

    def _delegated_declarations(self, dex: Dex, method_idx: int) -> list:
        """Ce qu'un constructeur déclare lui-même, en relayant une clé à son ancêtre.

        Rend les `(types, arguments)` des appels de constructeur faits **dans** ce
        constructeur et dont un argument `String` est une chaîne en forme de clé — le
        même critère qu'au site de construction, appliqué un cran plus bas.
        """
        code_off = self.code_offsets(dex).get(method_idx, 0)
        if code_off == 0:
            return []
        found: list = []

        def on_new(_cls, inner_idx, args, dex=dex, found=found):
            types = dex.parameter_types(inner_idx)
            if any(t == "Ljava/lang/String;" and a and a[0] == "str" and looks_like_key(a[1])
                   for a, t in zip(args, types)):
                found.append((types, args))

        try:
            OPTIONS.simulate(dex, code_off, on_new)
        except (struct.error, IndexError, KeyError):
            return []
        return found

    def code_offsets(self, dex: Dex) -> dict[int, int]:
        """{index de méthode: offset de code} pour un dex, construit une seule fois."""
        table = self._code_offsets.get(dex.path.name)
        if table is None:
            table = self._code_offsets[dex.path.name] = {}
            for name, (owner, _cdata) in self.owner.items():
                if owner is not dex:
                    continue
                for idx, _method_name, code_off in self.class_methods[name]:
                    table[idx] = code_off
        return table

    def _fixed_key_declarations(self, raw: list) -> list:
        """Les préférences dont la clé est écrite dans leur **constructeur**.

        `new yd0("Display.Theme", …)` livre sa clé au site de construction ; ce n'est pas
        toujours le cas. De la `0.9.9.1` à la `0.9.12.6`, le profil sonore personnalisé
        se construit sans clé —

            new y1(serializer, defaultProfile)

        — et c'est une surcharge du constructeur de `y1` qui pose
        `"Sound.AcousticVario.CustomProfile"` avant d'appeler la forme complète. La clé
        est bien dans le `.dex`, et la préférence est bien déclarée par le `<clinit>` :
        seule la lecture était trop courte, et il manquait au relevé de vingt versions
        une clé que les fichiers réels de 2024 et 2025 portent.

        Le critère reste fonctionnel et ne nomme rien : parmi les constructions du
        `<clinit>` **restées sans clé**, on ne retient que celles dont la classe hérite
        de la racine des préférences — c'est déjà ce qui distingue une préférence d'un
        `StringBuilder` — et dont le constructeur relaie **exactement une** clé à son
        ancêtre. Une seule : deux laisseraient le choix, et un choix est une déduction.

        Ce sont les arguments de **l'appel relayé** qui sont retenus, pas ceux du site de
        construction. C'est tout l'intérêt : `new yd0()` ne dit rien, alors que le
        `super(clé, fabrique, portée)` qu'il exécute donne la clé, la fabrique du défaut
        et la portée. Prendre les arguments du site aurait rendu ces préférences
        `PUBLIC` par défaut — une portée devinée, jamais lue.
        """
        if self.preference_root is None:
            return []
        known = {key for _cls, key, _types, _args in raw}
        recovered: list = []
        for cls, method_idx, types, args in self.constructions:
            if self.parent.get(cls) != self.preference_root:
                continue
            if any(a and a[0] == "str" and looks_like_key(a[1])
                   for a, t in zip(args, types) if t == "Ljava/lang/String;"):
                continue
            dex, _cdata = self.owner[cls]
            delegated = self._delegated_declarations(dex, method_idx)
            if len(delegated) != 1:
                continue
            inner_types, inner_args = delegated[0]
            keys = [a[1] for a, t in zip(inner_args, inner_types)
                    if t == "Ljava/lang/String;" and a and a[0] == "str"
                    and looks_like_key(a[1])]
            if len(keys) != 1 or keys[0] in known:
                continue
            known.add(keys[0])
            recovered.append((cls, keys[0], inner_types, inner_args))
        return recovered

    def _direct_reads(self) -> dict[str, dict]:
        """Les clés que la classe de configuration lit **directement** dans Android.

        Toutes les préférences ne passent pas par un objet de préférence. La classe de
        configuration en lit certaines à même les `SharedPreferences` :

            prefs.getStringSet("Sensors.ExtTypes", emptySet())

        La clé n'est alors ni dans le `<clinit>`, ni dans un `PreferenceScreen`, et rien
        dans les deux sources croisées ne la trahit. Elle est pourtant écrite noir sur
        blanc dans le bytecode, avec **son type de lecture** — c'est le nom de la
        méthode Android qui le donne, sans rien deviner.

        Le rattachement à la configuration ne se fait pas sur le nom de la classe
        appelante, qui est obfusqué et change de version en version : on suit
        l'instance. Est retenue la lecture dont le receveur vient d'une méthode de la
        classe de configuration — ou, plus simplement, celle qui a lieu dans la classe
        de configuration elle-même. Les préférences partagées de Firebase, d'AndroidX ou
        du SDK publicitaire, qui ont leur propre instance, ne passent pas ce filtre.

        Ce que la méthode **ne dit pas** : la portée de ces clés. Elle dit en revanche si
        la version les **réécrit**, et c'est mesuré de la même façon, en suivant l'éditeur
        que rend `edit()`. Sur la 1.0.3-beta5, aucune des vingt-quatre ne l'est : elles
        sont toutes lues par la méthode qui reconstruit la collection de capteurs, et
        aucune n'est réécrite ensuite.

        Elles sont donc publiées à part, dans `directReads`, et **pas** dans la table des
        préférences : les faire entrer là leur donnerait une portée qu'on n'a pas lue et
        les dirait exportables — `isExported()` rend vrai pour une clé sans portée —, ce
        qui n'est pas mesuré.
        """
        if not self.config_class:
            return {}
        reads: dict[str, dict] = {}
        written: set[str] = set()
        for name, methods in sorted(self.class_methods.items()):
            dex, _cdata = self.owner[name]
            for _idx, method_name, code_off in methods:
                if code_off == 0:
                    continue
                for key, accessor in self._shared_accesses(dex, code_off, name):
                    if accessor in SHARED_READERS:
                        reads.setdefault(key, {"read": accessor,
                                               "by": f"{short(name)}.{method_name}"})
                    else:
                        written.add(key)
        for key, entry in reads.items():
            entry["written"] = key in written
        return dict(sorted(reads.items()))

    def _shared_accesses(self, dex: Dex, code_off: int, owner: str):
        """(clé, nom de l'accesseur) pour chaque accès aux préférences de la config.

        Deux registres suivis, et rien de plus : les chaînes constantes, et les
        instances **issues de la classe de configuration**. La seconde marque se propage
        aux appels faits sur une instance déjà marquée, ce qui suffit à suivre
        `prefs.edit()` sans nommer quoi que ce soit.
        """
        strings: dict[int, str] = {}
        from_config: set[int] = set()
        pending_config = False
        try:
            for _pc, op, off in OPTIONS.walk(dex, code_off):
                if op in (0x1A, 0x1B):
                    register = dex.data[off + 1]
                    index = (struct.unpack_from("<H", dex.data, off + 2)[0] if op == 0x1A
                             else struct.unpack_from("<I", dex.data, off + 2)[0])
                    strings[register] = dex.string(index)
                    from_config.discard(register)
                elif op == 0x0C:  # move-result-object : reçoit le retour de l'appel
                    register = dex.data[off + 1]
                    strings.pop(register, None)
                    from_config.discard(register)
                    if pending_config:
                        from_config.add(register)
                    pending_config = False
                    continue
                elif 0x6E <= op <= 0x78:
                    method_idx = struct.unpack_from("<H", dex.data, off + 2)[0]
                    cls, method_name = dex.method_ref(method_idx)
                    registers = (OPTIONS._regs_35c(dex.data, off) if op <= 0x72
                                 else OPTIONS._regs_3rc(dex.data, off))
                    reachable = bool(registers) and (owner == self.config_class
                                                     or registers[0] in from_config)
                    accessors = (SHARED_READERS if cls == SHARED_PREFERENCES
                                 else SHARED_WRITERS if cls == SHARED_EDITOR else ())
                    if method_name in accessors and len(registers) >= 2 and reachable:
                        key = strings.get(registers[1])
                        if key is not None and looks_like_key(key):
                            yield key, method_name
                    pending_config = cls == self.config_class or reachable
                    for register in registers:
                        strings.pop(register, None)
                        from_config.discard(register)
                    continue
                elif op in (0x0A, 0x0B):  # move-result / move-result-wide
                    strings.pop(dex.data[off + 1], None)
                    from_config.discard(dex.data[off + 1])
                pending_config = False
        except (struct.error, IndexError, KeyError):
            return

    def _preference_root(self, raw: list) -> str | None:
        """La classe racine des préférences : l'ancêtre commun des classes construites.

        Elle sert à écarter ce que le `<clinit>` construit *aussi* et qui n'est pas une
        préférence — un `StringBuilder` dont le premier argument est un message d'erreur
        passait sinon pour une clé.
        """
        counts: Counter = Counter(cls for cls, _key, _types, _args in raw)
        ancestors: Counter = Counter()
        for cls, count in counts.items():
            parent = self.parent.get(cls)
            if parent and parent != "Ljava/lang/Object;":
                ancestors[parent] += count
        if not ancestors:
            return None
        return ancestors.most_common(1)[0][0]

    # -- lecture -----------------------------------------------------------
    def _value_types(self) -> dict[str, set[str]]:
        """{classe de préférence: types qu'elle accepte comme valeur par défaut}.

        Il faut cette table pour une raison précise. Deux formes de constructeur
        coexistent — `(clé, valeur[, portée])` et `(valeur, portée, clé)` — et dans la
        seconde, un `int` n'est pas toujours une valeur : `k24(-1, INTERNAL,
        "App.Config.Version")` déclare bien un entier par défaut, mais `yd0(4, SECURE,
        "SafeSky.Salt")` passe un **code de type** interne à la classe, pas un défaut.
        Prendre le second pour le premier donnait « défaut : 4 » à une graine
        cryptographique.

        Le tri se lit dans le dex : la forme canonique `(String, T)` d'une classe dit
        quels `T` sont des valeurs pour elle. `k24` déclare `(String, I)`, `yd0` non —
        ses formes à deux arguments sont `(String, Z)`, `(String, F)`,
        `(String, String)`, `(String, Enum)`, `(String, Function0)`.
        """
        table: dict[str, set[str]] = defaultdict(set)
        for name, methods in self.class_methods.items():
            if self.parent.get(name) != self.preference_root:
                continue
            dex, _cdata = self.owner[name]
            for method_idx, method_name, _code in methods:
                if method_name != "<init>":
                    continue
                types = dex.parameter_types(method_idx)
                if len(types) >= 2 and types[0] == "Ljava/lang/String;":
                    table[name].add(types[1])
        return table

    def _resolve(self, raw: list) -> dict[str, dict]:
        """{clé: {impl, valueKind, default, enum, enumValues, scope}}.

        Le type se lit dans le prototype, jamais dans la forme de l'argument : un
        booléen et un entier arrivent tous deux comme `("int", n)` dans les registres
        simulés, seul `Z` contre `I` les sépare.
        """
        accepted = self._value_types()
        out: dict[str, dict] = {}
        for cls, key, types, args in raw:
            if self.parent.get(cls) != self.preference_root:
                continue
            record = {"impl": short(cls), "valueKind": None, "default": None,
                      "defaultSource": None, "scope": "PUBLIC",
                      "enum": None, "enumValues": None}
            key_taken = False
            for value, type_name in zip(args, types):
                if type_name == "Ljava/lang/String;" and not key_taken:
                    key_taken = True
                    continue
                if type_name == self.scope_enum:
                    if value is not None and value[0] == "sfield":
                        table = self.enums.get(type_name, {})
                        record["scope"] = table.get("fields", {}).get(value[2], "PUBLIC")
                    continue
                if type_name not in accepted.get(cls, set()):
                    # Ni la clé, ni la portée, ni un type de valeur que cette classe
                    # accepte : c'est un paramètre interne (code de type, drapeau). On
                    # ne lui invente pas de sens.
                    continue
                if type_name == "Z":
                    record["valueKind"] = "boolean"
                    record["default"] = bool(value[1]) if value and value[0] == "int" else None
                elif type_name == "F":
                    record["valueKind"] = "float"
                    record["default"] = float_of(value[1]) if value and value[0] == "int" else None
                elif type_name == "I":
                    record["valueKind"] = "int"
                    record["default"] = value[1] if value and value[0] == "int" else None
                elif type_name == "Ljava/lang/String;":
                    record["valueKind"] = "string"
                    record["default"] = value[1] if value and value[0] == "str" else None
                elif type_name == "Ljava/lang/Enum;":
                    record["valueKind"] = "enum"
                    if value is not None and value[0] == "sfield":
                        table = self.enums.get(value[1])
                        if table is not None:
                            record["enum"] = short(value[1])
                            record["enumValues"] = list(table["order"])
                            record["default"] = table["fields"].get(value[2])
                elif type_name == "Ljava/lang/Class;" or is_type_token(type_name, self.scope_enum):
                    # Le constructeur reçoit le type à désérialiser : la valeur est un
                    # objet JSON. `Airspace.State2`, `Sounds`, `Navigation.State`…
                    record["valueKind"] = "json"
                elif type_name == FUNCTION0:
                    # Une fabrique de valeur par défaut, évaluée au démarrage : les huit
                    # `Unit.*` en dépendent, parce que XCTrack choisit mètres ou pieds
                    # d'après la locale de l'appareil. Le défaut n'est donc pas dans
                    # l'APK, et on ne le remplace pas par un des deux au hasard.
                    record["defaultSource"] = "runtime"
            if record["default"] is not None and record["defaultSource"] is None:
                record["defaultSource"] = "declared"
            out[key] = record
        return out


# --------------------------------------------------------------------------
# Croisement XML / bytecode
# --------------------------------------------------------------------------

# Le nom de l'élément XML donne la forme du contrôle. Table établie sur les 20 écrans de
# la 1.0.3-beta5 ; un élément inconnu reste `null` plutôt que rangé de force.
CONTROLS = {
    "SwitchPreferenceCompat": "checkbox",
    "CheckBoxPreference": "checkbox",
    "ListPreference": "list",
    "EditTextPreference": "text",
    "SeekBarPreference": "slider",
    "org.xcontest.XCTrack.config.VolumePreference": "slider",
    "org.xcontest.XCTrack.config.FloatPreference": "number",
    "org.xcontest.XCTrack.config.TriangleClosingPreference": "number",
    "org.xcontest.XCTrack.config.ColorPickerPreferencePro": "color",
    "org.xcontest.XCTrack.config.ButtonPreference": "button",
    "Preference": "action",
}

# Ce qu'une classe de préférence Android écrit dans les préférences partagées, quand
# XCTrack ne passe pas par sa propre classe de configuration. C'est le contrat des
# classes d'AndroidX, pas une hypothèse sur XCTrack.
ANDROID_VALUE_KINDS = {
    "SwitchPreferenceCompat": "boolean",
    "CheckBoxPreference": "boolean",
    "ListPreference": "string",
    "EditTextPreference": "string",
    "SeekBarPreference": "int",
}

# `android:inputType` valant `textPassword` : le champ est masqué à la saisie. Lu dans le
# XML, c'est la marque la plus sûre d'un secret.
INPUT_TYPE_PASSWORD = 0x81

# Ce que porte une clé, quand ni la portée ni le type de champ ne le disent. **Table
# déclarée, pas extraite** : elle affirme quelque chose sur le *contenu*, et le contenu
# ne se lit pas dans l'APK. Chaque entrée porte donc sa raison, et le catalogue publie
# `basis: "declared"` pour que l'interface sache que c'est un jugement, pas une lecture.
DECLARED_PERSONAL = {
    "Pilot.Name": ("identity", "le nom du pilote, saisi tel quel"),
    "Glider.Name": ("identity", "la voile du pilote — modèle et taille identifient un pilote dans un club"),
    "Glider._producer": ("equipment", "constructeur de la voile"),
    "Glider._model": ("equipment", "modèle de la voile"),
    "Glider.Ctg": ("equipment", "catégorie de la voile"),
    "Glider.CtgHG": ("equipment", "catégorie de l'aile delta"),
    "XContest.Username": ("credential", "identifiant du compte XContest"),
    "SkySight.Username": ("credential", "identifiant du compte SkySight"),
    "SafeSky.Address": ("contact", "adresse du compte SafeSky"),
    "SafeSky.Icao": ("identity", "immatriculation de l'aéronef"),
    "SafeSky.AutoIcao": ("identity", "immatriculation déduite"),
    "SafeSky.AnonymousUUID": ("device", "identifiant d'appareil, stable entre les vols"),
    "Livetrack.DeviceId": ("device", "identifiant d'appareil du service de suivi"),
    "Livetrack.QuickMessages": ("freeText", "messages écrits par vous"),
    "Sensors.Configuration": ("device", "les capteurs appairés, adresses Bluetooth comprises"),
    "ActiveLook.Device": ("device", "les lunettes appairées"),
    "ActiveLook.Name": ("device", "le nom des lunettes appairées"),
    "Maverick.SdkKey": ("credential", "clé d'accès au SDK Everysight"),
    "Navigation.WaypointFiles": ("file", "fichiers de waypoints — le nom désigne souvent la compétition"),
    "Navigation.State": ("location", "la tâche en cours, points de virage et coordonnées compris"),
    "Airspace.Files": ("file", "fichiers d'espaces aériens que vous avez chargés"),
    "Mapsforge.MapFiles": ("file", "cartes hors-ligne téléchargées"),
    "Mapsforge.ThemeFile": ("file", "thème de carte que vous avez installé"),
    "App.GuessLatitude": ("location", "la position présumée de l'appareil — le domicile, en pratique"),
    "App.GuessLongitude": ("location", "la position présumée de l'appareil — le domicile, en pratique"),
    "Sensors.LastNetLocation": ("location", "la dernière position ayant servi à interroger le QNH"),
    "Testing.IGCReplayFilename": ("file", "un fichier de trace du pilote"),
    "Devel.TTS": ("freeText", "texte que vous avez saisi"),
    "Devel.TTSAbbr": ("freeText", "texte que vous avez saisi"),
}

# Les préférences de diffusion : pas des données personnelles, mais des **choix** sur
# leur diffusion. `src/library/identity.ts` les regroupe déjà sous `Livetrack.*` ; on
# nomme ici le préfixe, pas les clés une à une, pour la même raison qu'elle.
SHARING_PREFIX = "Livetrack."


def family_of(key: str) -> str:
    """La famille d'une clé : ce qui précède le premier point.

    Une clé sans point (`TakeoffSpeed`, `Sounds`) n'a pas de famille. On rend une chaîne
    vide plutôt que d'en inventer une : c'est à l'interface de décider comment présenter
    ces sept-là.
    """
    return key.split(".", 1)[0] if "." in key else ""


def personal_of(key: str, scope: str | None, input_type) -> dict | None:
    """Ce que la clé porte de personnel, et **sur quelle base** on l'affirme."""
    if scope == "SECURE":
        return {"kind": "credential", "basis": "scope",
                "reason": "portée SECURE : XCTrack la range dans ses préférences chiffrées"}
    if input_type is not None and (input_type & 0xFF) == INPUT_TYPE_PASSWORD:
        return {"kind": "credential", "basis": "inputType",
                "reason": "champ de saisie masqué (`textPassword`)"}
    declared = DECLARED_PERSONAL.get(key)
    if declared is not None:
        return {"kind": declared[0], "basis": "declared", "reason": declared[1]}
    if key.startswith(SHARING_PREFIX):
        return {"kind": "sharing", "basis": "declared",
                "reason": "un choix de diffusion que vous avez fait, pas une donnée en soi"}
    return None


# Les champs d'une ligne d'écran qui décrivent l'**arborescence**. Tout le reste décrit
# le contrôle, et n'a qu'un porteur légitime : la table `preferences`.
ROW_FIELDS = ("tag", "key", "title", "titleText", "summary", "summaryText", "depth",
              "category", "opens")


def slim_row(row: dict) -> dict:
    return {field: row[field] for field in ROW_FIELDS if row.get(field) is not None}


class Catalog:
    """Assemble les deux sources en un catalogue, et compte ce qu'il n'a pas su remplir."""

    def __init__(self, apk_dir: Path):
        self.apk_dir = apk_dir
        self.table = ResourceTable(apk_dir / "resources.arsc")
        self.by_locale = self.table.string_entries_by_locale()
        self.arrays = ArrayTable(self.table)
        self.strings_by_id = self._string_ids()
        # Les écrans **avant** le bytecode : leurs clés servent à reconnaître la classe
        # de configuration des versions qui n'ont pas encore d'énumération de portée.
        # C'est la seule raison de cet ordre — la lecture des écrans ne dépend de rien.
        self.screens, self.rows = self._read_screens()
        self.config = ConfigReader(apk_dir, screen_keys=set(self.rows))
        # Les clés dont l'écran et le bytecode ne s'accordent pas sur le domaine de
        # valeurs. Vide dans la 1.0.3-beta5 ; une entrée signalerait que l'une des deux
        # lectures s'est trompée de préférence, et il faudrait la trancher sur
        # l'appareil avant de publier le catalogue.
        self.value_conflicts: list[str] = []
        self.default_conflicts: list[str] = []
        self.preferences = self._merge()

    def _string_ids(self) -> dict[int, str]:
        out: dict[int, str] = {}
        for off in self.table.type_chunks:
            type_id, _locale, entries = self.table._parse_type_chunk(off)
            if type_id != self.table.string_type_id:
                continue
            for index, (key_index, _value) in entries.items():
                out[0x7F000000 | (type_id << 16) | index] = self.table.key_pool["strings"][key_index]
        return out

    def translations(self, resource_key: str) -> dict[str, str]:
        out = {}
        for locale, entries in self.by_locale.items():
            if resource_key in entries:
                out["en" if locale == "" else locale] = entries[resource_key]
        return out

    def resource(self, resource_id: int | None) -> str | None:
        return None if resource_id is None else self.strings_by_id.get(resource_id)

    # -- écrans ------------------------------------------------------------
    def _read_screens(self):
        """L'arborescence des écrans, et l'index `clé -> ligne d'écran`.

        Une même clé peut apparaître dans deux écrans (`_sensorsAcousticVario` est à la
        fois dans « Sons » et dans « Capteurs »). La première rencontrée fait foi pour
        l'index — les deux restent visibles dans l'arborescence.
        """
        screens = []
        rows: dict[str, dict] = {}
        for name, path, elements in discover_screens(self.apk_dir, self.table):
            root = elements[0]
            entries = []
            category = None
            for element in elements[1:]:
                if element.tag == "intent":
                    if entries:
                        entries[-1]["opens"] = "activity"
                    continue
                key = element.text("key")
                record = {
                    "tag": element.tag,
                    "key": key,
                    "title": self.resource(element.reference("title")),
                    "titleText": element.text("title"),
                    "summary": self.resource(element.reference("summary")),
                    "summaryText": element.text("summary"),
                    "depth": element.depth,
                }
                if element.tag == "PreferenceCategory":
                    category = key or record["title"] or record["titleText"]
                    record["category"] = None
                else:
                    record["category"] = category
                if element.text("fragment") is not None:
                    record["opens"] = "fragment"
                # Ce qui suit ne sert qu'à décrire le **contrôle** ; on le lit ici parce
                # que c'est ici qu'il est écrit, mais il ne repart pas dans les écrans :
                # `slim_row` le retire avant l'écriture, pour ne pas dire deux fois la
                # même chose dans le même fichier. La table `preferences` en est le seul
                # porteur.
                entries_res = element.reference("entries")
                values_res = element.reference("entryValues")
                if entries_res is not None:
                    record["entryLabels"] = self.arrays.name_of(entries_res)
                if values_res is not None:
                    values_name = self.arrays.name_of(values_res)
                    record["values"] = self.arrays.texts(values_name, FALLBACK_LANGUAGE) \
                        if values_name else None
                for attribute in ("min", "max", "decimals", "show_limits", "systemSteps",
                                  "inputType", "persistent", "icons"):
                    value = element.number(attribute)
                    if value is None:
                        value = element.boolean(attribute)
                    if value is not None:
                        record[attribute] = value
                unit = element.text("unit") or element.text("valsuffix")
                if unit is not None:
                    record["unit"] = unit
                default = element.attributes.get("defaultValue")
                if default is not None and default[0] in ("string", "boolean", "int", "float"):
                    record["xmlDefault"] = default[1]
                entries.append(record)
                if key and key not in rows:
                    rows[key] = dict(record, screen=name, order=len(entries) - 1)
            screens.append({
                "id": name,
                "file": path.name,
                "title": self.resource(root.reference("title")),
                "rows": [slim_row(entry) for entry in entries],
            })
        return screens, rows

    # -- croisement --------------------------------------------------------
    def _merge(self) -> dict[str, dict]:
        keys = set(self.config.declarations) | {
            key for key, row in self.rows.items()
            if CONTROLS.get(row["tag"]) not in (None, "action", "button")
            and "opens" not in row
        }
        merged: dict[str, dict] = {}
        for key in sorted(keys):
            declaration = self.config.declarations.get(key)
            row = self.rows.get(key)
            control = CONTROLS.get(row["tag"]) if row else None
            if row is not None and row.get("opens") is not None:
                control = "screen"
            entry: dict = {
                "family": family_of(key),
                "scope": declaration["scope"] if declaration else None,
                "declared": declaration is not None,
                "valueKind": declaration["valueKind"] if declaration else None,
                "control": control,
                "label": (row["title"] if row else None),
                "help": (row["summary"] if row else None),
            }
            if declaration is not None:
                entry["impl"] = declaration["impl"]
                if declaration["default"] is not None:
                    entry["default"] = declaration["default"]
                if declaration["defaultSource"] is not None:
                    entry["defaultSource"] = declaration["defaultSource"]
                if declaration["enumValues"] is not None:
                    entry["enum"] = declaration["enum"]
                    entry["enumValues"] = declaration["enumValues"]
            if row is not None:
                entry["screen"] = row["screen"]
                entry["order"] = row["order"]
                if row["category"]:
                    entry["category"] = row["category"]
                if row.get("titleText"):
                    entry["labelText"] = row["titleText"]
                if row.get("summaryText"):
                    entry["helpText"] = row["summaryText"]
                if row.get("entryLabels"):
                    entry["entryLabels"] = row["entryLabels"]
                if row.get("values"):
                    entry["values"] = row["values"]
                for attribute, target in (("min", "min"), ("max", "max"),
                                          ("decimals", "decimals"), ("unit", "unit")):
                    if attribute in row:
                        entry[target] = row[attribute]
                if "xmlDefault" in row:
                    if "default" not in entry:
                        entry["default"] = row["xmlDefault"]
                        entry["defaultSource"] = "xml"
                    elif entry["default"] != row["xmlDefault"]:
                        entry["xmlDefault"] = row["xmlDefault"]
                        # Les deux sources donnent un défaut, et pas le même. Un écart
                        # ici voudrait dire qu'on a apparié la ligne d'écran à la
                        # mauvaise clé — c'est le contrôle croisé le moins cher de tous.
                        self.default_conflicts.append(key)

            # -- les valeurs permises, et laquelle des deux listes fait foi -------
            #
            # Quand une liste déroulante a des `entryValues`, **ce sont eux** : ils sont
            # dans l'ordre des libellés traduits qui les accompagnent, et l'interface
            # affiche les deux appariés. L'énumération donne le même domaine dans un
            # ordre **différent** — celui des ordinaux. Sur `Display.Orientation`, le
            # bytecode dit SENSOR, LANDSCAPE, PORTRAIT… et l'écran affiche SENSOR,
            # PORTRAIT, LANDSCAPE… : prendre l'ordre du bytecode pour l'ordre de la liste
            # collerait « Paysage » sur `PORTRAIT`.
            if "values" in entry:
                entry["valuesSource"] = "entryValues"
            elif entry.get("enumValues"):
                entry["values"] = entry["enumValues"]
                entry["valuesSource"] = "enum"
            if entry.get("enumValues") and entry.get("valuesSource") == "entryValues":
                if set(entry["enumValues"]) != set(entry["values"]):
                    self.value_conflicts.append(key)

            # Une clé qu'aucune ligne de la classe de configuration ne déclare est
            # persistée par Android lui-même, et le type dépend alors du contrôle : une
            # `ListPreference` et un `EditTextPreference` écrivent une chaîne, une
            # `SwitchPreferenceCompat` un booléen, un `SeekBarPreference` un entier. Ce
            # n'est pas une supposition sur XCTrack, c'est le contrat de la classe
            # Android qu'il emploie.
            if entry["valueKind"] is None and declaration is None and row is not None:
                entry["valueKind"] = ANDROID_VALUE_KINDS.get(row["tag"])

            personal = personal_of(key, entry["scope"], row.get("inputType") if row else None)
            if personal is not None:
                entry["personal"] = personal
            merged[key] = entry
        return merged


# --------------------------------------------------------------------------
# Écriture
# --------------------------------------------------------------------------

def used_resources(catalog: Catalog) -> tuple[set[str], set[str]]:
    """Les ressources de texte et les tableaux que le catalogue affiche."""
    texts: set[str] = set()
    arrays: set[str] = set()
    for entry in catalog.preferences.values():
        for field in ("label", "help"):
            if entry.get(field):
                texts.add(entry[field])
        if entry.get("entryLabels"):
            arrays.add(entry["entryLabels"])
    for screen in catalog.screens:
        if screen["title"]:
            texts.add(screen["title"])
        for row in screen["rows"]:
            for field in ("title", "summary"):
                if row.get(field):
                    texts.add(row[field])
            if row.get("entryLabels"):
                arrays.add(row["entryLabels"])
    return texts, arrays


def self_test() -> None:
    """Éprouve les deux garde-fous **sans APK**, sur des tables écrites à la main.

    Ce que ce script doit garantir ne se voit pas sur un APK qui marche : il faut le
    saboter. On rend donc l'énumération de portée méconnaissable, et on vérifie que la
    lecture ne rend pas un catalogue vide en silence mais **lève**.

    Lancé par `python3 tools/extract-preferences.py --self-test`, et par la suite de
    tests du dépôt, qui verrouille ainsi le mode d'échec.
    """
    checks: list[tuple[str, bool]] = []

    def check(label: str, condition: bool) -> None:
        checks.append((label, bool(condition)))

    icons = {"order": ["MD_BATTERY_FULL", "MD_WIFI"], "fields": {}}
    three = {"order": ["PUBLIC", "INTERNAL", "SECURE"], "fields": {}}
    four = {"order": ["PUBLIC", "INTERNAL", "SECURE", "SENSITIVE"], "fields": {}}
    wide = {"order": ["PUBLIC", "INTERNAL", "SECURE"] + [f"X{n}" for n in range(50)],
            "fields": {}}

    check("trois constantes : reconnue", scope_enum_of({"a": icons, "b": three}) == "b")
    # Le défaut 1 : la 0.9.6.2 en porte quatre. L'égalité stricte rendait `None`.
    check("quatre constantes (0.9.6.2) : reconnue",
          scope_enum_of({"a": icons, "b": four}) == "b")
    check("cinq constantes ou plus : reconnue",
          scope_enum_of({"z": wide}) == "z")
    check("la plus petite gagne", scope_enum_of({"a": wide, "b": four}) == "b")
    # De la 0.9.9.1 à la 0.9.10.3, l'énumération n'existe pas : il faut le dire, pas
    # désigner une table d'icônes au hasard.
    check("aucune énumération de portée : None", scope_enum_of({"a": icons}) is None)
    check("énumération incomplète : None",
          scope_enum_of({"a": {"order": ["PUBLIC", "INTERNAL"], "fields": {}}}) is None)

    # Le sabotage : une énumération renommée n'est plus reconnue — et c'est bien le
    # comportement voulu, tant que la suite refuse de publier ce qu'elle en tire.
    renamed = {"order": ["OPEN", "LOCAL", "ENCRYPTED"], "fields": {}}
    check("énumération renommée : méconnaissable", scope_enum_of({"a": renamed}) is None)

    # Et le garde-fou proprement dit : zéro déclaration lève, quoi qu'il arrive.
    reader = ConfigReader.__new__(ConfigReader)
    reader.declarations = {}
    reader.scope_enum = None
    reader.screen_keys = set()
    raised = False
    try:
        _guard_declarations(reader, Path("XCTrack-saboté"))
    except ExtractionFailed as error:
        raised = "aucune préférence déclarée" in str(error)
    check("zéro déclaration : ExtractionFailed", raised)

    for label, ok in checks:
        print(f"  {'ok  ' if ok else 'ÉCHEC'} {label}")
    failed = [label for label, ok in checks if not ok]
    if failed:
        print(f"{len(failed)} vérification(s) en échec", file=sys.stderr)
        raise SystemExit(1)
    print(f"{len(checks)} vérifications, aucune en échec")


def main() -> None:
    if "--self-test" in sys.argv[1:]:
        self_test()
        return
    apk_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if apk_dir is None:
        candidates = sorted(PROJECT_ROOT.parent.glob("XCTrack-*"))
        if not candidates:
            print("Aucun dossier XCTrack-* à côté du projet ; passez le chemin en argument.",
                  file=sys.stderr)
            raise SystemExit(2)
        apk_dir = candidates[-1]
    if not (apk_dir / "resources.arsc").exists():
        print(f"{apk_dir} ne contient pas resources.arsc", file=sys.stderr)
        raise SystemExit(2)

    # Rien n'est écrit avant que la lecture ait abouti : un échec laisse le catalogue
    # précédent en place, plutôt que de le remplacer par un catalogue vide.
    try:
        catalog = Catalog(apk_dir)
    except ExtractionFailed as failure:
        print(f"ÉCHEC DE L'EXTRACTION — {failure}", file=sys.stderr)
        print("Aucun fichier n'a été écrit.", file=sys.stderr)
        raise SystemExit(3) from failure
    if catalog.config.scope_enum is None:
        # Légitime avant la 0.9.11 — la notion de portée n'existait pas —, suspect
        # après. Dans les deux cas, toutes les portées valent alors `PUBLIC` par
        # défaut : ça se dit, plutôt que de se lire entre les lignes du catalogue.
        print("Attention : aucune énumération de portée dans cet APK. La classe de "
              "configuration a été reconnue par recoupement avec les écrans, et toutes "
              "les préférences sont rendues PUBLIC faute de portée lue.", file=sys.stderr)
    version_code, version_name, package = SCHEMA.manifest_version(apk_dir / "AndroidManifest.xml")

    texts, arrays = used_resources(catalog)
    strings = {key: catalog.translations(key) for key in sorted(texts)}
    languages = sorted({language for translation in strings.values() for language in translation}
                       | {FALLBACK_LANGUAGE})

    families: dict[str, list[str]] = defaultdict(list)
    for key, entry in catalog.preferences.items():
        families[entry["family"]].append(key)

    exported = [key for key, entry in catalog.preferences.items() if entry["scope"] == "PUBLIC"]
    labelled = [key for key, entry in catalog.preferences.items() if entry["label"] or entry.get("labelText")]
    personal = [key for key, entry in catalog.preferences.items() if "personal" in entry]

    base = {
        "meta": {
            "source": apk_dir.name,
            "generatedBy": "tools/extract-preferences.py",
            # La dimension « version » n'est pas construite (voir le rapport de
            # livraison), mais le catalogue dit **de quelle version il parle** : c'est
            # le minimum pour qu'une base multi-versions puisse un jour l'indexer sans
            # avoir à redécouvrir sa provenance.
            "versionCode": version_code,
            "versionName": version_name,
            "package": package,
            "configClass": short(catalog.config.config_class),
            "preferenceRoot": short(catalog.config.preference_root or ""),
            "scopeEnum": short(catalog.config.scope_enum or ""),
            # À quoi la classe de configuration a été reconnue : `scope` par
            # l'énumération de portée, `screens` par le recoupement avec les écrans
            # quand cette énumération n'existe pas encore. Publié parce qu'un relevé
            # doit dire de quel chemin il vient.
            "configCriterion": catalog.config.criterion,
            "languages": languages,
            "preferenceCount": len(catalog.preferences),
            "declaredCount": len(catalog.config.declarations),
            "exportedCount": len(exported),
            "labelledCount": len(labelled),
            "personalCount": len(personal),
            "screenCount": len(catalog.screens),
            "stringCount": len(strings),
            "arrayCount": len(arrays),
            "directReadCount": len(catalog.config.direct_reads),
            # Deux relevés qui doivent rester vides. Voir `value_conflicts` et
            # `default_conflicts` : ce sont les deux endroits où les deux sources se
            # contredisent, donc les deux endroits où l'extraction se serait trompée.
            "valueConflicts": sorted(catalog.value_conflicts),
            "defaultConflicts": sorted(catalog.default_conflicts),
        },
        "families": {name: sorted(keys) for name, keys in sorted(families.items())},
        "preferences": catalog.preferences,
        # Les clés que la classe de configuration lit à même les préférences partagées,
        # sans objet de préférence : ni dans le `<clinit>`, ni dans un écran. Voir
        # `ConfigReader._direct_reads`. Publiées **à côté** des préférences, parce qu'on
        # n'a lu ni leur portée ni, pour la plupart, la moindre écriture : les ranger
        # avec les autres reviendrait à les dire exportables sans l'avoir mesuré.
        "directReads": catalog.config.direct_reads,
        "screens": catalog.screens,
        # Les clés qu'aucun écran de réglages ne montre : l'écart est une donnée, il est
        # publié tel quel plutôt que laissé à recalculer.
        "unlabelled": sorted(key for key, entry in catalog.preferences.items()
                             if not entry["label"] and not entry.get("labelText")),
    }

    out_dir = PROJECT_ROOT / "src" / "catalog" / "preferenceCatalog"
    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("*.json"):
        stale.unlink()  # une langue retirée de l'APK ne doit pas survivre au fichier

    base_path = out_dir / "base.json"
    base_path.write_text(json.dumps(base, ensure_ascii=False, indent=1, sort_keys=False) + "\n",
                         encoding="utf-8")

    written: list[tuple[str, int, int, int]] = []
    for language in languages:
        payload_texts: dict[str, str] = {}
        borrowed = 0
        for key, by_language in strings.items():
            own = by_language.get(language)
            if own is not None:
                payload_texts[key] = own
            elif (fallback := by_language.get(FALLBACK_LANGUAGE)) is not None:
                payload_texts[key] = fallback
                borrowed += 1
        payload_arrays: dict[str, list[str]] = {}
        for name in sorted(arrays):
            values = catalog.arrays.texts(name, language)
            if values is None:
                values = catalog.arrays.texts(name, FALLBACK_LANGUAGE)
            if values is not None:
                payload_arrays[name] = values
        payload = {
            "language": language,
            "fallbackLanguage": FALLBACK_LANGUAGE,
            "nativeStringCount": len(payload_texts) - borrowed,
            "fallbackStringCount": borrowed,
            "strings": payload_texts,
            "arrays": payload_arrays,
        }
        path = out_dir / f"{language}.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n",
                        encoding="utf-8")
        written.append((language, len(payload_texts) - borrowed, borrowed, path.stat().st_size))

    index_path = PROJECT_ROOT / "src" / "catalog" / "preferenceCatalogLanguages.json"
    index_path.write_text(json.dumps(languages, ensure_ascii=False, indent=1) + "\n",
                          encoding="utf-8")

    # ------------------------------------------------------- le relevé des clés personnelles
    #
    # `src/model/personalKeys.json` est le sous-ensemble « personnel » du catalogue,
    # extrait ici et **jamais recopié à la main**. Il existe pour une raison de poids :
    # `src/model/personalData.ts` répond à « qu'y a-t-il de personnel dans ce fichier ? »
    # pour quatre écrans, dont trois n'ont pas le catalogue sous la main et ne doivent pas
    # charger ses 96 Ko pour le savoir.
    #
    # Une copie que rien ne vérifie dérive au premier APK, en silence — le pire mode de
    # défaillance pour de la confidentialité. `tests/model/personalData.test.ts` exige à
    # chaque exécution que ce fichier soit la copie exacte de ce qui est écrit ci-dessus :
    # régénérer le catalogue sans régénérer ce relevé fait tomber le test.
    personal_keys = {
        key: {
            "kind": entry["personal"]["kind"],
            "basis": entry["personal"]["basis"],
            "reason": entry["personal"]["reason"],
            "scope": entry["scope"],
        }
        for key, entry in sorted(catalog.preferences.items())
        if entry.get("personal")
    }
    personal_path = PROJECT_ROOT / "src" / "model" / "personalKeys.json"
    personal_path.write_text(
        json.dumps(
            {
                "meta": {
                    "source": base["meta"]["source"],
                    "generatedBy": base["meta"]["generatedBy"],
                    "versionCode": base["meta"]["versionCode"],
                    "versionName": base["meta"]["versionName"],
                    "keyCount": len(personal_keys),
                },
                "keys": personal_keys,
            },
            ensure_ascii=False,
            indent=1,
        )
        + "\n",
        encoding="utf-8",
    )

    print(f"APK : {apk_dir.name} (versionCode {version_code}, {version_name})")
    print(f"Classe de configuration : {short(catalog.config.config_class)}, "
          f"racine {short(catalog.config.preference_root or '?')}, "
          f"portées {short(catalog.config.scope_enum or 'aucune')} "
          f"(reconnue par : {catalog.config.criterion})")
    print(f"Part invariante : {base_path} ({base_path.stat().st_size:,} octets)")
    total = sum(size for _l, _n, _b, size in written)
    print(f"Textes : {out_dir}/ — {len(written)} fichiers de langue, {total:,} octets")
    print(f"Liste des langues : {index_path}")
    print(f"Clés personnelles : {personal_path} "
          f"({len(personal_keys)} clés, {personal_path.stat().st_size:,} octets)")
    print()
    print(f"Préférences : {len(catalog.preferences)} "
          f"({len(catalog.config.declarations)} déclarées dans le bytecode, "
          f"{len(exported)} exportées)")
    print(f"Libellées : {len(labelled)} ; sans libellé : {len(base['unlabelled'])}")
    print(f"Données personnelles marquées : {len(personal)}")
    print(f"Écrans de réglages : {len(catalog.screens)}")
    rewritten = sum(1 for entry in catalog.config.direct_reads.values() if entry["written"])
    print(f"Lues sans être déclarées : {len(catalog.config.direct_reads)} "
          f"({rewritten} réécrites par l'application)")
    print(f"Désaccords entre les deux sources : "
          f"{len(catalog.value_conflicts)} sur les valeurs, "
          f"{len(catalog.default_conflicts)} sur les défauts")
    print(f"Familles : {len(families)}")


if __name__ == "__main__":
    main()
