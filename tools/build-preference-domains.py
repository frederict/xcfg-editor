#!/usr/bin/env python3
"""Relève les **domaines de valeurs** que les écrans de réglages ne portent pas.

    python3 tools/build-preference-domains.py --surveys <dossier_de_relevés> \
        --android-jar <chemin/android.jar> [--corpus <dossier de .xcfg réels>...]

Deux familles de préférences échappent au catalogue courant, et pour deux raisons
différentes. Toutes deux laissent l'éditeur sans domaine, donc en champ de saisie
libre — où le pilote peut écrire une valeur que XCTrack refusera.

## `Unit.*` — huit listes que XCTrack remplit en code, et qu'on a relevées à l'écran

Les huit `ListPreference` de `preferences_units` n'ont ni `android:entries` ni
`android:entryValues` : l'écran ne porte que la clé et le titre, et XCTrack peuple la
liste au moment de l'afficher. **Les cinquante-cinq relevés le confirment : aucune
version, dans aucune langue, ne déclare ces listes en ressources.**

Trois choses de nature différente entrent donc dans ce fichier, et elles ne se
confondent pas :

* le **vocabulaire** des unités — l'énumération d'unités du bytecode, dont chaque
  constante porte le code écrit dans le fichier (`m`, `km/h`, `FL`…). C'est
  l'alphabet dans lequel une valeur est écrite, **extrait de l'APK** ;
* les valeurs **observées** dans des fichiers réels ;
* le **domaine** de chaque clé — la liste fermée que l'écran propose — qui ne se lit
  nulle part et qui a donc été **relevé à la main sur l'appareil** : voir
  `MEASURED_UNIT_DOMAINS`. C'est la seule donnée de ce fichier qui ne sorte ni du
  bytecode ni d'un `.xcfg`.

Ce relevé porte sur **un seul modèle d'appareil et une seule version de XCTrack**.
Il ne se présente donc pas comme une propriété de XCTrack : `domainSource` dit sur
quoi il a été fait, et l'interface doit le redire au pilote.

## `Keys.*` — un entier sans table de correspondance

Les quinze liaisons de touches portent un **code de touche Android**. « 266 » ne dit
rien à personne ; `KEYCODE_STEM_2` dit quelque chose. La table `KEYCODE_*` est
publique et stable : elle est lue ici dans l'`android.jar` du SDK Android installé,
sans réseau, en analysant directement le fichier de classe `android/view/KeyEvent`
— aucun JDK n'est requis.

Le niveau d'API relevé part dans le fichier : une table lue sur l'API 36 ne connaît
pas les codes ajoutés plus tard, et un code inconnu doit rester `null` plutôt que de
recevoir un nom inventé.

### Le bit 0x01000000 : l'appui long, et il est maintenant mesuré

Quatre valeurs du corpus dépassent 16 777 216 : `16777240`, `16777241`, `16777243`,
`16777482`. Ôté le bit 0x01000000, il reste `24`, `25`, `27`, `266` — quatre codes
Android valides, et **exactement les quatre touches que les autres liaisons du même
fichier portent sans le bit** :

| touche | sans le bit | avec le bit |
|---|---|---|
| `KEYCODE_VOLUME_UP` (24) | `Keys.ZoomIn` | `Keys.PreviousPage` |
| `KEYCODE_VOLUME_DOWN` (25) | `Keys.ZoomOut` | `Keys.NextPage` |
| `KEYCODE_CAMERA` (27) | `Keys.PrevWaypoint` (2022) | `Keys.NextWaypoint` (2022) |
| `KEYCODE_STEM_2` (266) | `Keys.PrevWaypoint` (2024→) | `Keys.NextWaypoint` (2024→) |

Deux ressources de texte vont dans le même sens : `keyLongPress` = « Long press: » et
`keyExtLong` = « External key - long press ».

Ce n'était qu'une déduction jusqu'à ce que l'écran natif de XCTrack la confirme :
mise en regard d'une configuration portant `Keys.PreviousPage = 16777240`, la ligne
affiche « **Appui long :** Augmenter le volume » — le bit posé, la touche 24, et le
mot. Le fichier porte donc `longPressBitBasis: "measured"`, et l'interface peut
écrire « appui long » sans réserve.

Ce qui reste **non vérifié** et ne doit pas être gommé : le relevé a été fait sur un
seul appareil et une seule version, et rien ne dit ce que le bit vaudrait sur une
touche que cet appareil-là ne porte pas.

## Les touches que l'appareil porte vraiment

Un code de touche n'est pas une touche. `Keys.PrevWaypoint = 266` est une ligne
parfaitement valide d'un fichier ; encore faut-il que le boîtier ait une touche qui
émette 266. Sur l'AIR³ 7.2 relevé ici, il n'y en a que trois — voir
`MEASURED_HARDWARE_KEYS`.

⚠️ **Ce relevé ne vaut que pour ce modèle-là.** Les AIR³ plus récents portent
davantage de touches physiques, et un réglage inerte sur l'un peut être vivant sur
l'autre. Le fichier `.xcfg` déclarant son appareil (`info.device`), l'interface peut
et doit conditionner son propos au modèle — et ne jamais écrire « cette touche
n'existe pas ».

## Trois crans de connaissance, et non deux

Ce que nous savons d'un code de touche se range sur **trois** crans, et les confondre
est la faute que ce fichier existe pour éviter :

1. **Touche pressée à la main, code lu à l'arrivée** — `MEASURED_HARDWARE_KEYS`, et
   c'est le seul cran qui prouve qu'un bouton existe. Trois touches sur l'AIR³ 7.2.
2. **Code déclaré par le noyau du boîtier** — `KERNEL_KEY_DECLARATIONS`, relevé par
   `getevent -pl` et le fichier de disposition qu'Android applique réellement. Il
   prouve que le code est **possible sur ce matériel** ; il ne prouve pas qu'un bouton
   l'émette. Un contrôleur de clavier déclare souvent plus de codes que le boîtier n'a
   de boutons.
3. **Rien** — le code n'est déclaré nulle part sur ce modèle.

⚠️ **Le fichier de disposition ne fait donc pas relevé, mais il ne fait pas silence
non plus.** `sn7326-key` déclare `CAMERA` en 27 et quatre codes de croix
directionnelle ; 27 est justement ce que `Keys.PrevWaypoint` porte dans le corpus. Un
texte qui dirait de 27 « aucune touche mesurée ne l'émet », sans plus, contredirait le
noyau. Un texte qui dirait « cette touche existe » irait au-delà de la mesure. Le
premier cran seul fait foi ; le second élargit le champ des possibles.

⚠️ **266 (`KEYCODE_STEM_2`) n'est expliqué par aucun des deux crans** :
`UNEXPLAINED_KEY_CODES` range ce qu'on en sait et l'hypothèse — **non vérifiée** —
d'une injection par une application installée. C'est une hypothèse, jamais une
explication.
"""
from __future__ import annotations

