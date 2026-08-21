#!/usr/bin/env python3
"""Relève **tout ce qu'un APK de XCTrack dit de sa configuration**, en une passe.

    python3 tools/extract-version-schema.py <dossier_apk_decompresse> \
        [-o relevé.json] [--texts relevé.textes.json.gz]

Un relevé répond désormais à neuf questions, et non plus à une seule :

 1. quels **widgets** existent, et quelles clés d'option chacun accepte ;
 2. quels **écrans de réglages** la version présente, et dans quel ordre ;
 3. pour chaque **préférence** : portée, type, défaut, contrôle, libellé, valeurs ;
 4. toutes les **tables d'énumération** du bytecode, brutes ;
 5. toutes les ressources **`string` et `array`, dans toutes les langues**, brutes ;
 6. ce que l'APK livre dans **`assets/`** et **`res/raw/`** — thèmes de carte, sons ;
 7. les **noms d'événements** (`Battery20`, `Landing`…) ;
 8. ce que l'APK sait des **classes d'espaces aériens** ;
 9. le **manifeste** : `versionCode`, `versionName`, `package`.

La première version de ce script ne relevait que le point 1. Il a fallu redemander
1,6 Go à l'archive pour obtenir les huit autres : d'où la règle qui gouverne
maintenant ce fichier — **on relève tout ce qui est lisible, on n'arbitre pas à la
place de celui qui lira**. Un relevé complet pèse quelques centaines de kilooctets
de structure et un mégaoctet de textes compressés ; c'est peu au regard du coût
d'une troisième collecte.

## Comment obtenir un dossier d'APK décompressé

    unzip -o mon-xctrack.apk -d /tmp/xct

⚠️ **`res/` est indispensable** — c'est là que vivent les écrans de réglages — et
c'est aussi le piège de ce script. Le dossier est **plat**, l'obfuscation y met des
noms qui ne diffèrent que par la **casse** (`res/Ft.xml` est un `PreferenceScreen`,
`res/FT.xml` une mise en page d'AndroidX), et **327 membres** de l'APK de la
`1.0.3-beta5` sont dans ce cas. Sur macOS ou Windows, un dépaqueteur qui écrase
silencieusement en perd autant, et **six écrans sur dix-neuf** tombent à côté.
`unzip` renomme (`Ft-1.xml`) : c'est la convention que ce script sait relire, et
la seule chose qui compte est qu'**aucun membre ne soit perdu**. On ne retient
jamais un document par son nom : `discover_screens` balaie tout `res/` et ne garde
que ceux dont la **racine** est `PreferenceScreen`.

Ce script ne va **rien chercher sur le réseau** : il lit ce qu'on lui donne. À
chacun de fournir l'APK de la version qu'il veut vérifier.

## Ce qui est réutilisé

Rien de la lecture bas niveau n'est réécrit ici. Le parseur `resources.arsc` vient de
`tools/extract-widget-labels.py`, le lecteur `.dex` et le simulateur de registres
Dalvik de `tools/extract-widget-options.py`, les écrans de réglages et le
`<clinit>` de la classe de configuration de `tools/extract-preferences.py`. Voir
leurs en-têtes pour la méthode ; elle n'est pas redite ici.

Deux différences avec `extract-preferences.py`, toutes deux voulues :

* il produit le catalogue de **la version courante**, traductions résolues et repli
  anglais fusionné ; ce script produit un **relevé brut d'une version parmi
  cinquante-cinq**. Rien n'y est fusionné, rien n'y est écarté : c'est la matière,
  pas le produit ;
* les options de widget dont le libellé n'a pas pu être résolu sont **conservées**.
  Le catalogue courant les écarte, et il a raison : une option sans libellé ne
  s'affiche pas. Mais sa *clé* existe bel et bien dans le fichier de configuration.
  Les écarter fabriquerait des trous : sur `0.9.11.11`, `titletext` tombe dans les
  non-résolues pour les quarante widgets de valeur.

## Les énumérations : pourquoi une lecture à part

`extract-widget-options.py` relève les énumérations dont les constantes sont en
capitales (`ENUM_NAME_RE`), parce que c'est tout ce dont un réglage de widget a
besoin. Ce filtre écarte précisément ce qu'on cherche ici : les événements
s'appellent `Battery20` et `Landing`. Et sa reconnaissance ne suit que
`invoke-direct` (`0x70`), quand R8 émet aussi `invoke-direct/range` (`0x76`) — c'est
le cas de l'énumération des événements de la `1.0.3-beta5`, qui lui échappe donc
entièrement.

`enum_tables` ci-dessous ne filtre pas sur le nom et retient un critère structurel :
la classe **hérite de `java.lang.Enum`**, et une constante n'est comptée que
lorsqu'elle est rangée par un `sput-object` dans un champ **de la classe et du type
de la classe**. Les deux conditions ensemble suppriment la pollution : sans elles,
un `StringBuilder` construit dans le même `<clinit>` fait entrer `CTR Prague` dans
la liste des événements.

## Ce que le relevé ne prouve pas

L'absence d'une clé dans un relevé ne prouve **pas** son absence de XCTrack : elle
peut aussi signaler une limite de l'extraction. Et sa présence dans un fichier réel
ne prouve pas davantage qu'elle existait dans la version qui a écrit ce fichier —
**XCTrack conserve les clés qu'il ne connaît plus**.

Enfin, une section qui échoue est **déclarée** (`sections`, `errors`) et non tue :
un relevé amputé qui le dit vaut mieux qu'une version manquante, et surtout mieux
qu'un trou silencieux — qui se lirait comme un palier de schéma qui n'a jamais eu
lieu.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import importlib.util
import io
import json
import struct
import sys
import traceback
import zipfile
from collections import defaultdict
from pathlib import Path

sys.dont_write_bytecode = True

PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Les scripts frères dont ce relevé réutilise la lecture bas niveau. Leur empreinte
# part dans chaque relevé : une base bâtie avec deux révisions différentes des
# outils produirait des différences fantômes, donc de faux paliers de schéma.
SIBLINGS = ("extract-widget-labels.py", "extract-widget-options.py",
            "extract-widget-catalog.py", "extract-preferences.py")


def _load(filename: str):
    """Import par chemin : les scripts frères portent des tirets."""
    path = PROJECT_ROOT / "tools" / filename
    spec = importlib.util.spec_from_file_location(
        filename[:-3].replace("-", "_"), path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _load_options_module():
    """Conservé sous son nom d'origine : `collect-xctrack-versions.py` s'en sert."""
    return _load("extract-widget-options.py")


def tool_fingerprint() -> str:
    """Empreinte des scripts qui font le relevé, ce fichier compris.

    Elle n'est pas décorative. Toutes les versions d'une même base doivent être
    relevées avec **la même** révision : deux lectures différentes du bytecode
    donneraient des écarts qui ressemblent à s'y méprendre à des changements de
    XCTrack. Comparer les empreintes des cinquante-cinq relevés est le seul contrôle
    qui attrape ça, et il coûte une ligne.
    """
    digest = hashlib.sha256()
    for name in (Path(__file__).name,) + SIBLINGS:
        path = PROJECT_ROOT / "tools" / name
        digest.update(path.read_bytes() if path.is_file() else b"")
    return digest.hexdigest()[:16]


# --------------------------------------------------------------------------
# AndroidManifest.xml binaire : le versionCode fait autorité
# --------------------------------------------------------------------------
# Format « AXML » : une suite de morceaux typés, dont un vivier de chaînes et une
# table qui associe chaque nom d'attribut à son identifiant de ressource système.
# Le nom textuel d'un attribut est souvent absent d'un APK optimisé ; l'identifiant,
# lui, ne l'est jamais.

ATTR_VERSION_CODE = 0x0101021B
ATTR_VERSION_NAME = 0x0101021C
CHUNK_STRING_POOL = 0x0001
CHUNK_RESOURCE_MAP = 0x0180
CHUNK_START_ELEMENT = 0x0102
TYPE_STRING = 0x03


def _utf8_length(data: bytes, offset: int) -> tuple[int, int]:
    value = data[offset]
    offset += 1
    if value & 0x80:
        value = ((value & 0x7F) << 8) | data[offset]
        offset += 1
    return value, offset


def _string_pool(data: bytes, offset: int) -> list[str]:
    count, _styles, flags, strings_start, _styles_start = struct.unpack_from(
        "<IIIII", data, offset + 8)
    utf8 = bool(flags & (1 << 8))
    offsets = struct.unpack_from(f"<{count}I", data, offset + 28)
    base = offset + strings_start
    pool: list[str] = []
    for entry in offsets:
        cursor = base + entry
        if utf8:
            _chars, cursor = _utf8_length(data, cursor)
            length, cursor = _utf8_length(data, cursor)
            pool.append(data[cursor:cursor + length].decode("utf-8", "replace"))
        else:
            length = struct.unpack_from("<H", data, cursor)[0]
            cursor += 2
            if length & 0x8000:  # chaîne longue : deux mots
                length = ((length & 0x7FFF) << 16) | struct.unpack_from("<H", data, cursor)[0]
                cursor += 2
            pool.append(data[cursor:cursor + length * 2].decode("utf-16-le", "replace"))
    return pool


def manifest_version(path: Path) -> tuple[int | None, str | None, str | None]:
    """Rend `(versionCode, versionName, package)` lus dans le manifeste binaire."""
    data = path.read_bytes()
    chunk_type, header_size, _total = struct.unpack_from("<HHI", data, 0)
    if chunk_type != 0x0003:
        raise ValueError(f"{path} n'est pas un AndroidManifest.xml binaire")
    offset = header_size
    pool: list[str] = []
    resource_map: list[int] = []
    code = name = package = None
    while offset + 8 <= len(data):
        chunk_type, chunk_header, chunk_size = struct.unpack_from("<HHI", data, offset)
        if chunk_size <= 0:
            break
        if chunk_type == CHUNK_STRING_POOL:
            pool = _string_pool(data, offset)
        elif chunk_type == CHUNK_RESOURCE_MAP:
            entries = (chunk_size - chunk_header) // 4
            resource_map = list(struct.unpack_from(f"<{entries}I", data, offset + chunk_header))
        elif chunk_type == CHUNK_START_ELEMENT:
            element = pool[struct.unpack_from("<I", data, offset + 20)[0]]
            attr_start, attr_size, attr_count = struct.unpack_from("<HHH", data, offset + 24)
            if element != "manifest":
                offset += chunk_size
                continue
            for index in range(attr_count):
                at = offset + 16 + attr_start + index * attr_size
                name_index = struct.unpack_from("<I", data, at + 4)[0]
                value_type = data[at + 15]
                value = struct.unpack_from("<I", data, at + 16)[0]
                resource_id = resource_map[name_index] if name_index < len(resource_map) else 0
                label = pool[name_index] if name_index < len(pool) else ""
                if resource_id == ATTR_VERSION_CODE or label == "versionCode":
                    code = value
                elif resource_id == ATTR_VERSION_NAME or label == "versionName":
                    name = pool[value] if value_type == TYPE_STRING else str(value)
                elif label == "package":
                    package = pool[value] if value_type == TYPE_STRING else None
            break
        offset += chunk_size
    return code, name, package


# --------------------------------------------------------------------------
# Énumérations du bytecode, sans filtre de nom
# --------------------------------------------------------------------------

def _field_ref_typed(dex, index: int) -> tuple[str, str, str]:
    """`(classe, type, nom)` d'un `field_id` — le type manque à `Dex.field_ref`."""
    cls_idx, type_idx, name_idx = struct.unpack_from(
        "<HHI", dex.data, dex.field_ids_off + index * 8)
    return dex.type_name(cls_idx), dex.type_name(type_idx), dex.string(name_idx)


