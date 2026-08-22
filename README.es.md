# Editor de configuración de XCTrack

[Français](README.md) · [English](README.en.md) · [Nederlands](README.nl.md) ·
[Deutsch](README.de.md) · **Español**

Un editor web para los archivos `.xcfg` de **XCTrack**, la aplicación de vuelo de los
parapentistas. Se abre una exportación del instrumento, se ven las páginas tal como las
dibuja el aparato, se modifican y se vuelve a exportar.

Todo ocurre **en el navegador**. Sin servidor, sin cuenta, sin envío: el archivo no sale de
la máquina.

## 👉 [Abrir el editor](https://frederict.github.io/xcfg-editor/)

**<https://frederict.github.io/xcfg-editor/>** — nada que instalar, nada que registrar.
Arrastre ahí un `.xcfg` o un `.xczfg` exportado desde su instrumento.

El archivo lo lee su navegador y no se envía a ninguna parte: la página se sirve como
archivos estáticos, no tiene servidor con quien hablar.

---

## Qué aspecto tiene

> ℹ️ **Las capturas están en francés, y así seguirán.** La interfaz existe en cinco
> idiomas, pero rehacer estas imágenes en los cinco serían treinta capturas que retomar
> cada vez que una pantalla se mueve, y envejecerían en su sitio. La geometría y los gestos
> se leen igual.

![El editor abierto en la primera página horizontal de la copia de seguridad de prueba: la
página dibujada a su tamaño real, la regla graduada encima, el panel de los widgets
desplegado abajo.](captures/editeur-paysage.png)

*Una página de la copia de seguridad de prueba, dibujada con la geometría de un AIR³ 7.2.
Nada comparte la anchura con ella: el panel de los widgets pasa por debajo.*

## El problema

Configurar las páginas con el dedo, en una pantalla de siete pulgadas apoyada en las
rodillas, lleva horas. XCTrack no sabe copiar una página ni duplicarla para cambiarle el
10 % — es la petición más votada de su tracker desde 2018. Y nada permite ver qué aspecto
tendrá una página antes de estar en el aire.

Existen editores externos. La primera objeción que un piloto les opone, por escrito en el
foro en julio de 2026, es esta:

> « will my specific widget settings still be there after I use the editor? Most of my
> widgets use specific styles and settings, so having to re-enter these would cost more
> than I could gain from a more convenient interface for layouting. »

En español: «¿seguirán ahí mis ajustes concretos de widget después de usar el editor? La
mayoría de mis widgets usan estilos y ajustes concretos, así que tener que volver a
introducirlos costaría más de lo que podría ganar con una interfaz de maquetación más
cómoda.»

Es la buena pregunta. Este proyecto está construido en torno a su respuesta.

## La fidelidad byte a byte, y lo que garantiza exactamente

**Un archivo abierto y vuelto a exportar sin modificación sale con la misma huella
SHA-256.** No «equivalente», no «funcionalmente idéntico»: el mismo archivo, byte a byte.

Y cuando usted modifica algo, **solo cambia lo que ha modificado**. Mover un widget solo
reescribe sus cuatro coordenadas; el resto del archivo — los otros 78 000 bytes — sale
intacto.

No es una elegancia de ingeniero, es lo que hace utilizable la herramienta:

- **Sus ajustes concretos sobreviven, incluidos los que el editor no entiende.** El formato
  `.xcfg` no está documentado y gana claves en cada versión de XCTrack. Un editor que
  reconstruye el archivo a partir de lo que ha sabido leer **pierde el resto en silencio**.
  Este transporta las claves desconocidas tal cual.
- **Los números conservan su escritura.** `3.0` no pasa a ser `3`, `1.0E7` no pasa a ser
  `10000000`, `-0.0` no pasa a ser `0`, un entero más allá de 2^53 no se redondea, y un
  color Android negativo sigue siendo negativo. Un simple `JSON.parse` + `JSON.stringify`
  destruye esos cinco casos — es la trampa central de este formato.
- **El orden de las claves, las claves duplicadas y el UTF-8 en bruto se conservan**, porque
  XCTrack los escribe así y un archivo reordenado ya no es el mismo archivo.