import argparse
import json
import re
import struct
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

KEY_EVENT_ENTRY = "android/view/KeyEvent.class"
# Le niveau d'API n'est pas dans l'archive : il est déclaré à côté d'elle, dans le
# `source.properties` de la plateforme. C'est lui qui date la table — une table lue
# sur l'API 36 ne connaît pas les codes ajoutés ensuite.
SOURCE_PROPERTIES = "source.properties"
API_LEVEL_KEY = "AndroidVersion.ApiLevel"

# En deçà, la lecture de l'`android.jar` a mal tourné : `KeyEvent` en portait déjà
# plus de 200 à l'API 19. Un tableau amputé ne s'écrit pas — il s'annonce.
MIN_KEYCODES = 200

# L'énumération d'unités se reconnaît par son contenu, jamais par son nom : celui-ci
# change à chaque compilation (`Lde9;`, `Lyd9;`, `Ljd9;`…). Ces quatre codes suffisent
# à la distinguer de tout le reste du bytecode.
UNIT_ENUM_MARKERS = {"m/s", "km/h", "m", "ft"}

UNIT_PREFIX = "Unit."
KEY_PREFIX = "Keys."

# --------------------------------------------------------------------------
# Ce qui a été relevé à la main, sur l'appareil
# --------------------------------------------------------------------------
#
# Tout le reste de ce fichier sort d'un APK ou d'un `.xcfg`, et se régénère. Les deux
# tables ci-dessous, non : elles ont été relevées **à l'œil et au doigt** sur un
# appareil, et rien dans le code ne peut les revérifier. Elles sont donc écrites ici,
# à la main, avec leur provenance — et le fichier produit la porte jusqu'à l'écran.

