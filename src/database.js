import mysql2, { createPool } from 'mysql2/promise';

const pool = mysql2.createPool({
    host: 'brvt658lkj42ridoadsa-mysql.services.clever-cloud.com',
    user: 'urzvmjaoqrumzldr',
    password: 'uBPy1lZAJpo2iFAfmDeD',
    database: 'brvt658lkj42ridoadsa',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

export const database = pool;