def enum_tables(options, dexes) -> dict[str, dict]:
    """{classe: {"order": [NOM, …], "fields": {champ: NOM}}} pour **toute** énumération.

    L'ordre rendu est celui des ordinaux : c'est celui que XCTrack emploie pour ses
    tableaux de libellés, et le nom de la constante est exactement ce qu'un fichier
    `.xcfg` écrit comme valeur.

    Le critère est structurel de bout en bout — la classe hérite de `java.lang.Enum`,
    et la constante est rangée dans un champ de la classe **dont le type est la
    classe**. Aucune convention de nommage n'intervient : `Battery20` et `PUBLIC`
    sont relevés de la même façon.
    """
    tables: dict[str, dict] = {}
    for dex in dexes:
        for name, parent, cdata_off in dex.class_defs():
            if parent != "Ljava/lang/Enum;" or cdata_off == 0:
                continue
            for _idx, method_name, code_off in dex.methods(cdata_off):
                if method_name != "<clinit>" or code_off == 0:
                    continue
                order: list[str] = []
                fields: dict[str, str] = {}
                last_string = None
                built = None
                try:
                    for _pc, op, off in options.walk(dex, code_off):
                        if op == 0x1A:
                            last_string = dex.string(struct.unpack_from("<H", dex.data, off + 2)[0])
                        elif op == 0x1B:
                            last_string = dex.string(struct.unpack_from("<I", dex.data, off + 2)[0])
                        elif op in (0x70, 0x76):  # invoke-direct[/range] : R8 émet les deux
                            _cls, method = dex.method_ref(
                                struct.unpack_from("<H", dex.data, off + 2)[0])
                            if method == "<init>" and last_string is not None:
                                built = last_string
                            last_string = None
                        elif op == 0x69:  # sput-object
                            owner, field_type, field = _field_ref_typed(
                                dex, struct.unpack_from("<H", dex.data, off + 2)[0])
                            if owner == name and field_type == name and built is not None:
                                fields[field] = built
                                order.append(built)
                                built = None
                except (struct.error, IndexError, KeyError):
                    pass
                if order:
                    tables[name] = {"order": order, "fields": fields}
                break
    return dict(sorted(tables.items()))


