# Guía de continuación para LeagueOfFriends

Este documento permite que otra IA continúe el proyecto sin cambiar la dirección definida. Sigue el orden de trabajo y no adelantes integraciones que dependan de una etapa anterior.

## Objetivo del producto

LeagueOfFriends permite a jugadores de League of Legends:

- Vincular su cuenta mediante Riot ID y región.
- Ver su progreso en Solo/Duo.
- Compararlo con amigos.
- Crear retos privados de LP, rango, victorias o maestría.
- Recibir alertas cuando un rival los supera.

La interfaz usa un estilo neo-brutalista, con rojo carmesí, bordes negros duros, esquinas rectas, tipografía pesada y compatibilidad con modo claro y oscuro.

## Reglas de trabajo

1. Trabajar solamente en la rama `main`.
2. Un commit por cambio lógico y terminado.
3. Escribir los commits en español, con estructura profesional y sin paréntesis.
4. Hacer `git push origin main` después de cada commit aprobado.
5. Usar `apply_patch` para editar archivos.
6. No borrar ni revertir cambios ajenos.
7. Antes de tocar la base de datos, leer las instrucciones vigentes de Supabase y las buenas prácticas de PostgreSQL.
8. Antes de usar Riot API, consultar la documentación oficial actual de Riot.

Ejemplos de commits válidos:

```text
feat: vincula cuentas de riot
feat: sincroniza el progreso competitivo
fix: corrige el cálculo de lp en retos
docs: documenta la configuración de producción
chore: actualiza las dependencias del proyecto
```

## Estado actual

### Implementado

- Frontend con dashboard y creador de retos en modo demostración.
- Tema claro y oscuro con paleta carmesí.
- Configuración local de Supabase y una migración inicial.
- Tablas para perfiles, cuentas Riot, amistades, retos, participantes, snapshots, progreso y notificaciones.
- RLS, permisos, índices, triggers de `updated_at` y pruebas pgTAP para el esquema.
- Pantallas de registro, inicio de sesión, recuperación y actualización de contraseña.
- Cierre de sesión y bloqueo visual de las rutas `/` y `/retos/nuevo` cuando no hay sesión.

### No implementado todavía

- Variables de entorno reales para Supabase en desarrollo y producción.
- Despliegue de la migración al proyecto remoto de Supabase.
- Vinculación real de Riot ID.
- Cliente y sincronizador de Riot API.
- Datos reales en dashboard, amistades y retos.
- Envío real de correos.
- Despliegue público.

## Archivos importantes

| Archivo | Responsabilidad |
| --- | --- |
| `supabase/migrations/20260828024246_create_initial_schema.sql` | Esquema inicial, RLS, índices, funciones y permisos. |
| `supabase/tests/database/initial_schema.test.sql` | Pruebas pgTAP del esquema. |
| `src/lib/supabase/client.ts` | Cliente público de Supabase para el navegador. |
| `src/components/auth/auth-form.tsx` | Registro, acceso y recuperación de contraseña. |
| `src/components/auth/auth-gate.tsx` | Control de sesión y creación inicial de perfil. |
| `src/components/auth/update-password-form.tsx` | Cambio de contraseña desde el enlace de recuperación. |
| `src/components/shared/app-sidebar.tsx` | Cierre de sesión. |
| `docs/data-model.md` | Modelo de datos y relaciones. |
| `docs/architecture.md` | Límites iniciales entre frontend, backend e integraciones. |

## Paso 1: completar la configuración de Supabase

Este es el siguiente paso obligatorio antes de conectar datos reales.

1. En el panel de Supabase, abrir **Connect** y obtener la URL del proyecto y la publishable key.
2. Crear `.env.local` a partir de `.env.example`. Este archivo no debe subirse al repositorio.
3. Definir solamente estas variables en el cliente:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

