# Pruebas manuales de Iris Desktop

Las siguientes comprobaciones están **pendientes / no verificadas** en este entorno macOS. No equivalen a pruebas automatizadas aprobadas.

| Plataforma / equipo             | Comprobación                                                                                                           | Estado              |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Windows                         | Importar imágenes, audio y video; eliminar un archivo desde Iris y comprobar su presencia en la Papelera de reciclaje. | Pendiente           |
| Windows con TV / proyector HDMI | Elegir monitor, proyectar a pantalla completa, desconectar y reconectar el monitor.                                    | Pendiente (fase 06) |
| Windows                         | Construir, instalar, abrir y desinstalar el instalador; comprobar conservación de la carpeta Iris.                     | Pendiente (fase 11) |

## Proyección (fase 06)

No verificadas: requieren Windows y hardware real.

- Conectar un TV/proyector por HDMI, elegirlo en Proyectar e iniciar: salida sin bordes en esa pantalla, consola utilizable en la principal.
- Desconectar durante la proyección: la ventana se cierra y aparece un aviso en español. Reconectar: la pantalla reaparece en el selector; no debe reanudar sola con la preferencia predeterminada.
- Proyectar un video con audio y alternar «Silenciar en pantalla»: audio solo en la salida de proyección; la vista previa permanece silenciada.
- Reproducir una pista o sonido en la consola: el dispositivo predeterminado de Windows determina la salida. Windows puede cambiarlo al conectar HDMI; revisar la configuración de sonido del sistema.
- Mantener un fondo de video en bucle diez minutos: sin sonido, destellos ni pausas largas.
- Probar monitores con 100 %, 150 % y 200 % de escala: texto, controles y salida nítidos, con relación 16:9 y bandas negras cuando corresponda.
- Iniciar y detener con Ctrl+Mayús+P. Comprobar que Windows no apaga la pantalla durante la proyección y vuelve a permitirlo después de detenerla.

## Herramientas (fase 07)

- Pendiente: en Windows, reproducir varios sonidos reales por los parlantes; repetir un sonido mientras suena y comprobar que reinicia desde el comienzo. Los E2E comprueban la llamada de reproducción y simulan la papelera; no verifican sonido audible ni la Papelera de reciclaje real.
- Pendiente: cambiar Texto durante una proyección HDMI y verificar legibilidad a distancia en las nueve tipografías; pausar/reanudar el temporizador y comprobar que coincide con la consola.

## YouTube (fase 09, retirado en 0.3.0)

Las comprobaciones del reproductor quedaron obsoletas: se retiró toda reproducción por enlace a petición del usuario. Solo permanece el descargador personal (fase 99).

## Entrega y fallos (fase 11)

Todas las comprobaciones siguientes siguen **pendientes / no verificadas**. Se deben hacer con una copia de datos de prueba, nunca con la única biblioteca de una iglesia.

- Windows limpio: ejecutar el workflow o `pnpm build:win --publish never`; comprobar que se generan el instalador y el ZIP x64. Instalar por usuario sin herramientas de desarrollo, abrir Iris, revisar icono, nombre y textos del instalador en español. Se espera primer inicio con carpetas y base nuevas, sin cuenta.
- Windows limpio: crear contenido, cerrar, actualizar reinstalando y desinstalar. Se espera que `Iris/` permanezca y que al reinstalar se recuperen los datos. Revisar el acceso directo del escritorio.
- Windows: abrir el ZIP extraído y ejecutar Iris; se espera la misma aplicación y datos fuera del directorio de instalación. Probar también un usuario/carpeta con tildes y espacios.
- Windows: revisar SmartScreen en el build sin firma y confirmar el procedimiento «Más información → Ejecutar de todas formas». No se ha probado firma de código.
- Windows: en un volumen de prueba con poco espacio, importar un archivo que no quepa. Se espera aviso de falta de espacio, origen intacto y posibilidad de reintentar tras liberar espacio.
- Windows: quitar permisos de escritura a la carpeta de prueba. Se espera error en español y conservación de los archivos; restituir permisos antes de seguir.
- Restauración real de SQLite: con Iris cerrado, conservar la base y reemplazarla por un snapshot. Se espera recuperar canciones, plan y tiempos según el momento del snapshot; la multimedia debe seguir en sus carpetas.
- Windows: probar copiar/pegar, deshacer/rehacer, navegación por Tab, foco en diálogos y menús en español. Comprobar Ctrl+Mayús+P, flechas, espacio, B y P fuera de campos de texto.
- Windows: iniciar una segunda instancia; se espera enfocar la consola ya abierta. Cambiar de monitor antes de reabrir; la barra de título debe seguir accesible.
- Windows: apagar internet, crear/editar/proyectar contenido local y abrir tiempos/ajustes. Se espera funcionamiento local; YouTube muestra un aviso sin interrumpir la letra proyectada; las canciones se crean pegando o escribiendo su letra.