# --------------------------------------------------------------------------
# Tableaux de chaînes constants d'un <clinit>
# --------------------------------------------------------------------------

# Une classe de l'application : soit elle porte le paquet en clair, soit
# l'obfuscation l'a remontée à la racine (`Lsx;`) — auquel cas son descripteur n'a
# pas de barre oblique. Tout ce qui a un paquet connu est du cadre, pas de XCTrack.
def _is_app_class(descriptor: str) -> bool:
    return descriptor.startswith("Lorg/xcontest/") or "/" not in descriptor


def constant_arrays(options, dexes, limit: int = 512) -> dict[str, list[list[str]]]:
    """{classe: [[chaîne, …], …]} — les tableaux de chaînes bâtis dans un `<clinit>`.

    XCTrack range plusieurs vocabulaires fermés sous cette forme plutôt qu'en
    énumération : la liste des abréviations aéronautiques reconnues en est une. On
    les relève **toutes**, sans chercher à savoir laquelle sert à quoi — c'est
    exactement l'erreur qui a coûté la seconde collecte.

    Seules les classes de l'application sont balayées : les tableaux de Kotlin, de
    Firebase et d'AndroidX pèseraient dix fois plus sans rien apprendre.
    """
    out: dict[str, list[list[str]]] = {}
    for dex in dexes:
        for name, _parent, cdata_off in dex.class_defs():
            if cdata_off == 0 or not _is_app_class(name):
                continue
            for _idx, method_name, code_off in dex.methods(cdata_off):
                if method_name != "<clinit>" or code_off == 0:
                    continue
                found: list[list[str]] = []

                def collect(_cls, _method_idx, args, found=found):
                    for value in args:
                        if value and value[0] == "arr":
                            strings = [v[1] for v in value[1] if v and v[0] == "str"]
                            if len(strings) >= 2:
                                found.append(strings)

                try:
                    # `simulate` ne rappelle que sur les constructions ; les tableaux
                    # passés à une fabrique statique (`Set.of(...)`) lui échappent, on
                    # les rattrape par un balayage des `filled-new-array` de chaînes.
                    options.simulate(dex, code_off, collect)
                    found.extend(_filled_string_arrays(options, dex, code_off))
                except (struct.error, IndexError, KeyError):
                    pass
                unique = []
                for strings in found:
                    if strings not in unique:
                        unique.append(strings)
                if unique:
                    out[name] = unique[:limit]
                break
    return dict(sorted(out.items()))


def _filled_string_arrays(options, dex, code_off: int) -> list[list[str]]:
    """Les `filled-new-array` de chaînes d'une méthode, dans l'ordre du code.

    Une seconde lecture, volontairement naïve : elle ne suit pas les registres, elle
    accumule les `const-string` et les découpe à chaque `filled-new-array`. Elle
    attrape ce que la simulation laisse passer quand le tableau part directement dans
    une fabrique statique, et ne coûte qu'un balayage de plus.
    """
    out: list[list[str]] = []
    pending: list[str] = []
    for _pc, op, off in options.walk(dex, code_off):
        if op == 0x1A:
            pending.append(dex.string(struct.unpack_from("<H", dex.data, off + 2)[0]))
        elif op == 0x1B:
            pending.append(dex.string(struct.unpack_from("<I", dex.data, off + 2)[0]))
        elif op in (0x24, 0x25):  # filled-new-array[/range]
            count = (dex.data[off + 1] >> 4) if op == 0x24 else dex.data[off + 1]
            if 2 <= count <= len(pending):
                out.append(pending[-count:])
            pending = []
    return out


