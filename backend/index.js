require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// ===============================
// RUTA PRINCIPAL → LOGIN
// ===============================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// ===============================
// SERVIR ARCHIVOS ESTÁTICOS
// (CSS, JS, IMÁGENES, index.html)
// ===============================
app.use(express.static(path.join(__dirname, '../frontend')));

// ===============================
// REGISTRAR CLIENTE
// ===============================
app.post('/clientes', async (req, res) => {
  const { nombre, telefono, tipo } = req.body;

  if (!nombre || !telefono || !tipo) {
    return res.status(400).json({
      mensaje: 'Nombre, teléfono y tipo son obligatorios'
    });
  }

  try {
   await db.query(
  `INSERT INTO clientes (nombre, telefono, tipo, fecha_inscripcion)
   VALUES ($1, $2, $3, CURRENT_DATE)`,
  [nombre, telefono, tipo]
);

    res.json({ mensaje: 'Cliente registrado correctamente' });
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al registrar cliente',
      error: error.message
    });
  }
});

// ===============================
// ACTUALIZAR CLIENTE
// ===============================
app.put('/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, tipo } = req.body;

  try {
    await db.query(
      'UPDATE clientes SET nombre = $1, telefono = $2, tipo = $3 WHERE id = $4',
      [nombre, telefono, tipo, id]
    );

    res.json({ mensaje: 'Cliente actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
});

// ===============================
// LISTAR CLIENTES (PARA SELECT)
// ===============================
app.get('/clientes', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nombre, telefono FROM clientes ORDER BY nombre'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
});

// ===============================
// ELIMINAR CLIENTE
// ===============================
app.delete('/clientes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM pagos WHERE cliente_id = $1', [id]);
    await db.query('DELETE FROM clientes WHERE id = $1', [id]);

    res.json({ mensaje: 'Cliente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
});

// ===============================
// REGISTRAR PAGO
// ===============================
app.post('/pagos', async (req, res) => {
  const { cliente_id, monto, medio_pago } = req.body;

  try {
    await db.query(
      `INSERT INTO pagos (cliente_id, fecha_pago, monto, medio_pago, estado)
       VALUES ($1, CURRENT_DATE, $2, $3, 'pagado')`,
      [cliente_id, monto, medio_pago]
    );

    res.json({ mensaje: 'Pago registrado correctamente 💰' });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
});

// ===============================
// CLIENTES MOROSOS
// ===============================
app.get('/clientes-morosos', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        c.id,
        c.nombre,
        c.telefono,
        c.tipo,
        MAX(p.fecha_pago) AS ultimo_pago
      FROM clientes c
      LEFT JOIN pagos p ON c.id = p.cliente_id
      WHERE c.tipo = 'mensual'
      GROUP BY c.id
      HAVING MAX(p.fecha_pago) IS NULL
         OR CURRENT_DATE - MAX(p.fecha_pago) > 7
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
});

// ===============================
// REPORTE DE INGRESOS CON FILTRO AVANZADO
// ===============================
app.get('/reporte-ingresos', async (req, res) => {
  try {
    const { dia, mes, anio } = req.query;

    let where = [];
    let params = [];
    let i = 1;

    if (anio) {
      where.push(`EXTRACT(YEAR FROM p.fecha_pago) = $${i++}`);
      params.push(anio);
    }

    if (mes) {
      where.push(`EXTRACT(MONTH FROM p.fecha_pago) = $${i++}`);
      params.push(mes);
    }

    if (dia) {
      where.push(`p.fecha_pago::date = $${i++}`);
      params.push(dia);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const detalle = await db.query(`
      SELECT 
        p.fecha_pago::date AS fecha,
        c.nombre AS cliente,
        c.tipo,
        p.monto,
        p.medio_pago
      FROM pagos p
      JOIN clientes c ON p.cliente_id = c.id
      ${whereSQL}
      ORDER BY p.fecha_pago DESC
    `, params);

    const total = await db.query(`
      SELECT SUM(p.monto) AS total
      FROM pagos p
      ${whereSQL}
    `, params);

    res.json({
      detalle: detalle.rows,
      total: total.rows[0].total || 0
    });

  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al generar reporte',
      error: error.message
    });
  }
});

// ===============================
// DASHBOARD GENERAL
// ===============================
app.get('/dashboard', async (req, res) => {
  try {
    const clientes = await db.query('SELECT COUNT(*) FROM clientes');
    const morosos = await db.query(`
      SELECT c.id
      FROM clientes c
      LEFT JOIN pagos p ON c.id = p.cliente_id
      WHERE c.tipo = 'mensual'
      GROUP BY c.id
      HAVING MAX(p.fecha_pago) IS NULL
         OR CURRENT_DATE - MAX(p.fecha_pago) > 27
    `);

    const ingresosMes = await db.query(`
      SELECT SUM(monto) FROM pagos
      WHERE date_trunc('month', fecha_pago) = date_trunc('month', CURRENT_DATE)
    `);

    const ingresosAnio = await db.query(`
      SELECT SUM(monto) FROM pagos
      WHERE date_trunc('year', fecha_pago) = date_trunc('year', CURRENT_DATE)
    `);

    res.json({
      totalClientes: clientes.rows[0].count,
      clientesMorosos: morosos.rows.length,
      ingresosMes: ingresosMes.rows[0].sum || 0,
      ingresosAnio: ingresosAnio.rows[0].sum || 0
    });
  } catch (error) {
    res.status(500).json({ mensaje: error.message });
  }
});

// ===============================
// CLIENTES PARA RECORDATORIO (3 DÍAS ANTES)
// ===============================
app.get('/recordatorios', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        c.id,
        c.nombre,
        c.telefono,
        MAX(p.fecha_pago) + INTERVAL '1 month' AS fecha_vencimiento,
        (MAX(p.fecha_pago) + INTERVAL '1 month') - INTERVAL '3 days' AS fecha_recordatorio
      FROM clientes c
      JOIN pagos p ON c.id = p.cliente_id
      WHERE c.tipo = 'mensual'
      GROUP BY c.id
      HAVING (MAX(p.fecha_pago) + INTERVAL '1 month') - INTERVAL '3 days' = CURRENT_DATE
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al obtener recordatorios',
      error: error.message
    });
  }
});

// ===============================
// LOGIN SIMPLE (TEMPORAL)
// ===============================
app.post('/login', (req, res) => {
  const { usuario, password } = req.body;

  if (usuario === 'Bigger' && password === 'H3125') {
    res.json({ ok: true });
  } else {
    res.status(401).json({
      ok: false,
      mensaje: 'Usuario o contraseña incorrectos'
    });
  }
});

// ===============================
// FIN DE RUTAS
// ===============================

// ===============================
// PRUEBA CONEXIÓN
// ===============================
app.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      ok: true,
      fecha: result.rows[0].now
    });
  } catch (error) {
    res.json({
      ok: false,
      error: error.message
    });
  }
});

// ===============================
// INICIAR SERVIDOR
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});





