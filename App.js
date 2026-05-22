'use strict';


const SUPABASE_URL = 'https://mrnipqyklefhjvlgfvsd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ybmlwcXlrbGVmaGp2bGdmdnNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5Mjk1NDcsImV4cCI6MjA5MzUwNTU0N30.LQhvMpAXxModEz9GEauivOeL0ajk99JyN96WLkZRpUI';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let arboles = [];
let currentUser = null;

async function cargarArboles() {
  try {
    const { data, error } = await sb.from('vista_arboles_completa').select('*');
    if (error) throw error;  
    arboles = data;
    renderTrees();
  } catch (error) {
    console.error('Error al cargar árboles:', error);
    showToast('Error al conectar con la base de datos ❌', 'error');
  }
}
async function cargarUsuarios() {
  try {
    // Trae usuarios
    const { data: usuariosData, error: errorUsuarios } = await sb
      .from('usuario')
      .select('id_usuario, nombre, apellido_paterno, apellido_materno, correo, tipo');

    if (errorUsuarios) throw errorUsuarios;

    // Trae todas las asignaciones alumno_arbol con nombre del árbol
    const { data: asignaciones, error: errorAsig } = await sb
      .from('alumno_arbol')
      .select('id_usuario, numero_arbol, fecha_adopcion_inicio');

    if (errorAsig) throw errorAsig;

    // Trae nombres de árboles para mostrar
    const { data: arbolesData } = await sb
      .from('vista_arboles_completa')
      .select('id, nombre');

    const arbolMap = {};
    (arbolesData || []).forEach(a => { arbolMap[a.id] = a.nombre; });

    const asigMap = {};
    (asignaciones || []).forEach(a => { asigMap[a.id_usuario] = a; });

    usuarios = usuariosData.map(u => {
      const asig = asigMap[u.id_usuario] || null;
      return {
        id: u.id_usuario,
        nombres: u.nombre,
        ap: u.apellido_paterno,
        am: u.apellido_materno || '',
        correo: u.correo,
        rol: u.tipo.charAt(0).toUpperCase() + u.tipo.slice(1),
        arboles: asig ? 1 : 0,
        arbol_nombre: asig ? (arbolMap[asig.numero_arbol] || `#${asig.numero_arbol}`) : null,
        arbol_asignado: asig?.numero_arbol || '',
        fecha: asig?.fecha_adopcion_inicio || '—',
        color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0')
      };
    });
    renderUsers();
  } catch (error) {
    console.error('Error al cargar usuarios:', error);
    showToast('Error al obtener la lista de usuarios', 'error');
  }
}

let usuarios = []; 

const state = {
  currentScreen: 'auth',   // 'auth' | 'dashboard'
  authView: 'login',        // 'login' | 'forgot' | 'register-1' | 'register-2'
  dashView: 'trees',        // 'trees' | 'users'
  treeFilter: '',
  treeStatus: 'all',
  userFilter: '',
  userRole: 'all',
  treePage: 1,
  userPage: 1,
  perPage: 5,
  editingTree: null,
  editingUser: null,
};


function navigate(view) {
  state.authView = view;
  document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
  const el = document.getElementById('view-' + view);
  if (el) el.classList.add('active');
}

function showDashboard() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('dashboard-screen').classList.remove('hidden');
  state.currentScreen = 'dashboard';
  cargarArboles();
  showPage('trees');
}

function showPage(page) {
  state.dashView = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active','active-tree','active-users'));
  const tab = document.getElementById('tab-' + page);
  if (tab) {
    tab.classList.add('active');
    tab.classList.add(page === 'trees' ? 'active-tree' : 'active-users');
  }
  if (page === 'trees') renderTrees();
  if (page === 'users') cargarUsuarios();
}


function filteredTrees() {
  return arboles.filter(a => {
    const q = state.treeFilter.toLowerCase();
    const matchQ = !q || a.nombre.toLowerCase().includes(q) || a.cientifico.toLowerCase().includes(q) || a.ubicacion.toLowerCase().includes(q);
    const matchS = state.treeStatus === 'all' || a.estado.toLowerCase() === state.treeStatus;
    return matchQ && matchS;
  });
}