# Le relevé des huit listes d'unités : chaque `ListPreference` dépliée sur l'écran
# natif « Unités » de XCTrack, parcourue option par option, et chaque choix vérifié
# par un export de la configuration.
#
# ⚠️ `value` est ce que le **fichier** porte, `label` ce que l'**écran** affiche, et
# les deux diffèrent : l'appareil écrit « m, km » à l'écran et `"m,km"` dans le
# fichier. Écrire l'espace dans le fichier produirait une valeur que XCTrack refuse.
#
# ⚠️ L'ordre est celui de l'appareil, et il n'est ni alphabétique ni logique
# (`Unit.RelativeDistance` propose km, puis nm, puis mi). Le trier serait déjà ne
# plus relever.
MEASURED_UNIT_DOMAINS: dict[str, list[tuple[str, str]]] = {
    "Unit.Distance": [("m,km", "m, km"), ("mi", "mi"), ("yd,mi", "yd, mi"),
                      ("nm", "nm")],
    "Unit.CompetitionDistance": [("m,km", "m, km"), ("mi", "mi"), ("nm", "nm")],
    "Unit.RelativeDistance": [("km", "km"), ("nm", "nm"), ("mi", "mi")],
    "Unit.Altitude": [("m", "m"), ("ft", "ft")],
    "Unit.AirspaceAltitude": [("m", "m"), ("ft", "ft")],
    "Unit.Speed": [("km/h", "km/h"), ("m/s", "m/s"), ("mph", "mph"), ("kt", "kt")],
    "Unit.WindSpeed": [("km/h", "km/h"), ("m/s", "m/s"), ("mph", "mph"),
                       ("kt", "kt")],
    "Unit.VerticalSpeed": [("m/s", "m/s"), ("ft/min", "ft/min"),
                           ("100ft/min", "100ft/min")],
}

UNIT_DOMAIN_SOURCE = {
    "basis": "measured",
    "device": "AIR3 AIR3-7.2 8.1.0",
    "deviceLabel": "AIR³ 7.2",
    "versionName": "1.0.3-beta",
    "method": "écran natif « Unités » de XCTrack, chaque liste dépliée et parcourue "
              "option par option, chaque choix vérifié par un export de la "
              "configuration",
    "caveats": [
        "un seul modèle d'appareil et une seule version de XCTrack : une autre "
        "pourrait proposer d'autres unités",
        "l'appareil affiche « m, km » et écrit « m,km » : l'espace de l'écran n'est "
        "pas dans le fichier",
    ],
}

# Les touches **physiques** du boîtier, appuyées une à une, le code lu à l'arrivée.
#
# ⚠️ Ce n'est pas une propriété d'XCTrack ni d'Android : c'est ce que **ce
# modèle-là** porte. Les AIR³ plus récents en ont davantage, et un réglage sans effet
# sur celui-ci peut être parfaitement vivant sur un autre. Le `.xcfg` déclarant son
# appareil (`info.device`), l'interface conditionne son propos au modèle.
MEASURED_HARDWARE_KEYS = [
    {
        "deviceId": "air3-7.2",
        "device": "AIR3 AIR3-7.2 8.1.0",
        "label": "AIR³ 7.2",
        "basis": "measured",
        "keys": [
            {"code": 24, "label": "volume haut"},
            {"code": 25, "label": "volume bas"},
            {"code": 26, "label": "marche/arrêt"},
        ],
        "caveats": [
            "relevé sur ce modèle seul ; les AIR³ plus récents portent davantage de "
            "touches physiques",
            "trois touches pressées ne font pas trois touches soudées : c'est ce que "
            "nous avons pressé, pas ce que le boîtier porte",
            "le noyau du même boîtier déclare d'autres codes — voir "
            "kernelDeclaration : un code déclaré est possible sur ce matériel, sans "
            "qu'un appui l'ait prouvé",
        ],
    },
]

