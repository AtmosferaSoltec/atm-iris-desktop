# Changelog

## 1.3.2

- Consola más compacta para pantallas chicas (como 1366×768): el servicio muestra casi el doble de elementos. Cada elemento ocupa una sola línea (título, autor y duración de la pista); los botones de mover y quitar aparecen al pasar el mouse. El reproductor, «Limpiar pantalla» y el volumen van en una sola fila, y la barra de la pista es una línea delgada con sus botones. La vista previa en vivo se puede plegar (queda una línea con lo que está en pantalla) y se recuerda en esa computadora. La barra superior es más baja.
- El ícono de Iris tiene el mismo tamaño que el de las demás apps (con su margen, como esperan Windows y macOS) en vez de verse más grande.
- Los textos ya no se pintan como selección al hacer doble clic o arrastrar (como en una página web); solo los campos donde se escribe y las direcciones del control desde iPad se pueden seleccionar.
- Tiempos: cada bloque muestra su hora de inicio y de fin en formato de 12 horas («de 8:01 p. m. a 8:09 p. m.»), también en el Excel descargado.
- Tiempos: «Intercambiar con otro bloque…» en el menú «…» de un bloque, para cuando un bloque se cronometró con el nombre de otro (por ejemplo, Consagración se hizo donde estaba Anuncios). Las horas quedan donde pasaron; cambian el nombre y el tiempo previsto, y opcionalmente los responsables.

## 1.3.1

- «Agregar bloque»: en vez de elegir «Antes de…», se ve la lista de bloques del servicio y el nuevo se arrastra a su lugar (arriba va primero, abajo al final; también con las flechas). Mientras no empiece, el bloque agregado se puede tocar en la lista de bloques para cambiarle el nombre, los minutos o el lugar, o quitarlo.

## 1.3.0

- Fondos y biblioteca: los videos se muestran como una imagen fija (con el ícono de video) en lugar de reproducirse todos a la vez, para no cargar la computadora.
- Biblia: al volver a abrirla queda en el último libro, con el capítulo marcado, para cambiar de capítulo sin buscar el libro otra vez. También se puede escribir solo «20:8» y se entiende en ese libro. Igual en el iPad.
- Configuración es ahora una tuerca al final de la barra superior y se abre en su propia ventana: la consola sigue ahí detrás y se cierra la ventana para volver. Lo que cambies se ve en el servicio al volver a él.
- Texto: el tamaño de la letra en las pantallas va de 60 a 200 (antes 100 a 250); si tenías más de 200 queda en 200. En el mismo diálogo se elige el tamaño del texto de las diapositivas de la consola (de 10 a 16), que solo ve quien la maneja.
- Diapositivas de la consola: texto más pequeño de fábrica (caben hasta 5 líneas por tarjeta).
- «Limpiar pantalla» ya no desmarca la diapositiva: sigue marcada la que elegiste, y al tocar otra se marca aunque la pantalla esté limpia.
- Control desde iPad: vista previa de fondos, imágenes y videos; texto opcional en el cronómetro; botón «Desconectar» con confirmación.

## 1.2.1

- Incluye todo lo de 1.2.0, que no llegó a publicarse. La barra de bloques cabe en pantallas angostas: «Agregar bloque» es el botón «+» junto a «Comenzar» y «Siguiente».

## 1.2.0

- «Agregar bloque» durante el servicio (en la barra de bloques): un bloque extra solo para ese servicio, en el lugar que elijas. Se cronometra y queda en Tiempos, pero el servicio conserva sus bloques de siempre.
- Control desde iPad: Biblia (todas las versiones de la computadora; se proyecta una sola vez, sin entrar al servicio), imágenes y videos de la biblioteca (se presentan con un toque), elegir el servicio antes de empezar, quién dirige cada bloque, agregar un bloque y terminar el servicio.

## 1.1.1

- Control desde iPad: si la computadora está en Configuración o Tiempos, el iPad ya no se queda cargando; avisa que hay que volver a la pantalla del servicio.
- Para diagnosticar la conexión: abrir la dirección de la computadora en el navegador del iPad muestra si Iris está activo, y `iris.log` registra cada intento del iPad.

## 1.1.0

- Control desde iPad: en Configuración → «Control desde iPad» (apagado de fábrica) aparece un código de 6 dígitos que se escribe en la app de iPad, conectada a la misma red Wi-Fi. Desde el iPad se elige el elemento, se proyecta una diapositiva, se reproduce o pausa la pista, se cambia el fondo, se usa el cronómetro y los sonidos y se pasa al siguiente bloque. El iPad no guarda nada ni puede agregar o editar contenido.
- La primera vez que se enciende, Windows pide permiso en el firewall: elige «Permitir» en redes privadas.

