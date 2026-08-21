#!/usr/bin/env python3
"""
Dérive les fixtures de `tests/fixtures/exports/` depuis les fichiers réels du
propriétaire — script à **usage unique et local**, qui ne tourne que sur son poste.

    python3 tests/fixtures/deriver-exemples.py <répertoire des fichiers réels>

⚠️ Ce script ne fait pas partie du produit et n'est jamais exécuté par les tests ni par
la CI : les fixtures qu'il produit sont versionnées, ce sont *elles* qui font foi. Il est
versionné pour une seule raison — rendre l'anonymisation **auditable** : on peut lire
ici, ligne par ligne, ce qui a été remplacé et ce qui ne l'a pas été.

## Pourquoi une dérivation, et pas des fichiers écrits à la main

Les tests éprouvent des propriétés qui ne survivent pas à un fichier « propre » : 105
widgets sur 8 pages, six widgets inatteignables au clic, 41 classes de widgets, un layout
de 50 ko. Réécrire tout cela à la main produirait un corpus plus pauvre — et une preuve
plus faible. On repart donc des fichiers réels et on ne touche qu'aux valeurs qui
désignent une personne, un lieu ou un fichier du pilote.

## Ce qui est remplacé, et ce qui ne l'est pas

**Remplacé** — tout ce qui désigne quelqu'un, quelque part, ou un fichier personnel :

| Clé | Pourquoi |
|---|---|
| `preferences/Pilot.Name` | nom du pilote |
| `preferences/Glider.Name` | matériel, identifiant indirect |
| `preferences/Navigation.State` | coordonnées GPS, noms et points de virage réels |
| `preferences/Navigation.WaypointFiles/files` | nomme la compétition et le pays |
| `preferences/Airspace.Files` | nomme le pays survolé |

**Conservé** — le vocabulaire de XCTrack lui-même, qui n'apprend rien sur personne :
énumérations (`SYS_UNIT`, `LANDING_AUTOMATIC`), noms de classes Java, unités (`km/h`),
thèmes livrés dans l'APK, réglages numériques (volume, QNH, seuils du vario), et
`info` en entier — `device` et `versionCode` sont ce qui permet de lire le fichier.

**Conservé aussi : le `layout` entier, à l'octet près.** Ce n'est pas une négligence,
c'est un relevé : les 217 chaînes distinctes du `layout` d'un export `pages` sont toutes
alphanumériques (classes, énumérations, `UUID`) — aucun texte libre, aucun titre
personnalisé, aucun `WButtonPhone` renseigné. Vérifié par balayage du texte intégral, et
re-vérifié à chaque exécution par `verifier()` ci-dessous, qui refuse d'écrire si un
marqueur personnel subsiste **où que ce soit** dans le fichier produit.

⚠️ Ce relevé vaut pour *ces* fichiers-là. Un export `pages` **peut** porter des données
personnelles : `WFreeText.text`, `titletext`, et le `contact/fullName` /
`contact/phoneNumber` d'un `WButtonPhone`. C'est pourquoi le contrôle porte sur le texte
complet et non sur le format d'export.

## Pourquoi Python plutôt que le sérialiseur du projet

`json.dumps(json.loads(t), indent=2, ensure_ascii=False)` reproduit les cinq fichiers
réels **à l'octet près** (vérifié). Python conserve `3.0`, les entiers, l'ordre des clés
et l'UTF-8 brut ; ce que `JSON.stringify` détruirait. Les pièges que Python ne sait pas
porter — `1.0E7`, `-0.0`, entier au-delà de 2^53, clés dupliquées — vivent dans
`tests/fixtures/formes/formes-preservees.xcfg`, écrit à la main.
"""

import json
import re
import sys
from pathlib import Path

# Le répertoire des fichiers réels est passé en argument, jamais écrit ici : ce dépôt
# est public, et le chemin d'un poste n'a rien à y faire.
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else None
CIBLE = Path(__file__).resolve().parent / 'exports'

