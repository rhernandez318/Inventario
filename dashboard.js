import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import DASHBOARD_BODY_HTML from '../lib/dashboardBody';

// Pages visible per role
const NAV_BY_ROLE = {
  admin:    ['resumen','clasificacion','tendencia','grupos','centros','cruce','catalogo','obsoletos','semanal','comentarios'],
  gerente:  ['resumen','clasificacion','tendencia','grupos','centros','cruce','catalogo','obsoletos','semanal','comentarios'],
  vendedor: ['catalogo','obsoletos','semanal','comentarios'],
};

const STATUS_MESSAGES = {
  loading:  'Cargando datos del inventario…',
  parsing:  'Procesando datos…',
  building: 'Construyendo dashboard…',
  ready:    '',
};

export default function Dashboard({ profile, snapshotMeta }) {
  const router = useRouter();
  const containerRef = useRef(null);
  const [status, setStatus]   = useState('loading');
  const [statusMsg, setStatusMsg] = useState(STATUS_MESSAGES.loading);
  const [error, setError]     = useState('');
  const allowedPages = NAV_BY_ROLE[profile.rol] || NAV_BY_ROLE.vendedor;

  useEffect(() => {
    if (!snapshotMeta?.url) {
      setStatus('nodata');
      return;
    }

    let styleEl;

    async function bootstrap() {
      try {
        // 1. Download snapshot JSON
        setStatusMsg('Descargando datos…');
        const resp = await fetch(snapshotMeta.url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status} al descargar snapshot`);

        setStatusMsg('Procesando datos…');
        const dashData = await resp.json();

        setStatusMsg('Construyendo interfaz…');

        // 2. Inject CSS
        styleEl = document.createElement('link');
        styleEl.rel  = 'stylesheet';
        styleEl.href = '/assets/dashboard.css';
        document.head.appendChild(styleEl);

        // 3. Inject HTML body
        if (containerRef.current) {
          containerRef.current.innerHTML = DASHBOARD_BODY_HTML;
        }

        // 4. Role-based nav: hide pages not allowed
        document.querySelectorAll('[data-page]').forEach(el => {
          if (!allowedPages.includes(el.getAttribute('data-page'))) {
            el.style.display = 'none';
          }
        });

        // 5. Add admin shortcuts to sidebar
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
          if (profile.rol === 'admin') {
            sidebar.insertAdjacentHTML('beforeend', `
              <div style="margin-top:auto;border-top:1px solid rgba(255,255,255,0.07);padding-top:10px;margin-top:8px;">
                <a href="/upload" style="text-decoration:none;">
                  <div class="nav-item" style="color:#d4a853;">📤 Cargar archivos SAP</div>
                </a>
                <a href="/admin/usuarios" style="text-decoration:none;">
                  <div class="nav-item" style="color:#8b949e;">👥 Usuarios</div>
                </a>
              </div>
            `);
          }
          // Logout
          sidebar.insertAdjacentHTML('beforeend', `
            <div id="btn-logout" class="nav-item"
              style="color:#8b949e;cursor:pointer;border-top:1px solid rgba(255,255,255,0.05);margin-top:4px;">
              ← Cerrar sesión
            </div>
          `);
          document.getElementById('btn-logout').onclick = async () => {
            const mod = await import('../lib/supabase');
            await mod.getSupabase().auth.signOut();
            router.push('/login');
          };
        }

        // 6. Metadata footer
        const procDate = new Date(snapshotMeta.processed_at).toLocaleString('es-MX', { dateStyle:'short', timeStyle:'short' });
        const totalSkus = (snapshotMeta.row_count || 0).toLocaleString('es-MX');
        const valorM = ((snapshotMeta.summary?.valor_total || 0) / 1e6).toFixed(1);
        document.body.insertAdjacentHTML('beforeend', `
          <div style="position:fixed;bottom:0;right:0;background:rgba(13,17,23,0.92);
            border-top:1px solid #30363d;border-left:1px solid #30363d;
            padding:3px 12px;font-size:11px;color:#8b949e;z-index:100;
            border-radius:6px 0 0 0;font-family:monospace;">
            Corte: ${procDate} &nbsp;·&nbsp; ${totalSkus} SKUs &nbsp;·&nbsp; $${valorM}M MXN
            &nbsp;·&nbsp; <span style="color:${profile.rol==='admin'?'#f85149':profile.rol==='gerente'?'#58a6ff':'#3fb950'}">
              ${profile.nombre} (${profile.rol})
            </span>
          </div>
        `);

        // 7. Inject data as inline script
        const dataScript = document.createElement('script');
        dataScript.textContent = [
          `const DATA        = ${JSON.stringify(dashData.DATA)};`,
          `const FILTER_DATA = ${JSON.stringify(dashData.FILTER_DATA)};`,
          `const MDATA       = { materials: ${JSON.stringify(dashData.MAT_ALL)}, grupos: ${JSON.stringify(dashData.GDATA.grupos)} };`,
          `var   GDATA       = ${JSON.stringify(dashData.GDATA)};`,
        ].join('\n');
        document.body.appendChild(dataScript);

        // 8. Load logic script
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = '/assets/dashboard-logic.js';
          s.onload = resolve;
          s.onerror = () => reject(new Error('Error cargando dashboard-logic.js'));
          document.body.appendChild(s);
        });

        // 9. Navigate to first allowed page
        const firstNavEl = document.querySelector(`[data-page="${allowedPages[0]}"]`);
        if (firstNavEl && window.showPage) {
          window.showPage(allowedPages[0], firstNavEl);
        }

        setStatus('ready');

      } catch (err) {
        console.error(err);
        setError(err.message);
        setStatus('error');
      }
    }

    bootstrap();
    return () => { if (styleEl?.parentNode) styleEl.parentNode.removeChild(styleEl); };
  }, []);

  return (
    <>
      <Head><title>Inventario ABC</title></Head>

      {/* Loading / error overlay */}
      {status !== 'ready' && (
        <div style={{
          position:'fixed', inset:0, background:'#0d1117', zIndex:9999,
          display:'flex', flexDirection:'column', alignItems:'center',
          justifyContent:'center', gap:20,
          fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}>
          {(status === 'loading') && <>
            <div style={{ width:48, height:48, border:'3px solid #30363d',
              borderTopColor:'#d4a853', borderRadius:'50%',
              animation:'spin 0.8s linear infinite' }} />
            <div style={{ color:'#e6edf3', fontSize:15 }}>{statusMsg}</div>
            {snapshotMeta?.row_count && (
              <div style={{ color:'#8b949e', fontSize:12 }}>
                {snapshotMeta.row_count.toLocaleString('es-MX')} SKUs &nbsp;·&nbsp;
                ${((snapshotMeta.summary?.valor_total||0)/1e6).toFixed(1)}M MXN
              </div>
            )}
          </>}

          {status === 'error' && <>
            <div style={{ fontSize:40 }}>⚠️</div>
            <div style={{ color:'#f85149', fontSize:15, maxWidth:400, textAlign:'center' }}>{error}</div>
            <button onClick={() => window.location.reload()} style={{
              padding:'9px 24px', background:'#d4a853', border:'none',
              borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:14 }}>
              Reintentar
            </button>
          </>}

          {status === 'nodata' && <>
            <div style={{ fontSize:48 }}>📭</div>
            <div style={{ color:'#8b949e', fontSize:15, textAlign:'center', maxWidth:360 }}>
              No hay datos disponibles. Un administrador debe cargar los archivos SAP primero.
            </div>
            {profile.rol === 'admin' && (
              <a href="/upload" style={{
                padding:'9px 24px', background:'#d4a853', border:'none',
                borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:14,
                color:'#0d1117', textDecoration:'none' }}>
                📤 Cargar archivos SAP
              </a>
            )}
          </>}
        </div>
      )}

      {/* Dashboard HTML — injected by useEffect */}
      <div ref={containerRef} />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}

export async function getServerSideProps(ctx) {
  const supabase = createServerSupabaseClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { redirect: { destination: '/login', permanent: false } };

  // Use admin client to bypass RLS in SSR context
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, email, nombre, rol, activo')
    .eq('id', session.user.id)
    .single();

  if (!profile) {
    // Profile missing — auto-create with vendedor role
    await supabaseAdmin.from('profiles').insert({
      id:     session.user.id,
      email:  session.user.email,
      nombre: session.user.email.split('@')[0],
      rol:    'vendedor',
      activo: true,
    });
    return { redirect: { destination: '/dashboard', permanent: false } };
  }

  if (!profile.activo) {
    return { redirect: { destination: '/login?error=inactivo', permanent: false } };
  }

  // Fetch snapshot metadata server-side
  let snapshotMeta = null;
  try {
    const proto = ctx.req.headers['x-forwarded-proto'] || 'http';
    const host  = ctx.req.headers.host;
    const res   = await fetch(`${proto}://${host}/api/snapshot`, {
      headers: { Cookie: ctx.req.headers.cookie || '' },
    });
    if (res.ok) snapshotMeta = await res.json();
  } catch (_) {}

  return {
    props: {
      profile: { id: profile.id, email: profile.email, nombre: profile.nombre || profile.email, rol: profile.rol },
      snapshotMeta,
    },
  };
}