# --------------------------------------------------------------------------
# Ce que l'APK livre : assets/ et res/raw/
# --------------------------------------------------------------------------

def apk_listing(apk_dir: Path) -> list[dict] | None:
    """Le contenu de l'archive, quand on peut le connaître sans l'archive.

    `assets/` n'est décrit nulle part dans `resources.arsc` : la seule source est le
    listing de l'APK. Deux façons de l'obtenir, dans cet ordre :

    1. un fichier `apk-listing.json` déposé à côté du dépaquetage — c'est ce que fait
       une collecte qui ne garde pas les APK, et c'est la source la plus fidèle : elle
       connaît les membres que le système de fichiers a fusionnés par la casse ;
    2. à défaut, un balayage du dossier `assets/` s'il a été dépaqueté.

    Rend `None` quand ni l'un ni l'autre n'existe — l'absence d'information n'est pas
    une liste vide, et le relevé doit pouvoir dire la différence.
    """
    sidecar = apk_dir / "apk-listing.json"
    if sidecar.is_file():
        return json.loads(sidecar.read_text(encoding="utf-8"))
    assets = apk_dir / "assets"
    if assets.is_dir():
        return [{"name": f"assets/{path.relative_to(assets).as_posix()}",
                 "size": path.stat().st_size}
                for path in sorted(assets.rglob("*")) if path.is_file()]
    return None


def group_assets(listing: list[dict] | None) -> dict | None:
    """`assets/` résumé par premier niveau, plus la liste complète des fichiers.

    Les thèmes de carte (`assets/vtm_themes/<nom>/`) et les sons sont ce qu'on vient
    chercher ; le regroupement les met en évidence sans perdre le détail.
    """
    if listing is None:
        return None
    files = [entry for entry in listing if entry["name"].startswith("assets/")]
    groups: dict[str, dict] = {}
    for entry in files:
        parts = entry["name"].split("/")
        top = parts[1] if len(parts) > 2 else "(racine)"
        bucket = groups.setdefault(top, {"count": 0, "bytes": 0})
        bucket["count"] += 1
        bucket["bytes"] += entry.get("size") or 0
    themes = sorted({entry["name"].split("/")[2]
                     for entry in files
                     if entry["name"].startswith("assets/vtm_themes/")
                     and entry["name"].count("/") >= 3})
    return {
        "fileCount": len(files),
        "byteCount": sum(entry.get("size") or 0 for entry in files),
        "groups": dict(sorted(groups.items())),
        "mapThemes": themes,
        "files": sorted(entry["name"] for entry in files),
    }


# Le vivier de ressources sans qualificatif de langue — `values/` dans les sources
# d'Android. Ce n'est **pas** l'anglais : c'est ce qu'un appareil emploie quand aucune
# langue ne convient, et un APK peut avoir les deux. On le nomme donc pour ce qu'il
# est, plutôt que de le confondre avec une langue.
DEFAULT_LOCALE = "(default)"


def raw_arrays(prefs, labels, table) -> dict[str, dict[str, list[str]]]:
    """{locale: {nom: [valeurs]}} pour le type `array`, **sans fusion de langues**.

    `ArrayTable` range les tableaux par défaut sous « en » et fusionne s'il existe un
    `values-en/`. C'est sans conséquence pour le catalogue de la version courante, qui
    résout de toute façon un repli anglais — mais dix-sept des cinquante-cinq versions
    relevées *ont* un `values-en/`, et un relevé brut ne doit rien fusionner : la
    question « ce tableau est-il traduit ou hérité du vivier par défaut ? » doit rester
    posable dix ans plus tard.

    On réemploie son décodeur d'entrée (`_entry`), qui est la partie délicate ; seul le
    parcours des morceaux est refait, pour garder la locale telle qu'elle est écrite.
    """
    reader = prefs.ArrayTable(table)
    data = table.data
    out: dict[str, dict[str, list[str]]] = {}
    for offset in table.type_chunks:
        if data[offset + 8] != reader.type_id:
            continue
        flags = data[offset + 9]
        entry_count = struct.unpack_from("<I", data, offset + 12)[0]
        entries_start = struct.unpack_from("<I", data, offset + 16)[0]
        config_offset = offset + 20
        config_size = struct.unpack_from("<I", data, config_offset)[0]
        locale = labels.parse_config_locale(data[config_offset:config_offset + config_size])
        offsets_start = config_offset + config_size
        base = offset + entries_start
        sparse = bool(flags & 0x01)
        offset16 = bool(flags & 0x02)
        bucket = out.setdefault(DEFAULT_LOCALE if locale == "" else locale, {})
        for index in range(entry_count):
            if sparse:
                entry_index, relative = struct.unpack_from(
                    "<HH", data, offsets_start + index * 4)
                relative *= 4
            elif offset16:
                relative = struct.unpack_from("<H", data, offsets_start + index * 2)[0]
                if relative == 0xFFFF:
                    continue
                relative *= 4
                entry_index = index
            else:
                relative = struct.unpack_from("<I", data, offsets_start + index * 4)[0]
                if relative == 0xFFFFFFFF:
                    continue
                entry_index = index
            decoded = reader._entry(base + relative)
            if decoded is None:
                continue
            name, values = decoded
            bucket[name] = values
    return out


def raw_resources(labels, table) -> dict[str, str]:
    """{nom de ressource: chemin} pour le type `raw` — les sons, entre autres.

    Lu dans `resources.arsc` et non sur le disque : le nom de ressource y est écrit,
    et aucune collision de casse ne vient le brouiller.
    """
    types = table.type_pool["strings"]
    if "raw" not in types:
        return {}
    raw_type_id = types.index("raw") + 1
    out: dict[str, str] = {}
    for offset in table.type_chunks:
        type_id, _locale, entries = table._parse_type_chunk(offset)
        if type_id != raw_type_id:
            continue
        for _index, (key_index, value) in entries.items():
            if isinstance(value, str):
                out[table.key_pool["strings"][key_index]] = value
    return dict(sorted(out.items()))