# Ce que le **noyau** du boîtier déclare : le deuxième cran, entre l'appui sous le
# doigt et le silence complet.
#
# ⚠️ **Une capacité déclarée n'est pas une touche sous le doigt.** Un contrôleur de
# clavier déclare souvent plus de codes que le boîtier n'a de boutons : cette mesure
# élargit le champ des possibles, elle ne prouve pas qu'un bouton existe. Seul un
# appui physique le ferait.
#
# Recette, à refaire sans deviner :
#   adb shell getevent -pl                        → les codes Linux de chaque
#                                                   périphérique d'entrée
#   adb shell dumpsys input                       → le fichier de disposition
#                                                   qu'Android applique à chacun
#   adb shell cat /system/usr/keylayout/<nom>.kl  → la traduction Linux → Android
KERNEL_KEY_DECLARATIONS = {
    "air3-7.2": {
        "basis": "kernelDeclared",
        "device": "AIR3 AIR3-7.2 8.1.0",
        "surveyedOn": "2026-08-22",
        "method": "adb shell getevent -pl pour les codes Linux que déclare chaque "
                  "périphérique d'entrée, adb shell dumpsys input pour le fichier de "
                  "disposition qu'Android applique réellement à chacun, puis lecture "
                  "de ce fichier dans /system/usr/keylayout/",
        "devices": [
            {
                "name": "mtk-kpd",
                "what": "le clavier du boîtier",
                "keyLayoutFile": "/system/usr/keylayout/mtk-kpd.kl",
                "keyLayoutIsFallback": False,
                "linuxCodes": [114, 115, 116, 408],
                "codes": [24, 25, 26],
                "unmappedLinuxCodes": [408],
            },
            {
                "name": "sn7326-key",
                "what": "le contrôleur de clavier sn7326",
                # Le fichier propre au périphérique n'existe pas : Android se rabat
                # sur Generic.kl, et c'est lui qui traduit 212 en CAMERA (27).
                "keyLayoutFile": "/system/usr/keylayout/Generic.kl",
                "keyLayoutIsFallback": True,
                "linuxCodes": [103, 105, 106, 108, 114, 158, 212, 251],
                "codes": [4, 19, 20, 21, 22, 25, 27],
                "unmappedLinuxCodes": [251],
            },
            {
                "name": "mtk-tpd",
                "what": "la dalle tactile",
                "keyLayoutFile": "/system/usr/keylayout/Generic.kl",
                "keyLayoutIsFallback": True,
                "linuxCodes": [139, 158, 172, 217, 330],
                "codes": [3, 4, 82, 84],
                "unmappedLinuxCodes": [330],
            },
            {
                "name": "ACCDET",
                "what": "la prise casque",
                "keyLayoutFile": "/system/usr/keylayout/ACCDET.kl",
                "keyLayoutIsFallback": False,
                "linuxCodes": [87, 88, 114, 115, 164, 582],
                "codes": [24, 25, 79, 141, 142, 231],
                "unmappedLinuxCodes": [],
            },
        ],
        "caveats": [
            "une capacité déclarée n'est pas une touche sous le doigt : un contrôleur "
            "de clavier déclare souvent plus de codes que le boîtier n'a de boutons",
            "ce relevé élargit le champ des possibles ; seul un appui physique prouve "
            "qu'un bouton existe",
            "le fichier /system/usr/keylayout/sn7326-key.kl n'existe pas : c'est "
            "Generic.kl qui s'applique, et c'est lui qui traduit CAMERA 212 en 27",
            "Android déclare un cinquième périphérique, « Virtual », qui ne déclare "
            "aucun code au noyau : c'est par lui qu'arrivent les événements qu'une "
            "application injecte",
            "relevé sur ce boîtier seul, sous Android 8.1.0 : un autre AIR³ peut "
            "déclarer autre chose",
        ],
    },
}

# Les codes que le corpus porte et que **ni** l'appui **ni** le noyau n'expliquent.
#
# ⚠️ `hypothesis` est une hypothèse : elle se dit comme telle partout, et jamais comme
# une explication. `evidence` range ce qui la rend plausible — et ce qui manquerait
# pour la vérifier.
UNEXPLAINED_KEY_CODES = [
    {
        "code": 266,
        "hypothesis": "injectedByApp",
        "suspectPackage": "air3.air3xctaddon",
        "deviceId": "air3-7.2",
        "surveyedOn": "2026-08-22",
        "evidence": [
            "aucun des quatre périphériques d'entrée du boîtier ne déclare un code "
            "Linux que sa disposition traduirait en 266",
            "le seul fichier de disposition du boîtier qui porte des entrées STEM, "
            "/system/usr/keylayout/qwerty.kl (583 → STEM_2), n'est appliqué à aucun "
            "des périphériques : dumpsys input les donne sur Generic.kl, ACCDET.kl et "
            "mtk-kpd.kl",
            "le paquet air3.air3xctaddon est installé sur l'appareil, et un add-on qui "
            "injecte des événements les fait passer par le périphérique « Virtual », "
            "qui n'a pas de disposition à respecter",
            "rien de tout cela ne prouve l'injection : ni le code de l'add-on ni un "
            "appui n'ont été observés — c'est ce qu'il faudrait pour trancher",
        ],
    },
]

# `0.9.11.11-464-g2c43a2932` : 464 commits après l'étiquette.
BUILD_RE = re.compile(r"-(\d+)-g[0-9a-f]{6,}$")


def build_number(version_name: str | None) -> int:
    match = BUILD_RE.search(version_name or "")
    return int(match.group(1)) if match else 0


# --------------------------------------------------------------------------
# La table des codes de touches, lue dans le fichier de classe
# --------------------------------------------------------------------------

