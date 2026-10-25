# Iris Desktop · 0.1.0

Consola local de proyección y tiempos para iglesias, para Windows y macOS. Electron, React y TypeScript; sin servidor, cuentas ni inicio de sesión. Porta el diseño y los flujos de Iris Web. Incluye proyección de Biblias importadas localmente. El descargador opcional no está incluido.

## Desarrollo

Requiere Node.js 24 y pnpm 11. El lockfile fija las dependencias; los scripts de compilación permitidos están declarados en `pnpm-workspace.yaml`.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

En una terminal de VS Code de macOS, Electron necesita quitar la variable que lo hace iniciar como Node:

```sh
env -u ELECTRON_RUN_AS_NODE pnpm dev
```

Para abrir el build local:

```sh
pnpm build
env -u ELECTRON_RUN_AS_NODE pnpm start
```

En Windows usa `pnpm start`, sin el prefijo `env`. Para un perfil aislado, define `IRIS_HOME` antes de iniciar: en PowerShell, `$env:IRIS_HOME = "$env:TEMP\iris-prueba"`; en macOS, `IRIS_HOME=/tmp/iris-prueba env -u ELECTRON_RUN_AS_NODE pnpm dev`.

```sh
pnpm check
pnpm format:check
pnpm build
pnpm test:e2e
```

`check` ejecuta ESLint, TypeScript estricto y Vitest. Los E2E usan Electron real con perfiles y carpetas temporales; la red externa se bloquea y YouTube se simula. No usan tu carpeta Iris. El spike de video real está documentado por separado en [fase 09](docs/plans/09-youtube/README.md).

## Primer uso y archivos

Al iniciar se crea `<carpeta de usuario>/Iris/`, con `Audio`, `Videos`, `Images`, `Backgrounds`, `Sounds`, `Database` y `Backups`. La base local es `Database/iris.db`. Puedes cambiar el nombre de la iglesia y su zona horaria en Configuración. «Acerca de» muestra la ubicación y abre las carpetas de Iris y registros.

Agrega canciones en la biblioteca. Para multimedia, coloca tus imágenes directamente en `Iris/Images` y tus videos en `Iris/Videos`, también dentro de subcarpetas. La fila **Buscar → carpeta → actualizar** abre la carpeta de la pestaña elegida y vuelve a leer sus archivos. Iris también revisa las carpetas al iniciar y al volver a la aplicación. YouTube se agrega únicamente mediante enlaces.

Los archivos permanecen en el disco; **SQLite no guarda imágenes, videos ni audios como contenido binario**. Solo mantiene un índice con nombres, rutas relativas, medidas y referencias del servicio. El escaneo no copia ni mueve los archivos. Al actualizar, los reemplazos se vuelven a leer y los archivos eliminados desaparecen de la biblioteca; sus registros faltantes siguen disponibles en Almacenamiento. Las pistas de canciones residen en `Audio`, los fondos en `Backgrounds` y los sonidos en `Sounds`, dentro de la misma carpeta Iris. Sus editores conservan sus propios controles. Los cambios de título no renombran los archivos y una eliminación confirmada en Iris envía el archivo a la papelera del sistema.

Arma el servicio arrastrando elementos. Selecciona una diapositiva para enviarla a pantalla. «Proyectar» permite elegir el segundo monitor; sin él se puede abrir una ventana de vista previa. El sonido de videos sale de la proyección; las pistas de canciones y los sonidos salen de la consola mediante el dispositivo predeterminado de Windows. El sistema puede cambiar ese dispositivo al conectar HDMI.

«Seleccionar servicio» permite crear sus bloques y llevar los tiempos. Cada cambio se guarda; cerrar y abrir recupera el bloque en curso. «Tiempos» reúne los registros y resúmenes. El temporizador de pantalla es independiente del cronómetro del servicio.

Las letras se escriben o pegan manualmente. Todo lo local funciona sin internet; solo YouTube necesita conexión. YouTube conserva su reproductor y anuncios; Iris no descarga videos. Las letras siguen disponibles si la pista de YouTube falla.

## Biblias

En **Configuración → Biblias**, pulsa **Importar Biblia** y elige tu XML. Puedes conservar varias traducciones: RVR1960, RVR1909, NVI u otras con el mismo formato compatible. El nombre se lee del archivo. Importar de nuevo la misma traducción actualiza solo su contenido; las demás permanecen guardadas. La RVR1960 importada antes de esta actualización se conserva automáticamente.

Abre **Biblia** en la consola (atajo **V**). **Tradicional** agrupa los libros por Antiguo y Nuevo Testamento; **A–Z** los ordena alfabéticamente. Si hay varias traducciones, elige una en el selector: Iris recordará tu elección. Con una sola, muestra su nombre sin selector.