Esta garantía no es una promesa: está **demostrada por los tests**, sobre un corpus de
archivos versionado que cualquiera puede ejecutar (`npm test`). Es deliberado — una promesa
de fidelidad que solo el autor puede comprobar no vale nada.

## Lo que la herramienta sabe hacer

- **Abrir** un `.xcfg` o un `.xczfg` (el archivo comprimido ZIP que XCTrack escribe cuando
  la configuración lleva recursos).
- **Dibujar las páginas** con la geometría del instrumento, sobre ocho plantillas de
  pantalla (AIR³ 7.2, 7.3, 7.35 y cinco proporciones corrientes), en horizontal y en
  vertical.
- **Avisar de lo que falla** antes de que usted lo descubra en vuelo. Siete reglas,
  repartidas en los dos bloques de la vista de conjunto — una sola, la de los dos mapas de
  carreteras, sube al bloque desplegado, porque una regla solo tiene sitio ahí si es **a la
  vez grave y establecida**. Cada una dice cuánto vale:

  - un widget al que ningún toque puede llegar, **tapado por los widgets dibujados después
    de él** — la unión de varios, de los que ninguno lo tapa por sí solo, cuenta también, y
    un tapador transparente también. **Es una hipótesis**: lo que está medido es que ningún
    clic llega a él en edición; el enrutado de un toque *en vuelo* no se ha observado nunca,
    y es justamente lo que cuenta para un botón. La regla **se calla** cuando el aviso de
    geometría ya ha señalado el mismo montaje: un mismo problema dicho dos veces vale menos
    que una;
  - una página que nunca aparecerá — aquella que ningún tipo de navegación activa, la única
    de la que una prueba en el AIR³ ha confirmado que se salta al pasar páginas;
  - varias páginas de asistente de térmica en la misma orientación, de las que solo una
    recibe el paso automático a modo espiral. **Cuál sea es una suposición**: ningún registro
    de este repositorio lo dirime, y ningún archivo del corpus lleva dos, así que nada lo ha
    mostrado nunca;
  - un widget **quizá** demasiado pequeño para leerlo con el brazo estirado — el umbral
    viene de una norma y se aplica al tamaño físico de la **plantilla de pantalla elegida**,
    pero la relación entre la altura del widget y la altura del texto sigue siendo **una
    hipótesis asumida**, a falta de una campaña de medición en el aparato;
  - dos mapas de carreteras en la misma página;
  - un widget Pro en un archivo que no declara licencia — ese es **una pregunta, no una
    constatación**: lo que XCTrack hace con él no se ha comprobado nunca en el aparato, y la
    regla lo escribe;
  - y un ajuste escrito por una versión anterior de XCTrack.

  **Cuatro de estas siete son suposiciones**, y se presentan como tales: nunca en el bloque
  de alerta, con el rótulo sufijado «por confirmar en el instrumento» y la explicación
  abierta con «no es una constatación medida sino una pregunta». La herramienta **avisa,
  nunca corrige por su cuenta**.

  Lo que se **retiró** el 22 de agosto de 2026, y por qué se dice aquí: la herramienta
  marcaba ciertas páginas «oculta fuera de vuelo» según su **clase** (`WPCompetition`,
  `WPThermalAssistant`) y anunciaba «en tierra, el aparato solo muestra 3 de 5». Una prueba
  en un AIR³ 7.2 demostró lo contrario — la página de asistente de térmica sí vuelve a
  aparecer al pasar páginas en tierra, y la única página saltada es aquella que ninguna
  navegación activa. La marca y la cuenta se han ido; lo que de verdad decide, la clave
  `navigations`, se lee página por página en «Gestionar las páginas».
- **Editar**: mover, redimensionar, añadir, eliminar y reordenar widgets; ajustar sus
  opciones; gestionar las páginas (insertar, duplicar, eliminar, reordenar). Deshacer /
  rehacer.
- **Ajustar los ajustes generales** — las 217 preferencias que viven fuera de las páginas:
  unidades, botones, sensores, sonido, espacios aéreos. En el árbol de las 23 líneas del
  menú del instrumento. En consulta, **no se construye ningún control de formulario**; en
  edición, 77 de las 93 líneas presentadas se ajustan — casilla, lista, deslizador, número,
  texto, color —, con deshacer y rehacer como el resto. Las otras dieciséis, el valor JSON
  anidado y todo lo que la página no sabe nombrar quedan a la vista **sin control**, y cada
  una dice por qué.
