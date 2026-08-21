#!/usr/bin/env python3
"""Relève les **domaines de valeurs** que les écrans de réglages ne portent pas.

    python3 tools/build-preference-domains.py --surveys <dossier_de_relevés> \
        --android-jar <chemin/android.jar> [--corpus <dossier de .xcfg réels>...]

Deux familles de préférences échappent au catalogue courant, et pour deux raisons
différentes. Toutes deux laissent l'éditeur sans domaine, donc en champ de saisie
libre — où le pilote peut écrire une valeur que XCTrack refusera.

## `Unit.*` — huit listes que XCTrack remplit en code

Les huit `ListPreference` de `preferences_units` n'ont ni `android:entries` ni
`android:entryValues` : l'écran ne porte que la clé et le titre, et XCTrack peuple la
liste au moment de l'afficher. **Les cinquante-cinq relevés le confirment : aucune
version, dans aucune langue, ne déclare ces listes en ressources.**

Ce qu'on peut relever, et qu'on relève ici :

* le **vocabulaire** des unités — l'énumération d'unités du bytecode, dont chaque
  constante porte le code écrit dans le fichier (`m`, `km/h`, `FL`…). C'est
  l'alphabet dans lequel une valeur est écrite ;
* les valeurs **observées** dans des fichiers réels.

Ce qu'on ne relève **pas**, faute de pouvoir le lire : le sous-ensemble du
vocabulaire que chaque clé accepte. `Unit.Distance` vaut `m,km` dans le corpus —
deux codes séparés par une virgule, une échelle et non une unité — quand
`Unit.Altitude` vaut `m`. Rien dans les relevés ne dit quelles combinaisons XCTrack
propose. Le champ `domain` reste donc `null`, et c'est un renseignement : mieux vaut
que l'éditeur se taise que de proposer une valeur qu'un vario refusera en vol.

## `Keys.*` — un entier sans table de correspondance

Les quinze liaisons de touches portent un **code de touche Android**. « 266 » ne dit
rien à personne ; `KEYCODE_STEM_2` dit quelque chose. La table `KEYCODE_*` est
publique et stable : elle est lue ici dans l'`android.jar` du SDK Android installé,
sans réseau, en analysant directement le fichier de classe `android/view/KeyEvent`
— aucun JDK n'est requis.

Le niveau d'API relevé part dans le fichier : une table lue sur l'API 36 ne connaît
pas les codes ajoutés plus tard, et un code inconnu doit rester `null` plutôt que de
recevoir un nom inventé.

### Le bit 0x01000000 : ce qu'on croit, et pourquoi on le dit ainsi

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

C'est cohérent, c'est corroboré — **ce n'est pas lu dans le bytecode**. Le fichier
porte donc `longPressBitBasis: "inferred"` avec ses preuves, et l'interface doit dire
« bit 0x01000000 » ou « appui long (déduit) », jamais « appui long » comme un constat.

Et le corpus ne vient que d'**un seul appareil** : ces quatre paires sont tout ce que
nous avons. Une cinquième valeur qui contredirait la lecture renverserait la
conclusion.
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
            # Par clé : ce qu'un fichier réel porte, et le domaine — toujours `null`,
            # parce qu'aucune source lisible ne le donne. Voir l'en-tête.
            "keys": {key: {"observed": unit_values.get(key, []), "domain": None}
                     for key in unit_keys},
        },
        "keyCodes": {
            "androidApiLevel": api_level,
            "source": args.android_jar.name,
            "codes": {str(code): name for code, name in sorted(table.items())},
            # Ôté ce bit, il reste un code de touche Android. Ce que le bit *signifie*
            # n'est pas lu dans le bytecode : voir `longPressBitBasis`.
            "longPressBit": 0x01000000,
            "longPressBitBasis": "inferred",
            "longPressBitEvidence": [
                "quatre valeurs du corpus valent un code Android valide une fois le "
                "bit ôté : 16777240→24, 16777241→25, 16777243→27, 16777482→266",
                "ces quatre codes sont exactement ceux que d'autres liaisons du même "
                "fichier portent sans le bit",
                "ressources de texte keyLongPress = « Long press: » et "
                "keyExtLong = « External key - long press »",
                "corpus d'un seul appareil : quatre paires, pas davantage",
            ],
            # -1 : aucune touche affectée. C'est le défaut déclaré des quinze liaisons.
            "unsetValue": -1,
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
          f"{sum(len(v['observed']) for v in payload['units']['keys'].values())}")
    print(f"Clés Keys.* (action) : {len(payload['keyCodes']['keys'])}")
    print(f"{args.out} : {args.out.stat().st_size:,} octets")


if __name__ == "__main__":
    main()
