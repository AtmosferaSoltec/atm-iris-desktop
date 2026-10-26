# Instalar y actualizar Iris

## Entrega 0.3.0

Los workflows se ejecutan por separado: `deploy/windows` genera Windows y `deploy/macos` genera Mac. Los cambios en `main` y los pull requests no activan ambos. También puedes usar «Run workflow» en GitHub Actions:

- [Windows](https://github.com/AtmosferaSoltec/atm-iris-desktop/actions/workflows/build-win.yml): artifact `iris-windows-0.3.0`, con `atm-iris-desktop-0.3.0-setup.exe`, ZIP alternativo y blockmap.
- [macOS](https://github.com/AtmosferaSoltec/atm-iris-desktop/actions/workflows/build-mac.yml): artifacts `iris-macos-0.3.0-arm64` para Apple Silicon y `iris-macos-0.3.0-x64` para Intel, con DMG y ZIP de cada arquitectura.

En cada ejecución aprobada, baja el artifact desde «Artifacts» y descomprime ese contenedor de GitHub. Entrega al usuario el `.exe` de Windows o el `.dmg` de su Mac. No necesita el código fuente, Node ni pnpm. El ZIP de aplicación es una alternativa; el `.blockmap` no se instala.

La versión de los artifacts se lee de `package.json`, no se escribe manualmente en cada workflow. Los resultados se conservan como artifacts de la ejecución, no como una publicación automática de GitHub Releases.

## Actualizar una instalación existente

1. Cierra Iris completamente. Usa la misma cuenta del sistema que utilizabas antes.
2. Antes de actualizar, conserva una copia de toda tu carpeta Iris en otra ubicación. «Configuración → Acerca de → Abrir carpeta de Iris» muestra cuál estás usando. El respaldo JSON no incluye la multimedia ni las Biblias.
3. En Windows, ejecuta el instalador nuevo sobre la instalación existente. En macOS, abre el DMG y arrastra Iris a Aplicaciones; elige reemplazar la app anterior.
4. Abre Iris y comprueba canciones, Biblias, archivos, ajustes y plan antes de iniciar el servicio.

**No tienes que volver a importar todo.** La aplicación se reemplaza; los datos permanecen en `<carpeta del usuario>/Iris`, fuera de la instalación, con SQLite en `Database/iris.db` y los archivos en sus subcarpetas. Si usas `IRIS_HOME` o una ubicación personalizada en `config.json`, conserva esa configuración. Otra cuenta del sistema utiliza una carpeta de usuario diferente; actualizar no sincroniza equipos.

El `appId` (`com.atmosfera.iris`), el nombre de paquete y el nombre del producto se mantienen entre versiones. El instalador Windows conserva los datos al desinstalar, aunque para actualizar basta con ejecutar el instalador nuevo.

## Migraciones y recuperación

La versión de la aplicación (`0.3.0`) y la versión de estructura de SQLite (`12`) son independientes. Al abrir:

- Si la estructura ya está actualizada, Iris utiliza la base existente.
- Si faltan migraciones, guarda antes una copia `Backups/pre-migration-<anterior>-to-<nueva>-<fecha>.db` y aplica las migraciones pendientes en una transacción.
- Si una migración falla, la transacción se revierte y se informa del error. No borres la base ni la carpeta Iris para intentar resolverlo.
- Una app anterior rechaza una estructura más reciente que la que conoce. Para retroceder de versión, conserva la base actual, instala la app anterior y restaura con Iris cerrado el respaldo previo a la migración. Se perderán en esa restauración los cambios posteriores al respaldo; los archivos multimedia permanecen en sus carpetas.

La versión 0.3.0 añade vista Lista, controles de pantalla/audio y una edición personal opcional. Migra al esquema 12: conserva canciones, letras, audios locales, Biblias y ajustes; retira los enlaces de YouTube y sus filas del servicio. Guarda antes un respaldo automático de la base. Las canciones que solo tenían enlace conservan su título para agregarles un MP3. Para obtener el descargador, sigue la [guía de edición personal](downloader-personal.md); los artifacts generales no lo incluyen.

Las migraciones 0009–0011 guardan las Biblias locales y conservan la RVR1960 existente al incorporar varias traducciones. Los archivos multimedia no se reimportan ni se trasladan durante una migración.

Para futuras versiones: aumentar `package.json.version`; añadir migraciones numeradas consecutivas cuando cambie el esquema, sin modificar migraciones ya entregadas; probar actualización con datos anteriores, generar el build de la plataforma que se vaya a entregar y realizar el ensayo en los equipos reales antes del culto.

## Firma y comprobaciones pendientes

El instalador Windows no tiene certificado de firma. La app Mac usa firma ad-hoc técnica y no está notarizada por Apple; no tiene identidad de desarrollador verificada. Las advertencias del sistema en una descarga real siguen pendientes de comprobar. La distribución con identidad verificada requiere configurar certificados y credenciales en CI.

Las pruebas automáticas usan datos sintéticos y carpetas temporales. No sustituyen instalar/actualizar en Windows, probar el Mac Intel, revisar Gatekeeper/SmartScreen tras descargar, ni proyectar por HDMI. Consulta [las pruebas manuales](manual-tests.md).