- **Escribir, quitar, restablecer: tres gestos en torno al valor de fábrica**, y no son
  equivalentes — ni entre sí, ni según la pantalla en la que se hacen.

  Lo que significa una clave **ausente** no es lo mismo de un lado que del otro, y está
  medido de los dos lados. En un **widget**, XCTrack completa al leer las opciones que un
  archivo no lleva: el valor de fábrica se aplica implícitamente (constatado en la tabla de
  los 75 widgets). En los **ajustes generales**, no: al importar con «Reemplazar todo», el
  aparato conserva el ajuste que ya tiene, y una clave ausente del archivo no se toca —
  medido en el AIR³, con `Display.Theme` retirada de una copia de seguridad y luego
  reimportada, con un testigo de control en la misma tanda. En un aparato que nunca la ha
  tocado, el valor de fábrica se aplica por fuerza: eso es una deducción, no una medida, y
  los otros dos modos de importación no se han puesto a prueba.

  - **«Definir este valor»** (panel de un widget) y **«Escribir este valor»** (ajustes
    generales) escriben en el archivo un valor de fábrica que no está en él. Es el mismo
    gesto en las dos pantallas, con dos rótulos. En un widget, no cambia nada de lo que el
    aparato hace hoy, y pone el ajuste a resguardo de una actualización de XCTrack que
    cambiara ese valor de fábrica. En una preferencia general, eso es cierto en un aparato
    que nunca ha ajustado eso — y falso en un aparato ya ajustado, cuyo valor la importación
    reemplazará.
  - **«Quitar»** hace callar al archivo sobre un ajuste: un valor escrito que **ya** vale el
    valor de fábrica desaparece. Solo en los ajustes generales, y solo en ese estado — hacer
    callar al archivo sobre un valor que usted ha elegido privaría a la copia de seguridad
    de un ajuste deliberado, cosa que un botón discreto no debe hacer de un clic. **No** es
    una vuelta al valor de fábrica: el aparato conservará el suyo.
  - **«Restablecer el valor de fábrica»** reemplaza un valor que usted ha elegido por el que
    aplica un XCTrack nuevo. También en las dos pantallas. **Es el único de los tres que
    borra un ajuste deliberado** — los otros dos solo tocan valores que ya eran los de
    fábrica, o que no estaban escritos en absoluto. Por eso no se revela al pasar el ratón:
    ocupa su propia línea bajo el ajuste, muestra los dos valores en presencia *antes* del
    clic, y dice en qué versión de XCTrack se registró el valor de fábrica en cuanto no es la
    del archivo. **Escribe** el valor de fábrica en lugar de borrar la clave: la línea pasa
    entonces al estado de fábrica, desde donde «Quitar» se ofrece. Dos clics deliberados, dos
    efectos separados.

  Ningún botón allí donde el valor de fábrica no está registrado, allí donde XCTrack lo
  calcula al arrancar, allí donde publica dos que se contradicen (`Sensors.ManualQnh`: 1013 y
  1013.25), ni allí donde el registro solo da un valor compuesto
  (`{"theme": …, "terrain": …}`) — escribir un valor adivinado sería peor que no proponer
  nada.
- **Diagnosticar la diferencia de versión**: usted elige su versión de XCTrack **por su
  nombre** — el que muestra su aparato, «1.0.3-beta» — entre las 46 entradas que nuestro
  registro distingue, y la herramienta parte de la que el propio archivo declara, ya
  preseleccionada. Muestra entonces lo que el archivo lleva que esa versión ya no lee, y lo
  que ella espera y él no tiene. Como varias versiones aceptan a menudo exactamente los
  mismos ajustes, la herramienta **nombra aquellas que su registro no sabe distinguir de la
  suya**: elegir entre dos vecinas no tiene efecto, y más vale decirlo que dejarlo adivinar.
  El diagnóstico **constata** — ocho familias de diferencia, cada una con su conducta a
  seguir — y distingue con cuidado lo que está medido de lo que no lo está: un ajuste
  retirado por XCTrack, un hueco de nuestro propio registro y un ajuste sobre el que estamos
  ciegos no piden la misma conducta.