## 1.0.4

- Versión de prueba del flujo de actualización (sin cambios para el usuario).

## 1.0.3

- Actualización obligatoria: ya no descarga sola. Primero aparece «Hay una nueva versión» con el botón «Descargar actualización».
- El registro de Iris (`iris.log`) ahora guarda lo que hace el actualizador, para poder diagnosticar una instalación que no termina.

## 1.0.2

- Audios: el selector de audio y «Asignar audios» tienen «Abrir carpeta de audios» (para copiar tus MP3 a Iris/Audio) y «Buscar archivos nuevos».

## 1.0.0

- Primera versión pública. Al abrir por primera vez, una guía de bienvenida de cuatro pasos. Sello «Desarrollado por Atmosfera» en Configuración, con enlace a atmosferast.com.
- Configuración → Respaldo: «Importar canciones» ahora acepta varios archivos JSON a la vez, y el nuevo botón «Importar carpeta» importa todos los JSON de una carpeta (y sus subcarpetas) con una sola vista previa.
- Actualización automática obligatoria desde nuestro propio servidor (Windows y macOS): al abrir, si hay una versión nueva se descarga y la app no deja entrar hasta instalarla. Sin internet abre normal; no instala mientras se proyecta.
- Publicación con tags en GitHub Actions: construye Windows y macOS, firma y notariza la versión de Mac y la sube al servidor (ver docs/releasing.md). El instalador de Windows ahora se llama `Iris-<versión>-win-x64-setup.exe`.

## 0.7.0

- «Seleccionar servicio»: cada servicio tiene un botón para eliminarlo (con confirmación). Los tiempos ya guardados en Tiempos se conservan con el nombre del servicio.
- Tiempos → Registros: cada bloque muestra a qué hora inició y el menú tiene «Cambiar hora de inicio…»: si el bloque empezó antes o después de pulsar el botón, el bloque dura hasta que terminó, el bloque anterior termina a esa hora y, si es el primero, el servicio se mueve a esa hora.

- Panel de trabajo: se quitó el selector «Tarjetas / Lista»; las diapositivas se muestran siempre como tarjetas.
- Multimedia → YouTube: pega el enlace de un video y se proyecta con el reproductor de YouTube en la pantalla de proyección (sonido incluido), con los controles de EN VIVO. No se descarga ni se guarda en el servicio; necesita internet y puede mostrar anuncios.

## 0.6.1

- Tiempos → Descargar: la tabla ahora es una hoja de Excel (.xlsx) con diseño, en vez de CSV. Columnas: fecha, servicio, bloque, responsable, hora de inicio, hora de fin y excedente (o «A tiempo»).
- Arrastrar una canción o archivo de la biblioteca ahora solo lo añade al servicio si lo sueltas dentro del servicio; soltarlo en la biblioteca ya no lo añade.
- Las barras de desplazamiento muestran un surco gris suave para indicar que el área se desplaza.

## 0.6.0

- Barras de desplazamiento delgadas, redondeadas y sin flechas, con los colores de Iris, en toda la aplicación.

- Asignar audios: los nombres que solo añaden algo al título (por ejemplo «Océanos» y «Océanos Hillsong») se sugieren marcados como «Revisar» y sin casilla activa, y las canciones sin pareja se pueden unir a mano eligiendo el archivo en una lista con búsqueda.

- Tiempos → Registros: filtro «Desde / Hasta» por meses (por ejemplo, de enero a diciembre) además del filtro por servicio.
- Tiempos → botón «Descargar»: informe en PDF con diseño (resumen y una tarjeta por servicio con barras de tiempo, sin tablas) o tabla CSV que abre en Excel, Google Sheets o LibreOffice. Respeta los filtros activos.

## 0.5.1

## Unreleased

- Importar canciones acepta solo JSON (se quitó el TXT).
- Almacenamiento: «Archivos sin uso» y «no encontrados» muestran los primeros 5; «Mostrar todos» abre la lista completa con búsqueda y páginas.
- Respaldo: «Descargar canciones (letras)» y «Copiar archivos a una carpeta» para copiar por separado pistas, fondos, imágenes, videos y sonidos, cada tipo en su subcarpeta.

## 0.5.0

