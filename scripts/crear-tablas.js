import mysql2 from 'mysql2/promise';
// Importar bcrypt para hashear contraseñas
import bcrypt from 'bcryptjs';
//modificar los datos de conexion a la base de datos segun sea necesario

const pool = mysql2.createPool({
    host: 'brvt658lkj42ridoadsa-mysql.services.clever-cloud.com',
    user: 'urzvmjaoqrumzldr',
    password: 'uBPy1lZAJpo2iFAfmDeD',
    database: 'brvt658lkj42ridoadsa',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function inicializarBD() {
    try {
        const connection = await pool.getConnection();
        
        console.log('🔨 Inicializando base de datos...\n');

        // 1. Crear tabla roles
        console.log('📋 Creando tabla roles...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id_rol INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(50) NOT NULL UNIQUE
            )
        `);
        
        const [rolesCount] = await connection.query('SELECT COUNT(*) as total FROM roles');
        if (rolesCount[0].total === 0) {
            await connection.query(`
                INSERT INTO roles (nombre) VALUES ('admin'), ('cliente')
            `);
            console.log('✅ Tabla roles creada e inicializada\n');
        } else {
            console.log('✅ Tabla roles ya existe\n');
        }

        // 2. Crear tabla usuarios (con campos OAuth)
        console.log('👤 Creando tabla usuarios...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id_usuario INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(120) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                id_rol INT NOT NULL,
                google_id VARCHAR(100) NULL,
                microsoft_id VARCHAR(100) NULL,
                github_id VARCHAR(100) NULL,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
            )
        `);
        console.log('✅ Tabla usuarios creada\n');

        // 3. Crear tabla empleados
        console.log('👨‍💼 Creando tabla empleados...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS empleados (
                id_empleado INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(120) NOT NULL,
                documento VARCHAR(50) NOT NULL UNIQUE,
                telefono VARCHAR(20),
                cargo VARCHAR(100),
                fecha_contrato DATE
            )
        `);
        console.log('✅ Tabla empleados creada\n');

        // 4. Crear tabla habitaciones
        console.log('🛏️  Creando tabla habitaciones...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS habitaciones (
                id_habitacion INT AUTO_INCREMENT PRIMARY KEY,
                numero VARCHAR(10) NOT NULL UNIQUE,
                tipo VARCHAR(50) NOT NULL,
                precio DECIMAL(10,2) NOT NULL,
                estado VARCHAR(20) DEFAULT 'disponible'
            )
        `);
        console.log('✅ Tabla habitaciones creada\n');

        // 5. Crear tabla fotos_habitaciones
        console.log('📸 Creando tabla fotos_habitaciones...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS fotos_habitaciones (
                id_foto INT AUTO_INCREMENT PRIMARY KEY,
                id_habitacion INT NOT NULL,
                url_foto TEXT NOT NULL,
                FOREIGN KEY (id_habitacion) REFERENCES habitaciones(id_habitacion)
                    ON DELETE CASCADE
            )
        `);
        console.log('✅ Tabla fotos_habitaciones creada\n');

        // 6. Crear tabla servicios_adicionales
        console.log('🎯 Creando tabla servicios_adicionales...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS servicios_adicionales (
                id_servicio INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                descripcion TEXT,
                precio DECIMAL(10,2) NOT NULL
            )
        `);
        console.log('✅ Tabla servicios_adicionales creada\n');

        // 7. Crear tabla reservas
        console.log('📅 Creando tabla reservas...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS reservas (
                id_reserva INT AUTO_INCREMENT PRIMARY KEY,
                id_usuario INT NOT NULL,
                id_habitacion INT NOT NULL,
                fecha_inicio DATE NOT NULL,
                fecha_fin DATE NOT NULL,
                total DECIMAL(10,2),
                estado VARCHAR(20) DEFAULT 'pendiente',
                fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
                FOREIGN KEY (id_habitacion) REFERENCES habitaciones(id_habitacion)
            )
        `);
        console.log('✅ Tabla reservas creada\n');

        // 8. Crear tabla reserva_servicio
        console.log('🔗 Creando tabla reserva_servicio...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS reserva_servicio (
                id_reserva INT NOT NULL,
                id_servicio INT NOT NULL,
                cantidad INT DEFAULT 1,
                subtotal DECIMAL(10,2),
                PRIMARY KEY (id_reserva, id_servicio),
                FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva)
                    ON DELETE CASCADE,
                FOREIGN KEY (id_servicio) REFERENCES servicios_adicionales(id_servicio)
            )
        `);
        console.log('✅ Tabla reserva_servicio creada\n');

        // 9. Crear tabla pagos
        console.log('💳 Creando tabla pagos...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS pagos (
                id_pago INT AUTO_INCREMENT PRIMARY KEY,
                id_reserva INT NOT NULL,
                monto DECIMAL(10,2) NOT NULL,
                metodo VARCHAR(50),
                fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva)
            )
        `);
        console.log('✅ Tabla pagos creada\n');

        // 10. Crear vista vista_reservas
        console.log('👁️  Creando vista vista_reservas...');
        try {
            await connection.query(`DROP VIEW IF EXISTS vista_reservas`);
        } catch (e) {
            // Ignorar si no existe
        }
        
        await connection.query(`
            CREATE VIEW vista_reservas AS
            SELECT 
                r.id_reserva,
                u.nombre AS cliente,
                h.numero AS habitacion,
                r.fecha_inicio,
                r.fecha_fin,
                r.total,
                r.estado
            FROM reservas r
            JOIN usuarios u ON u.id_usuario = r.id_usuario
            JOIN habitaciones h ON h.id_habitacion = r.id_habitacion
        `);
        console.log('✅ Vista vista_reservas creada\n');

        console.log('✨ Base de datos inicializada correctamente!\n');

        connection.release();
        // Pool no se cierra aquí
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
async function crearAdmin() {
    try {
        const connection = await pool.getConnection();
        
        // Contraseña que vamos a usar
        const contrasena = 'Admin123!';
        const hashedPassword = await bcrypt.hash(contrasena, 10);
        
        console.log('🔐 Creando usuario admin de prueba...');
        console.log('Email: admin@hotel.com');
        console.log(`Contraseña: ${contrasena}`);
        console.log(`Hash: ${hashedPassword}`);
        
        // Primero verificar si existe
        const [existing] = await connection.query(
            'SELECT * FROM usuarios WHERE email = ?',
            ['admin@hotel.com']
        );
        
        if (existing.length > 0) {
            console.log('\n✏️ Admin ya existe, actualizando contraseña...');
            await connection.query(
                'UPDATE usuarios SET password = ? WHERE email = ?',
                [hashedPassword, 'admin@hotel.com']
            );
        } else {
            console.log('\n✨ Creando nuevo usuario admin...');
            await connection.query(
                'INSERT INTO usuarios (nombre, email, password, id_rol) VALUES (?, ?, ?, ?)',
                ['Administrador', 'admin@hotel.com', hashedPassword, 1]
            );
        }
        
        console.log('✅ Usuario admin listo!\n');
        console.log('Para iniciar sesión:');
        console.log('Email: admin@hotel.com');
        console.log(`Contraseña: ${contrasena}\n`);
        
        connection.release();
        // Pool no se cierra aquí
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
async function insertarDatos() {
    try {
        const connection = await pool.getConnection();
        
        console.log('📝 Insertando datos de prueba...\n');

        // 1. Insertar usuario admin
        console.log('👨‍💼 Creando usuario admin...');
        const hashedAdminPassword = await bcrypt.hash('Admin123!', 10);
        const [adminCheck] = await connection.query(
            'SELECT COUNT(*) as total FROM usuarios WHERE email = ?',
            ['admin@hotel.com']
        );
        
        if (adminCheck[0].total === 0) {
            await connection.query(
                'INSERT INTO usuarios (nombre, email, password, id_rol) VALUES (?, ?, ?, ?)',
                ['Administrador', 'admin@hotel.com', hashedAdminPassword, 1]
            );
            console.log('✅ Admin creado: admin@hotel.com / Admin123!\n');
        } else {
            console.log('✅ Admin ya existe\n');
        }

        // 2. Insertar usuario cliente
        console.log('👥 Creando usuario cliente...');
        const hashedClientPassword = await bcrypt.hash('Cliente123!', 10);
        const [clientCheck] = await connection.query(
            'SELECT COUNT(*) as total FROM usuarios WHERE email = ?',
            ['cliente@test.com']
        );
        
        if (clientCheck[0].total === 0) {
            await connection.query(
                'INSERT INTO usuarios (nombre, email, password, id_rol) VALUES (?, ?, ?, ?)',
                ['Cliente Test', 'cliente@test.com', hashedClientPassword, 2]
            );
            console.log('✅ Cliente creado: cliente@test.com / Cliente123!\n');
        } else {
            console.log('✅ Cliente ya existe\n');
        }

        // 3. Insertar habitaciones
        console.log('🛏️  Creando habitaciones...');
        const [habitacionesCheck] = await connection.query(
            'SELECT COUNT(*) as total FROM habitaciones'
        );
        
        if (habitacionesCheck[0].total === 0) {
            await connection.query(`
                INSERT INTO habitaciones (numero, tipo, precio, estado) VALUES
                ('101', 'estándar', 50.00, 'disponible'),
                ('102', 'estándar', 50.00, 'disponible'),
                ('201', 'premium', 80.00, 'disponible'),
                ('202', 'premium', 80.00, 'disponible'),
                ('301', 'suite', 120.00, 'disponible'),
                ('302', 'suite', 120.00, 'disponible'),
                ('401', 'penthouse', 200.00, 'disponible')
            `);
            console.log('✅ 7 habitaciones creadas\n');
        } else {
            console.log('✅ Habitaciones ya existen\n');
        }

        // 4. Insertar servicios adicionales
        console.log('🎯 Creando servicios...');
        const [serviciosCheck] = await connection.query(
            'SELECT COUNT(*) as total FROM servicios_adicionales'
        );
        
        if (serviciosCheck[0].total === 0) {
            await connection.query(`
                INSERT INTO servicios_adicionales (nombre, descripcion, precio) VALUES
                ('Desayuno Buffet', 'Desayuno completo con opciones variadas', 15.00),
                ('Spa y Sauna', 'Acceso a spa y sauna del hotel', 50.00),
                ('Gym 24 horas', 'Acceso al gimnasio completo', 10.00),
                ('Parqueadero', 'Parqueadero seguro y vigilado', 5.00),
                ('WiFi Premium', 'Internet de alta velocidad sin límites', 8.00)
            `);
            console.log('✅ 5 servicios creados\n');
        } else {
            console.log('✅ Servicios ya existen\n');
        }

        console.log('✨ Datos de prueba insertados correctamente!\n');
        console.log('📋 Credenciales de acceso:\n');
        console.log('Admin:');
        console.log('  Email: admin@hotel.com');
        console.log('  Contraseña: Admin123!\n');
        console.log('Cliente:');
        console.log('  Email: cliente@test.com');
        console.log('  Contraseña: Cliente123!\n');

        connection.release();
        // Pool no se cierra aquí
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}


async function crearCliente() {
    try {
        const connection = await pool.getConnection();
        
        // Contraseña que vamos a usar
        const contrasena = 'Cliente123!';
        const hashedPassword = await bcrypt.hash(contrasena, 10);
        
        console.log('🔐 Creando usuario cliente de prueba...');
        console.log('Email: cliente@test.com');
        console.log(`Contraseña: ${contrasena}`);
        
        // Primero verificar si existe
        const [existing] = await connection.query(
            'SELECT * FROM usuarios WHERE email = ?',
            ['cliente@test.com']
        );
        
        if (existing.length > 0) {
            console.log('\n✏️ Cliente ya existe, actualizando contraseña...');
            await connection.query(
                'UPDATE usuarios SET password = ? WHERE email = ?',
                [hashedPassword, 'cliente@test.com']
            );
        } else {
            console.log('\n✨ Creando nuevo usuario cliente...');
            await connection.query(
                'INSERT INTO usuarios (nombre, email, password, id_rol) VALUES (?, ?, ?, ?)',
                ['Cliente Test', 'cliente@test.com', hashedPassword, 2]
            );
        }
        
        console.log('✅ Usuario cliente listo!\n');
        console.log('Para iniciar sesión:');
        console.log('Email: cliente@test.com');
        console.log(`Contraseña: ${contrasena}\n`);
        
        connection.release();
        // Pool no se cierra aquí
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Función para agregar columnas OAuth a tabla existente
async function agregarColumnasOAuth() {
    try {
        const connection = await pool.getConnection();
        
        console.log('🔧 Agregando columnas OAuth a tabla usuarios...\n');
        
        // Verificar si las columnas ya existen y agregarlas si no
        try {
            await connection.query(`
                ALTER TABLE usuarios 
                ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) NULL,
                ADD COLUMN IF NOT EXISTS microsoft_id VARCHAR(100) NULL,
                ADD COLUMN IF NOT EXISTS github_id VARCHAR(100) NULL
            `);
            console.log('✅ Columnas OAuth agregadas correctamente\n');
        } catch (alterError) {
            // Si falla el ALTER, intentar agregar columnas una por una
            console.log('Intentando agregar columnas individualmente...');
            try {
                await connection.query(`ALTER TABLE usuarios ADD COLUMN google_id VARCHAR(100) NULL`);
            } catch (e) { /* columna ya existe */ }
            try {
                await connection.query(`ALTER TABLE usuarios ADD COLUMN microsoft_id VARCHAR(100) NULL`);
            } catch (e) { /* columna ya existe */ }
            try {
                await connection.query(`ALTER TABLE usuarios ADD COLUMN github_id VARCHAR(100) NULL`);
            } catch (e) { /* columna ya existe */ }
            console.log('✅ Columnas OAuth verificadas\n');
        }
        
        connection.release();
        // Pool no se cierra aquí
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}


async function main() {
    try {
        await inicializarBD();
        await insertarDatos();
        await crearAdmin();
        await crearCliente();
        await agregarColumnasOAuth();
        console.log('🏁 Todo completado con éxito');
    } catch (error) {
        console.error('❌ Error general:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

main();
