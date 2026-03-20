import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSupabase } from '../../lib/supabase';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

const ROLES = { admin:'Administrador', gerente:'Gerente', vendedor:'Vendedor' };
const ROL_COLORS = { admin:'#f85149', gerente:'#58a6ff', vendedor:'#3fb950' };
const S = {
  page:  { minHeight:'100vh', background:'#0d1117', color:'#e6edf3', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' },
  nav:   { background:'#161b22', borderBottom:'1px solid #30363d', padding:'0 32px', display:'flex', alignItems:'center', height:56, gap:24 },
  logo:  { fontWeight:700, fontSize:16, color:'#d4a853' },
  navLink:{ fontSize:13, color:'#8b949e', cursor:'pointer', padding:'4px 8px', borderRadius:6 },
  main:  { maxWidth:960, margin:'40px auto', padding:'0 24px' },
  h1:    { fontSize:22, fontWeight:600, marginBottom:24 },
  card:  { background:'#161b22', border:'1px solid #30363d', borderRadius:12, overflow:'hidden', marginBottom:24 },
  table: { width:'100%', borderCollapse:'collapse' },
  th:    { padding:'12px 16px', textAlign:'left', fontSize:12, color:'#8b949e', borderBottom:'1px solid #30363d', background:'#0d1117' },
  td:    { padding:'12px 16px', borderBottom:'1px solid #21262d', fontSize:14 },
  chip:  (rol) => ({ display:'inline-block', padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:`${ROL_COLORS[rol]}22`, color:ROL_COLORS[rol] }),
  badge: (activo) => ({ display:'inline-block', padding:'2px 8px', borderRadius:20, fontSize:11, background: activo ? 'rgba(63,185,80,.15)' : 'rgba(139,148,158,.15)', color: activo ? '#3fb950' : '#8b949e' }),
  addCard: { background:'#161b22', border:'1px solid #30363d', borderRadius:12, padding:28, marginBottom:24 },
  formRow:{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:12, alignItems:'flex-end' },
  label: { display:'block', fontSize:12, color:'#8b949e', marginBottom:5 },
  input: { width:'100%', padding:'9px 12px', background:'#0d1117', border:'1px solid #30363d', borderRadius:7, color:'#e6edf3', fontSize:13 },
  select:{ width:'100%', padding:'9px 12px', background:'#0d1117', border:'1px solid #30363d', borderRadius:7, color:'#e6edf3', fontSize:13 },
  btn:   { padding:'9px 20px', background:'#d4a853', border:'none', borderRadius:7, color:'#0d1117', fontWeight:600, fontSize:13, cursor:'pointer' },
  err:   { padding:'10px 14px', background:'rgba(248,81,73,.12)', border:'1px solid rgba(248,81,73,.4)', borderRadius:8, color:'#f85149', fontSize:12, marginTop:12 },
  ok:    { padding:'10px 14px', background:'rgba(63,185,80,.12)', border:'1px solid rgba(63,185,80,.4)', borderRadius:8, color:'#3fb950', fontSize:12, marginTop:12 },
};

export default function Usuarios({ currentUserId }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email:'', nombre:'', rol:'vendedor', password:'' });
  const [msg, setMsg] = useState({ type:'', text:'' });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    const { data } = await getSupabase().from('profiles').select('*').order('created_at');
    if (data) setUsers(data);
  }

  async function createUser(e) {
    e.preventDefault();
    setLoading(true); setMsg({ type:'', text:'' });
    try {
      const resp = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify(form),
      });
      const d = await resp.json();
      if (!resp.ok) throw new Error(d.error);
      setMsg({ type:'ok', text: `Usuario ${form.email} creado correctamente.` });
      setForm({ email:'', nombre:'', rol:'vendedor', password:'' });
      fetchUsers();
    } catch(err) {
      setMsg({ type:'err', text: err.message });
    } finally { setLoading(false); }
  }

  async function toggleActivo(user) {
    await getSupabase().from('profiles').update({ activo: !user.activo }).eq('id', user.id);
    fetchUsers();
  }

  async function changeRol(userId, rol) {
    await getSupabase().from('profiles').update({ rol }).eq('id', userId);
    fetchUsers();
  }

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <span style={S.logo}>📦 Inventario ABC</span>
        <span style={S.navLink} onClick={() => router.push('/dashboard')}>← Dashboard</span>
        <span style={S.navLink} onClick={() => router.push('/upload')}>📤 Carga de archivos</span>
        <span style={{ marginLeft:'auto', ...S.navLink }}
          onClick={async () => { await getSupabase().auth.signOut(); router.push('/login'); }}>
          Cerrar sesión
        </span>
      </nav>
      <div style={S.main}>
        <h1 style={S.h1}>👥 Gestión de Usuarios</h1>

        {/* Crear usuario */}
        <div style={S.addCard}>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>➕ Nuevo usuario</div>
          <form onSubmit={createUser}>
            <div style={S.formRow}>
              <div>
                <label style={S.label}>Correo electrónico</label>
                <input style={S.input} type="email" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email:e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Nombre completo</label>
                <input style={S.input} type="text" required value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre:e.target.value }))} />
              </div>
              <div>
                <label style={S.label}>Rol</label>
                <select style={S.select} value={form.rol}
                  onChange={e => setForm(f => ({ ...f, rol:e.target.value }))}>
                  <option value="vendedor">Vendedor</option>
                  <option value="gerente">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div>
                <label style={S.label}>Contraseña temporal</label>
                <input style={S.input} type="password" required minLength={8} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password:e.target.value }))} />
              </div>
            </div>
            <button style={{ ...S.btn, marginTop:16, opacity: loading ? 0.6:1 }} disabled={loading}>
              {loading ? 'Creando…' : 'Crear usuario'}
            </button>
          </form>
          {msg.text && <div style={msg.type === 'ok' ? S.ok : S.err}>{msg.text}</div>}
        </div>

        {/* Tabla de usuarios */}
        <div style={S.card}>
          <table style={S.table}>
            <thead>
              <tr>
                {['Nombre','Email','Rol','Estado','Creado','Acciones'].map(h =>
                  <th key={h} style={S.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={S.td}>{u.nombre}</td>
                  <td style={{ ...S.td, color:'#8b949e', fontFamily:'monospace', fontSize:12 }}>{u.email}</td>
                  <td style={S.td}>
                    <select style={{ ...S.select, width:'auto', fontSize:12 }}
                      value={u.rol}
                      disabled={u.id === currentUserId}
                      onChange={e => changeRol(u.id, e.target.value)}>
                      {Object.entries(ROLES).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td style={S.td}><span style={S.badge(u.activo)}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                  <td style={{ ...S.td, color:'#8b949e', fontSize:12 }}>
                    {new Date(u.created_at).toLocaleDateString('es-MX')}
                  </td>
                  <td style={S.td}>
                    {u.id !== currentUserId && (
                      <button onClick={() => toggleActivo(u)}
                        style={{ padding:'4px 10px', background:'transparent', border:'1px solid #30363d',
                          borderRadius:6, color:'#8b949e', fontSize:12, cursor:'pointer' }}>
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const supabase = createServerSupabaseClient(ctx);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { redirect: { destination: '/login', permanent: false } };
  return { props: { currentUserId: session.user.id } };
}