def _api_level(platform: Path) -> int | None:
    """Le niveau d'API de la plateforme, ou `None` si elle ne le déclare pas."""
    properties = platform / SOURCE_PROPERTIES
    if not properties.is_file():
        return None
    for line in properties.read_text(encoding="utf-8", errors="replace").splitlines():
        name, _, value = line.partition("=")
        if name.strip() == API_LEVEL_KEY:
            try:
                return int(value.strip())
            except ValueError:
                return None
    return None


def _constant_pool(data: bytes) -> tuple[dict[int, object], int]:
    """Rend `{index: valeur}` pour les entrées utiles, et l'offset après la table.

    Seuls `Utf8` (tag 1) et `Integer` (tag 3) nous servent : les noms de champs et la
    valeur de leur attribut `ConstantValue`. Le reste n'est que traversé — mais il
    doit l'être exactement, tailles comprises, sinon tout ce qui suit se décale."""
    (count,) = struct.unpack_from(">H", data, 8)
    pool: dict[int, object] = {}
    offset = 10
    index = 1
    while index < count:
        tag = data[offset]
        offset += 1
        if tag == 1:  # Utf8
            (length,) = struct.unpack_from(">H", data, offset)
            offset += 2
            pool[index] = data[offset:offset + length].decode("utf-8", "replace")
            offset += length
        elif tag == 3:  # Integer
            (pool[index],) = struct.unpack_from(">i", data, offset)
            offset += 4
        elif tag == 4:  # Float
            offset += 4
        elif tag in (5, 6):  # Long, Double — deux places dans la table
            offset += 8
            index += 1
        elif tag in (7, 8, 16, 19, 20):  # Class, String, MethodType, Module, Package
            offset += 2
        elif tag == 15:  # MethodHandle
            offset += 3
        elif tag in (9, 10, 11, 12, 17, 18):  # refs, NameAndType, (Invoke)Dynamic
            offset += 4
        else:
            raise ValueError(f"tag de pool de constantes inconnu : {tag}")
        index += 1
    return pool, offset


def keycodes(jar: Path) -> tuple[dict[int, str], int | None]:
    """`{code: "KEYCODE_..."}` lu dans `android/view/KeyEvent`, et le niveau d'API.

    Aucun JDK n'est nécessaire : `android.jar` est une archive zip, et un fichier de
    classe se lit à la structure."""
    api_level = _api_level(jar.parent)
    with zipfile.ZipFile(jar) as archive:
        try:
            data = archive.read(KEY_EVENT_ENTRY)
        except KeyError:
            raise SystemExit(f"{jar} ne porte pas {KEY_EVENT_ENTRY} : "
                             "ce n'est pas un android.jar de plateforme.")
    if data[:4] != b"\xca\xfe\xba\xbe":
        raise SystemExit(f"{KEY_EVENT_ENTRY} n'est pas un fichier de classe Java.")
    pool, offset = _constant_pool(data)
    offset += 6  # access_flags, this_class, super_class
    (interfaces,) = struct.unpack_from(">H", data, offset)
    offset += 2 + 2 * interfaces

    (field_count,) = struct.unpack_from(">H", data, offset)
    offset += 2
    table: dict[int, str] = {}
    duplicates: dict[int, list[str]] = defaultdict(list)
    for _ in range(field_count):
        _flags, name_index, _descriptor = struct.unpack_from(">HHH", data, offset)
        offset += 6
        name = pool.get(name_index)
        (attribute_count,) = struct.unpack_from(">H", data, offset)
        offset += 2
        value = None
        for _ in range(attribute_count):
            attribute_name, length = struct.unpack_from(">HI", data, offset)
            offset += 6
            if pool.get(attribute_name) == "ConstantValue" and length == 2:
                (constant,) = struct.unpack_from(">H", data, offset)
                value = pool.get(constant)
            offset += length
        if (isinstance(name, str) and name.startswith("KEYCODE_")
                and isinstance(value, int)):
            if value in table:
                duplicates[value].append(name)
            else:
                table[value] = name
    if len(table) < MIN_KEYCODES:
        raise SystemExit(f"{len(table)} constantes KEYCODE_ lues dans {jar}, "
                         f"au moins {MIN_KEYCODES} attendues : la lecture a échoué, "
                         "rien n'est écrit.")
    if duplicates:
        # `KEYCODE_UNKNOWN` vaut 0 et rien d'autre ne le partage : une collision
        # signalerait une lecture décalée, pas une particularité d'Android.
        raise SystemExit(f"codes de touche en double : {dict(duplicates)}")
    return table, api_level


# --------------------------------------------------------------------------
# Le vocabulaire des unités, lu dans les relevés
# --------------------------------------------------------------------------