# --------------------------------------------------------------------------
# Événements et espaces aériens
# --------------------------------------------------------------------------

# Le préfixe que XCTrack donne aux libellés de ses événements : `eventLanding`,
# `eventBattery20`. C'est une convention **de l'APK lu**, pas une liste de noms
# écrite ici : on s'en sert pour reconnaître l'énumération, jamais pour la fabriquer.
EVENT_LABEL_PREFIX = "event"
EVENT_MATCH_MINIMUM = 5


def identify_events(enums: dict[str, dict], resource_names: set[str]) -> dict | None:
    """L'énumération des événements, reconnue par ses libellés.

    Un événement `Landing` a un libellé `eventLanding` dans les ressources. On retient
    l'énumération dont le plus grand nombre de constantes se retrouvent ainsi, à
    condition qu'il y en ait au moins cinq — en dessous, c'est une coïncidence.

    Rien n'est nommé en dur : ni la classe (obfusquée en `hg2` sur la `1.0.3-beta5`),
    ni les noms d'événements. Si une version future renomme le préfixe, la
    reconnaissance rend `None` et le relevé le dit, plutôt que de rendre une liste
    fausse — les énumérations sont de toute façon toutes présentes, brutes.
    """
    best: tuple[int, str | None] = (0, None)
    for name, table in enums.items():
        matched = sum(1 for constant in table["order"]
                      if EVENT_LABEL_PREFIX + constant in resource_names)
        if matched > best[0]:
            best = (matched, name)
    matched, name = best
    if name is None or matched < EVENT_MATCH_MINIMUM:
        return None
    order = enums[name]["order"]
    return {
        "enum": name,
        "names": order,
        "labelledCount": matched,
        "labels": {constant: EVENT_LABEL_PREFIX + constant for constant in order
                   if EVENT_LABEL_PREFIX + constant in resource_names},
    }


AIRSPACE_KEY = "Airspace.ClassColors"
# Une classe d'espace aérien s'écrit `A`, `CTR`, `TMZ` : court, en capitales. Le
# critère est une **forme**, pas une liste ; il sert à proposer des candidats, jamais
# à trancher.
def _looks_like_airspace_class(token: str) -> bool:
    return 1 <= len(token) <= 6 and token.isupper() and token.isalnum()


def airspace_classes(enums: dict[str, dict], arrays: dict[str, list[list[str]]],
                     preferences: dict | None) -> dict:
    """Ce que l'APK sait des classes d'espaces aériens.

    **Il n'y en a pas de liste fermée dans la `1.0.3-beta5`**, et c'est un résultat, pas
    un échec : `Airspace.ClassColors` est une table libre, et l'écran d'édition invite
    le pilote à taper la classe lui-même (« Airspace class (e.g. CTR, A) »). Le relevé
    dit donc `closed: false` et publie les **candidats** — les énumérations et les
    tableaux constants dont toutes les valeurs ont la forme d'une classe d'espace
    aérien. Le vocabulaire d'abréviations que XCTrack emploie pour abréger les
    étiquettes en fait partie.

    Une version plus ancienne qui aurait, elle, une énumération fermée la ferait
    remonter par le même chemin : c'est pour ça que le critère est une forme et non
    une liste de noms.
    """
    candidates: list[dict] = []
    for name, table in enums.items():
        order = table["order"]
        if len(order) >= 8 and all(_looks_like_airspace_class(t) for t in order):
            candidates.append({"kind": "enum", "owner": name, "values": order})
    for name, tables in arrays.items():
        for values in tables:
            if len(values) >= 8 and all(_looks_like_airspace_class(t) for t in values):
                candidates.append({"kind": "array", "owner": name, "values": values})
    candidates.sort(key=lambda c: (-len(c["values"]), c["owner"]))
    return {
        "declaredKey": AIRSPACE_KEY if preferences and AIRSPACE_KEY in preferences else None,
        "closed": False if candidates else None,
        "candidates": candidates[:8],
    }


# --------------------------------------------------------------------------
# Le relevé, section par section
# --------------------------------------------------------------------------

def survey_widgets(options, apk_dir: Path, corpus_dir: Path) -> dict:
    """`{widget: {clé: type de contrôle}}` et de quoi juger de la qualité du relevé.

    Inchangé depuis la première collecte, **délibérément** : la partie widgets de la
    base doit se régénérer à l'identique, faute de quoi on ne saurait pas distinguer
    un changement de XCTrack d'un changement d'outil.

    `corpus_dir` sert d'appui à l'extraction, pas de vérité : `extract-widget-options.py`
    s'en sert pour départager deux littéraux de chaîne dans un même constructeur.
    """
    extractor = options.Extractor(apk_dir, corpus_dir)

    definers: dict[str, list[dict]] = defaultdict(list)
    unresolved: list[dict] = []
    for definer, calls in extractor.constructions.items():
        if definer in extractor.setting_classes:
            continue  # une classe de réglage n'est pas un déclarant : elle EST le réglage
        seen: set[str] = set()
        for cls, method, args in calls:
            if cls not in extractor.setting_classes:
                continue
            option = extractor.option_from_call(cls, method, args)
            if not option or option["key"] in seen:
                continue
            seen.add(option["key"])
            if "unresolved" in option:
                # Libellé introuvable, mais la clé, elle, est lue dans le bytecode :
                # elle a sa place dans un relevé de structure. Voir l'en-tête.
                unresolved.append({"key": option["key"], "definedIn": options.short(definer)})
            definers[definer].append(option)

    widget_classes = options.discover_widget_classes(sorted(apk_dir.glob("classes*.dex")))
    per_widget = options.attribute(extractor, definers, widget_classes)

    # `infer_controls` lit le libellé anglais : on ne lui donne que les options
    # résolues. Les autres reçoivent `unknown`, ce qu'elles sont.
    labelled = {widget: [o for o in opts if "unresolved" not in o]
                for widget, opts in per_widget.items()}
    kinds = options.infer_controls(extractor, labelled)

    schema = {
        widget: {option["key"]: ("unknown" if "unresolved" in option
                                 else kinds.get(option["impl"], "unknown"))
                 for option in opts}
        for widget, opts in sorted(per_widget.items())
    }
    return {
        "widgets": schema,
        "widgetClasses": {group: sorted(names) for group, names in widget_classes.items()},
        "settingRoot": options.short(getattr(extractor, "setting_root", "")),
        "settingClassCount": len(extractor.setting_classes),
        "unresolvedCount": len(unresolved),
        "unresolved": sorted(unresolved, key=lambda u: (u["definedIn"], u["key"])),
        "resourceStringCount": len(extractor.res_by_id),
        "dexClassCount": len(extractor.owner),
    }