- **Quitar los ajustes que dejó una versión antigua** — y nada más. XCTrack conserva los
  ajustes que ya no conoce: una copia de seguridad de 2026 arrastra todavía interruptores de
  2023. Es el único sitio donde la herramienta propone **por sí misma** retirar algo del
  documento, y el cribado es estrecho a propósito: un ajuste solo se propone cuando un
  archivo real lo atestigua — la pantalla lo llama **obsoleto**. Un hueco de nuestra lectura
  de las versiones — el ajuste existía, es nuestra extracción la que lo ha fallado — o un
  ajuste que ella no ha visto nunca se llaman **punto ciego** y **desconocido**, y **nunca**
  se proponen; incluso un ajuste obsoleto del que no sabemos decir desde cuándo ya no sirve
  se queda en su sitio, porque no se propone borrar lo que no se sabría explicar. No quitar
  nada no rompe nada, quitar por error rompe una configuración de vuelo: todo el cribado
  está construido sobre ese desequilibrio.

  Medido en la copia de seguridad de referencia del corpus
  (`tests/fixtures/exports/2026-08-20_backup-00.xcfg`, escrita por XCTrack 1.0.3-beta):
  **9 ajustes propuestos, en 4 widgets, sobre 1 059 ajustes de widgets examinados.** Usted ve
  la lista — cada ajuste con la última versión de XCTrack que aún lo leía —, desmarca lo que
  prefiere conservar, actúa con un gesto explícito, y puede volver atrás justo después:
  devueltos, el archivo sale **byte a byte igual**. La limpieza está bajo el diagnóstico de
  versión, y solo en modo edición.
- **Decir lo que su archivo revela de usted** antes de que lo comparta. Una exportación
  `backup` lleva su nombre, su vela, sus sensores emparejados, sus archivos de waypoints —
  hasta el nombre de la competición en la que participa. Al guardar, la herramienta propone
  por tanto **tres salidas**, ordenadas según lo que sale — bajar un peldaño quiere decir
  siempre «entregar menos»:

  1. **«Su configuración, tal como está»**, devuelta byte a byte;
  2. **«Todos sus ajustes, sin lo que le identifica»** — una copia de seguridad entera, cuyas
     líneas que le identifican se reemplazan, se retiran, o se conservan y se dicen como
     tales. Es la que permite pedir ayuda sobre los ajustes del vario sin publicar su
     nombre;
  3. **«Versión compartible, sin datos personales»** — una exportación `pages`, sin ninguna
     preferencia.

  Cada salida lleva su inventario: cada línea tocada, su sitio y su razón, mostrados *antes*
  de la descarga. El nombre del archivo producido lleva marca de tiempo y **no retoma nada
  del nombre de origen**, que a menudo contiene un nombre de pila.
- **Guardar varias configuraciones bajo un nombre**, en su navegador, y volver a una de
  ellas: una para la competición, una para el vivac, una para la escuela. Los bytes guardados
  son los de su archivo, comprobados por huella en cada lectura. No se envía nada a ninguna
  parte.
- **Hablar su idioma, en dos ejes que no se confunden.** *Nuestra* prosa — la interfaz, el
  manual, este README — existe en cinco idiomas: francés, inglés, neerlandés, alemán,
  español. Los nombres y descripciones *de XCTrack* son los de la propia aplicación,
  extraídos del APK — 33 idiomas para los widgets, 34 para sus opciones, 35 para los rótulos
  de los ajustes generales —, y siguen el idioma del archivo abierto, no el de la interfaz.
  Estas tres cifras no son una elección nuestra: es lo que el APK lleva.
- **Explicarse en el sitio**: un manual de uso en trece capítulos se abre desde la pantalla
  de inicio y desde el menú «Archivo», sin salir de la página — **en los cinco idiomas**, y
  solo se descarga el que se muestra. Está escrito para un piloto, no para un informático, y
  empieza por lo que sobre todo no hay que hacer: enviar su copia de seguridad tal cual.

