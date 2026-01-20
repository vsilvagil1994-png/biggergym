const mysql = require('mysql2');

const pool = mysql.createPool(process.env.MYSQL_PUBLIC_URL);

module.exports = pool.promise();



