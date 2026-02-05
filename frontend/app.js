if (localStorage.getItem('logeado') !== 'true') {
  window.location.href = 'login.html';
}

const API = 'https://biggergym-1.onrender.com';

let clientesCache = [];
let clienteEditar = null;
let clientePago = null;
let contadorReporte = 0;

// ===============================
// CARGAR CLIENTES
// ===============================
async function cargarClientes() {
  const res = await fetch(`${API}/clientes`);
  clientesCache = await res.json();
}

// ===============================
// REGISTRAR CLIENTE
// ===============================
async function registrarCliente() {
  if (clienteEditar) {
    alert('Estás editando un cliente. Usa ACTUALIZAR.');
    return;
  }

  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const tipo = document.getElementById('tipo').value;

  if (!nombre || !telefono) {
    alert('Complete todos los campos');
    return;
  }

  await fetch(`${API}/clientes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, telefono, tipo })
  });

  alert('Cliente registrado');
  limpiarFormulario();
  cargarClientes();
}

// ===============================
// ACTUALIZAR CLIENTE
// ===============================
async function actualizarCliente() {
  if (!clienteEditar) {
    alert('Seleccione un cliente para editar');
    return;
  }

  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const tipo = document.getElementById('tipo').value;

  await fetch(`${API}/clientes/${clienteEditar.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, telefono, tipo })
  });

  alert('Cliente actualizado');
  limpiarFormulario();
  cargarClientes();
}

// ===============================
// ELIMINAR CLIENTE ❌
// ===============================
async function eliminarCliente(id, nombre) {
  const confirmar = confirm(`¿Eliminar definitivamente a ${nombre}?`);

  if (!confirmar) return;

  await fetch(`${API}/clientes/${id}`, {
    method: 'DELETE'
  });

  alert('Cliente eliminado');
  limpiarFormulario();
  cargarClientes();
}

// ===============================
// BUSCAR CLIENTES
// ===============================
document.getElementById('buscarClienteEditar').addEventListener('input', e => {
  mostrarLista(e.target.value, 'listaClientesEditar', true);
});

document.getElementById('buscarClientePago').addEventListener('input', e => {
  mostrarLista(e.target.value, 'listaClientesPago', false);
});

// ===============================
// MOSTRAR LISTA (CON ELIMINAR ESTÉTICO)
// ===============================
function mostrarLista(texto, listaId, permitirEliminar) {
  const lista = document.getElementById(listaId);
  lista.innerHTML = '';

  if (!texto) return;

  clientesCache
    .filter(c => c.nombre.toLowerCase().includes(texto.toLowerCase()))
    .forEach(c => {
      const li = document.createElement('li');

      // Estilo del item
      li.style.display = 'flex';
      li.style.justifyContent = 'space-between';
      li.style.alignItems = 'center';
      li.style.padding = '8px 12px';
      li.style.marginBottom = '6px';
      li.style.borderRadius = '8px';
      li.style.background = '#111';
      li.style.border = '1px solid #333';

      // Nombre cliente
      const nombre = document.createElement('span');
      nombre.textContent = c.nombre;
      nombre.style.cursor = 'pointer';
      nombre.style.color = '#FFD700';
      nombre.style.flex = '1';

      nombre.onclick = () => {
        if (listaId === 'listaClientesEditar') seleccionarClienteEditar(c);
        if (listaId === 'listaClientesPago') seleccionarClientePago(c);
      };

      li.appendChild(nombre);

      // 👉 Botón eliminar SOLO en editar
      if (permitirEliminar) {
        const btnEliminar = document.createElement('button');

        btnEliminar.innerHTML = '🗑️';
        btnEliminar.title = 'Eliminar cliente';

        btnEliminar.style.marginLeft = '10px';
        btnEliminar.style.width = '32px';
        btnEliminar.style.height = '32px';
        btnEliminar.style.borderRadius = '50%';
        btnEliminar.style.border = 'none';
        btnEliminar.style.cursor = 'pointer';
        btnEliminar.style.background = '#ff3b3b';
        btnEliminar.style.color = '#000';
        btnEliminar.style.fontSize = '14px';
        btnEliminar.style.display = 'flex';
        btnEliminar.style.alignItems = 'center';
        btnEliminar.style.justifyContent = 'center';

        // Hover
        btnEliminar.onmouseenter = () => {
          btnEliminar.style.background = '#ff0000';
        };
        btnEliminar.onmouseleave = () => {
          btnEliminar.style.background = '#ff3b3b';
        };

        btnEliminar.onclick = (e) => {
          e.stopPropagation();
          eliminarCliente(c.id, c.nombre);
        };

        li.appendChild(btnEliminar);
      }

      lista.appendChild(li);
    });
}