# Les fichiers réels, et le nom qu'ils portent une fois anonymisés. Les deux fichiers de
# 2025 sont renommés pour deux raisons : « complète.xcfg » porte un accent, que macOS
# range en NFD et Linux en NFC — un nom de fichier non-ASCII dans un dépôt qui se clone
# sur les deux est une panne qui attend son tour ; et « pages.xcfg » ne dit ni sa date ni
# son format. La convention retenue est celle du corpus historique.
FICHIERS = {
    '2026-08-20_backup-00.xcfg': '2026-08-20_backup-00.xcfg',
    '2026-08-20_pages-00.xcfg': '2026-08-20_pages-00.xcfg',
    'backup.xcfg': 'backup.xcfg',
    'complète.xcfg': '2025-07-07_backup-00.xcfg',
    'pages.xcfg': '2025-07-07_pages-00.xcfg',
}

# ------------------------------------------------------------------ valeurs de remplacement

# Un nom manifestement fictif, qui garde la propriété que le fichier réel exerçait : de
# l'UTF-8 **brut**, non échappé, dans une valeur de chaîne. Sans accent ici, le corpus
# perdrait le seul cas non-ASCII de ses préférences.
PILOTE = 'Amélie Exemple'
VOILE = 'EXEMPLE Aile Légère 2'

# Coordonnées inventées, reconnaissables comme telles à leurs décimales répétitives, et
# qui gardent la forme qui compte : un flottant à 17 chiffres significatifs, que tout
# sérialiseur qui recalcule les nombres abîme.
def _wpt(nom, description, lat, lon):
    return {'lat': lat, 'lon': lon, 'name': nom, 'description': description}


NAVIGATION_STATE_2026 = {
    '_active': 'org.xcontest.XCTrack.navig.TaskBackToTakeoff',
    'org.xcontest.XCTrack.navig.TaskToWaypoint': [
        {
            'lon': 5.111111111111111,
            'lat': 45.22222222222222,
            'altSmoothed': 459.0,
            'name': 'Balise Exemple',
            'description': '',
            'isUnknown': False,
        }
    ],
    'org.xcontest.XCTrack.navig.TaskCompetition': {
        'taskType': 'CLASSIC',
        'actualPos': 0,
        'turnpoints': [
            {'radius': 400, 'waypoint': _wpt('X00001', 'DECOLLAGE EXEMPLE', 45.333333333333336, 5.444444444444445)},
            {'radius': 4000, 'waypoint': _wpt('X00001', 'DECOLLAGE EXEMPLE', 45.333333333333336, 5.444444444444445), 'type': 'SSS'},
            {'radius': 2000, 'waypoint': _wpt('X00002', 'BALISE EXEMPLE UN', 45.555555555555557, 5.666666666666667)},
            {'radius': 2000, 'waypoint': _wpt('X00003', 'BALISE EXEMPLE DEUX', 45.777777777777779, 5.888888888888889)},
            {'radius': 1000, 'waypoint': _wpt('X00004', 'ARRIVEE EXEMPLE', 45.999999999999999, 5.101010101010101), 'type': 'ESS'},
            {'radius': 400, 'waypoint': _wpt('X00004', 'ARRIVEE EXEMPLE', 45.999999999999999, 5.101010101010101)},
        ],
        'sss': {'type': 'RACE', 'direction': 'EXIT', 'timeGates': ['12:40:00Z']},
        'goal': {'type': 'CYLINDER', 'deadline': '18:00:00Z'},
        'earthModel': 'WGS84',
    },
}

NAVIGATION_STATE_2025 = {
    '_active': 'org.xcontest.XCTrack.navig.TaskBackToTakeoff',
    'org.xcontest.XCTrack.navig.TaskToWaypoint': [],
    'org.xcontest.XCTrack.navig.TaskCompetition': {
        'version': 1,
        'taskType': 'CLASSIC',
        'actualPos': 0,
        'turnpoints': [
            {'radius': 1000, 'waypoint': _wpt('Depart Exemple', 'Depart Exemple', 45.222222222222221, 5.111111111111111), 'type': 'SSS'},
            {'radius': 2000, 'waypoint': _wpt('Balise Exemple', 'Balise Exemple', 45.444444444444443, 5.333333333333333)},
            {'radius': 1000, 'waypoint': _wpt('Arrivee Exemple', '', 45.666666666666664, 5.555555555555555), 'type': 'ESS'},
        ],
        'sss': {'type': 'RACE', 'direction': 'EXIT', 'timeGates': ['09:00:00Z']},
        'goal': {'type': 'CYLINDER', 'deadline': '21:00:00Z'},
        'earthModel': 'WGS84',
    },
}

