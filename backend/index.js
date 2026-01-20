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
       VALUES (?, ?, ?, CURDATE())`,
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
      'UPDATE clientes SET nombre = ?, telefono = ?, tipo = ? WHERE id = ?',
      [nombre, telefono, tipo, id]
    );

    res.json({ mensaje: 'Cliente actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al actualizar cliente' });
  }
});

// ===============================
// LISTAR CLIENTES (PARA SELECT)
// ===============================
app.get('/clientes', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, nombre, telefono FROM clientes ORDER BY nombre'
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener clientes' });
  }
});

// ===============================
// ELIMINAR CLIENTE
// ===============================
app.delete('/clientes/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Primero borrar pagos del cliente
    await db.query('DELETE FROM pagos WHERE cliente_id = ?', [id]);

    // Luego borrar cliente
    await db.query('DELETE FROM clientes WHERE id = ?', [id]);

    res.json({ mensaje: 'Cliente eliminado correctamente' });

  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al eliminar cliente',
      error: error.message
    });
  }
});

// ===============================
// REGISTRAR PAGO
// ===============================
app.post('/pagos', async (req, res) => {
  const { cliente_id, monto, medio_pago } = req.body;

  if (!cliente_id || !monto || !medio_pago) {
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  }

  try {
    await db.query(
  `INSERT INTO pagos (cliente_id, fecha_pago, monto, medio_pago, estado)
   VALUES (?, CURDATE(), ?, ?, 'pagado')`,
  [cliente_id, monto, medio_pago]
);

    res.json({ mensaje: 'Pago registrado correctamente 💰' });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al registrar pago' });
  }
});

// ===============================
// CLIENTES MOROSOS
// ===============================
app.get('/clientes-morosos', async (req, res) => {
  try {
    const [rows] = await db.query(`
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
      HAVING 
        ultimo_pago IS NULL
        OR DATEDIFF(CURDATE(), ultimo_pago) > 7
    `);

    res.json(rows);
  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al obtener clientes morosos',
      error: error.message
    });
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

    if (anio) {
      where.push('YEAR(p.fecha_pago) = ?');
      params.push(anio);
    }

    if (mes) {
      where.push('MONTH(p.fecha_pago) = ?');
      params.push(mes);
    }

    if (dia) {
      where.push('DATE(p.fecha_pago) = ?');
      params.push(dia);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [detalle] = await db.query(`
      SELECT 
        DATE(p.fecha_pago) AS fecha,
        c.nombre AS cliente,
        c.tipo,
        p.monto,
        p.medio_pago
      FROM pagos p
      JOIN clientes c ON p.cliente_id = c.id
      ${whereSQL}
      ORDER BY p.fecha_pago DESC
    `, params);

    const [[total]] = await db.query(`
      SELECT SUM(p.monto) AS total
      FROM pagos p
      ${whereSQL}
    `, params);

    res.json({
      detalle,
      total: total.total || 0
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
    const [[clientes]] = await db.query(
      'SELECT COUNT(*) AS total FROM clientes'
    );

    const [morosos] = await db.query(`
      SELECT c.id
      FROM clientes c
      LEFT JOIN pagos p ON c.id = p.cliente_id
      WHERE c.tipo = 'mensual'
      GROUP BY c.id
      HAVING MAX(p.fecha_pago) IS NULL
         OR DATEDIFF(CURDATE(), MAX(p.fecha_pago)) > 27
    `);

    const [[ingresosMes]] = await db.query(`
      SELECT SUM(monto) AS total
      FROM pagos
      WHERE MONTH(fecha_pago) = MONTH(CURDATE())
      AND YEAR(fecha_pago) = YEAR(CURDATE())
    `);

    const [[ingresosAnio]] = await db.query(`
      SELECT SUM(monto) AS total
      FROM pagos
      WHERE YEAR(fecha_pago) = YEAR(CURDATE())
    `);

    res.json({
      totalClientes: clientes.total,
      clientesMorosos: morosos.length,
      ingresosMes: ingresosMes.total || 0,
      ingresosAnio: ingresosAnio.total || 0
    });

  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al cargar dashboard',
      error: error.message
    });
  }
});

// ===============================
// CLIENTES PARA RECORDATORIO (3 DÍAS ANTES)
// ===============================
app.get('/recordatorios', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        c.id,
        c.nombre,
        c.telefono,
        DATE_ADD(MAX(p.fecha_pago), INTERVAL 1 MONTH) AS fecha_vencimiento,
        DATE_SUB(DATE_ADD(MAX(p.fecha_pago), INTERVAL 1 MONTH), INTERVAL 3 DAY) AS fecha_recordatorio
      FROM clientes c
      JOIN pagos p ON c.id = p.cliente_id
      WHERE c.tipo = 'mensual'
      GROUP BY c.id
      HAVING fecha_recordatorio = CURDATE()
    `);

    res.json(rows);
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
// INICIAR SERVIDOR
// ===============================
const PORT = process.env.PORT || 3000;

// ===============================
// PRUEBA CONEXIÓN MYSQL
// ===============================
app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT 1');
    res.json({ ok: true, mensaje: 'Conectado a MySQL Railway ✅' });
  } catch (error) {
    res.json({ ok: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});