// ===============================
// SELECCIONAR CLIENTE EDITAR
// ===============================
function seleccionarClienteEditar(cliente) {
  clienteEditar = cliente;
  document.getElementById('nombre').value = cliente.nombre;
  document.getElementById('telefono').value = cliente.telefono;
  document.getElementById('tipo').value = cliente.tipo;
  document.getElementById('buscarClienteEditar').value = cliente.nombre;
  document.getElementById('listaClientesEditar').innerHTML = '';
}

// ===============================
// SELECCIONAR CLIENTE PAGO
// ===============================
function seleccionarClientePago(cliente) {
  clientePago = cliente;
  document.getElementById('buscarClientePago').value = cliente.nombre;
  document.getElementById('listaClientesPago').innerHTML = '';
    // 🔥 CARGAR HISTORIAL AUTOMÁTICAMENTE
  cargarHistorialPagos(cliente.id);
}

// ===============================
// REGISTRAR PAGO
// ===============================
async function registrarPago() {
  if (!clientePago) {
    alert('Seleccione un cliente');
    return;
  }

  const monto = Number(document.getElementById('monto').value);
  const medio_pago = document.getElementById('medio_pago').value;
  const dias_pagados = parseInt(
    document.getElementById('dias_pagados').value
  );

  if (!dias_pagados || dias_pagados <= 0) {
    alert('Ingrese un número válido de días pagados');
    return;
  }

  await fetch(`${API}/pagos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      cliente_id: clientePago.id,   
      monto, 
      medio_pago,
      dias_pagados
    })
  });

  alert('Pago registrado');
  clientePago = null;
  document.getElementById('monto').value = '';
  document.getElementById('medio_pago').value = '';
  document.getElementById('dias_pagados').value = '';
  document.getElementById('buscarClientePago').value = '';
}

// ===============================
// CARGAR HISTORIAL DE PAGOS
// ===============================
async function cargarHistorialPagos(clienteId) {
  const res = await fetch(`${API}/clientes/${clienteId}/pagos`);
  const data = await res.json();

  console.log('Respuesta backend:', data);

  const ul = document.getElementById('historialPagos');
  ul.innerHTML = '';

  // ✅ Si backend manda { pagos: [...] }
  const pagos = Array.isArray(data) ? data : data.pagos;

  if (!pagos || pagos.length === 0) {
    ul.innerHTML = '<li>Este cliente no tiene pagos registrados.</li>';
    return;
  }

  pagos.forEach(p => {
    const fecha = p.fecha_pago || p.fecha;
    const venc = p.fecha_vencimiento || p.vencimiento;

    const li = document.createElement('li');
    li.textContent = 
      `📅 ${formatearFecha(fecha)} | 💰 $${p.monto} | 🗓️ ${p.dias_pagados} días | ⏳ Vence: ${formatearFecha(venc)} | 💳 ${p.medio_pago}`;
    ul.appendChild(li);
  });
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  return fecha.toString().substring(0, 10);
}


// ===============================
// CLIENTES MOROSOS CON WHATSAPP
// ===============================
async function verMorosos() {
  const res = await fetch(`${API}/clientes-morosos`);
  const data = await res.json();

  const lista = document.getElementById('listaMorosos');
  lista.innerHTML = '';

  if (data.length === 0) {
    lista.innerHTML = '<li>No hay clientes morosos 🎉</li>';
    return;
  }

  data.forEach(c => {
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    li.style.gap = '8px';

    const info = document.createElement('span');
    info.textContent = `${c.nombre} - ${c.telefono}`;

    const btn = document.createElement('button');

    if (c.ya_enviado) {
      btn.textContent = 'Enviado ✅';
      btn.style.background = 'green';
      btn.style.color = 'white';
      btn.disabled = true;
      btn.classList.add('btn-small');
    } else {
      btn.textContent = 'Enviar WhatsApp';
      btn.style.background = 'red';
      btn.style.color = 'white';
      btn.classList.add('btn-small');

      btn.onclick = async () => {
        const mensaje = `Hola ${c.nombre} 👋
Te recordamos que tienes un pago pendiente del gimnasio 💪
Por favor acércate para ponerte al día.
¡Gracias!`;

        const telLimpio = c.telefono.replace(/\D/g, '');
        const url = `https://wa.me/57${telLimpio}?text=${encodeURIComponent(mensaje)}`;

        window.open(url, '_blank');

        // Guardar como enviado en backend
        await fetch(`${API}/morosos/enviado`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente_id: c.id
          })
        });

        // Cambiar botón
        btn.textContent = 'Enviado ✅';
        btn.style.background = 'green';
        btn.disabled = true;
      };
    }

    li.appendChild(info);
    li.appendChild(btn);
    lista.appendChild(li);
  });
}