## Evidencia disponible en este entorno

- Automatizado en macOS: biblioteca/canciones, importación/escaneo/archivos faltantes, Range/seek de video, plan y drag/drop, dos ventanas de proyección en modo vista previa, tipografía/temporizador/sonido simulado, cronometraje y recuperación, historial de responsables, exportación/importación JSON, confirmación de borrado y snapshots.
- Unitario: reglas puras, validaciones, migraciones/rollback/base futura, rutas/symlinks, servicios/repositorios, importación sin duplicados, rotación de snapshots, geometría de ventana, base dañada preservada y logs con rotación. Los archivos temporales y las respuestas simuladas sustituyen dispositivos/servicios externos.
- Spike manual de fase 09 en macOS: video real de YouTube mediante Referer y el reproductor final aislado; el tiempo avanzó hasta 17 segundos y no hubo errores de consola. No verifica sonido audible ni reproducción en Windows/HDMI.
- Pendiente: ejecución del workflow en GitHub, artifacts Windows, instalación y todas las pruebas físicas listadas arriba. No se equivalen a resultados de CI aprobados.

## Biblia RVR1960 (fase 12)

- Pendiente en Windows/HDMI: importar el XML propio una vez, proyectar Juan 3:16, avanzar/retroceder y comprobar texto, referencia RVR1960, fondo y tipografía a distancia. Cerrar y reabrir Iris: la Biblia permanece disponible sin internet ni el XML original.
- Pendiente en Windows: cancelar la importación, elegir un XML incorrecto y volver a abrir un capítulo ya importado; no se debe perder la Biblia anterior ni cerrarse la aplicación.

- Verificado en macOS con un perfil temporal: `SpanishRVR1960Bible.xml` se importó con 31.104 versículos y su atribución; el contenido permaneció tras cerrar y reabrir Iris. La prueba automatizada usa texto sintético y comprueba la proyección en dos ventanas. Esto no verifica Windows ni HDMI.

## Biblioteca por carpetas (fase 13)

- Pendiente en Windows: en Imágenes, comprobar el orden Buscar → carpeta → actualizar; la carpeta debe abrir Images en el Explorador. Copiar una imagen allí y volver a Iris: debe aparecer sin un diálogo de subida. Repetir con Videos y un MP4, incluida la reproducción en HDMI.
- Pendiente en Windows: reemplazar una imagen con el mismo nombre, actualizar y comprobar la vista nueva. Eliminarla desde el Explorador y actualizar: desaparece; restaurarla y actualizar: reaparece. Un MP4 colocado en Images no debe listarse en esa pestaña. No debe existir pestaña YouTube ni botón para agregar enlaces.

## Varias Biblias (fase 14)

- Pendiente en Windows: actualizar una instalación con RVR1960 ya importada y confirmar que permanece disponible. En Configuración → Biblias, importar XML compatibles de otras traducciones; un XML inválido no debe borrar las existentes.
- Pendiente en Windows/HDMI: cambiar entre traducciones desde Biblia, comprobar texto y referencia de cada una, cerrar/reabrir y verificar la selección recordada. Con una sola traducción no aparece selector. «Tradicional» separa Antiguo/Nuevo Testamento; «A–Z» ordena los libros. No hay botón de importación en el panel de proyección.
- Las pruebas automatizadas usan traducciones sintéticas; no verifican archivos reales de otras versiones ni su proyección en hardware Windows.

## Entrega Windows/macOS y actualizaciones (fase 15)