def unit_vocabulary(surveys: list[dict]) -> tuple[list[str], dict]:
    """Rend l'alphabet des codes d'unité et sa provenance.

    Le vocabulaire est celui de la version la plus récente qui le porte : c'est le
    seul dont on puisse dire qu'il vaut pour l'éditeur d'aujourd'hui. Les versions
    plus anciennes qui portent le même sont citées ; celles qui en portent un autre
    aussi, avec le leur."""
    found: list[tuple[dict, str, list[str]]] = []
    for survey in surveys:
        for name, table in (survey.get("enums") or {}).items():
            order = table.get("order") or []
            if UNIT_ENUM_MARKERS <= set(order):
                found.append((survey, name, order))
    if not found:
        raise SystemExit("aucun relevé ne porte l'énumération des unités : "
                         "le vocabulaire ne peut pas être établi, rien n'est écrit.")
    newest_survey, newest_enum, newest_order = found[-1]
    variants: dict[str, list[str]] = defaultdict(list)
    for survey, _name, order in found:
        variants["".join(order)].append(survey["versionName"])
    provenance = {
        "enum": newest_enum,
        "versionName": newest_survey["versionName"],
        "versionCode": newest_survey["versionCode"],
        "alsoIn": sorted(set(variants["".join(newest_order)])
                         - {newest_survey["versionName"]}),
        "otherVocabularies": [
            {"codes": key.split(""), "versionNames": sorted(names)}
            for key, names in sorted(variants.items())
            if key != "".join(newest_order)
        ],
        # Les cinquante-cinq relevés ne portent pas tous cette énumération : le
        # bytecode des versions anciennes ne la livre pas à notre lecture. Le dire
        # évite de prendre le vocabulaire pour une constante de XCTrack.
        "surveysWithout": len(surveys) - len({s["source"] for s, _n, _o in found}),
    }
    return list(newest_order), provenance


# --------------------------------------------------------------------------
# Le relevé fait à la main, confronté à ce que les sources lisibles disent
# --------------------------------------------------------------------------

def unit_domains(vocabulary: list[str], unit_keys: list[str],
                 unit_values: dict[str, list]) -> dict[str, list[dict[str, str]]]:
    """`MEASURED_UNIT_DOMAINS`, vérifié contre le bytecode et contre le corpus.

    Un relevé à la main se fait contredire par le reste du fichier plutôt que par un
    pilote en vol. Trois contradictions arrêtent la génération :

    * une clé d'unité du dernier relevé sans domaine relevé, ou l'inverse ;
    * un code qui n'est pas du vocabulaire de l'énumération — le relevé aurait alors
      été fait sur autre chose que ces unités-là ;
    * une valeur qu'un `.xcfg` réel porte et que le domaine ne propose pas — c'est
      le signe qu'une option a été manquée, et fermer la liste dessus retirerait au
      pilote une valeur que son appareil accepte."""
    known = set(vocabulary)
    measured = set(MEASURED_UNIT_DOMAINS)
    declared = set(unit_keys)
    if measured != declared:
        raise SystemExit(
            f"relevé des unités et relevé de version en désaccord : "
            f"{sorted(measured - declared)} relevées en trop, "
            f"{sorted(declared - measured)} sans domaine relevé — rien n'est écrit.")
    for key, choices in MEASURED_UNIT_DOMAINS.items():
        for value, _label in choices:
            for code in value.split(","):
                if code not in known:
                    raise SystemExit(f"{key} : « {code} » n'est pas du vocabulaire "
                                     "de l'énumération d'unités — rien n'est écrit.")
        offered = {value for value, _label in choices}
        for seen in unit_values.get(key, []):
            if seen not in offered:
                raise SystemExit(
                    f"{key} : un fichier réel porte « {seen} », que le domaine relevé "
                    "ne propose pas — une option a été manquée, rien n'est écrit.")
    return {key: [{"value": value, "label": label} for value, label in choices]
            for key, choices in MEASURED_UNIT_DOMAINS.items()}