- Configuración → Respaldo → «Importar canciones»: un solo botón que acepta un archivo JSON (exportación de Holyrics o respaldo de Iris), con vista previa y sin duplicar las canciones que ya existen; conserva los nombres de sección (//CORO, //PUENTE).
- Configuración → «Asignar audios a las canciones»: empareja por nombre los MP3 de Iris/Audio con las canciones sin audio, con vista previa para revisar y desmarcar antes de asignar.
- Al cerrar la consola se cierra también la pantalla de proyección (antes el televisor quedaba congelado con la última imagen).
- La barra de la ventana muestra la versión de Iris (por ejemplo «Iris 0.4.1»).

- Se elimina el descargador de YouTube y toda la edición personal: hay una sola edición de Iris, sin acceso a YouTube.
- Se elimina la actualización automática obligatoria (electron-updater, pantalla de bloqueo y su IPC). Las actualizaciones vuelven a ser manuales.
- Se eliminan los workflows de GitHub Actions; se trabaja solo en `main` y los instaladores se generan localmente.

## 0.4.1

- Actualizaciones automáticas obligatorias en Windows: al abrir, si hay una versión nueva se descarga y se debe instalar antes de continuar. Las releases se publican desde deploy/windows.
- Al repetir una pista, la barra de tiempo vuelve a 0 en cada vuelta.
- Tarjetas de diapositivas con texto más pequeño; la tipografía del panel de textos solo afecta a la pantalla proyectada.
- Selector de pista con «Elegir audio de Iris» y «Elegir archivo MP3» lado a lado.
- macOS: el workflow queda solo manual.

## 0.3.0

- Vista Lista numerada junto a las tarjetas del espacio de trabajo.
- Se retiran todos los enlaces y reproductores de YouTube; las canciones usan letra y/o audio MP3 local. Migración 12 con respaldo previo, letras, Biblias y archivos conservados.
- Limpiar pantalla es un botón persistente bajo En vivo; no hay diapositiva final vacía. Volumen con slider vertical, icono/duración de audio y Vaciar servicio como icono.
- Renombrado seguro del archivo de audio y limpieza de pistas retiradas o borradores descartados, comprobando referencias y usando la papelera.
- Buscador bíblico con autocompletado de libros, capítulo completo y Enter para proyectar desde el primer versículo.
- Builds independientes: ramas deploy/windows y deploy/macos, sin activar ambos al cambiar main.
- Selector «Elegir audio de Iris» para reutilizar pistas existentes sin duplicar archivos.
- Edición personal opcional con descargas MP4/MP3, preparación de herramientas, SHA-256, actualización semanal, progreso, cancelación y guardado en carpetas Iris. La edición general excluye el módulo.

## 0.2.1

- Diapositivas del espacio de trabajo compactas, con texto normal, numeración y cuatro/cinco columnas según el espacio disponible. Se mantiene la proyección y la vista En vivo.
- Se reutilizan los datos existentes y el esquema 11, sin una migración adicional.

## 0.2.0

- Entrega Windows/macOS con dos workflows, DMG/ZIP para Apple Silicon e Intel y prueba de apertura de cada app empaquetada.
- Actualizaciones manuales documentadas; regresión de migraciones desde estructuras 8, 9 y 10 conserva datos y archivos, con respaldo previo.
- Icono Iris en el Dock durante desarrollo en macOS.

- Biblias: importación desde Configuración, varias traducciones XML, selector persistente y orden «Tradicional»; se conserva la RVR1960 existente.

- Biblioteca multimedia en lista con miniaturas y títulos visibles; YouTube muestra el título y el autor obtenidos automáticamente del enlace.

- Biblioteca multimedia por carpetas: buscar, abrir Images/Videos y actualizar, sin subida de imágenes/videos; detección de archivos reemplazados y separación por tipo.

- Biblia RVR1960 mediante importación XML local, selección por cita o libro/capítulo/versículo y proyección con navegación.

- Se elimina por completo la búsqueda de letras en línea. Las letras se escriben o pegan manualmente.

## 0.1.0

- Consola local de Iris con biblioteca, canciones, pistas, multimedia y plan de servicio.
- Proyección a monitor o ventana de vista previa, fondos, texto, temporizador y sonidos.
- Cronometraje por bloques, responsables, recuperación del servicio y resúmenes de tiempos.
- Videos y pistas de YouTube mediante reproductor aislado; funcionamiento local sin conexión para el resto.
- SQLite local, importación segura de archivos, papelera, respaldos JSON y snapshots diarios.
- Configuración de instalador NSIS y ZIP de Windows; workflow de construcción incluido. Instalación real pendiente de verificar.