# Les trois portées que XCTrack a toujours eues. `extract-preferences.py` reconnaît
# l'énumération à l'**égalité** de ses constantes avec cet ensemble — vrai depuis la
# `0.9.11`, faux avant : la `0.9.6.2` de 2022 en a une quatrième, `SENSITIVE`.
# L'égalité stricte y rend `None`, et tout s'effondre **en silence** : plus de classe
# de configuration, donc zéro préférence déclarée, donc ni type, ni défaut, ni portée
# — et 67 clés d'un fichier `.xcfg` réel de 2022 absentes de son propre relevé. Le
# relevé aurait eu l'air d'un simple « il y avait moins de réglages en 2022 ».
#
# On relâche donc en **inclusion** : l'énumération de portée est celle dont les
# constantes contiennent les trois, la plus petite d'abord. Sur les versions
# récentes, où elle en a exactement trois, la réponse est inchangée — la correction
# ne déplace rien de ce qui marchait.
SCOPE_CONSTANTS = frozenset({"PUBLIC", "INTERNAL", "SECURE"})


# Combien de clés d'un `<clinit>` doivent se retrouver dans les écrans de réglages
# pour qu'on tienne la classe pour celle de la configuration. Cinq suffisent
# largement à écarter le concurrent : le `<clinit>` d'une table d'icônes construit
# neuf cents objets sur des noms en forme de clé (`md_battery_full`), et pas un seul
# ne figure dans un `PreferenceScreen`.
SCREEN_OVERLAP_MINIMUM = 5


def _screen_keys(prefs, labels, apk_dir: Path) -> set[str]:
    """Les clés que les écrans de réglages déclarent — la vérité indépendante.

    Lue avant le bytecode et sans lui : c'est ce qui permet de reconnaître la classe
    de configuration d'une version qui n'a pas d'énumération de portée.
    """
    try:
        table = labels.ResourceTable(apk_dir / "resources.arsc")
        keys: set[str] = set()
        for _name, _path, elements in prefs.discover_screens(apk_dir, table):
            for element in elements:
                key = element.text("key")
                if key:
                    keys.add(key)
        return keys
    except Exception:  # noqa: BLE001 — pas d'écrans lisibles : on retombe sur la portée
        return set()


def _relax_scope_enum(prefs, options, labels) -> None:
    """Spécialise, **dans la copie chargée ici**, la découverte de la configuration.

    `extract-preferences.py` sert le catalogue de la version courante et n'a jamais eu
    à lire 2022 ni 2023. On ne le modifie pas — il est juste, pour ce qu'il fait — on
    le spécialise le temps d'un relevé, sur deux points que la traversée de cinquante-
    cinq versions a mis au jour et qu'une seule ne pouvait pas montrer :

    1. **la portée se reconnaît par inclusion, plus par égalité** (voir
       `SCOPE_CONSTANTS`) ;
    2. **la classe de configuration se reconnaît sans la portée.** La `0.9.10-beta`
       n'a aucune énumération de portée — `SECURE` n'apparaît nulle part dans son
       bytecode, la notion n'existait pas encore. La condition d'origine y rendait
       zéro déclaration, donc un relevé de 114 préférences au lieu de 219, sans rien
       signaler. Le critère de repli est celui qui ne dépend d'aucun nommage : les
       clés du `<clinit>` doivent se retrouver dans les `PreferenceScreen`.

    Quand l'énumération de portée existe, le critère d'origine est appliqué **tel
    quel** : la correction ne déplace rien de ce qui marchait.
    """
    class VersionedConfigReader(prefs.ConfigReader):
        def __init__(self, apk_dir: Path):
            self.screen_keys = _screen_keys(prefs, labels, apk_dir)
            super().__init__(apk_dir)

        def _scope_enum(self):
            candidates = [(len(table["order"]), name)
                          for name, table in self.enums.items()
                          if SCOPE_CONSTANTS <= set(table["order"])]
            return min(candidates)[1] if candidates else None

        def _read_declarations(self) -> tuple[str, list]:
            # Deux passes : d'abord le critère d'origine (la construction reçoit la
            # portée), puis, s'il ne donne rien, le recoupement avec les écrans.
            for require_scope in (True, False):
                if require_scope and self.scope_enum is None:
                    continue
                found = self._best_clinit(require_scope)
                if found[1]:
                    return found
            return ("", [])

        def _best_clinit(self, require_scope: bool) -> tuple[str, list]:
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
                                and prefs.looks_like_key(a[1])]
                        if keys:
                            found.append((cls, keys[0], types, args))

                    try:
                        options.simulate(dex, code_off, on_new)
                    except (struct.error, IndexError, KeyError):
                        continue
                    if require_scope:
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

    prefs.ConfigReader = VersionedConfigReader


