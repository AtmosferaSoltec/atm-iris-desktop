# Descargas personales

La edición personal de Iris añade **Herramientas → Descargar**. La edición general no contiene el módulo de descarga. Los archivos obtenidos son archivos locales normales: MP4 en `Iris/Videos`, MP3 como pista en `Iris/Audio` o como efecto en `Iris/Sounds`. SQLite guarda solo sus metadatos.

## Obtener el instalador personal

1. Abre el workflow [Windows](https://github.com/AtmosferaSoltec/atm-iris-desktop/actions/workflows/build-win.yml) o [macOS](https://github.com/AtmosferaSoltec/atm-iris-desktop/actions/workflows/build-mac.yml).
2. Pulsa **Run workflow**, elige `main` y marca **Edición personal con descargador (no distribuir)**.
3. Cuando termine, descarga el artifact con sufijo **`-personal`**. En Windows será `iris-windows-0.3.0-personal`; el instalador se llama `atm-iris-desktop-0.3.0-personal-setup.exe`. En Mac, elige el DMG personal de tu arquitectura.
4. Cierra Iris y actualiza sobre tu instalación actual. Conserva antes una copia de toda la carpeta Iris. El identificador de la app y la carpeta de datos se mantienen; el esquema pasa a 12 con respaldo previo; no tienes que importar tus datos nuevamente.

Los builds automáticos de `deploy/windows` y `deploy/macos` son generales; `main` y los PR no disparan estos workflows. No actives la casilla personal para preparar instaladores que entregarás a otras personas. Una actualización general sobre una instalación personal deshabilita esta función; no elimina los archivos ya guardados.

## Preparación inicial

1. En **Herramientas → Descargar**, pulsa **Activar descargas personales**. La preferencia está desactivada inicialmente y se guarda en esta instalación.
2. Pulsa **Preparar herramienta**. Iris obtiene `yt-dlp` de su repositorio oficial y comprueba el SHA-256 publicado para esa versión antes de instalarlo.
3. Pulsa **Obtener FFmpeg**. Se abre la página oficial, que enlaza proveedores de binarios para cada sistema. Descarga y extrae una compilación estática compatible con tu equipo que incluya `ffmpeg` y `ffprobe`.
4. Pulsa **Seleccionar FFmpeg** y elige la carpeta de esos ejecutables. En Windows suele ser la subcarpeta `bin`, con `ffmpeg.exe` y `ffprobe.exe`. Iris copia y comprueba ambas herramientas en su carpeta privada; no modifica los originales.

Las herramientas viven en `userData/tools`, fuera del instalador y de la biblioteca. La conversión no requiere instalar Node aparte: Iris usa el motor JavaScript de su propio Electron. Los componentes remotos adicionales y los plugins externos del descargador quedan desactivados.

## Descargar y usar

- Pega un enlace de YouTube. Elige **Video (MP4)** y 360p/720p, o **Solo audio (MP3)** y el destino: pista de canción o sonido.
- Pulsa **Descargar**. Se admite un solo trabajo simultáneo, videos públicos de hasta 30 minutos y archivos de hasta 200 MB. Las listas, emisiones en vivo y videos que requieren iniciar sesión no se descargan.
- El panel muestra consulta, descarga, preparación y guardado. Puedes cancelar antes del guardado final. Cerrar el panel permite continuar; salir de Iris cancela el proceso y espera su limpieza.
- Los videos aparecen en la biblioteca multimedia. Para usar un MP3 como pista, edita la canción y pulsa **Elegir audio de Iris**; el archivo existente se reutiliza sin duplicarlo. Guardar la canción sustituye su pista anterior.
- Los efectos se muestran en **Herramientas → Sonidos**. Los archivos descargados funcionan sin internet.

**Actualizar herramienta** obtiene y verifica una versión oficial. Si ya está actualizada e íntegra, solo renueva la fecha de comprobación. Con la función activada, Iris comprueba semanalmente al iniciar; nunca lo hace en la edición general ni en las pruebas automatizadas. Puedes desactivar la función desde este mismo panel.

Una descarga puede fallar por cambios o restricciones de YouTube. Actualizar la herramienta puede resolver cambios técnicos; no garantiza que un video bloqueado pase a estar disponible. No se utilizan cookies de cuentas ni se añaden opciones para eludir restricciones de acceso.

## Validación disponible

Las pruebas de servicios usan herramientas/respuestas simuladas y archivos temporales para comprobar formatos, límites, checksum, destinos, cancelación y ausencia de duplicados. Los E2E comprueban la interfaz personal y que la general excluye la función. El build comprueba además los bundles generados.

El spike real en macOS verificó instalación oficial `yt-dlp 2026.10.21`, integridad SHA-256, ejecución nativa, Node `v24.22.0` de Electron y consulta del video de demostración `M7lc1UVf-VE` (1344 segundos). No descargó el contenido ni verificó conversión/sonido.

**Pendiente de verificación manual:** una descarga real MP4 y MP3 con FFmpeg, reproducción audible, funcionamiento en Windows, cancelación durante una descarga real y los errores de red/restricciones reales. Ver [pruebas manuales](manual-tests.md).

## Desarrollo

```sh
pnpm dev:personal
pnpm build:win:personal --publish never
pnpm build:mac:personal --arm64 --publish never
```

El flag `IRIS_PERSONAL_BUILD=1` activa los módulos virtuales de main/renderer. Sin el flag, los módulos no se importan y permanecen solo respuestas IPC de función no disponible. `scripts/check-edition.mjs` comprueba los bundles antes de empaquetar. Los directorios `src/main/modules/downloader` y `src/renderer/src/features/downloader` pueden retirarse y la edición general debe seguir pasando `pnpm check` y `pnpm build`.
