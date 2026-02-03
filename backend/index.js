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
   VALUES ($1, $2, $3, CURRENT_DATE::date)`,
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
  const { cliente_id, monto, medio_pago, dias_pagados } = req.body;

  try {
    await db.query(`
  INSERT INTO pagos (cliente_id, fecha_pago, monto, medio_pago, dias_pagados)
  VALUES (
    $1, 
    (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date, 
    $2, 
    $3, 
    $4
  )
`, [cliente_id, monto, medio_pago, dias_pagados]);

    res.json({ mensaje: 'Pago registrado con vencimiento automático ✅' });

  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al registrar pago',
      error: error.message
    });
  }
});

// ===============================
// CLIENTES PARA RECORDATORIO (HOY)
// ===============================
app.get('/recordatorios', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        c.id,
        c.nombre,
        c.telefono,
        c.tipo,
        p.fecha_pago,
        p.dias_pagados,
        (p.fecha_pago::date + (p.dias_pagados || ' days')::interval)::date AS fecha_vencimiento,
        CASE 
          WHEN re.id IS NOT NULL THEN true
          ELSE false
        END AS ya_enviado
      FROM clientes c
      JOIN pagos p ON c.id = p.cliente_id
      LEFT JOIN recordatorios_enviados re 
        ON re.cliente_id = c.id
        AND re.fecha_vencimiento = 
          (p.fecha_pago::date + (p.dias_pagados || ' days')::interval)::date
      WHERE 
        (p.fecha_pago::date + (p.dias_pagados || ' days')::interval)::date = CURRENT_DATE
      ORDER BY c.nombre
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
// MARCAR RECORDATORIO COMO ENVIADO
// ===============================
app.post('/recordatorios/enviado', async (req, res) => {
  const { cliente_id, fecha_vencimiento } = req.body;

  try {
    await db.query(`
      INSERT INTO recordatorios_enviados (cliente_id, fecha_vencimiento, enviado)
      VALUES ($1, $2, true)
      ON CONFLICT DO NOTHING
    `, [cliente_id, fecha_vencimiento]);

    res.json({ mensaje: 'Recordatorio marcado como enviado ✅' });

  } catch (error) {
    console.error('Error marcar enviado:', error);
    res.status(500).json({
      mensaje: 'Error al marcar recordatorio como enviado',
      error: error.message
    });
  }
});

// ===============================
// HISTORIAL DE PAGOS POR CLIENTE
// ===============================
app.get('/clientes/:id/pagos', async (req, res) => {
  const clienteId = req.params.id;

  try {
    const result = await db.query(`
      SELECT 
        fecha_pago,
        monto,
        dias_pagados,
        medio_pago,
        (fecha_pago + dias_pagados) AS vencimiento
      FROM pagos
      WHERE cliente_id = $1
      ORDER BY fecha_pago DESC
    `, [clienteId]);   

    res.json(result.rows);

  } catch (error) {
    console.error('Error historial pagos:', error);
    res.status(500).json({
      mensaje: 'Error al obtener historial de pagos',
      error: error.message
    });
  }
});

// ===============================
// CLIENTES MOROSOS (MISMA LOGICA DASHBOARD)
// ===============================
app.get('/clientes-morosos', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        c.id,
        c.nombre,
        c.telefono,
        c.tipo,
        MAX(p.fecha_pago) AS ultimo_pago,
        CASE 
          WHEN me.id IS NOT NULL THEN true
          ELSE false
        END AS ya_enviado
      FROM clientes c
      LEFT JOIN pagos p ON c.id = p.cliente_id
      LEFT JOIN morosos_enviados me 
        ON me.cliente_id = c.id
        AND me.fecha_envio = CURRENT_DATE
      WHERE c.tipo = 'mensual'
      GROUP BY c.id, me.id
      HAVING 
        MAX(p.fecha_pago) IS NULL
        OR CURRENT_DATE > MAX(p.fecha_pago) + INTERVAL '30 days'
      ORDER BY c.nombre
    `);

    res.json(result.rows);

  } catch (error) {
    console.error('Error clientes morosos:', error);
    res.status(500).json({ mensaje: error.message });
  }
});


// ===============================
// MARCAR MOROSO COMO NOTIFICADO
// ===============================
app.post('/morosos/enviado', async (req, res) => {
  const { cliente_id } = req.body;

  try {
    await db.query(`
      INSERT INTO morosos_enviados (cliente_id, enviado)
      VALUES ($1, true)
      ON CONFLICT DO NOTHING
    `, [cliente_id]);

    res.json({ mensaje: 'Moroso marcado como notificado ✅' });

  } catch (error) {
    console.error('Error moroso enviado:', error);
    res.status(500).json({
      mensaje: 'Error al marcar moroso como enviado',
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
      params.push(anio);
      where.push(`EXTRACT(YEAR FROM p.fecha_pago::date) = $${params.length}`);
    }

    if (mes) {
      params.push(mes);
      where.push(`EXTRACT(MONTH FROM p.fecha_pago::date) = $${params.length}`);
    }

    if (dia) {
      params.push(dia);
      where.push(`EXTRACT(DAY FROM p.fecha_pago::date) = $${params.length}`);
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
    console.error('Error reporte:', error);
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
    const clientesResult = await db.query(
      'SELECT COUNT(*) AS total FROM clientes'
    );

    // MOROSOS BASADOS EN VENCIMIENTO REAL
    const morososResult = await db.query(`
      SELECT c.id
      FROM clientes c
      LEFT JOIN pagos p ON c.id = p.cliente_id
      GROUP BY c.id
      HAVING 
        MAX(
          (p.fecha_pago::date + (p.dias_pagados || ' days')::interval)::date
        ) IS NULL
        OR MAX(
          (p.fecha_pago::date + (p.dias_pagados || ' days')::interval)::date
        ) < CURRENT_DATE
    `);

    const ingresosMesResult = await db.query(`
      SELECT SUM(monto) AS total
      FROM pagos
      WHERE fecha_pago::date >= DATE_TRUNC('month', CURRENT_DATE)::date
        AND fecha_pago::date < (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::date
    `);

    const ingresosAnioResult = await db.query(`
      SELECT SUM(monto) AS total
      FROM pagos
      WHERE fecha_pago::date >= DATE_TRUNC('year', CURRENT_DATE)::date
        AND fecha_pago::date < (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year')::date
    `);

    res.json({
      totalClientes: clientesResult.rows[0].total,
      clientesMorosos: morososResult.rows.length,
      ingresosMes: ingresosMesResult.rows[0].total || 0,
      ingresosAnio: ingresosAnioResult.rows[0].total || 0
    });

  } catch (error) {
    res.status(500).json({
      mensaje: 'Error al cargar dashboard',
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
// DEBUG FECHAS Y VENCIMIENTOS
// ===============================
app.get('/debug-fechas', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        c.id,
        c.nombre,
        c.tipo,
        p.fecha_pago,
        p.dias_pagados,
        (p.fecha_pago::date + (p.dias_pagados || ' days')::interval)::date AS vencimiento_calculado
      FROM clientes c
      JOIN pagos p ON c.id = p.cliente_id
      ORDER BY vencimiento_calculado DESC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// DEBUG FECHA DEL SERVIDOR
// ===============================
app.get('/debug-hoy', async (req, res) => {
  try {
    const result = await db.query(`SELECT CURRENT_DATE, NOW()`);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// INICIAR SERVIDOR
// ===============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});





