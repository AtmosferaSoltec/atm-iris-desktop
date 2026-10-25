# Iris Desktop · 0.1.0

Consola local de proyección y tiempos para iglesias, para Windows. Electron, React y TypeScript; sin servidor, cuentas ni inicio de sesión. Porta el diseño y los flujos de Iris Web. La Biblia y el descargador opcional no están incluidos.

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

Agrega canciones en la biblioteca, importa imágenes/videos/pistas o arrastra archivos a la biblioteca. Los archivos importados se **copian**: el original no cambia. «Buscar archivos» detecta archivos agregados directamente a las carpetas y marca los que faltan. Los cambios de título no renombran los archivos. «Quitar» envía el archivo a la papelera del sistema.

Arma el servicio arrastrando elementos. Selecciona una diapositiva para enviarla a pantalla. «Proyectar» permite elegir el segundo monitor; sin él se puede abrir una ventana de vista previa. El sonido de videos sale de la proyección; las pistas de canciones y los sonidos salen de la consola mediante el dispositivo predeterminado de Windows. El sistema puede cambiar ese dispositivo al conectar HDMI.

«Seleccionar servicio» permite crear sus bloques y llevar los tiempos. Cada cambio se guarda; cerrar y abrir recupera el bloque en curso. «Tiempos» reúne los registros y resúmenes. El temporizador de pantalla es independiente del cronómetro del servicio.

Todo lo local funciona sin internet. YouTube y la búsqueda opcional de letras necesitan conexión. YouTube conserva su reproductor y anuncios; Iris no descarga videos. Las letras siguen disponibles si la pista de YouTube falla.

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

## Windows y distribución

```sh
pnpm build:win --publish never
```

El build configura un instalador NSIS por usuario en español y un ZIP x64 en `dist/`, con iconos derivados de la marca Iris. No incorpora datos del usuario y desinstalar conserva la carpeta Iris. La configuración y [workflow de Windows](.github/workflows/build-win.yml) están incluidos; **los artifacts de Windows y la instalación en un PC limpio no se han verificado en este Mac Apple Silicon**. Cuando exista un remote, ejecuta el workflow en GitHub Actions para producirlos.

La versión no está firmada. Windows puede mostrar SmartScreen: «Más información → Ejecutar de todas formas». Una distribución firmada requiere un certificado de firma de código de Windows y configurar sus credenciales en el entorno de build. La actualización automática está deshabilitada; no hay feed ni llamadas de actualización al inicio.

## Solución de problemas

- Electron inicia como Node: usa el comando con `env -u ELECTRON_RUN_AS_NODE` en macOS.
- Falta un archivo: vuelve a ponerlo en la carpeta original y ejecuta «Buscar archivos», o quita su registro e impórtalo de nuevo.
- No hay espacio: libera espacio en el disco de Iris y vuelve a importar; el origen no se sobrescribe.
- Desaparece el monitor: Iris cierra la salida y avisa; reconecta, elige la pantalla y vuelve a proyectar.
- YouTube falla o no hay conexión: la biblioteca local y las letras siguen funcionando. La verificación con Windows e internet está pendiente.
- Registros: Configuración → Acerca de → «Abrir carpeta de registros»; `iris.log` rota localmente. No hay telemetría.

La arquitectura está en [docs/architecture.md](docs/architecture.md), las comprobaciones físicas pendientes en [docs/manual-tests.md](docs/manual-tests.md) y el plan con sus desviaciones en [docs/plans/README.md](docs/plans/README.md). Los repositorios de referencia no se modificaron.