4. No agregar `SUPABASE_SERVICE_ROLE_KEY`, `RIOT_API_KEY`, contraseñas de base de datos ni claves de proveedores de correo con prefijo `VITE_`.
5. En **Authentication > URL Configuration** configurar:
   - Site URL de desarrollo: `http://localhost:3000`
   - Site URL de producción cuando exista el dominio
   - Redirect URL de desarrollo: `http://localhost:3000/actualizar-contrasena`
   - Redirect URL de producción equivalente
6. En producción, activar confirmación por correo y configurar un proveedor SMTP propio.
7. Revisar el mínimo de contraseña y los requisitos de complejidad en Supabase Auth.

### Verificación local

Con Docker Desktop iniciado:

```bash
npm run supabase:start
npm run supabase:reset
npm run supabase:test
npm run dev
```

Si `supabase test db` presenta un error de formato de `pg_prove`, ejecutar el archivo de prueba directamente dentro del contenedor de PostgreSQL y registrar el resultado. Antes de diagnosticar un fallo de Supabase, consultar su guía actual de monitorización y depuración.

Probar manualmente estos casos:

1. Registro con correo nuevo.
2. Confirmación de correo si está activada.
3. Inicio de sesión correcto e incorrecto.
4. Cierre de sesión.
5. Recuperación de contraseña.
6. Acceso directo a `/` y `/retos/nuevo` sin sesión.
7. Acceso a esas rutas con sesión.

## Paso 2: aplicar el esquema al proyecto remoto

Antes de ejecutar cualquier cambio remoto:

1. Confirmar que el proyecto remoto correcto está vinculado con `supabase link` o revisar `supabase/.temp/linked-project.json`.
2. Obtener la contraseña de base de datos a través de un canal seguro. Nunca escribirla en un commit, documento, variable pública ni chat compartido.
3. Ejecutar primero una vista previa:

```bash
npx supabase db push --linked --dry-run
```

4. Aplicar la migración:

```bash
npx supabase db push --linked
```

5. Confirmar el historial y revisar asesores:

```bash
npx supabase migration list --linked
npx supabase db advisors --linked --type all
```

6. Generar tipos desde la base remota y versionarlos:

```bash
npx supabase gen types --linked --lang typescript --schema public > src/types/database.ts
```

La migración existente expone solamente `public`; las colas internas viven en `private` y nunca deben convertirse en una API pública.

## Paso 3: implementar la vinculación de Riot ID

Crear la primera función real del backend. No llamar a Riot API directamente desde el navegador.

### Flujo esperado

1. Crear una pantalla protegida para introducir `gameName`, `tagLine` y región.
2. Enviar los datos a un endpoint de servidor o una Edge Function autenticada.
3. El backend valida la sesión del usuario antes de procesar la solicitud.
4. El backend usa `RIOT_API_KEY`, nunca el frontend.
5. Resolver el Riot ID a PUUID con Account-V1.
6. Guardar la cuenta verificada en `public.riot_accounts` vinculada al perfil autenticado.
7. Encolar un trabajo inicial en `private.sync_jobs`.
8. Mostrar errores de entrada de forma clara, sin filtrar detalles internos de Riot ni claves.

### Seguridad

- Declarar `RIOT_API_KEY` solo en el entorno de servidor o Edge Function.
- No registrar en logs claves, PUUID completos, cabeceras `Authorization` ni respuestas completas de Riot.
- Limitar la frecuencia del endpoint de vinculación por usuario e IP.
- Validar lista blanca de rutas de plataforma y región.
- Respetar respuestas `429`, encabezados de rate limit y reintentos con espera exponencial.
- Consultar siempre la política de Riot y registrar el producto antes de exponerlo al público.

Commit sugerido:

```text
feat: vincula cuentas de riot mediante riot id
```

## Paso 4: crear el sincronizador de progreso

No sincronizar cada vez que se renderiza una pantalla. El producto debe leer snapshots de Supabase y actualizar Riot API en segundo plano.

### Responsabilidades del sincronizador

1. Tomar trabajos pendientes de `private.sync_jobs` sin procesar dos veces el mismo trabajo.
2. Consultar League-V4, Match-V5 y Champion Mastery según los objetivos activos del jugador.
3. Insertar snapshots inmutables en:
   - `public.ranked_snapshots`
   - `public.mastery_snapshots`
