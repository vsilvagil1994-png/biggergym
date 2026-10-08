const { Pool } = require('pg');

console.log(
  '🔗 DATABASE_URL EN USO:',
  process.env.DATABASE_URL ? 'Configurada' : 'NO CONFIGURADA'
);

const pool = new Pool({

  connectionString: process.env.DATABASE_URL,

  ssl: process.env.NODE_ENV === 'production'
    ? {
        rejectUnauthorized: false
      }
    : false

});


// ==========================================
// ZONA HORARIA DE COLOMBIA
// ==========================================

pool.on('connect', async (client) => {

  try {

    await client.query(
      "SET TIME ZONE 'America/Bogota'"
    );

    console.log(
      '🇨🇴 Zona horaria PostgreSQL: America/Bogota'
    );

  } catch (error) {

    console.error(
      '❌ Error configurando zona horaria:',
      error
    );

  }

});


module.exports = {

  query: (text, params) =>
    pool.query(text, params),

};