- Pendiente en Windows: instalar 0.1.0 con datos de prueba y actualizar a 0.2.0 con el instalador nuevo. Confirmar una sola aplicación/acceso directo, canciones, multimedia, Biblias, ajustes y plan conservados; comprobar el respaldo previo si hubo migración.
- Pendiente en Mac Intel y en una descarga nueva de Mac Apple Silicon: abrir el DMG de la arquitectura correcta, reemplazar Iris.app, conservar datos y comprobar los avisos reales de Gatekeeper. La firma ad-hoc no equivale a firma Developer ID/notarización.
- Pendiente en ambos sistemas: probar instalación, reemplazo y desinstalación en equipos finales y proyección/audio HDMI. No se consideran comprobados por los tests de apertura de la app empaquetada.

- Verificado localmente en Mac Apple Silicon: build 0.2.0 DMG/ZIP y apertura del ejecutable empaquetado, nombre/versión y consola/IPC, con un perfil y carpeta Iris temporales. No verifica una descarga con cuarentena de macOS ni el reemplazo de una instalación real.
- Automatizado: actualización de bases en disco desde estructuras 8, 9 y 10 a 11, con conservación de datos, archivos intactos, respaldo previo idéntico e idempotencia.

## Diapositivas compactas (fase 16)

- Pendiente en Windows con datos de prueba: actualizar mediante `atm-iris-desktop-0.2.1-setup.exe` sobre la instalación anterior, manteniendo la misma cuenta de Windows y carpeta Iris. Confirmar canciones, Biblias, archivos y ajustes conservados. La entrega 0.2.1 mantiene el esquema 11, sin migración adicional.
- Pendiente en el equipo real/HDMI: abrir una canción de 20–30 diapositivas; comprobar cuatro/cinco columnas según el espacio disponible, texto normal legible, selección y edición, y que En vivo/proyección mantengan su tipografía. Probar escala de Windows 100 %, 150 % y 200 % según el monitor disponible.

## Herramienta personal (fase 99)

- Pendiente en Windows/macOS con FFmpeg: generar/instalar la edición personal, activar la función, preparar la herramienta, seleccionar FFmpeg/FFprobe, descargar un video público corto como MP4 y MP3 y reproducir ambos. Verificar el destino Videos/Audio/Sounds y asignar el MP3 desde «Elegir audio de Iris» sin duplicar el archivo.
- Pendiente con descargas reales: progreso, cancelación durante transferencia y conversión, cierre de Iris, pérdida de internet, video retirado/restringido y archivo superior a los límites. No se usan cookies de cuentas ni se promete eliminar restricciones de YouTube.
- Pendiente: vista Lista/Tarjetas con letras reales en el monitor de operación y proyección HDMI.
- Spike real macOS con perfil temporal: descarga oficial y SHA-256 de yt-dlp 2026.10.21, ejecución nativa, motor Node de Electron v24.22.0 y metadatos de M7lc1UVf-VE (1344 segundos). No verifica descarga de contenido, conversión ni sonido audible.

## Operación local 0.3.0 (fase 17)

- No verificado en Windows: actualizar con canciones/Biblias/medios reales desde 0.2.1, revisar el respaldo previo a migración 12, las letras conservadas y los enlaces retirados. No debe requerir importar de nuevo los archivos locales.
- No verificado con HDMI/parlantes: activar Limpiar pantalla, cambiar canciones/diapositivas/temporizador y comprobar que solo vuelve el contenido al desactivarlo. El fondo se conserva; el audio continúa. Comprobar volumen vertical, mute y salida predeterminada del equipo.
- No verificado en Windows: renombrar un MP3 desde el editor (incluyendo tildes), confirmar referencias tras reiniciar; quitar/reemplazar/eliminar pistas y revisar la Papelera. Probar permisos restringidos y archivo en uso: debe fallar sin perder el original.
- No verificado con RVR1960 real en Windows: escribir «salm», «Salmos 96» y «Salmos 96:13», comprobar capítulo y versículos completos; Enter sin versículo empieza por el primero.
- Las pruebas Electron en macOS usan audios y Biblias sintéticos, no verifican sonido audible ni hardware Windows.
