import type { DomainCatalog } from '../../domains'

/**
 * Les versions relevées et le nettoyage — voir `fr/versions.ts`.
 *
 * Les trois statuts : *obsoleto*, *punto ciego*, *desconocido*. « angle mort » se dit
 * **punto ciego** en espagnol, au propre comme au figuré : ce que l'on ne voit pas et que
 * l'on sait ne pas voir.
 *
 * Les énumérations passent par `format.list`, qui applique l'alternance *y → e* devant le
 * son /i/ et *o → u* devant /o/ : personne n'aurait écrit cette règle à la main.
 */
const versions: DomainCatalog<'versions'> = {
  'versions.publishedCount': {
    one: '{count} versión publicada',
    other: '{count} versiones publicadas'
  },

  /* ------------------------------------------------- les statuts : le mot du bandeau */

  'versions.badgeOutdated': 'obsoleto',
  'versions.badgeReadBefore': 'leído solo antes',
  'versions.badgeAppearedLater': 'aparecido después',
  'versions.badgeBlindSpot': 'punto ciego',
  'versions.badgeUnknown': 'desconocido',
  'versions.badgeUnknownWidget': 'widget desconocido',
  'versions.badgeRecognized': 'reconocido',

  /* ----------------------------------------- les huit cas : titre, constat, et verdict */

  'versions.titleLegacy': 'Ajustes obsoletos: la versión elegida ya no los lee',
  'versions.evidenceLegacy': 'Leemos estos ajustes en versiones más antiguas, ya no en esta — y archivos reales escritos por esa misma versión los llevan de todos modos. XCTrack conserva sin leerlos los ajustes que ya no conoce: aquí lo hemos visto ocurrir, no lo suponemos.',
  'versions.verdictLegacy': 'Aquí quitarlos se sostiene. Es el único caso que un archivo real viene a confirmar.',

  'versions.titlePastOnly': 'Leídos solo por versiones más antiguas',
  'versions.evidencePastOnly': 'Leemos estos ajustes en versiones más antiguas, ya no en la que se ha elegido. Pero ningún archivo real viene a confirmarlo: aquí solo tenemos nuestra lectura de las versiones, sin el ejemplo que la comprueba.',
  'versions.verdictPastOnly': 'Quitarlos se sostiene, solo con nuestra lectura. Nada dice que XCTrack los haya retirado: simplemente ya no los leemos ahí.',

  'versions.titleFutureOnly': 'Aparecidos después de la versión elegida',
  'versions.evidenceFutureOnly': 'Solo leemos estos ajustes en versiones más recientes que la elegida. Este archivo viene pues de una versión más reciente que la escogida aquí.',
  'versions.verdictFutureOnly': 'No quitarlos. La versión elegida los ignora; una versión más reciente los recuperará intactos.',

  'versions.titleStraddled': 'Leídos antes y después de la versión elegida, pero no por ella',
  'versions.evidenceStraddled': 'Leemos estos ajustes en las versiones de antes y en las de después, y se nos escapan justo aquí. Un ajuste que desapareciera para volver idéntico sería una rareza; lo más sencillo es que nuestra lectura tenga un hueco en este punto.',
  'versions.verdictStraddled': 'No quitarlos. El hueco está en nosotros, no en su archivo.',

  'versions.titleNeverRead': 'Desconocidos: ninguna versión que hayamos leído los lee',
  'versions.evidenceNeverRead': 'Ninguna de las versiones de XCTrack que hemos podido leer lleva este ajuste en este widget, y ningún archivo real lo muestra ahí tampoco. No sabemos de dónde viene.',
  'versions.verdictNeverRead': 'No lo sabemos. No es prueba de que el ajuste esté obsoleto — solo de que no lo conocemos.',

  'versions.titleGap': 'Nuestra lectura tiene un hueco: el ajuste sí existía',
  'versions.evidenceGap': 'No hemos visto estos ajustes en aquella versión, pero los leemos en versiones más recientes, y un archivo real escrito por ella los lleva. El ajuste existía: somos nosotros quienes lo hemos pasado por alto.',
  'versions.verdictGap': 'No quitarlos nunca. Son ajustes válidos, y tomarlos por ajustes obsoletos borraría los suyos.',

  'versions.titleBlind': 'Ajustes que no vemos en ninguna parte',
  'versions.evidenceBlind': 'Archivos reales los llevan, y ninguna versión que hayamos podido leer los declara. No los vemos en ninguna parte, y nuestro silencio no dice nada de ellos.',
  'versions.verdictBlind': 'Nada que concluir. No quitarlos por este motivo.',

  'versions.titleUnknownWidget': 'Widgets que la versión elegida no conoce',
  'versions.evidenceUnknownWidget': 'Este tipo de widget no figura en lo que hemos leído de esta versión. No sabemos pues nada de sus ajustes: un widget que nunca hemos visto no es un widget retirado.',
  'versions.verdictUnknownWidget': 'Nada que concluir sobre sus ajustes.',

  /* ------------------------------------------------------ où le gadget se trouve */

  'versions.placePortrait': 'Vertical · página {page} · posición {rank} · {name}',
  'versions.placeLandscape': 'Horizontal · página {page} · posición {rank} · {name}',

  /* -------------------------------------------------------------- le choix de version */

  'versions.panelLabel': 'Versión elegida y compatibilidad',
  'versions.targetLabel': 'La versión de XCTrack a la que apunta',
  'versions.noVersionOption': '— ninguna versión elegida —',
  'versions.groupWriter': 'La versión que escribió este archivo',
  'versions.groupCandidates': 'Las versiones a las que este archivo puede referirse',
  'versions.groupNearestOne': 'La versión más cercana a la de este archivo',
  'versions.groupNearestSeveral': 'Las versiones más cercanas a la de este archivo',
  'versions.groupPublished': 'Versiones publicadas, de la más reciente a la más antigua',
  'versions.groupDevelopment': 'Versiones de desarrollo, nunca publicadas',

  'versions.unknownVersion': 'versión desconocida',
  'versions.buildLabel': '{release} (compilación {build})',

  /* ------------------------------------------------- d'où vient la version proposée */

  'versions.declaredByCode': 'la versión {code}',
  'versions.declaredByName': 'XCTrack {release} (número {code})',

  'versions.messageUndeclared': 'Este archivo no dice de qué versión de XCTrack viene: no lleva su número de versión. Nada permite proponer una — elija la del aparato en el que volverá a importar este archivo.',

  'versions.messageExact': 'Este archivo lo escribió {declared}. Es a ella a la que se apunta abajo, y puede elegir otra.',

  'versions.messageExactPinned': {
    one: 'Este archivo lo escribió {declared}. {count} versión lleva ese número; el nombre que declara el archivo señala solo una. Es a ella a la que se apunta abajo, y puede elegir otra.',
    other: 'Este archivo lo escribió {declared}. {count} versiones llevan ese número; el nombre que declara el archivo señala solo una. Es a ella a la que se apunta abajo, y puede elegir otra.'
  },

  'versions.messageAmbiguous': {
    one: 'Este archivo lo escribió {declared}. {count} versión lleva ese número sin aceptar los mismos ajustes, y el archivo no dice cuál lo escribió. Apuntamos a la más reciente, {version} — una elección arbitraria, asumida como tal: cada observación que cambiaría con otra de ellas se señala abajo.',
    other: 'Este archivo lo escribió {declared}. {count} versiones llevan ese número sin aceptar los mismos ajustes, y el archivo no dice cuál lo escribió. Apuntamos a la más reciente, {version} — una elección arbitraria, asumida como tal: cada observación que cambiaría con otra de ellas se señala abajo.'
  },

  'versions.messageApproximated': 'Este archivo lo escribió {declared}, que ninguna versión registrada lleva. Nos replegamos sobre el número más cercano, {code} — no es la misma versión, es la más cercana que hemos podido leer. Apuntamos a {version}.',

  'versions.messageApproximatedSeveral': {
    one: 'Este archivo lo escribió {declared}, que ninguna versión registrada lleva. Nos replegamos sobre el número más cercano, {code} — no es la misma versión, es la más cercana que hemos podido leer. Ese número abarca a su vez {count} versión; apuntamos a la más reciente, {version}, y señalamos abajo toda observación que cambiaría con otra.',
    other: 'Este archivo lo escribió {declared}, que ninguna versión registrada lleva. Nos replegamos sobre el número más cercano, {code} — no es la misma versión, es la más cercana que hemos podido leer. Ese número abarca a su vez {count} versiones; apuntamos a la más reciente, {version}, y señalamos abajo toda observación que cambiaría con otra.'
  },

  'versions.messageUnrecognized': {
    one: 'Este archivo lo escribió {declared}, que no conocemos: hemos podido leer {count} versión de XCTrack, y esta no está entre ellas. No proponemos ninguna — señalar una a ojo sería inventar. Elija la de su aparato.',
    other: 'Este archivo lo escribió {declared}, que no conocemos: hemos podido leer {count} versiones de XCTrack, y esta no está entre ellas. No proponemos ninguna — señalar una a ojo sería inventar. Elija la de su aparato.'
  },

  'versions.messageUnrecognizedSituated': {
    one: 'Este archivo lo escribió {declared}, que no conocemos: hemos podido leer {count} versión de XCTrack, y esta no está entre ellas. {situate} No proponemos ninguna — señalar una a ojo sería inventar. Elija la de su aparato.',
    other: 'Este archivo lo escribió {declared}, que no conocemos: hemos podido leer {count} versiones de XCTrack, y esta no está entre ellas. {situate} No proponemos ninguna — señalar una a ojo sería inventar. Elija la de su aparato.'
  },

  'versions.rangeAbove': 'Los números que conocemos van de {min} a {max}; este los supera a todos.',
  'versions.rangeBelow': 'Los números que conocemos van de {min} a {max}; este queda por debajo de todos.',
  'versions.rangeBetween': 'Los números que conocemos van de {min} a {max}; este cae entre dos de ellos.',

  'versions.aimingElsewhere': 'Apunta a una versión distinta de aquella: el diagnóstico de abajo confronta este archivo con {version}.',

  /* --------------------------------- ce que le choix du pilote ne change pas */

  'versions.sameNone': 'Ninguna otra versión registrada acepta exactamente los mismos ajustes que {version}: lo que se dice abajo solo vale para ella.',

  'versions.sameOtherOne': '{list} acepta exactamente los mismos ajustes que {version}: no las distinguimos, y lo que se dice abajo vale para {total} versiones.',
  'versions.sameOtherSeveral': '{list} aceptan exactamente los mismos ajustes que {version}: no las distinguimos, y lo que se dice abajo vale para {total} versiones.',

  /* ------------------------------------------------- l'écart depuis la version d'avant */

  'versions.noPreviousRelease': {
    one: 'Ninguna versión publicada precede a esta entre las que hemos podido leer: nada que comparar. {count} widget conocido.',
    other: 'Ninguna versión publicada precede a esta entre las que hemos podido leer: nada que comparar. {count} widgets conocidos.'
  },
  'versions.widgetsAdded': {
    one: '{count} widget añadido',
    other: '{count} widgets añadidos'
  },
  'versions.widgetsRemoved': {
    one: '{count} widget retirado',
    other: '{count} widgets retirados'
  },
  'versions.settingsAdded': {
    one: '{count} ajuste añadido',
    other: '{count} ajustes añadidos'
  },
  'versions.settingsRemoved': {
    one: '{count} ajuste retirado',
    other: '{count} ajustes retirados'
  },
  'versions.deltaNone': 'Nada distingue esta versión de {version}: leemos en ella los mismos ajustes.',
  'versions.deltaSince': 'Desde {version}: {changes}.',
  'versions.noVersionChosen': 'Ninguna versión elegida: no se compara nada y no se diagnostica nada.',

  'versions.deltaDetails': 'El detalle de estos cambios',
  'versions.deltaCaveat': 'Lo que sigue es lo que la versión elegida lee de más, o de menos, que la anterior. Los widgets llevan el nombre que XCTrack les da; los ajustes no — la aplicación no los muestra en ninguna parte, y estos son los nombres que escribe en el archivo.',
  'versions.detailWidgetsAdded': 'Widgets añadidos',
  'versions.detailWidgetsRemoved': 'Widgets retirados',
  'versions.detailSettingsAdded': 'Ajustes añadidos en widgets ya existentes',
  'versions.detailSettingsRemoved': 'Ajustes retirados',
  'versions.detailLine': '{name}: {keys}',

  /* ------------------------------------------------------------------ le diagnostic */

  'versions.chooseVersion': 'Elija una versión para obtener el diagnóstico de este archivo.',

  'versions.tally': {
    one: '{count} ajuste reconocido de {examined} examinados, repartidos en {instances}.',
    other: '{count} ajustes reconocidos de {examined} examinados, repartidos en {instances}.'
  },

  'versions.scope': {
    one: 'Este diagnóstico se apoya en nuestro registro de {count} versión de XCTrack y en archivos reales escritos por ella: es lo que designa «nosotros» más abajo. Solo se examinan los widgets de las páginas — el resto de una copia de seguridad (vario, unidades, sensores, espacios aéreos) no se diagnostica. La posición de un widget y su tipo no son ajustes y no se cuentan.',
    other: 'Este diagnóstico se apoya en nuestro registro de {count} versiones de XCTrack y en archivos reales escritos por ellas: es lo que designa «nosotros» más abajo. Solo se examinan los widgets de las páginas — el resto de una copia de seguridad (vario, unidades, sensores, espacios aéreos) no se diagnostica. La posición de un widget y su tipo no son ajustes y no se cuentan.'
  },

  'versions.unstableNotice': {
    one: '{count} observación cambia según la versión que se retenga entre aquellas a las que este archivo puede referirse. Se señalan una a una.',
    other: '{count} observaciones cambian según la versión que se retenga entre aquellas a las que este archivo puede referirse. Se señalan una a una.'
  },

  'versions.noFindings': 'Ninguna diferencia: todos los ajustes de este archivo los lee la versión elegida, y todos sus widgets existen en ella. Nada que señalar — lo que no quiere decir que el archivo sea correcto, solo que no le encontramos nada que reprochar.',

  'versions.widgetKnownElsewhere': 'tipo que conocemos, pero no en esta versión',
  'versions.widgetNeverSeen': 'tipo que no hemos visto en ninguna versión',

  'versions.unstableFinding': 'Observación inestable — con {divergences}.',
  'versions.divergencePart': '{version}: {word}',
  'versions.divergenceJoin': '; ',

  'versions.readonlyNote': 'Está consultando este archivo sin modificarlo: desde aquí no se le puede quitar nada. Para actuar sobre lo que lee, cierre esta ventana y pase al modo de modificación.',

  /* ================================================================= le nettoyage */

  'cleanup.title': 'Quitar lo que dejó una versión antigua',

  'cleanup.lead': {
    one: '{count} ajuste de este archivo ya no lo usa la versión elegida, repartido en {instances}: {list}.',
    other: '{count} ajustes de este archivo ya no los usa la versión elegida, repartidos en {instances}: {list}.'
  },

  'cleanup.calm': 'No hay prisa y no hay nada roto: XCTrack los transporta sin leerlos, y dejarlos ahí no cambia nada en sus páginas. Quitarlos aligera el archivo, nada más.',

  'cleanup.seeList': {
    one: 'Ver este ajuste, y desmarcar lo que prefiera conservar',
    other: 'Ver estos {count} ajustes, y desmarcar lo que prefiera conservar'
  },

  'cleanup.caveat': 'Los nombres de abajo son los que escribe XCTrack. La aplicación ya no los muestra en sus menús: eso es precisamente lo que indica que ya no los usa.',

  /* ------------------------------------------- ce que porte chaque réglage périmé */

  'cleanup.usedUntil': 'usado hasta XCTrack {release}',
  'cleanup.noLongerRead': 'ya no lo lee la versión elegida',
  'cleanup.noteWithValue': 'ajustado en {value}, {since}',
  'cleanup.noteRepeated': {
    one: '{note}, escrito {count} vez en este widget',
    other: '{note}, escrito {count} veces en este widget'
  },
  'cleanup.valueYes': 'sí',
  'cleanup.valueNo': 'no',

  /* ------------------------------------------------------------- décocher, puis agir */

  'cleanup.allSelected': {
    one: '{count} ajuste marcado.',
    other: '{count} ajustes marcados.'
  },
  'cleanup.someSelected': {
    one: '{count} marcado de {total} — {left}.',
    other: '{count} marcados de {total} — {left}.'
  },
  'cleanup.remaining': {
    one: '{count} ajuste se quedará en su sitio',
    other: '{count} ajustes se quedarán en su sitio'
  },
  'cleanup.noneSelected': 'Ningún ajuste marcado',

  'cleanup.removeButton': {
    one: 'Quitar este ajuste',
    other: 'Quitar estos {count} ajustes'
  },
  'cleanup.undoButton': {
    one: 'Devolver este ajuste',
    other: 'Devolver estos {count} ajustes'
  },

  'cleanup.removedTally': {
    one: '{count} ajuste quitado en {instances}. Su aparato aún no sabe nada: el archivo solo cambia cuando usted lo guarda.',
    other: '{count} ajustes quitados en {instances}. Su aparato aún no sabe nada: el archivo solo cambia cuando usted lo guarda.'
  },

  /* --------------------------------------- le libellé du pas d'annulation de l'hôte */

  'cleanup.removeStep': {
    one: 'Quitar {count} ajuste de una versión antigua',
    other: 'Quitar {count} ajustes de una versión antigua'
  },
  'cleanup.restoreStep': {
    one: 'Devolver {count} ajuste de una versión antigua',
    other: 'Devolver {count} ajustes de una versión antigua'
  }
}

export default versions