def survey_preferences(prefs, apk_dir: Path) -> dict:
    """Préférences et écrans de réglages, tels que `extract-preferences.py` les lit.

    On garde la table telle quelle, libellés compris — mais ce sont ici des **noms de
    ressource** (`prefDisplayTheme`), pas des textes : les textes vivent dans le
    fichier de langues, une fois pour toutes les clés et toutes les langues.
    """
    catalog = prefs.Catalog(apk_dir)
    return {
        "preferences": catalog.preferences,
        "screens": catalog.screens,
        "preferenceMeta": {
            "configClass": prefs.short(catalog.config.config_class),
            "preferenceRoot": prefs.short(catalog.config.preference_root or ""),
            "scopeEnum": prefs.short(catalog.config.scope_enum or ""),
            "preferenceCount": len(catalog.preferences),
            "declaredCount": len(catalog.config.declarations),
            "screenCount": len(catalog.screens),
            "exportedCount": sum(1 for e in catalog.preferences.values()
                                 if e["scope"] == "PUBLIC"),
            "labelledCount": sum(1 for e in catalog.preferences.values()
                                 if e["label"] or e.get("labelText")),
            # Deux relevés qui doivent rester vides : ce sont les deux endroits où les
            # deux sources se contredisent, donc les deux endroits où l'extraction se
            # serait trompée de préférence.
            "valueConflicts": sorted(catalog.value_conflicts),
            "defaultConflicts": sorted(catalog.default_conflicts),
        },
        "unlabelled": sorted(key for key, entry in catalog.preferences.items()
                             if not entry["label"] and not entry.get("labelText")),
    }