Escribe `Juan 3:16` o `Juan 3:16-18` y pulsa Enter para proyectar, o elige libro, capítulo y versículo. Anterior/Siguiente y las flechas cambian el versículo, con la referencia y la traducción al pie. El pasaje es temporal y no se agrega al plan del servicio. Se mantienen el fondo y la tipografía elegidos.

El instalador no incluye texto bíblico. La importación es local y luego funciona sin internet, aunque muevas el XML original. Se admite XML con elementos `bible` (atributo `translation`), `testament` (`Old`/`New`), `book`, `chapter` y `verse` numerados, con los 66 libros completos. Otros esquemas XML y archivos binarios `.bib` no se importan. Una importación inválida conserva las Biblias anteriores. Los snapshots de SQLite incluyen todas las Biblias; el respaldo JSON de canciones y YouTube no las incluye.

## Respaldos y recuperación

En Configuración → Respaldo, «Descargar respaldo» guarda un JSON compatible con Iris Web. Incluye letras, secciones, enlaces de pistas y videos guardados de YouTube. **No incluye los archivos multimedia**. Importar omite canciones con el mismo título/autor normalizados y videos ya guardados. Las canciones de solo pista local no se pueden reconstruir desde el JSON; el importador lo informa.

La base tiene un snapshot automático por día de la iglesia y un botón «Crear respaldo ahora». Se conservan los últimos siete archivos `Backups/iris-*.db`; las copias previas a migraciones se guardan aparte. Para una copia completa, respalda toda la carpeta Iris, con la aplicación cerrada.

Para restaurar SQLite:

1. Cierra Iris completamente.
2. Conserva una copia de `Database/iris.db`.
3. Copia el snapshot elegido de `Backups/` como `Database/iris.db`.
4. Abre Iris. Los medios deben seguir en sus carpetas originales.

Si la base está dañada, Iris muestra estas instrucciones y conserva el archivo. Si pertenece a una versión más reciente, debes actualizar Iris. No borres la base para resolver un problema sin conservar antes una copia.

«Empezar de cero» elimina solo las categorías elegidas tras escribir `ELIMINAR`. También limpia sus entradas del plan; los archivos se envían a la papelera. No elimina los registros históricos de tiempos.

## Windows, macOS y distribución

```sh
pnpm build:win --publish never
pnpm build:mac --arm64 --publish never
pnpm build:mac --x64 --publish never
```

La versión 0.2.0 produce instalador NSIS/ZIP de Windows x64 y DMG/ZIP de Mac Apple Silicon e Intel en `dist/`. Compila cada plataforma en su sistema: los workflows independientes de [Windows](.github/workflows/build-win.yml) y [macOS](.github/workflows/build-mac.yml) se activan al subir a `main` y publican artifacts con la versión de `package.json`. También pueden ejecutarse manualmente. Cada build abre su app empaquetada con datos temporales antes de subir los archivos.

**Actualizar conserva los datos:** cierra Iris y ejecuta el instalador nuevo en Windows, o reemplaza Iris.app en Aplicaciones en Mac. Se reutilizan la carpeta Iris y la base existente; las migraciones crean antes una copia de seguridad y se aplican en una transacción. No hay actualización automática ni feed. Consulta [la guía de instalación, actualización y recuperación](docs/updating.md).

Windows no está firmado; macOS usa firma ad-hoc y no está notarizado. Los avisos de descarga, la instalación/actualización en los equipos finales y HDMI requieren las pruebas manuales indicadas en la guía.

## Solución de problemas

- Electron inicia como Node: usa el comando con `env -u ELECTRON_RUN_AS_NODE` en macOS.
- En desarrollo en macOS, el Dock usa el icono de Iris, pero el nombre puede seguir siendo Electron porque se ejecuta su aplicación anfitriona. El instalador de Windows configura el nombre y el icono de Iris.
- Falta un archivo: vuelve a ponerlo en la carpeta original y ejecuta «Buscar archivos», o quita su registro e impórtalo de nuevo.
- No hay espacio: libera espacio en el disco de Iris y vuelve a importar; el origen no se sobrescribe.
- Desaparece el monitor: Iris cierra la salida y avisa; reconecta, elige la pantalla y vuelve a proyectar.
- YouTube falla o no hay conexión: la biblioteca local y las letras siguen funcionando. La verificación con Windows e internet está pendiente.
- Registros: Configuración → Acerca de → «Abrir carpeta de registros»; `iris.log` rota localmente. No hay telemetría.

La arquitectura está en [docs/architecture.md](docs/architecture.md), las comprobaciones físicas pendientes en [docs/manual-tests.md](docs/manual-tests.md) y el plan con sus desviaciones en [docs/plans/README.md](docs/plans/README.md). Los repositorios de referencia no se modificaron.
