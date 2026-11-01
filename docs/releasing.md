# Publicar una versión

Iris se publica en nuestro propio servidor. No hay GitHub Releases: GitHub solo construye, firma y
copia los archivos al VPS por SSH.

```
git tag v0.8.0 && git push origin v0.8.0
  1. check    pnpm check · format:check · el tag coincide con package.json
  2. windows  e2e · instalador (NSIS) · prueba del programa empaquetado
  3. macos    e2e · DMG/ZIP arm64 y x64 · firma "Developer ID" · notarización de Apple
  4. publish  rsync al VPS: primero los instaladores, al final latest.yml / latest-mac.yml / latest.json
```

Antes de publicar: sube `version` en `package.json`, escribe el cambio en `CHANGELOG.md` y deja `main`
verde. El tag debe ser `v` + esa versión; si no coincide, el flujo falla. Una ejecución manual del flujo
(sin tag) solo construye y deja los archivos como artifacts.

## Cómo se actualiza la app

- Al abrir, Iris pide `https://iris.atmosferast.com/releases/latest.yml` (Windows) o `latest-mac.yml` (Mac).
- **Cualquier versión más nueva es obligatoria**: se descarga, y la pantalla de bloqueo no deja entrar
  hasta instalarla. No hay «después». Sin internet, abre normal. No instala mientras se proyecta.
- Antes de instalar, Iris guarda una copia automática de la base de datos.
- Cada archivo se verifica con la huella (sha512) de `latest*.yml`. En Mac, además, solo se actualiza una
  app firmada y notarizada.
- Una versión mala llega a todos al abrir: por eso el flujo corre las pruebas antes de publicar.

## Una sola vez: el VPS

Se usa el usuario `deploy` que ya existe para los despliegues desde GitHub (no hay usuario aparte).
La carpeta de publicación es suya y la sirve el contenedor de la landing (ver `atm-iris-web`):

```bash
sudo mkdir -p /opt/iris-landing/releases
sudo chown -R deploy:deploy /opt/iris-landing
```

El nginx del host (`iris.atmosferast.com`) ya apunta al contenedor, que sirve `/releases/` desde esa carpeta.

## Una sola vez: secretos en GitHub (Settings → Secrets and variables → Actions)

El repositorio es público: **ninguna llave va en el código ni en el historial**. Solo existen como secretos.

| Secreto                                | Qué es                                                                |
| -------------------------------------- | --------------------------------------------------------------------- |
| `SSH_HOST`, `SSH_USER`, `SSH_KEY`      | VPS, `deploy` y su llave privada (los mismos de los demás repos)      |
| `MAC_CERT_P12_BASE64`                  | certificado «Developer ID Application» exportado como .p12, en base64 |
| `MAC_CERT_PASSWORD`                    | contraseña de ese .p12                                                |
| `APPLE_API_KEY_P8`                     | contenido del archivo `AuthKey_XXXX.p8`                               |
| `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` | ID de la llave y «Issuer ID»                                          |

### Apple (Mac)

1. developer.apple.com → Certificates → **Developer ID Application** (se pide con un CSR desde «Acceso a
   Llaveros»). Instálalo, expórtalo desde Llaveros como `.p12` con contraseña y conviértelo:
   `base64 -i certificado.p12 | pbcopy` → pégalo en `MAC_CERT_P12_BASE64`.
2. App Store Connect → Users and Access → Integrations → **App Store Connect API** → crea una llave
   (rol _Developer_), descarga el `.p8` (se baja una sola vez) y anota _Key ID_ e _Issuer ID_.
3. Con una cuenta Apple Developer **individual** la app aparece firmada con tu nombre legal, y Gatekeeper
   la acepta. Para que diga «Atmosfera» hace falta una cuenta de organización.

### Windows

Sin firma, Windows muestra «editor desconocido» (SmartScreen): se instala con «Más información → Ejecutar
de todas formas». La actualización automática funciona igual. Para firmar hace falta un certificado de
firma de código con **identidad verificada**; el nombre que muestra Windows es el del certificado (tu nombre
legal si es de persona natural, salvo que la entidad certificadora valide «Atmosfera» como nombre comercial).
Opciones, a verificar con precios y requisitos vigentes: Azure Trusted Signing, o un certificado de
DigiCert / Sectigo / SSL.com con firma en la nube. Los certificados nuevos pueden seguir viendo avisos de
SmartScreen hasta ganar reputación.

Cuando lo tengas: agrega los secretos de la firma al job `windows` de `release.yml`, activa
`win.signtoolOptions.publisherName` en `electron-builder.yml` (así el actualizador solo acepta instaladores
firmados por ti) y quita `CSC_IDENTITY_AUTO_DISCOVERY: "false"`.

## Retroceder una versión mala

Los instaladores viejos siguen en la carpeta. En el VPS, restaura el `latest.yml` / `latest-mac.yml` de la
versión buena (guarda copias) **y** publica una versión nueva con el arreglo: las apps ya actualizadas no
bajan de versión por sí solas (`allowDowngrade` está apagado).

## Antes de anunciar

- Elegir la licencia del código (el repositorio es público) y revisar que «Iris» no choque con una marca.
- Página de privacidad: la comprobación de actualizaciones envía la IP, la versión y el sistema; YouTube
  carga recursos de Google.
- Mantener los avisos de licencia de Electron y de las librerías (van dentro del instalador).