// ===============================
// REPORTE DE INGRESOS
// ===============================
async function verReporte() {
  contadorReporte++;

  const dia = document.getElementById('diaFiltro').value;
  const mes = document.getElementById('mesFiltro').value;
  const anio = document.getElementById('anioFiltro').value;

  const contenedor = document.getElementById('contenedorTabla');
  const tbody = document.querySelector('#tablaReporte tbody');
  const totalDiv = document.getElementById('totalIngresos');

  if (contadorReporte % 2 === 0) {
    contenedor.style.display = 'none';
    return;
  }

  contenedor.style.display = 'block';

  let url = `${API}/reporte-ingresos?`;
  if (anio) url += `anio=${anio}&`;
  if (mes) url += `mes=${mes}&`;
  if (dia) url += `dia=${dia}&`;

  const res = await fetch(url);
  const data = await res.json();

  tbody.innerHTML = '';

  if (!data.detalle || data.detalle.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5">No hay ingresos</td></tr>`;
  } else {
    data.detalle.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${r.fecha}</td>
        <td>${r.cliente}</td>
        <td>${r.tipo}</td>
        <td>$${Number(r.monto).toLocaleString()}</td>
        <td>${r.medio_pago}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  totalDiv.textContent =
    `Total ingresos: $${Number(data.total).toLocaleString()}`;
}

// ===============================
// EXPORTAR EXCEL
// ===============================
function exportarExcel() {
  const tabla = document.getElementById('tablaReporte');
  if (tabla.rows.length <= 1) {
    alert('No hay datos para exportar');
    return;
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(tabla);
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');

  const fecha = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `reporte_ingresos_${fecha}.xlsx`);
}

// ===============================
// DASHBOARD GENERAL
// ===============================
async function cargarDashboard() {
  try {
    const res = await fetch(`${API}/dashboard`);
    const data = await res.json();

    document.getElementById('dashClientes').textContent = data.totalClientes;
    document.getElementById('dashMorosos').textContent = data.clientesMorosos;
    document.getElementById('dashIngresosMes').textContent =
      `$${Number(data.ingresosMes).toLocaleString()}`;
    document.getElementById('dashIngresosAnio').textContent =
      `$${Number(data.ingresosAnio).toLocaleString()}`;

  } catch (error) {
    console.error(error);
    alert('Error al cargar dashboard');
  }
}

// ===============================
// MOSTRAR LISTA DE RECORDATORIOS
// ===============================
async function verRecordatorios() {
  const res = await fetch(`${API}/recordatorios`);
  const data = await res.json();

  const contenedor = document.getElementById('listaRecordatorios');
  contenedor.innerHTML = '';

  if (data.length === 0) {
    contenedor.innerHTML = '<p>😊 Hoy no hay recordatorios</p>';
    return;
  }

  data.forEach(c => {
    const fechaVence = new Date(c.fecha_vencimiento)
      .toISOString()
      .split('T')[0];

    const div = document.createElement('div');
    div.style.border = '1px solid #ccc';
    div.style.padding = '8px';
    div.style.marginBottom = '6px';
    div.style.borderRadius = '6px';

    const btn = document.createElement('button');

    if (c.ya_enviado) {
      btn.textContent = 'Enviado ✅';
      btn.style.background = 'green';
      btn.style.color = 'white';
      btn.disabled = true;
    } else {
      btn.textContent = 'Enviar WhatsApp';
      btn.style.background = 'red';
      btn.style.color = 'white';

      btn.onclick = async () => {
        const mensaje = `Hola ${c.nombre} 👋
Te recordamos que tu pago del gimnasio vence el ${fechaVence}.
¡Te esperamos! 💪`;

        const telLimpio = c.telefono.replace(/\D/g, '');
        const url = `https://wa.me/57${telLimpio}?text=${encodeURIComponent(mensaje)}`;

        window.open(url, '_blank');

        // Guardar como enviado en backend
        await fetch(`${API}/recordatorios/enviado`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente_id: c.id,
            fecha_vencimiento: c.fecha_vencimiento
          })
        });

        // Cambiar botón en pantalla
        btn.textContent = 'Enviado ✅';
        btn.style.background = 'green';
        btn.disabled = true;
      };
    }

    div.innerHTML = `
      <strong>${c.nombre}</strong><br>
      📞 ${c.telefono}<br>
      ⏳ Vence: ${fechaVence}<br>
    `;

    div.appendChild(btn);
    contenedor.appendChild(div);
  });
}