REMPLACEMENTS = {
    '2026-08-20_backup-00.xcfg': {
        'Pilot.Name': PILOTE,
        'Glider.Name': VOILE,
        'Navigation.State': NAVIGATION_STATE_2026,
        'Navigation.WaypointFiles': {
            'cities': True,
            'files': ['coupe-exemple-2026.CompeGPS.wpt', 'cities5000-Exemple.wpt', 'xctrack-internal.wpt'],
            'sortBy': 'NAME',
            'takeoffs': True,
        },
    },
    'complète.xcfg': {
        'Pilot.Name': PILOTE,
        'Glider.Name': VOILE,
        'Navigation.State': NAVIGATION_STATE_2025,
        'Navigation.WaypointFiles': {
            'cities': False,
            'files': ['coupe-exemple-2025.CompeGPS.wpt', 'xctrack-internal.wpt'],
            'sortBy': 'NAME',
            'takeoffs': True,
        },
        'Airspace.Files': ['Exemple-Airspaces-2025_0.txt'],
    },
}
REMPLACEMENTS['backup.xcfg'] = REMPLACEMENTS['2026-08-20_backup-00.xcfg']

# ------------------------------------------------------------------------------ contrôle

# Cherchés dans le **texte intégral** du fichier produit, jamais dans les seules clés que
# l'on croit sensibles : c'est le seul contrôle qu'un remplacement incomplet ne berne pas.
# Chaque motif est d'abord cherché dans la source — vérifier l'absence d'une chaîne qui
# n'a jamais été là est vert pour rien.
MARQUEURS = [
    'Frédéric', 'Tétart', 'NIVIUK', 'Artik',
    'Hompré', 'Marche', 'Ciney', 'Courriere',
    'DESPEGUE', 'GASOLINERA', 'GALLEGOS', 'AGUASAL',
    'belgian-paragliding', 'Belgium', 'Colombia',
]

# Toute valeur à décimales longues est traitée comme une coordonnée potentielle, quelle
# que soit sa clé — un tri par nom de clé raterait `altSmoothed` ou une clé qu'une
# version future ajoute. Les nôtres se reconnaissent à leur expansion construite sur un
# chiffre répété ; toute autre forme doit être justifiée nommément.
DECIMALES_LONGUES = re.compile(r'"([^"]+)": (-?\d+\.\d{6,})')

# `lpWeight` est le poids d'un filtre passe-bas du vario et `TakeoffSpeed` un seuil de
# détection du décollage (1.388889 m/s = 5 km/h). Ni lieu ni identifiant : des réglages.
SANS_LIEU = {'lpWeight', 'TakeoffSpeed'}


def verifier(nom: str, texte: str) -> None:
    for marqueur in MARQUEURS:
        if marqueur in texte:
            sys.exit(f'ÉCHEC {nom} : le marqueur « {marqueur} » survit')
    for cle, brut in DECIMALES_LONGUES.findall(texte):
        if cle in SANS_LIEU:
            continue
        decimales = brut.split('.')[1]
        if len(set(decimales)) > 2:
            sys.exit(f'ÉCHEC {nom} : « {cle} » porte une valeur d’allure réelle « {brut} »')


def main() -> None:
    if SOURCE is None or not SOURCE.is_dir():
        sys.exit('usage : deriver-exemples.py <répertoire des fichiers réels>')
    CIBLE.mkdir(parents=True, exist_ok=True)
    for origine, destination in FICHIERS.items():
        texte = (SOURCE / origine).read_text(encoding='utf8')
        document = json.loads(texte)
        if json.dumps(document, indent=2, ensure_ascii=False) != texte:
            sys.exit(f'ÉCHEC {origine} : Python ne reproduit pas ce fichier à l’octet près')

        for cle, valeur in REMPLACEMENTS.get(origine, {}).items():
            if cle not in document['preferences']:
                sys.exit(f'ÉCHEC {origine} : clé « {cle} » absente, le remplacement est muet')
            document['preferences'][cle] = valeur

        produit = json.dumps(document, indent=2, ensure_ascii=False)
        verifier(destination, produit)
        (CIBLE / destination).write_text(produit, encoding='utf8')
        print(f'{destination} : {len(produit.encode("utf8"))} octets')


if __name__ == '__main__':
    main()