def survey(apk_dir: Path, corpus_dir: Path) -> tuple[dict, dict]:
    """Rend `(relevé, textes)`.

    Chaque section est isolée : celle qui échoue est **déclarée** dans `sections` et
    `errors`, les autres sont produites. Une version amputée qui le dit reste
    exploitable ; une version manquante ne l'est pas, et un trou silencieux est pire
    que les deux — il se lirait comme un palier de schéma qui n'a jamais eu lieu.
    """
    options = _load("extract-widget-options.py")
    labels = _load("extract-widget-labels.py")
    # Chargement tardif, et non en tête de module : `extract-preferences.py` importe
    # ce fichier-ci pour la lecture du manifeste. En tête, les deux s'appelleraient
    # sans fin ; dans une fonction, la copie qu'il charge n'appelle plus personne.
    prefs = _load("extract-preferences.py")
    _relax_scope_enum(prefs, options, labels)

    result: dict = {}
    texts: dict = {}
    sections: dict[str, str] = {}
    errors: dict[str, str] = {}

    def section(name: str, work):
        try:
            value = work()
        except Exception as error:  # noqa: BLE001 — on relève l'échec, on ne le tait pas
            sections[name] = "échec"
            errors[name] = f"{type(error).__name__}: {error}"
            print(f"    section « {name} » en échec : {errors[name]}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            return None
        sections[name] = "ok"
        return value

    # 1 — widgets et options (inchangé)
    widgets = section("widgets", lambda: survey_widgets(options, apk_dir, corpus_dir))
    if widgets:
        result.update(widgets)

    # 2, 3 — écrans de réglages et préférences
    preferences = section("preferences", lambda: survey_preferences(prefs, apk_dir))
    if preferences:
        result.update(preferences)

    # 4 — toutes les énumérations, brutes
    dexes = [options.Dex(path) for path in sorted(apk_dir.glob("classes*.dex"))]
    enums = section("enums", lambda: enum_tables(options, dexes)) or {}
    result["enums"] = enums
    arrays = section("constantArrays", lambda: constant_arrays(options, dexes)) or {}
    result["constantArrays"] = arrays

    # 5 — toutes les chaînes et tous les tableaux, dans toutes les langues
    table = labels.ResourceTable(apk_dir / "resources.arsc")

    def read_texts() -> dict:
        # ⚠️ Les autres outils rangent les ressources par défaut sous « en », parce
        # qu'ils résolvent ensuite un repli et que le résultat est le même. **Ici
        # non** : la `1.0.3-beta5` a *aussi* un vrai `values-en/` — dix-sept chaînes
        # d'AndroidX — et écraser l'un par l'autre perdait 2 336 ressources sur
        # 2 353. Un relevé brut ne résout pas les replis, il rend les deux viviers
        # côte à côte et laisse la résolution à celui qui lira.
        by_locale = table.string_entries_by_locale()
        return {
            "strings": {(DEFAULT_LOCALE if locale == "" else locale): dict(sorted(entries.items()))
                        for locale, entries in sorted(by_locale.items())},
            "arrays": {locale: dict(sorted(entries.items()))
                       for locale, entries in sorted(raw_arrays(prefs, labels, table).items())},
        }

    texts = section("texts", read_texts) or {"strings": {}, "arrays": {}}
    result["textMeta"] = {
        "defaultLocale": DEFAULT_LOCALE,
        "stringLocales": sorted(texts["strings"]),
        "arrayLocales": sorted(texts["arrays"]),
        "stringCount": len(texts["strings"].get(DEFAULT_LOCALE, {})),
        "arrayCount": len(texts["arrays"].get(DEFAULT_LOCALE, {})),
    }

    # 6 — ce que l'APK livre
    listing = section("assets", lambda: apk_listing(apk_dir))
    result["assets"] = group_assets(listing)
    result["rawResources"] = section("rawResources",
                                     lambda: raw_resources(labels, table)) or {}

    # 7 — les noms d'événements
    resource_names = set(texts["strings"].get(DEFAULT_LOCALE, {})) | set(
        texts["strings"].get("en", {}))
    result["events"] = section("events",
                               lambda: identify_events(enums, resource_names))

    # 8 — les classes d'espaces aériens
    result["airspace"] = section(
        "airspace", lambda: airspace_classes(enums, arrays, result.get("preferences")))

    result["sections"] = sections
    result["errors"] = errors
    return result, texts


# --------------------------------------------------------------------------
# Écriture
# --------------------------------------------------------------------------

def write_json(path: Path, payload) -> int:
    """Écrit du JSON, compressé si le nom se termine par `.gz`.

    Les textes de trente-trois langues pèsent quatre mégaoctets et demi par version,
    un peu plus d'un compressé. Cinquante-cinq fois, la différence décide de ce qui
    tient dans un dépôt et de ce qui n'y tient pas.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    body = json.dumps(payload, ensure_ascii=False) + "\n"
    if path.suffix == ".gz":
        # `mtime=0` : deux relevés du même APK doivent donner deux fichiers
        # identiques à l'octet près, sinon la reproductibilité ne se vérifie plus.
        buffer = io.BytesIO()
        with gzip.GzipFile(fileobj=buffer, mode="wb", compresslevel=9, mtime=0) as out:
            out.write(body.encode("utf-8"))
        path.write_bytes(buffer.getvalue())
    else:
        path.write_text(body, encoding="utf-8")
    return path.stat().st_size


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("apk_dir", type=Path,
                        help="dossier d'un APK décompressé (AndroidManifest.xml, "
                             "resources.arsc, classes*.dex, res/)")
    parser.add_argument("-o", "--out", type=Path, default=None,
                        help="relevé de structure ; `.gz` pour compresser. "
                             "Sinon, résumé sur la sortie standard")
    parser.add_argument("--texts", type=Path, default=None,
                        help="fichier des chaînes et tableaux de toutes les langues "
                             "(`.gz` recommandé : 4,5 Mo bruts, 1,2 Mo compressés)")
    parser.add_argument("--corpus", type=Path,
                        default=PROJECT_ROOT.parent / "Exemples",
                        help="dossier de fichiers .xcfg servant d'appui à l'extraction")
    parser.add_argument("--label", default=None,
                        help="étiquette de provenance conservée dans le relevé "
                             "(nom du fichier APK d'origine, par exemple)")
    args = parser.parse_args()

    manifest = args.apk_dir / "AndroidManifest.xml"
    if not manifest.is_file():
        parser.error(f"{manifest} est introuvable — l'APK est-il décompressé ?")
    if not (args.apk_dir / "res").is_dir():
        # Pas une erreur fatale : le relevé se fera sans les écrans, et le dira. Mais
        # c'est l'omission qui a coûté une collecte entière, alors elle se voit.
        print("Attention : pas de dossier res/ — les écrans de réglages manqueront.",
              file=sys.stderr)
    code, name, package = manifest_version(manifest)
    if package and package != "org.xcontest.XCTrack":
        print(f"Attention : le paquet est « {package} », pas org.xcontest.XCTrack.",
              file=sys.stderr)

    result, texts = survey(args.apk_dir, args.corpus)
    result = {
        "versionCode": code,
        "versionName": name,
        "package": package,
        "source": args.label or args.apk_dir.name,
        "generatedBy": "tools/extract-version-schema.py",
        "toolFingerprint": tool_fingerprint(),
        **result,
    }

    pairs = sum(len(keys) for keys in result.get("widgets", {}).values())
    failed = [name for name, state in result["sections"].items() if state != "ok"]
    if args.out:
        size = write_json(args.out, result)
        text_size = write_json(args.texts, texts) if args.texts else 0
        print(f"{code} ({name}) : {len(result.get('widgets', {}))} widgets, {pairs} couples, "
              f"{result.get('preferenceMeta', {}).get('preferenceCount', 0)} préférences, "
              f"{result.get('preferenceMeta', {}).get('screenCount', 0)} écrans, "
              f"{len(result.get('enums', {}))} énumérations "
              f"-> {args.out} ({size:,} o)"
              + (f" + {args.texts} ({text_size:,} o)" if args.texts else "")
              + (f"  ÉCHECS : {', '.join(failed)}" if failed else ""))
    else:
        meta = result.get("preferenceMeta", {})
        print(f"versionCode  : {code}")
        print(f"versionName  : {name}")
        print(f"empreinte    : {result['toolFingerprint']}")
        print(f"widgets      : {len(result.get('widgets', {}))}")
        print(f"couples      : {pairs}")
        print(f"non résolues : {result.get('unresolvedCount', 0)} (clé lue, libellé introuvable)")
        print(f"racine des réglages : {result.get('settingRoot', '?')} "
              f"({result.get('settingClassCount', 0)} classes)")
        print(f"préférences  : {meta.get('preferenceCount', 0)} "
              f"({meta.get('declaredCount', 0)} déclarées, "
              f"{meta.get('exportedCount', 0)} exportées, "
              f"{meta.get('labelledCount', 0)} libellées)")
        print(f"écrans       : {meta.get('screenCount', 0)}")
        print(f"énumérations : {len(result.get('enums', {}))}")
        print(f"tableaux constants : {len(result.get('constantArrays', {}))} classes")
        events = result.get("events")
        print(f"événements   : {len(events['names'])} ({events['enum']})" if events
              else "événements   : non reconnus")
        assets = result.get("assets")
        print(f"assets/      : {assets['fileCount']} fichiers, "
              f"thèmes de carte {assets['mapThemes']}" if assets
              else "assets/      : inconnu (ni listing ni dossier)")
        print(f"res/raw/     : {len(result.get('rawResources', {}))} ressources")
        print(f"langues      : {len(result['textMeta']['stringLocales'])} pour les chaînes, "
              f"{len(result['textMeta']['arrayLocales'])} pour les tableaux")
        print(f"sections     : {result['sections']}")


if __name__ == "__main__":
    main()
