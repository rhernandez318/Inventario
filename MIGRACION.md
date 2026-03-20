# Migración a nuevo proyecto Supabase

## Paso 1 — Crear proyecto nuevo
1. Ve a https://supabase.com/dashboard → "New project"
2. Nombre: `Inventario` (o el que prefieras)
3. Región: **us-west-2** o la más cercana
4. Contraseña de DB: guárdala, la necesitarás

## Paso 2 — Ejecutar el schema
1. En el proyecto nuevo → **SQL Editor** → **New query**
2. Pega todo el contenido de `supabase_schema.sql`
3. Haz clic en **Run**

## Paso 3 — Obtener las nuevas credenciales
1. **Settings → API**
2. Copia:
   - **Project URL** → reemplaza `SUPA_URL` en los archivos
   - **anon / public key** → reemplaza `SUPA_KEY` en los archivos

## Paso 4 — Actualizar los archivos HTML
Busca y reemplaza en los 4 archivos (`dashboard.html`, `login.html`, `upload.html`, `reset.html`):

```
BUSCAR:   https://xfikamnsweunfzkvmjqa.supabase.co
REEMPLAZAR: https://TU-NUEVO-PROYECTO.supabase.co

BUSCAR:   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmaWthbW5zd2V1bmZ6a3ZtanFhIiwicm9sZSI6ImFub24i...
REEMPLAZAR: TU-NUEVA-ANON-KEY
```

## Paso 5 — Crear Edge Function (para crear usuarios)
1. **Edge Functions** → **New function** → nombre: `create-user`
2. Pega el contenido de `create-user-function.ts`
3. En **Secrets** agrega: `SERVICE_ROLE_KEY` = tu service_role key (Settings → API)

## Paso 6 — Configurar Auth
1. **Authentication → URL Configuration**:
   - Site URL: `https://rhernandez318.github.io/Inventario`
   - Redirect URLs: `https://rhernandez318.github.io/Inventario/reset.html`
2. **Authentication → Email Templates** → ajusta si quieres

## Paso 7 — Subir archivos al Codespace y hacer push
```bash
cd /workspaces/Inventario
rm dashboard.html login.html upload.html reset.html
unzip 'gh-pages-inventario.zip' -d .
rm 'gh-pages-inventario.zip'
git add .
git commit -m "Migrate to new Supabase project"
git push origin main
```

## Paso 8 — Crear primer usuario admin
1. **Authentication → Users** → **Invite user** (pon tu email)
2. Acepta la invitación → entra al dashboard
3. En **SQL Editor** ejecuta:
```sql
UPDATE public.profiles SET rol = 'admin', activo = true WHERE email = 'TU-EMAIL';
```

## Paso 9 — Subir archivos SAP
- Ve a `upload.html` y carga los archivos SAP normalmente
