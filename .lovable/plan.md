## Objetivo

Publicar Top Volley Manager como app nativa en Google Play y App Store usando Capacitor, reutilizando el 100% del código web actual.

## Estado actual

Ya existe `capacitor.config.ts` con `appId: app.lovable.topvolleymanager` y `appName: Top Volley Manager` apuntando al sandbox de Lovable para hot-reload. Falta instalar dependencias, añadir plataformas nativas y preparar iconos/splash y config de producción.

## Pasos

### 1. Instalar dependencias de Capacitor
- `@capacitor/core`, `@capacitor/cli` (dev)
- `@capacitor/ios`, `@capacitor/android`
- Plugins recomendados para tu app: `@capacitor/push-notifications` (ya tienes push web, para nativo se usa este), `@capacitor/status-bar`, `@capacitor/splash-screen`, `@capacitor/app` (deep links / back button), `@capacitor/preferences` (storage nativo si hace falta), `@capacitor/browser` (para OAuth Google en nativo).

### 2. Ajustar `capacitor.config.ts` para dos modos
- **Modo desarrollo** (actual): server.url apunta al preview de Lovable con hot-reload.
- **Modo producción** (para builds de tienda): sin `server.url`, sirve el `dist/` empaquetado.
Documentar cómo alternar (comentar/descomentar el bloque `server`) antes de generar el build de release.

### 3. Preparar activos móviles
- Icono app 1024×1024 y splash screen (usar identidad visual del club, azul primario `#2563eb`).
- Generar todos los tamaños con `@capacitor/assets`.

### 4. Ajustes de OAuth (Google Sign-In) en nativo
El flujo web actual con Supabase + Google no funciona igual en WebView nativa. Habrá que:
- Registrar `redirect_uri` con esquema custom `app.lovable.topvolleymanager://auth/callback` en Google Cloud Console.
- Añadir el intent filter en Android y URL scheme en iOS.
- Usar `@capacitor/browser` para abrir el flujo OAuth y `@capacitor/app` para capturar el retorno del deep link e intercambiar el código con Supabase.

### 5. Push notifications nativas
El `sw.js` web actual no aplica en nativo. Configurar `@capacitor/push-notifications` con:
- Android: Firebase Cloud Messaging (`google-services.json`).
- iOS: APNs (certificado Apple Developer).
Reutilizar la tabla `push_subscriptions` guardando además el token FCM/APNs.

### 6. Instrucciones de build (documento en README)
Explicar al usuario que Lovable no compila binarios nativos. El flujo es:
1. Exportar el proyecto a GitHub desde Lovable.
2. `git pull` en local.
3. `npm install`
4. `npx cap add android` y/o `npx cap add ios`
5. `npm run build && npx cap sync`
6. Android: abrir con `npx cap open android` en Android Studio → generar AAB firmado → subir a Google Play Console.
7. iOS (requiere Mac + Xcode + cuenta Apple Developer 99€/año): `npx cap open ios` → firmar → subir a App Store Connect vía Xcode/Transporter.

### 7. Cumplimiento tiendas
- Google Play: política de datos, edad mínima, screenshots (teléfono + tablet), descripción ES/EN/IT, política de privacidad (ya la tienes en `/privacy`).
- App Store: mismos activos + revisión Apple más estricta. Confirmar que el flujo de suscripción Stripe cumple guidelines (Apple exige IAP para bienes digitales — puede requerir eliminar la compra Stripe en la app iOS o usar IAP).

## Punto que necesita decisión antes de implementar

**Suscripciones en iOS**: Apple prohíbe cobrar servicios digitales fuera de su In-App Purchase. Opciones:
- (a) Ocultar la pantalla de suscripción en la build iOS y solo permitir gestión desde la web.
- (b) Integrar In-App Purchases de Apple (mucho más trabajo, comisión 15-30%).
- (c) Publicar solo Android por ahora.

## Archivos que se crearán / modificarán

- `capacitor.config.ts` (añadir modo prod comentado, plugins config)
- `package.json` (nuevas dependencias)
- `src/hooks/usePushNotifications.ts` (branch nativo vs web con `Capacitor.isNativePlatform()`)
- `src/hooks/useAuth.ts` (flujo OAuth nativo)
- Nuevo: `src/lib/nativeAuth.ts` (helper deep-link OAuth)
- `README.md` (sección "Build móvil")
- Activos: `resources/icon.png`, `resources/splash.png`

## Detalles técnicos

- Detección plataforma: `import { Capacitor } from '@capacitor/core'; Capacitor.isNativePlatform()`.
- Supabase auth con deep link: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'app.lovable.topvolleymanager://auth/callback', skipBrowserRedirect: true }})` + `Browser.open(url)` + listener `App.addListener('appUrlOpen', ...)` que llama a `supabase.auth.exchangeCodeForSession`.
- Los cambios web no requieren `cap sync`; los cambios nativos (plugins, config, iconos) sí.

Al finalizar te pediré leer este post oficial de Lovable sobre desarrollo móvil con Capacitor.