function renderTrees() {
  const list = filteredTrees();
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / state.perPage));
  state.treePage = Math.min(state.treePage, pages);
  const slice = list.slice((state.treePage-1)*state.perPage, state.treePage*state.perPage);

  const tbody = document.getElementById('tree-tbody');
  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🌱</div><p>No se encontraron árboles</p></div></td></tr>`;
  } else {
    tbody.innerHTML = slice.map(a => `
      <tr>
        <td>
          <div class="tree-cell">
            <div class="tree-thumb">${a.icono}</div>
            <div>
              <div class="tree-name">#${String(a.id).padStart(4,'0')} ${a.nombre}</div>
              <div class="tree-scientific">${a.cientifico}</div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-valor">${a.valor}</span></td>
        <td>${calcAge(a.plantacion)}</td>
        <td>${a.altura} m</td>
        <td>${a.diametro} cm</td>
        <td title="${a.ubicacion}">${a.ubicacion.length>18 ? a.ubicacion.slice(0,18)+'…' : a.ubicacion}</td>
        <td>
          <span class="badge badge-${a.estado.toLowerCase()}">
            <span class="status-dot dot-${a.estado.toLowerCase()}"></span>
            ${a.estado}
          </span>
        </td>
        <td>${a.plantacion}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn view" title="Ver" onclick="viewTree(${a.id})">👁</button>
            <button class="action-btn edit" title="Editar" onclick="openTreeModal(${a.id})">✏️</button>
            <button class="action-btn del"  title="Eliminar" onclick="deleteTree(${a.id})">🗑</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('tree-count').textContent =
    total === 0 ? 'Sin resultados' : `Mostrando ${(state.treePage-1)*state.perPage+1}–${Math.min(state.treePage*state.perPage,total)} de ${total}`;

  renderPagination('tree-pagination', state.treePage, pages, p => { state.treePage = p; renderTrees(); });
}

function calcAge(dateStr) {
  if (!dateStr) return '—';
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const parts = dateStr.split(' ');
  if (parts.length === 3) {
    const d = parseInt(parts[0]);
    const m = months.indexOf(parts[1]);
    const y = parseInt(parts[2]);
    const then = new Date(y, m, d);
    const now = new Date();
    const yrs = Math.floor((now - then) / (365.25*24*3600*1000));
    return yrs + (yrs===1?' año':' años');
  }
  return '—';
}


function filteredUsers() {
  return usuarios.filter(u => {
    const full = (u.nombres+' '+u.ap+' '+u.am+' '+u.correo).toLowerCase();
    const matchQ = !state.userFilter || full.includes(state.userFilter.toLowerCase());
    const matchR = state.userRole === 'all' || u.rol.toLowerCase() === state.userRole.toLowerCase();
    return matchQ && matchR;
  });
}

