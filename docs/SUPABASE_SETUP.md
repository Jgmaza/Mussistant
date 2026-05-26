# Configurar Supabase para Mussistant

El proyecto anterior (`miucczhudcskyzyrnzhr`) quedó pausado o apagado por Supabase. Mussistant solo necesita:

- **Auth**: registro e inicio de sesión con email/contraseña
- **Tabla `profiles`**: si Spotify está conectado (`spotify_connected`, `spotify_user_id`)

No guarda setlists ni playlists en la base de datos.

## ¿Proyecto nuevo o restaurar backup?

| Opción | Cuándo elegirla |
|--------|------------------|
| **Proyecto nuevo (recomendado)** | No tenías usuarios reales, o solo pruebas. Tarda ~10 minutos. |
| **Reactivar el proyecto viejo** | En el [dashboard](https://supabase.com/dashboard) aún aparece como “Paused” y Supabase te deja **Restore project**. |
| **Restaurar backup SQL** | Tenías usuarios que quieres conservar. Más laborioso; el backup debe incluir esquema `auth` + `public`. |

Para la mayoría de casos con Mussistant, **un proyecto nuevo es lo más simple**: el esquema ya está en `supabase/migrations/`.

---

## Opción A — Proyecto nuevo (recomendado)

### 1. Crear proyecto

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Elige organización, nombre (ej. `mussistant`), contraseña de BD y región.
3. Espera a que termine el aprovisionamiento.

### 2. Ejecutar el esquema

En el dashboard: **SQL Editor** → **New query** → pega y ejecuta el contenido de:

`supabase/migrations/20250918004535_57715ee9-c1b4-41da-bb00-13e4a96c35f5.sql`

Eso crea `profiles`, RLS, trigger al registrarse un usuario, etc.

Luego ejecuta también:

`supabase/migrations/20250526120000_spotify_tokens_on_profiles.sql`

(sin esto, la conexión con Spotify no se guarda al recargar la página).

### 3. Auth (URLs)

**Authentication** → **URL Configuration**:

| Campo | Valor (desarrollo) |
|-------|---------------------|
| Site URL | `http://127.0.0.1:8080` (o `http://localhost:8080`) |
| Redirect URLs | `http://127.0.0.1:8080/**` y/o `http://localhost:8080/**` |

Opcional: desactiva “Confirm email” en **Providers → Email** si quieres probar sin confirmar correo.

### 4. Variables en la app

**Project Settings** → **API**:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Reference ID** → `VITE_SUPABASE_PROJECT_ID` (opcional)

En la raíz del repo:

```bash
cp .env.example .env
# Edita .env con los valores nuevos
npm run dev
```

### 5. Probar

1. Abre http://127.0.0.1:8080 (misma URL que Spotify; ver `docs/SPOTIFY_SETUP.md`)
2. Regístrate con un email nuevo
3. En **Table Editor** → `profiles` debería aparecer una fila para tu usuario

---

## Opción B — Reactivar proyecto pausado

1. Dashboard → proyecto `miucczhudcskyzyrnzhr` (o el que tengas)
2. Si ves **Restore project** / **Unpause**, úsalo
3. Comprueba que la tabla `profiles` existe (SQL Editor o Table Editor)
4. Si las keys no cambiaron, el `.env` antiguo podría seguir sirviendo

Si el proyecto fue **eliminado** definitivamente, solo queda restaurar desde backup o crear uno nuevo.

---

## Opción C — Restaurar desde backup

1. Dashboard del proyecto (nuevo o reactivado) → **Database** → **Backups**
2. Restaura el backup que tengas, o importa un `.sql` con `psql`/CLI de Supabase
3. Verifica que existan `auth.users` y `public.profiles`
4. Actualiza `.env` con la URL y anon key del proyecto donde restauraste

**Nota:** Importar solo `public` sin `auth` deja usuarios rotos (no podrán iniciar sesión).

---

## Plan gratuito de Supabase

Los proyectos inactivos se **pausan** tras un tiempo. Para evitarlo:

- Usa el proyecto de vez en cuando, o
- Pasa a un plan de pago si necesitas uptime garantizado

---

## Siguiente mejora (opcional)

Hoy los tokens de Spotify viven solo en memoria del navegador. Si quieres que sobrevivan al recargar la página, se puede añadir una tabla `spotify_tokens` cifrada en Supabase en una migración futura.