def hardware_keys(table: dict[int, str]) -> list[dict]:
    """`MEASURED_HARDWARE_KEYS`, chaque code confronté à la table d'Android, et le
    relevé du noyau accroché au modèle qu'il concerne.

    Un code relevé au doigt qu'Android ne nomme pas serait une faute de frappe, pas
    une touche. Un code déclaré par le noyau qu'Android ne nomme pas non plus : les
    deux crans passent le même contrôle, et se rangent côte à côte sans se mélanger."""
    for device in MEASURED_HARDWARE_KEYS:
        for key in device["keys"]:
            if key["code"] not in table:
                raise SystemExit(f"{device['deviceId']} : le code {key['code']} n'est "
                                 "dans aucune table de touches Android lue ici — "
                                 "rien n'est écrit.")
    for device_id, declaration in KERNEL_KEY_DECLARATIONS.items():
        for source in declaration["devices"]:
            for code in source["codes"]:
                if code not in table:
                    raise SystemExit(
                        f"{device_id} / {source['name']} : le code déclaré {code} "
                        "n'est dans aucune table de touches Android lue ici — rien "
                        "n'est écrit.")
    return [
        {**device,
         "keys": [{**key, "name": table[key["code"]]} for key in device["keys"]],
         # Le deuxième cran voyage avec le premier, et sous son propre nom : un texte
         # qui les confondrait dirait d'un code déclaré ce qu'un appui seul prouve.
         **({"kernelDeclaration": kernel_declaration(device["deviceId"], table)}
            if device["deviceId"] in KERNEL_KEY_DECLARATIONS else {})}
        for device in MEASURED_HARDWARE_KEYS
    ]


def kernel_declaration(device_id: str, table: dict[int, str]) -> dict:
    """Le relevé du noyau d'un modèle, chaque code déclaré nommé par la table."""
    declaration = KERNEL_KEY_DECLARATIONS[device_id]
    return {
        **{key: value for key, value in declaration.items() if key != "devices"},
        "devices": [
            {**source,
             "keys": [{"code": code, "name": table[code]}
                      for code in source["codes"]]}
            for source in declaration["devices"]
        ],
    }


def unexplained_codes(table: dict[int, str]) -> list[dict]:
    """`UNEXPLAINED_KEY_CODES`, chaque code nommé par la table d'Android."""
    for entry in UNEXPLAINED_KEY_CODES:
        if entry["code"] not in table:
            raise SystemExit(f"le code inexpliqué {entry['code']} n'est dans aucune "
                             "table de touches Android lue ici — rien n'est écrit.")
    return [{**entry, "name": table[entry["code"]]} for entry in UNEXPLAINED_KEY_CODES]


# --------------------------------------------------------------------------
# Ce que les fichiers réels portent
# --------------------------------------------------------------------------

def observed(directories: list[Path]) -> tuple[dict[str, list], dict[str, list], int]:
    """Valeurs vues dans des `.xcfg` réels, pour les clés `Unit.*` et `Keys.*`.

    Rien d'autre n'en sort : ni le nom des fichiers, ni les autres clés. Une unité et
    un code de touche ne désignent personne — le reste d'un fichier réel, si."""
    units: dict[str, set[str]] = defaultdict(set)
    keys: dict[str, set[int]] = defaultdict(set)
    count = 0
    for directory in directories:
        for path in sorted(directory.glob("*.xcfg")):
            try:
                document = json.loads(path.read_text(encoding="utf-8"))
            except (ValueError, UnicodeDecodeError):
                continue
            preferences = (document or {}).get("preferences")
            if not isinstance(preferences, dict):
                continue
            count += 1
            for key, value in preferences.items():
                if key.startswith(UNIT_PREFIX) and isinstance(value, str):
                    units[key].add(value)
                elif key.startswith(KEY_PREFIX) and isinstance(value, int) \
                        and not isinstance(value, bool):
                    keys[key].add(value)
    return ({k: sorted(v) for k, v in sorted(units.items())},
            {k: sorted(v) for k, v in sorted(keys.items())},
            count)


# --------------------------------------------------------------------------