// ===============================
// ENVIAR WHATSAPP INDIVIDUAL
// ===============================
async function enviarWhatsApp(id, telefono, nombre, fechaVence) {
  const mensaje = `Hola ${nombre} 👋
Te recordamos que tu pago del gimnasio vence el ${fechaVence}.
¡Te esperamos! 💪`;

  const telLimpio = telefono.replace(/\D/g, '');
  const url = `https://wa.me/57${telLimpio}?text=${encodeURIComponent(mensaje)}`;

  // Abrir WhatsApp
  window.open(url, '_blank');

  // Referencia al botón EXISTENTE
  const btn = document.getElementById(`btn-${id}`);

  // Guardar como enviado en backend
  try {
    await fetch(`${API}/recordatorios/enviado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: id,
        fecha_vencimiento: fechaVence
      })
    });

    // Cambiar botón en pantalla
    btn.textContent = 'Enviado ✅';
    btn.style.background = 'green';
    btn.disabled = true;

  } catch (error) {
    console.error('Error guardando recordatorio como enviado:', error);
    alert('Error al marcar como enviado');
  }
}

// ===============================
// VER ESTADO GENERAL DE CLIENTES
// ===============================
async function verEstadoClientes() {
  const res = await fetch(`${API}/estado-clientes`);
  const data = await res.json();

  const tbody = document.querySelector('#tablaEstadoClientes tbody');
  tbody.innerHTML = '';

  data.forEach(c => {
    const tr = document.createElement('tr');

    const ultimoPago = c.ultimo_pago
      ? new Date(c.ultimo_pago).toLocaleDateString('es-CO')
      : '';

    const fechaVence = c.fecha_vence
      ? new Date(c.fecha_vence).toLocaleDateString('es-CO')
      : '';

    let colorEstado = '#ccc';
    if (c.estado === 'Activo') colorEstado = 'lime';
    if (c.estado === 'Inactivo') colorEstado = 'red';
    if (c.estado === 'Regular') colorEstado = 'deepskyblue';

    tr.innerHTML = `
      <td>${c.nombre}</td>
      <td>${c.telefono}</td>
      <td>${c.tipo}</td>
      <td>${ultimoPago}</td>
      <td>${fechaVence}</td>
      <td style="color:${colorEstado}; font-weight:bold">
        ${c.estado}
      </td>
    `;

    tbody.appendChild(tr);
  });
}


// ===============================
// HELPERS
// ===============================
function limpiarFormulario() {
  clienteEditar = null;
  document.getElementById('nombre').value = '';
  document.getElementById('telefono').value = '';
  document.getElementById('tipo').value = 'mensual';
  document.getElementById('buscarClienteEditar').value = '';
  document.getElementById('listaClientesEditar').innerHTML = '';
}

// ===============================
// INIT
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  cargarClientes();
  cargarDashboard();
});

function cerrarSesion() {
  const confirmar = confirm('¿Deseas cerrar sesión?');

  if (!confirmar) return;

  localStorage.removeItem('logeado');
  window.location.href = 'login.html';
}