### En imágenes

*Todas las capturas están tomadas sobre las fixtures anonimizadas de `tests/fixtures/`,
nunca sobre una configuración real — un mapa mostrado puede revelar un domicilio con
precisión de edificio.*

![El panel de ajustes del widget «Espacio aéreo cercano», en modo edición: tres líneas
«Restablecer el valor de fábrica» que muestran los dos valores en presencia, y abajo el
bloque del ajuste que este widget no escribe, con su botón «Definir este
valor».](captures/panneau-gadget.png)

*El panel de un widget, y los dos gestos de valor de fábrica que ofrece: restablecer lo que
se ha ajustado, o fijar lo que el archivo no dice.*

![La pantalla «Integración Android» de los ajustes generales, en modo edición: líneas
«Quitar» marcadas VALOR DE FÁBRICA, líneas «Restablecer el valor de fábrica» marcadas
AJUSTADO POR USTED, y dos líneas «Escribir este valor» marcadas AUSENTE DEL
ARCHIVO.](captures/reglages-generaux.png)

*Los ajustes generales, en el árbol del menú del instrumento — y los tres gestos de valor de
fábrica reunidos en una misma pantalla.*

![La ventana «Versión y compatibilidad»: la versión 1.0.3-beta preseleccionada, la frase de
las versiones indistinguibles, el bloque OBSOLETO de nueve ajustes, y la sección «Quitar lo
que dejó una versión antigua» desplegada sobre sus nueve
casillas.](captures/version-et-nettoyage.png)

*La elección de versión, el diagnóstico y la limpieza que abre — nueve ajustes, en cuatro
widgets, cada uno con la última versión de XCTrack que aún lo leía.*

![El cuadro «Guardar esta configuración»: las tres salidas, y después el inventario de los
cinco textos reemplazados — cada uno con su página, su widget, el valor antiguo tachado, el
nuevo, y la razón del reemplazo.](captures/enregistrer-et-partager.png)

*Al guardar, lo que el archivo revela y lo que puede reemplazarse — mostrado antes de la
descarga, no después.*

![El manual de uso a página completa: a la izquierda el índice de sus trece capítulos, a
la derecha un aviso enmarcado «Léalo antes de dar su archivo a nadie», y después el
comienzo del capítulo 1.](captures/manuel.png)

*El manual ocupa una página del ancho del editor. Empieza por el aviso en lugar de por la
visita guiada, y su índice permanece a la izquierda durante toda la lectura — con un filete
en el capítulo en el que uno se encuentra.*

## Lo que no sabe hacer, y lo que sigue siendo incierto

Mejor decirlo de entrada.

- **El formato `.xcfg` no está documentado.** Todo lo que la herramienta sabe de él viene de
  la observación de un corpus de archivos reales (2022 → 2026) y de la lectura de la
  aplicación. El esquema cambia en cada versión de XCTrack: lo que hoy es cierto puede dejar
  de serlo mañana. Es precisamente por eso por lo que la herramienta está construida para
  **transportar lo que no entiende** antes que para modelar el formato.
- **El dibujo es una imitación, no el aparato.** Los dibujos de los widgets están
  reconstruidos a partir de lo observado en un **AIR³ 7.2** — un solo aparato, una sola
  versión de XCTrack. Los valores mostrados son ejemplos fijos: no se simula nada. Un widget
  cuyo dibujo no se ha reproducido aparece bajo una forma genérica honrada antes que bajo una
  aproximación engañosa.
- **Ninguna sincronización con el instrumento.** La ida y vuelta se hace por tarjeta SD o por
  cable, a mano.
- **Ni sugerencia, ni corrección automática.** La herramienta no reordena sus páginas ni
  decide en su lugar. La limpieza de los ajustes obsoletos no es una excepción: nada se va sin
  que usted haya visto la lista y hecho clic.
- **Sin biblioteca comunitaria, sin cuenta, sin servidor.** Es una elección: lo que no existe
  no se filtra. La biblioteca de configuraciones vive **en su navegador** (IndexedDB) y solo
  sale de él si usted mismo la exporta; vaciar los datos del sitio la borra, y otro aparato no
  la ve.