def load_surveys(directory: Path) -> list[dict]:
    surveys: list[dict] = []
    for path in sorted(directory.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        if payload.get("versionCode") is None:
            continue
        surveys.append(payload)
    surveys.sort(key=lambda s: (s["versionCode"], build_number(s.get("versionName")),
                                s["source"]))
    return surveys


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--surveys", type=Path, required=True,
                        help="dossier des relevés produits par extract-version-schema.py")
    parser.add_argument("--android-jar", type=Path, required=True,
                        help="android.jar d'une plateforme du SDK Android")
    parser.add_argument("--corpus", type=Path, nargs="*", default=None,
                        help="dossiers de fichiers .xcfg réels, pour les valeurs vues")
    parser.add_argument("--out", type=Path,
                        default=PROJECT_ROOT / "src" / "catalog" / "preferenceDomains.json")
    args = parser.parse_args()

    surveys = load_surveys(args.surveys)
    if not surveys:
        sys.exit(f"Aucun relevé exploitable dans {args.surveys}")

    table, api_level = keycodes(args.android_jar)
    vocabulary, provenance = unit_vocabulary(surveys)
    unit_values, key_values, corpus_count = observed(args.corpus or [])

    # Les huit clés d'unité du dernier relevé, qu'un fichier les porte ou non : une
    # clé sans valeur observée doit apparaître avec une liste vide, sinon son absence
    # se lirait comme une absence de la préférence.
    latest = surveys[-1]["preferences"]
    unit_keys = sorted(k for k in latest if k.startswith(UNIT_PREFIX))
    key_keys = sorted(k for k in latest if k.startswith(KEY_PREFIX))

    domains = unit_domains(vocabulary, unit_keys, unit_values)
    devices = hardware_keys(table)

    payload = {
        "meta": {
            "generatedBy": "tools/build-preference-domains.py",
            "surveyCount": len(surveys),
            "newestVersion": surveys[-1]["versionName"],
            "corpusFileCount": corpus_count,
        },
        "units": {
            # L'alphabet des codes d'unité, dans l'ordre des ordinaux.
            "vocabulary": vocabulary,
            "vocabularySource": provenance,
            # D'où vient le domaine des huit clés : un relevé fait à la main, sur un
            # appareil et une version. Il voyage avec les valeurs qu'il justifie.
            "domainSource": UNIT_DOMAIN_SOURCE,
            # Par clé : ce qu'un fichier réel porte, et la liste que l'écran natif
            # propose — `value` tel que le fichier l'écrit, `label` tel que l'écran
            # l'affiche. Voir `MEASURED_UNIT_DOMAINS`.
            "keys": {key: {"observed": unit_values.get(key, []),
                           "domain": domains[key]}
                     for key in unit_keys},
        },
        "keyCodes": {
            "androidApiLevel": api_level,
            "source": args.android_jar.name,
            "codes": {str(code): name for code, name in sorted(table.items())},
            # Ôté ce bit, il reste un code de touche Android, et le bit vaut appui
            # long — l'écran natif le dit maintenant en toutes lettres.
            "longPressBit": 0x01000000,
            "longPressBitBasis": "measured",
            "longPressBitEvidence": [
                "écran natif de XCTrack, réglage des touches : la ligne portant "
                "16777240 (= 24 | 0x1000000) affiche « Appui long : Augmenter le "
                "volume »",
                "quatre valeurs du corpus valent un code Android valide une fois le "
                "bit ôté : 16777240→24, 16777241→25, 16777243→27, 16777482→266",
                "ces quatre codes sont exactement ceux que d'autres liaisons du même "
                "fichier portent sans le bit",
                "ressources de texte keyLongPress = « Long press: » et "
                "keyExtLong = « External key - long press »",
                "relevé sur un seul appareil et une seule version : ce que le bit "
                "vaudrait sur une touche que cet appareil ne porte pas n'est pas vérifié",
            ],
            # -1 : aucune touche affectée. C'est la valeur d'usine des quinze liaisons.
            "unsetValue": -1,
            # Les touches physiques relevées, par modèle d'appareil. Le `.xcfg` déclare
            # le sien : c'est ce qui autorise l'interface à parler du matériel.
            "hardwareKeys": devices,
            # Ce que ni l'appui ni le noyau n'expliquent, avec l'hypothèse qui tient
            # lieu de piste — et qui se dit comme une hypothèse, jamais autrement.
            "unexplainedCodes": unexplained_codes(table),
            "keys": {key: {"observed": key_values.get(key, [])}
                     for key in key_keys
                     if latest[key].get("control") == "action"},
        },
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(payload, ensure_ascii=False,
                                   separators=(",", ":")) + "\n", encoding="utf-8")

    print(f"Relevés          : {len(surveys)}")
    print(f"Codes de touche  : {len(table)} (API {api_level})")
    print(f"Vocabulaire      : {len(vocabulary)} unités, {provenance['enum']} "
          f"de {provenance['versionName']}")
    if provenance["otherVocabularies"]:
        for other in provenance["otherVocabularies"]:
            print(f"  autre vocabulaire ({len(other['codes'])}) : "
                  f"{other['versionNames'][:3]}")
    print(f"Relevés sans l'énumération d'unités : {provenance['surveysWithout']}")
    print(f"Clés Unit.*      : {len(unit_keys)} ; valeurs vues : "
          f"{sum(len(v['observed']) for v in payload['units']['keys'].values())} ; "
          f"domaines relevés : "
          f"{sum(len(v['domain']) for v in payload['units']['keys'].values())} options")
    print(f"Clés Keys.* (action) : {len(payload['keyCodes']['keys'])}")
    for device in devices:
        names = ", ".join(f"{k['name']} ({k['code']})" for k in device["keys"])
        print(f"Touches relevées : {device['label']} — {names}")
    print(f"{args.out} : {args.out.stat().st_size:,} octets")


if __name__ == "__main__":
    main()
