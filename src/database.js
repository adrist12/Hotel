const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Hotel_DB',
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Verificar conexión
async function verificarConexion() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexión a MySQL exitosa');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Error al conectar a MySQL:', error.message);
        console.error('Por favor verifica las credenciales en el archivo .env');
        return false;
    }
}

// Ejecutar verificación al cargar el módulo
verificarConexion();

// Función helper para ejecutar queries
async function query(sql, params) {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Error en query:', error);
        throw error;
    }
}

module.exports = {
    pool,
    query,
    verificarConexion
};