- **No todo se ajusta en las preferencias generales.** El JSON anidado de la sección
  `preferences` (`Sounds`, `Navigation.State`, `Sensors.Configuration`,
  `Sound.AcousticVario.CustomProfile`) sale intacto, nunca reescrito; las dieciséis líneas que
  abren un cuadro en el aparato — los quince botones, la tabla del vario sonoro — no se
  ajustan aquí, por no conocer su dominio; y las ocho `Unit.*`, cuya lista XCTrack rellena en
  código, solo tienen un campo de texto en lugar de una lista inventada.
- **Ninguna vista previa de imagen en la biblioteca.** El sitio está reservado en los datos,
  la miniatura es un marco vacío que lo dice.
- **La interfaz existe en cinco idiomas, las capturas de este archivo en uno solo.** La
  interfaz, el manual y este README están traducidos al francés, inglés, neerlandés, alemán y
  español (`src/i18n/`). Las imágenes, en cambio, muestran la interfaz **francesa**: rehacerlas
  en cinco idiomas serían treinta capturas que retomar cada vez que una pantalla se mueve, y
  envejecerían. La geometría y los gestos se leen igual. Los rótulos de XCTrack — nombres de
  widgets, de opciones, de preferencias — no siguen la elección de idioma de la interfaz sino
  **la del archivo**: son dos ejes distintos, y confundirlos haría leer a un piloto checo
  nombres de widgets en inglés cuando su instrumento se los muestra en checo.

## Dar su opinión, avisar de lo que falla

La herramienta está escrita para pilotos, y solo mejora con lo que ellos dicen de ella.
**Los comentarios pasan por las issues de GitHub:**

**<https://github.com/frederict/xcfg-editor/issues>**

Todo sirve: un widget mal dibujado, un ajuste que el editor no muestra, una palabra oscura,
una versión de XCTrack ausente de la lista, un archivo que se niega a abrirse — y, desde que
la interfaz existe en cinco idiomas, **una traducción que suena rara o que nombra un botón de
otra forma que la pantalla**. Decir qué aparato, qué versión de XCTrack y qué esperaba usted
ahorra mucho tiempo.

**Escriba en su idioma** — francés, inglés, neerlandés, alemán o español. No hace falta
pasarse al inglés para avisar de algo.

⚠️ **No adjunte nunca su propio `.xcfg`.** Lleva su nombre, sus sensores, sus archivos de
waypoints, a veces sus coordenadas — y una issue de GitHub es pública, y para siempre. Si un
archivo es imprescindible para entender el problema, produzca antes una versión expurgada con
la propia herramienta (botón de guardado), y repase el inventario que le muestra antes de
enviar nada. Cuál elegir depende de su pregunta: **«Versión compartible, sin datos
personales»** si trata de sus páginas, **«Todos sus ajustes, sin lo que le identifica»** si
trata de un ajuste general — vario, sensores, unidades.

## Instalar y arrancar

Hace falta Node.js 22 o más reciente.

```bash
git clone https://github.com/frederict/xcfg-editor.git
cd xcfg-editor
npm ci
npm run dev          # http://localhost:5173
```

Para construir la versión estática:

```bash
npm run build        # produce dist/
npm run preview      # sirve dist/ localmente
```

`dist/` es un sitio enteramente estático, sin dependencias en ejecución: se deja en cualquier
alojamiento de archivos, incluso en un subdirectorio.

## Contribuir: la documentación está en el README francés

La documentación del contribuidor — el corpus de tests, la regeneración de la base de
versiones de XCTrack, el catálogo de preferencias generales, los dominios de valores — vive
en el **[README francés](README.md)**, y solo ahí.

Es una decisión asumida, no una carencia. **El código y sus comentarios están escritos en
francés**: quien contribuye al código lee francés de todos modos. Una traducción de esas
secciones se apartaría del código sin que nadie se diera cuenta, y una documentación falsa es
peor que una documentación ausente.

## Licencia

MIT — véase [LICENSE](LICENSE).

XCTrack es una aplicación de [XContest](https://xcontest.org/). Este proyecto no está afiliado
a XContest ni a Air3, ni cuenta con su aprobación.
