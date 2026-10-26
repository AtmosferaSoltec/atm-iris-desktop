# Changelog

## Unreleased

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