function renderUsers() {
  const list = filteredUsers();
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / state.perPage));
  state.userPage = Math.min(state.userPage, pages);
  const slice = list.slice((state.userPage-1)*state.perPage, state.userPage*state.perPage);

  const tbody = document.getElementById('user-tbody');
  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">👤</div><p>No se encontraron usuarios</p></div></td></tr>`;
  } else {
    tbody.innerHTML = slice.map(u => {
      const initials = (u.nombres[0]||'') + (u.ap[0]||'');
      const rolClass = u.rol === 'Administrador' ? 'badge-admin' : 'badge-alumno';
      return `
        <tr>
          <td>
            <div class="user-cell">
              <div class="user-initials" style="background:${u.color}">${initials}</div>
              <div>
                <div class="user-name">${u.nombres} ${u.ap} ${u.am}</div>
                <div class="user-email">${u.correo}</div>
              </div>
            </div>
          </td>
          <td><span class="badge ${rolClass}">${u.rol}</span></td>
          <td>${u.arboles > 0
            ? `<span class="badge badge-valor">🌿 ${u.arbol_nombre || u.arboles + ' árbol'}</span>`
            : `<span style="color:var(--text-muted);font-size:.82rem">Sin árbol</span>`
          }</td>
          <td>${u.fecha}</td>
          <td>
            <div class="action-btns">
              <button class="action-btn edit" title="Editar" onclick="openUserModal('${u.id}')">✏️</button>
              <button class="action-btn del"  title="Eliminar" onclick="deleteUser('${u.id}')">🗑</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  document.getElementById('user-count').textContent =
    total === 0 ? 'Sin resultados' : `Mostrando ${(state.userPage-1)*state.perPage+1}–${Math.min(state.userPage*state.perPage,total)} de ${total}`;

  renderPagination('user-pagination', state.userPage, pages, p => { state.userPage = p; renderUsers(); });
}


function renderPagination(containerId, current, total, onClick) {
  const c = document.getElementById(containerId);
  if (!c) return;
  let html = '';
  for (let i=1; i<=total; i++) {
    html += `<button class="page-btn ${i===current?'active':''}" onclick="(${onClick.toString()})(${i})">${i}</button>`;
  }
  html += `<button class="page-btn" onclick="(${onClick.toString()})(${Math.min(current+1,total)})">›</button>`;
  c.innerHTML = html;
}


function openTreeModal(id = null) {
  state.editingTree = id;
  const tree = id ? arboles.find(a => a.id === id) : null;
  const modal = document.getElementById('modal-tree');
  document.getElementById('modal-tree-title').textContent = id ? '✏️ Editar árbol' : '🌿 Agregar árbol';
  document.getElementById('tree-nombre').value    = tree?.nombre    || '';
  document.getElementById('tree-cientifico').value= tree?.cientifico|| '';
  document.getElementById('tree-valor').value     = tree?.valor     || '';
  document.getElementById('tree-estado').value    = tree?.estado    || 'Vivo';
  document.getElementById('tree-altura').value    = tree?.altura    || '';
  document.getElementById('tree-diametro').value  = tree?.diametro  || '';
  document.getElementById('tree-ubicacion').value = tree?.ubicacion  || '';

 
  let fechaInput = '';
  if (tree?.plantacion) {
    const parts = tree.plantacion.split(' ');
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    const m = String(months.indexOf(parts[1]) + 1).padStart(2, '0');
    fechaInput = `${parts[2]}-${m}-${String(parts[0]).padStart(2, '0')}`;
  }
  document.getElementById('tree-plantacion').value = fechaInput;
  document.getElementById('tree-especie').value = tree?.especie_id || '';
  // -------------------------------------

  modal.classList.add('show');
}

function closeTreeModal() { document.getElementById('modal-tree').classList.remove('show'); }

async function saveTree() {
  
  const especie_id = parseInt(document.getElementById('tree-especie').value) || 1;
  const valor      = document.getElementById('tree-valor').value.trim();
  const estado     = document.getElementById('tree-estado').value.toLowerCase();
  const altura     = parseFloat(document.getElementById('tree-altura').value) || 0;
  const diametro   = parseFloat(document.getElementById('tree-diametro').value) || 0;
  const ubicacion  = document.getElementById('tree-ubicacion').value.trim();
  
  const rawDate    = document.getElementById('tree-plantacion').value; 
  const fecha_plantacion = rawDate || new Date().toISOString().split('T')[0];

  try {
    const { error } = await sb.rpc('agregar_arbol', {
      p_especie_id: especie_id,
      p_valor: valor,
      p_estado: estado,
      p_altura: altura,
      p_diametro: diametro,
      p_ubicacion: ubicacion,
      p_fecha_plantacion: fecha_plantacion
    });

    if (error) throw error;

    showToast('Árbol agregado a la base de datos 🌱');
    closeTreeModal();
    
    cargarArboles(); 
    
  } catch(err) {
    console.error('Error al guardar árbol:', err);
    showToast('Hubo un error al guardar el árbol', 'error');
  }
}

let currentTreeId = null;

function viewTree(id) {
  const a = arboles.find(t => t.id === id);
  if (!a) return;
  currentTreeId = id;

  document.getElementById('detail-nombre').textContent = `${a.icono} #${String(a.id).padStart(4,'0')} ${a.nombre}`;
  document.getElementById('detail-cientifico').textContent = a.cientifico;
  document.getElementById('detail-valor').textContent    = a.valor;
  document.getElementById('detail-estado').textContent   = a.estado;
  document.getElementById('detail-plantacion').textContent = a.plantacion;
  document.getElementById('detail-ubicacion').textContent = a.ubicacion;

  // Ocultar form de nueva medición
  document.getElementById('form-medicion').classList.add('hidden');

  document.getElementById('modal-detail').classList.add('show');
  cargarMediciones(id);
}

function closeDetailModal() {
  document.getElementById('modal-detail').classList.remove('show');
  currentTreeId = null;
}

// ─── MEDICIONES ────────────────────────────────────────────────────────────────

async function cargarMediciones(arbolId) {
  const tbody = document.getElementById('medicion-tbody');
  tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:var(--text-muted)">Cargando...</td></tr>`;
  try {
    const { data, error } = await sb
      .from('medicion_arbol')
      .select('*')
      .eq('numero_arbol', arbolId)
      .order('fecha_medicion', { ascending: false });

    if (error) throw error;

    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state" style="padding:24px 0"><div class="empty-icon" style="font-size:1.8rem">📏</div><p>Sin mediciones registradas</p></div></td></tr>`;
    } else {
      tbody.innerHTML = data.map(m => `
        <tr>
          <td><strong>${m.fecha_medicion}</strong></td>
          <td>${m.altura} m</td>
          <td>${m.diametro} cm</td>
          <td>${m.observaciones || '—'}</td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Error al cargar mediciones:', err);
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--danger);padding:16px">Error al cargar mediciones</td></tr>`;
  }
}

function toggleFormMedicion() {
  document.getElementById('form-medicion').classList.toggle('hidden');
  // Poner fecha de hoy por defecto
  const fechaInput = document.getElementById('med-fecha');
  if (!fechaInput.value) {
    fechaInput.value = new Date().toISOString().split('T')[0];
  }
}

async function guardarMedicion() {
  const altura       = parseFloat(document.getElementById('med-altura').value);
  const diametro     = parseFloat(document.getElementById('med-diametro').value);
  const fecha        = document.getElementById('med-fecha').value;
  const observaciones= document.getElementById('med-observaciones').value.trim();

  if (!altura || !diametro || !fecha) {
    showToast('Completa altura, diámetro y fecha', 'error');
    return;
  }
  if (!currentTreeId) return;

  try {
    const { error } = await sb.from('medicion_arbol').insert({
      numero_arbol: currentTreeId,
      altura,
      diametro,
      fecha_medicion: fecha,
      observaciones: observaciones || null
    });

    if (error) throw error;

    // Limpiar form
    document.getElementById('med-altura').value = '';
    document.getElementById('med-diametro').value = '';
    document.getElementById('med-fecha').value = '';
    document.getElementById('med-observaciones').value = '';
    document.getElementById('form-medicion').classList.add('hidden');

    showToast('Medición registrada ✅');
    cargarMediciones(currentTreeId);

  } catch (err) {
    console.error('Error al guardar medición:', err);
    showToast('No se pudo guardar la medición', 'error');
  }
}

// ─── FIN MEDICIONES ─────────────────────────────────────────────────────────

async function deleteTree(id) {
  
  if (!confirm('¿Estás seguro de que deseas eliminar este árbol de la base de datos?')) return;

  try {
    const { error } = await sb
      .from('arbol')
      .delete()
      .eq('numero_arbol', id);

    if (error) throw error;
    showToast('Árbol eliminado correctamente 🗑️');
    cargarArboles(); 

  } catch (err) {
    console.error('Error al eliminar:', err);
    showToast('No se pudo eliminar el árbol de la base de datos', 'error');
  }
}


function openUserModal(id = null) {
  state.editingUser = id;
  const u = id ? usuarios.find(u => u.id === id) : null;
  document.getElementById('modal-user-title').textContent = id ? '✏️ Editar usuario' : '👤 Agregar usuario';
  document.getElementById('user-nombres').value  = u?.nombres || '';
  document.getElementById('user-ap').value       = u?.ap      || '';
  document.getElementById('user-am').value       = u?.am      || '';
  document.getElementById('user-correo').value   = u?.correo  || '';
  document.getElementById('user-rol').value      = u?.rol     || 'Alumno';
  document.getElementById('user-password').value = '';

  // Mostrar/ocultar sección asignación según rol
  const rol = u?.rol || 'Alumno';
  toggleAsignacionSection(rol);

  // Cargar árboles disponibles en el selector
  cargarArbolesParaAsignar(u?.arbol_asignado || '');

  document.getElementById('modal-user').classList.add('show');

  // Listener para mostrar/ocultar asignación al cambiar rol
  document.getElementById('user-rol').onchange = (e) => toggleAsignacionSection(e.target.value);
}
function closeUserModal() { document.getElementById('modal-user').classList.remove('show'); }

// ─── ASIGNACIÓN DE ÁRBOL ───────────────────────────────────────────────────────

function toggleAsignacionSection(rol) {
  const section = document.getElementById('asignacion-section');
  if (rol === 'Alumno' || rol === 'alumno') {
    section.style.display = 'block';
  } else {
    section.style.display = 'none';
  }
}

async function cargarArbolesParaAsignar(arbolSeleccionado = '') {
  const select = document.getElementById('user-arbol');
  select.innerHTML = '<option value="">— Sin árbol asignado —</option>';
  try {
    const { data, error } = await sb
      .from('vista_arboles_completa')
      .select('id, nombre, cientifico')
      .eq('estado', 'Vivo');

    if (error) throw error;

    data.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `#${String(a.id).padStart(4,'0')} ${a.nombre} (${a.cientifico})`;
      if (String(a.id) === String(arbolSeleccionado)) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Error al cargar árboles para asignar:', err);
  }
}

async function saveUser() {
  const nombres = document.getElementById('user-nombres').value.trim();
  const ap      = document.getElementById('user-ap').value.trim();
  const am      = document.getElementById('user-am').value.trim();
  const correo  = document.getElementById('user-correo').value.trim();
  const rol     = document.getElementById('user-rol').value;
  const pwd     = document.getElementById('user-password').value;
  const arbolId = document.getElementById('user-arbol').value;

  if (!nombres || !ap || !correo) { showToast('Completa los campos obligatorios', 'error'); return; }

  const colors = ['#4caf50','#2196f3','#ff9800','#9c27b0','#00bcd4','#607d8b','#f44336','#795548'];
  const randomColor = colors[Math.floor(Math.random()*colors.length)];
  const today = new Date();
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const fecha = `${String(today.getDate()).padStart(2,'0')} ${months[today.getMonth()]} ${today.getFullYear()}`;

  if (state.editingUser) {
    // Editar usuario existente
    const idx = usuarios.findIndex(u => u.id === state.editingUser);
    if (idx >= 0) {
      usuarios[idx] = { ...usuarios[idx], nombres, ap, am, correo, rol, arbol_asignado: arbolId || '' };

      // Guardar asignación en Supabase si es alumno
      if (rol === 'Alumno' && arbolId) {
        await guardarAsignacion(state.editingUser, arbolId);
      } else if (rol === 'Alumno' && !arbolId) {
        await eliminarAsignacion(state.editingUser);
      }

      showToast('Usuario actualizado ✅');
    }
  } else {
    // Nuevo usuario
    try {
      const { data, error } = await sb.rpc('agregar_usuario_sistema', {
        p_nombres: nombres,
        p_ap_paterno: ap,
        p_ap_materno: am || '',
        p_correo: correo,
        p_password: pwd || 'temporal123',
        p_rol: rol.toLowerCase()
      });

      if (error) {
        if (error.code === '23505') {
          showToast('Este correo ya está registrado', 'error');
        } else {
          throw error;
        }
        return;
      }

      // Recargar usuarios para obtener el id real
      await cargarUsuarios();

      // Si es alumno y tiene árbol asignado, buscar el id del usuario recién creado
      if (rol === 'Alumno' && arbolId) {
        const { data: nuevoUser } = await sb
          .from('usuario')
          .select('id_usuario')
          .eq('correo', correo)
          .single();

        if (nuevoUser) {
          await guardarAsignacion(nuevoUser.id_usuario, arbolId);
        }
      }

      showToast('Usuario creado correctamente ✅');
      closeUserModal();
      return;

    } catch (err) {
      console.error('Error al guardar usuario:', err);
      showToast('Error al guardar el usuario', 'error');
      return;
    }
  }

  closeUserModal();
  renderUsers();
}

async function guardarAsignacion(usuarioId, arbolId) {
  try {
    // Eliminar asignación anterior si existe
    await sb.from('alumno_arbol').delete().eq('id_usuario', usuarioId);

    // Insertar nueva asignación
    const { error } = await sb.from('alumno_arbol').insert({
      id_usuario: usuarioId,
      numero_arbol: parseInt(arbolId),
      fecha_adopcion_inicio: new Date().toISOString().split('T')[0]
    });

    if (error) throw error;
  } catch (err) {
    console.error('Error al guardar asignación:', err);
    showToast('No se pudo guardar la asignación del árbol', 'error');
  }
}

async function eliminarAsignacion(usuarioId) {
  try {
    await sb.from('alumno_arbol').delete().eq('id_usuario', usuarioId);
  } catch (err) {
    console.error('Error al eliminar asignación:', err);
  }
}

// ─── FIN ASIGNACIÓN ───────────────────────────────────────────────────────────

function deleteUser(id) {
  if (!confirm('¿Eliminar este usuario?')) return;
  usuarios = usuarios.filter(u => u.id !== id);
  showToast('Usuario eliminado');
  renderUsers();
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pwd   = document.getElementById('login-pwd').value;
  
  if (!email || !pwd) { showToast('Ingresa correo y contraseña', 'error'); return; }

  try {
    const { data, error } = await sb.from('usuario')
      .select('nombre, apellido_paterno, correo, tipo')
      .eq('correo', email)
      .eq('contrasena', pwd);

    if (error) throw error;

    if (data.length === 0) {
      showToast('Correo o contraseña incorrectos', 'error');
      return;
    }

    currentUser = data[0];
    const iniciales = (currentUser.nombre[0] + currentUser.apellido_paterno[0]).toUpperCase();
    const nombreCompleto = `${currentUser.nombre} ${currentUser.apellido_paterno}`;

    document.getElementById('nav-avatar').textContent = iniciales;
    document.getElementById('nav-name').textContent = currentUser.nombre;

    document.getElementById('profile-avatar').textContent = iniciales;
    document.getElementById('profile-name').textContent = nombreCompleto;
    document.getElementById('profile-email').textContent = currentUser.correo;
    document.getElementById('profile-role').textContent = currentUser.tipo === 'administrador' ? 'Administrador' : 'Alumno';

    showToast(`Bienvenido, ${currentUser.nombre} 🌿`);
    setTimeout(showDashboard, 600);

  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    showToast('Error de conexión con la base de datos', 'error');
  }
}

function handleForgot() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) { showToast('Ingresa tu correo', 'error'); return; }
  showToast('Enlace de recuperación enviado 📧');
  setTimeout(() => navigate('login'), 1500);
}

function handleRegister1() {
  const n  = document.getElementById('reg-nombres').value.trim();
  const ap = document.getElementById('reg-ap').value.trim();
  const em = document.getElementById('reg-email').value.trim();
  if (!n || !ap || !em) { showToast('Completa todos los campos', 'error'); return; }
  navigate('register-2');
}

async function handleRegister2() {
  const n    = document.getElementById('reg-nombres').value.trim();
  const ap   = document.getElementById('reg-ap').value.trim();
  const am   = document.getElementById('reg-am').value.trim();
  const em   = document.getElementById('reg-email').value.trim();
  const pwd  = document.getElementById('reg-pwd').value;
  const pwd2 = document.getElementById('reg-pwd2').value;
  const chk  = document.getElementById('reg-terms').checked;

  if (!pwd || pwd.length < 8) { showToast('La contraseña debe tener al menos 8 caracteres', 'error'); return; }
  if (pwd !== pwd2) { showToast('Las contraseñas no coinciden', 'error'); return; }
  if (!chk) { showToast('Acepta los términos de uso', 'error'); return; }

  try {
    const { error } = await sb.rpc('agregar_usuario_sistema', {
      p_nombres: n,
      p_ap_paterno: ap,
      p_ap_materno: am || '',
      p_correo: em,
      p_password: pwd,
      p_rol: 'administrador' 
    });

    if (error) {
      if (error.code === '23505') {
        showToast('Este correo ya está registrado', 'error');
      } else {
        throw error;
      }
      return;
    }
    showToast('Cuenta creada con éxito. ¡Inicia sesión! 🌱');
    setTimeout(() => navigate('login'), 1500);
  } catch (err) {
    console.error('Error al registrar:', err);
    showToast('Hubo un error al registrar el usuario', 'error');
  }
}

function checkStrength(val) {
  const bars = document.querySelectorAll('.pwd-strength-bar');
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const colors = ['#e0e0e0','#f44336','#ff9800','#ffc107','#4caf50'];
  bars.forEach((b,i) => { b.style.background = i < score ? colors[score] : '#e0e0e0'; });
}

function togglePwd(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

function toggleUserMenu() {
  document.querySelector('.user-dropdown').classList.toggle('show');
}
document.addEventListener('click', e => {
  if (!e.target.closest('.user-chip')) {
    document.querySelector('.user-dropdown')?.classList.remove('show');
  }
});

function logout() {
  document.getElementById('dashboard-screen').classList.add('hidden');
  document.getElementById('auth-screen').classList.remove('hidden');
  navigate('login');
  showToast('Sesión cerrada 👋');
}

function showToast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast' + (type==='error' ? ' error' : '');
  t.innerHTML = `<span>${type==='error'?'❌':'✅'}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

function openProfileModal() {
  document.querySelector('.user-dropdown').classList.remove('show'); 
  document.getElementById('modal-profile').classList.add('show');
}

function closeProfileModal() {
  document.getElementById('modal-profile').classList.remove('show');
}

function openSettingsModal() {
  document.querySelector('.user-dropdown').classList.remove('show'); 
  document.getElementById('modal-settings').classList.add('show');
}

function closeSettingsModal() {
  document.getElementById('modal-settings').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', () => {
  navigate('login');
  document.getElementById('tree-search')?.addEventListener('input', e => {
    state.treeFilter = e.target.value;
    state.treePage = 1;
    renderTrees();
  });

  document.getElementById('tree-status-filter')?.addEventListener('change', e => {
    state.treeStatus = e.target.value;
    state.treePage = 1;
    renderTrees();
  });

  document.getElementById('user-search')?.addEventListener('input', e => {
    state.userFilter = e.target.value;
    state.userPage = 1;
    renderUsers();
  });

  document.getElementById('user-role-filter')?.addEventListener('change', e => {
    state.userRole = e.target.value;
    state.userPage = 1;
    renderUsers();
  });
  
  document.getElementById('reg-pwd')?.addEventListener('input', e => checkStrength(e.target.value));
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => { if (e.target === o) o.classList.remove('show'); });
  });
});