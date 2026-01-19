if (localStorage.getItem('logeado') !== 'true') {
  window.location.href = 'login.html';
}

const API = 'http://localhost:3000';

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
}

// ===============================
// REGISTRAR PAGO
// ===============================
async function registrarPago() {
  if (!clientePago) {
    alert('Seleccione un cliente');
    return;
  }

  const monto = document.getElementById('monto').value;
  const medio_pago = document.getElementById('medio_pago').value;

  await fetch(`${API}/pagos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cliente_id: clientePago.id,
      monto,
      medio_pago
    })
  });

  alert('Pago registrado');
  clientePago = null;
  document.getElementById('monto').value = '';
  document.getElementById('medio_pago').value = '';
  document.getElementById('buscarClientePago').value = '';
}

// ===============================
// CLIENTES MOROSOS
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
    li.textContent = `${c.nombre} - ${c.telefono}`;
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
        <td>${r.fecha.split('T')[0]}</td>
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
// RECORDATORIOS POR WHATSAPP
// ===============================
async function verRecordatorios() {
  const res = await fetch(`${API}/recordatorios`);
  const data = await res.json();

  if (data.length === 0) {
    alert('Hoy no hay recordatorios 😊');
    return;
  }

  data.forEach(c => {
    const mensaje = `Hola ${c.nombre} 👋
Te recordamos que tu pago del gimnasio vence el ${c.fecha_vencimiento}.
¡Te esperamos! 💪`;

    const telefono = c.telefono.replace(/\D/g, '');
    const url = `https://wa.me/57${3125570324}?text=${encodeURIComponent(mensaje)}`;

    window.open(url, '_blank');
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