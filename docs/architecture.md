# Arquitectura implementada

Iris Desktop 0.2.0 usa Electron, React, TypeScript, React Compiler, Vite, Radix y SQLite integrado en Node. El renderer es local y no requiere cuenta ni servidor.

## Procesos y límites

- `src/main`: crea la consola y la salida de proyección, enumera monitores, mantiene SQLite y controla archivos. Los handlers validan sus entradas y delegan en servicios; los repositorios contienen SQL. `db/sqlite.ts` es el único adaptador de `node:sqlite`.
- `src/preload`: expone el contrato de `src/shared/ipc/contract.ts` como `window.iris`, con resultados y eventos tipados. No publica `ipcRenderer`, Node ni rutas de archivos multimedia.
- `src/renderer`: React con router hash, formularios y caché de consultas. Búsqueda, filtros y selección de tiempos viven en la URL. Usa identificadores y `iris-media://asset/<id>`.
- `src/shared`: modelos, zod en español, reglas puras, zonas horarias, cronómetros y estadísticas. ESLint impide las importaciones entre capas prohibidas.

Todas las ventanas mantienen aislamiento de contexto, sandbox y `webSecurity`; no habilitan Node. Se deniegan permisos, navegación y ventanas nuevas. IPC acepta solo frames principales de ventanas locales registradas. Los errores se transportan como `AppError` con código estable, mensaje español y campos opcionales.

## Persistencia

La carpeta `<home>/Iris` contiene `Audio`, `Videos`, `Images`, `Backgrounds`, `Sounds`, `Database` y `Backups`. `IRIS_HOME` sustituye esa ubicación; también se reconoce `userData/config.json` con `homeDir` absoluto. No hay selector de ubicación en la interfaz.

SQLite usa foreign keys, journal DELETE y synchronous FULL. Once migraciones crean ajustes, medios, canciones/diapositivas, plan, personas, tipos/bloques, registros, videos de YouTube y Biblia RVR1960; la décima registra modificaciones de archivos multimedia y la undécima conserva varias traducciones bíblicas sin perder la RVR1960 existente. Se copia la base antes de migrar; una versión futura se rechaza. Las rutas de medios son relativas y `resolveInside` comprueba segmentos, prefijos y symlinks. Las importaciones copian sin sobrescribir y las eliminaciones explícitas pasan por la papelera del sistema.

El registro en curso se guarda en cada cambio de bloque y se reanuda desde sus timestamps UTC. Los nombres históricos permanecen aunque se elimine la persona o el tipo. «Hoy», horarios, periodos y snapshots diarios usan la zona de la iglesia.

El respaldo JSON conserva la forma del importador web y excluye los archivos multimedia. La importación valida todo antes de una transacción y omite duplicados. `VACUUM INTO` genera snapshots diarios y manuales; se conservan siete, además de las copias previas a migraciones. La restauración de SQLite es manual con Iris cerrado.

## Proyección y YouTube

La consola publica frames completos. Main los conserva y los envía a la salida al cargar. La salida reproduce video con audio; la vista previa permanece silenciada. Los fondos de video siempre van silenciados. Al perder un monitor se cierra la salida y se avisa; se impide el apagado de pantalla mientras se proyecta.

El renderer principal conserva CSP sin scripts remotos. La excepción de YouTube se limita a una página empaquetada en `iris-player://app`, dentro de un iframe con origen diferente y sin preload. La API oficial solo se carga allí; comandos, tiempo y errores pasan por postMessage validado y comprobación del emisor. El protocolo sirve únicamente HTML y assets empaquetados en producción; durante desarrollo remite al servidor Vite. El header Referer identifica `com.atmosfera.iris` solo ante YouTube. El spike real reprodujo video en macOS; Windows y HDMI siguen pendientes. No se descargan contenidos ni se bloquean anuncios.

La única red de producto es YouTube. Las letras se escriben o pegan manualmente; no hay consulta de letras en línea. No hay telemetría ni actualización automática. Los logs rotan en `userData/logs`.

## Verificación y distribución

Vitest cubre reglas, servicios, repositorios y migraciones. Playwright abre Electron con perfil e `IRIS_HOME` temporales, bloquea red externa por defecto y simula los servicios externos cuando se necesitan. El checklist físico está en [manual-tests.md](manual-tests.md).

Windows usa instalador NSIS por usuario y ZIP x64; macOS añade DMG/ZIP arm64 y x64, con marca Iris y datos fuera de la instalación. Dos workflows construyen y publican artifacts de CI, sin desplegar Releases. Abren además el ejecutable empaquetado con un perfil temporal antes de subir los archivos. Las actualizaciones manuales conservan la identidad y la carpeta Iris; se reutilizan las migraciones transaccionales con respaldo previo. Ver [actualización y recuperación](updating.md). Firma de distribución, notarización y comprobaciones físicas quedan pendientes.

## Biblias locales (fases 12 y 14)

El selector y las referencias portan la consola web. Configuración permite importar varias traducciones XML locales; la consola permite elegir entre ellas y recuerda la selección. Main valida y parsea el XML elegido mediante diálogo nativo, conserva su atribución y reemplaza solo los metadatos/versículos de esa traducción en una transacción; el renderer pide capítulos por traducción mediante IPC y separa su caché por traducción y no accede a rutas. El XML no se incluye en Git ni en el instalador. Los pasajes temporales usan frames de texto con pie de referencia, conservan fondos/tipografía y admiten navegación dentro del capítulo. No cambian las categorías persistentes del plan ni requieren red.

## Biblioteca por carpetas (fase 13)

Multimedia muestra los archivos presentes en Images/Videos con búsqueda, carpeta y actualizar. El escaneo conserva ids por ruta relativa, respeta los tipos de cada carpeta y detecta modificaciones por tamaño y fecha del archivo. Las URLs de assets admiten únicamente un parámetro numérico de versión para renovar previews; se mantienen los controles de ruta y Range. Los archivos faltantes se ocultan en esa biblioteca, conservando sus referencias para avisos en el plan y mantenimiento. SQLite almacena solo metadatos, nunca los bytes de imágenes, videos o audios. La importación de las otras herramientas sigue separada del nuevo flujo de biblioteca.
