const { Pool } = require('pg');

console.log('🟢 DATABASE_URL EN USO:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};