4. Actualizar `last_synced_at` y `sync_status` de `public.riot_accounts`.
5. Calcular progreso por reto e insertar registros en `public.challenge_progress`.
6. Crear notificaciones cuando cambie la posición de un participante.
7. Reintentar fallos transitorios con límites de intentos y tiempos de espera.

### Implementación recomendada

- Usar una Edge Function o un endpoint de servidor protegido para procesar la cola.
- Programarlo con un cron seguro y no desde el cliente.
- Usar bloqueo transaccional o `FOR UPDATE SKIP LOCKED` al reclamar trabajos.
- Mantener las operaciones pequeñas y transaccionales.
- Añadir pruebas para datos duplicados, errores 429, cuenta inexistente y reintentos agotados.

Commit sugerido:

```text
feat: sincroniza el progreso desde riot api
```

## Paso 5: sustituir los datos de demostración

Convertir cada pantalla a datos reales de forma incremental.

1. Dashboard: leer el perfil, la cuenta principal y el último snapshot competitivo.
2. Comparación: mostrar tendencias de LP usando snapshots por día, semana y mes.
3. Amistades: implementar solicitud, aceptación, rechazo y bloqueo usando `public.friendships`.
4. Retos: persistir creación, invitaciones y aceptación en `public.challenges` y `public.challenge_participants`.
5. Clasificación: leer `public.challenge_progress` y ordenar por posición.

Todas las consultas del cliente deben depender de RLS. La protección visual de rutas no sustituye las políticas de base de datos.

Commits sugeridos:

```text
feat: muestra el rendimiento desde snapshots reales
feat: gestiona amistades entre perfiles
feat: persiste retos e invitaciones
```

## Paso 6: activar notificaciones por correo

No enviar correos desde el navegador.

1. Elegir un proveedor transaccional, por ejemplo Resend.
2. Guardar la clave del proveedor solo en entorno de servidor.
3. Procesar `private.email_outbox` desde una Edge Function o worker.
4. Respetar `public.notification_preferences` antes de encolar o enviar.
5. Implementar idempotencia mediante `notifications.deduplication_key`.
6. Registrar el resultado sin guardar cuerpos sensibles de correo en logs.
7. Configurar dominio, SPF, DKIM y DMARC antes de producción.

Commit sugerido:

```text
feat: envía alertas de retos por correo
```

## Seguridad obligatoria

- RLS activado para toda tabla expuesta en `public`.
- Políticas con `TO authenticated` y predicados de propiedad usando `(select auth.uid())`.
- Ninguna clave secreta con prefijo `VITE_`.
- No usar `user_metadata` como autorización.
- Revisar cambios de RLS mediante `npx supabase db advisors --local --type all`.
- Validar entrada en cliente para experiencia y en servidor para seguridad.
- Evitar mensajes que permitan enumerar cuentas por correo.
- Para acciones sensibles, validar usuario en servidor con Supabase Auth y no confiar solo en el estado del navegador.
- Mantener dependencias actualizadas y ejecutar `npm audit --omit=dev` antes de desplegar.

## Validación de cada entrega

Antes de cada commit:

```bash
npm run lint
npm run build
git diff --check
```

Cuando haya cambios en Supabase:

```bash
npm run supabase:reset
npm run supabase:test
npx supabase db advisors --local --type all
```

Cuando cambie la interfaz:

1. Levantar `npm run dev`.
2. Abrir el flujo afectado en navegador.
3. Comprobar contenido visible, errores de consola y modo claro/oscuro.
4. Verificar vista móvil.

## Criterio para la primera versión pública

La versión pública está lista cuando un usuario puede registrarse, confirmar su correo, vincular un Riot ID, ver estadísticas reales, crear un reto privado, invitar a un amigo y recibir una alerta al ser superado. Antes de abrir el acceso público, solicitar la clave de producción de Riot y desplegar con variables secretas configuradas en el proveedor de hosting.
