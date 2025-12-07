//importar las dependencias, al usar type: "module" se usa import y export
import express from 'express';
import passport from 'passport';
// Cargar configuración de Passport (registra la estrategia)
import './src/passport.js';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import mysql2 from 'mysql2/promise';
import ejs from 'ejs';
import bcrypt from 'bcryptjs';
import methodOverride from 'method-override';
import path from 'path';
import { fileURLToPath } from 'url';
import { auth } from './src/auth.js';
import { reservas } from './src/reservas.js';
import { habitaciones } from './src/habitaciones.js';
import { database } from './src/database.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = 3000;

//configuracion del motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//Archivos estaticos
app.use(express.static(path.join(__dirname, 'public')));

//Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Configuración de sesiones
app.use(session({
    secret: 'HotelFlamingoSecretKey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, 
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
    }
}));

// Inicializar Passport
app.use(passport.initialize());
app.use(passport.session());

// Rutas de autenticación con Google
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/login' }),
    (req, res) => {
        // Guardar datos en sesión para compatibilidad
        req.session.userId = req.user.id_usuario;
        req.session.nombre = req.user.nombre;
        req.session.email = req.user.email;
        req.session.id_rol = req.user.id_rol;
        req.session.rol_nombre = req.user.id_rol === 1 ? 'admin' : 'cliente';
        res.redirect('/dashboard');
    }
);

// Middleware para verificar autenticación
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    next();
};

// Middleware para verificar rol de admin
const requireAdmin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    if (req.session.id_rol !== 1) {  // id_rol 1 = admin
        return res.status(403).render('error', {
            message: 'Acceso denegado. Solo administradores pueden acceder a esta sección.',
            codigo: 403
        });
    }
    next();
};

// Middleware para hacer variables de sesión disponibles en vistas
app.use((req, res, next) => {
    res.locals.usuario = req.session.userId ? {
        id: req.session.userId,
        nombre: req.session.nombre,
        email: req.session.email,
        id_rol: req.session.id_rol,
        rol_nombre: req.session.rol_nombre
    } : null;
    next();
});

//Rutas de autenticación
app.use('/auth', auth);

// Rutas de reservas y gestión
app.use('/', reservas);

// Rutas de habitaciones
app.use('/', habitaciones);

// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.render('error', {
                message: 'Error al cerrar sesión',
                codigo: 500
            });
        }
        res.redirect('/');
    });
});

app.get('/', (req, res) => {
    res.render('index', { titulo: 'Hotel Flamingo' });
});

// Ruta del dashboard (ambos roles)
app.get('/dashboard', requireLogin, async (req, res) => {
    try {
        const id_rol = req.session.id_rol;

        if (id_rol === 1) {  // id_rol 1 = admin
            // Dashboard de administrador
            try {
                // Obtener estadísticas de forma separada para evitar errores
                const [usuariosCount] = await database.execute(`SELECT COUNT(*) as total FROM usuarios`);
                const [habitacionesCount] = await database.execute(`SELECT COUNT(*) as total FROM habitaciones`);
                const [reservasActivas] = await database.execute(`SELECT COUNT(*) as total FROM reservas WHERE estado = 'confirmada'`);
                const [ingresosResult] = await database.execute(`SELECT COALESCE(SUM(total), 0) as total FROM reservas WHERE estado = 'finalizada'`);

                const estadisticas = {
                    total_usuarios: usuariosCount[0].total || 0,
                    total_habitaciones: habitacionesCount[0].total || 0,
                    reservas_activas: reservasActivas[0].total || 0,
                    ingresos_totales: ingresosResult[0].total || 0
                };

                const [habitaciones] = await database.execute(`
                    SELECT id_habitacion, numero, tipo, precio, estado, Descripcion
                    FROM habitaciones
                    ORDER BY numero ASC
                `);

                const [reservas] = await database.execute(`
                    SELECT r.id_reserva, u.nombre, h.numero, r.fecha_inicio, r.fecha_fin, r.estado, r.total
                    FROM reservas r
                    JOIN usuarios u ON r.id_usuario = u.id_usuario
                    JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
                    ORDER BY r.fecha_inicio DESC
                    LIMIT 10
                `);

                res.render('dashboard-admin', {
                    user: req.session,
                    estadisticas: estadisticas,
                    habitaciones: habitaciones || [],
                    reservas: reservas || []
                });
            } catch (adminError) {
                console.error('Error en dashboard admin:', adminError);
                throw adminError;
            }
        } else {
            // Dashboard de cliente
            try {
                const [reservas] = await database.execute(`
                    SELECT r.id_reserva, h.numero, h.tipo, r.fecha_inicio, r.fecha_fin, r.estado, r.total
                    FROM reservas r
                    JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
                    WHERE r.id_usuario = ?
                    ORDER BY r.fecha_inicio DESC
                `, [req.session.userId]);

                const [habitaciones] = await database.execute(`
                    SELECT id_habitacion, numero, tipo, descripcion, precio, estado
                    FROM habitaciones
                    WHERE estado = 'disponible'
                    ORDER BY numero ASC
                `);

                res.render('dashboard-cliente', {
                    user: req.session,
                    reservas: reservas || [],
                    habitaciones: habitaciones || []
                });
            } catch (clientError) {
                console.error('Error en dashboard cliente:', clientError);
                throw clientError;
            }
        }
    } catch (error) {
        console.error('Error en dashboard:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).render('error', {
            message: 'Error al cargar el dashboard: ' + error.message,
            codigo: 500
        });
    }
});

// Ruta para hacer una reserva (solo clientes)
app.post('/reservar', requireLogin, async (req, res) => {
    if (req.session.id_rol !== 2) {  // id_rol 2 = cliente
        return res.status(403).json({ error: 'Solo los clientes pueden hacer reservas' });
    }

    try {
        const { id_habitacion, fecha_inicio, fecha_fin } = req.body;

        // Validar fechas
        const inicio = new Date(fecha_inicio);
        const fin = new Date(fecha_fin);

        if (inicio >= fin) {
            return res.status(400).json({ error: 'La fecha de fin debe ser posterior a la de inicio' });
        }

        // Obtener precio de la habitación
        const [habitacion] = await database.execute(
            'SELECT precio FROM habitaciones WHERE id_habitacion = ?',
            [id_habitacion]
        );

        if (habitacion.length === 0) {
            return res.status(404).json({ error: 'Habitación no encontrada' });
        }

        // Calcular total
        const noches = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
        const total = noches * habitacion[0].precio;

        // Crear reserva
        await database.execute(
            'INSERT INTO reservas (id_usuario, id_habitacion, fecha_inicio, fecha_fin, total, estado) VALUES (?, ?, ?, ?, ?, ?)',
            [req.session.userId, id_habitacion, fecha_inicio, fecha_fin, total, 'pendiente']
        );

        res.json({ success: true, message: 'Reserva creada correctamente' });
    } catch (error) {
        console.error('Error al crear reserva:', error);
        res.status(500).json({ error: 'Error al crear la reserva' });
    }
});

//Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
