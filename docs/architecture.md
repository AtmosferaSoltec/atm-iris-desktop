# Arquitectura implementada

Iris Desktop 0.1.0 usa Electron, React, TypeScript, React Compiler, Vite, Radix y SQLite integrado en Node. El renderer es local y no requiere cuenta ni servidor.

## Procesos y límites

- `src/main`: crea la consola y la salida de proyección, enumera monitores, mantiene SQLite y controla archivos. Los handlers validan sus entradas y delegan en servicios; los repositorios contienen SQL. `db/sqlite.ts` es el único adaptador de `node:sqlite`.
- `src/preload`: expone el contrato de `src/shared/ipc/contract.ts` como `window.iris`, con resultados y eventos tipados. No publica `ipcRenderer`, Node ni rutas de archivos multimedia.
- `src/renderer`: React con router hash, formularios y caché de consultas. Búsqueda, filtros y selección de tiempos viven en la URL. Usa identificadores y `iris-media://asset/<id>`.
- `src/shared`: modelos, zod en español, reglas puras, zonas horarias, cronómetros y estadísticas. ESLint impide las importaciones entre capas prohibidas.

Todas las ventanas mantienen aislamiento de contexto, sandbox y `webSecurity`; no habilitan Node. Se deniegan permisos, navegación y ventanas nuevas. IPC acepta solo frames principales de ventanas locales registradas. Los errores se transportan como `AppError` con código estable, mensaje español y campos opcionales.

## Persistencia

La carpeta `<home>/Iris` contiene `Audio`, `Videos`, `Images`, `Backgrounds`, `Sounds`, `Database` y `Backups`. `IRIS_HOME` sustituye esa ubicación; también se reconoce `userData/config.json` con `homeDir` absoluto. No hay selector de ubicación en la interfaz.

SQLite usa foreign keys, journal DELETE y synchronous FULL. Ocho migraciones crean ajustes, medios, canciones/diapositivas, plan, personas, tipos/bloques, registros y videos de YouTube. Se copia la base antes de migrar; una versión futura se rechaza. Las rutas de medios son relativas y `resolveInside` comprueba segmentos, prefijos y symlinks. Las importaciones copian sin sobrescribir y las eliminaciones explícitas pasan por la papelera del sistema.

El registro en curso se guarda en cada cambio de bloque y se reanuda desde sus timestamps UTC. Los nombres históricos permanecen aunque se elimine la persona o el tipo. «Hoy», horarios, periodos y snapshots diarios usan la zona de la iglesia.

El respaldo JSON conserva la forma del importador web y excluye los archivos multimedia. La importación valida todo antes de una transacción y omite duplicados. `VACUUM INTO` genera snapshots diarios y manuales; se conservan siete, además de las copias previas a migraciones. La restauración de SQLite es manual con Iris cerrado.

## Proyección y YouTube

La consola publica frames completos. Main los conserva y los envía a la salida al cargar. La salida reproduce video con audio; la vista previa permanece silenciada. Los fondos de video siempre van silenciados. Al perder un monitor se cierra la salida y se avisa; se impide el apagado de pantalla mientras se proyecta.

El renderer principal conserva CSP sin scripts remotos. La excepción de YouTube se limita a una página empaquetada en `iris-player://app`, dentro de un iframe con origen diferente y sin preload. La API oficial solo se carga allí; comandos, tiempo y errores pasan por postMessage validado y comprobación del emisor. El protocolo sirve únicamente HTML y assets empaquetados en producción; durante desarrollo remite al servidor Vite. El header Referer identifica `com.atmosfera.iris` solo ante YouTube. El spike real reprodujo video en macOS; Windows y HDMI siguen pendientes. No se descargan contenidos ni se bloquean anuncios.

La única red de producto es YouTube y la búsqueda opcional de letras en LRCLIB, con timeout. No hay telemetría ni actualización automática. Los logs rotan en `userData/logs`.

## Verificación y distribución

Vitest cubre reglas, servicios, repositorios y migraciones. Playwright abre Electron con perfil e `IRIS_HOME` temporales, bloquea red externa por defecto y simula los servicios externos cuando se necesitan. El checklist físico está en [manual-tests.md](manual-tests.md).

Windows se configura con instalador NSIS por usuario y ZIP x64, marca Iris y datos fuera de la instalación. El workflow construye y publica únicamente artifacts de CI, sin desplegar releases. La ejecución del workflow, el instalador real y SmartScreen no se verificaron en este Mac.
