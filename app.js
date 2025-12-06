const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configurar sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'hotel-flamingo-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para hacer disponible el usuario en todas las vistas
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Importar módulos
const { register, login, isAuthenticated, isAdmin } = require('./src/auth');
const habitacionesModule = require('./src/habitaciones');
const reservasModule = require('./src/reservas');

// ==================== RUTAS PÚBLICAS ====================

// Página de inicio
app.get('/', (req, res) => {
    res.render('index');
});

// Login
app.get('/auth/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login', { error: null });
});

app.post('/auth/login', async (req, res) => {
    try {
        const result = await login(req.body.email, req.body.password);
        
        if (result.success) {
            req.session.user = result.user;
            
            // Redirigir según el rol
            if (result.user.rol === 'admin') {
                return res.redirect('/admin');
            }
            return res.redirect('/dashboard');
        } else {
            res.render('login', { error: result.message });
        }
    } catch (error) {
        console.error('Error en login:', error);
        res.render('login', { error: 'Error en el servidor. Intente nuevamente.' });
    }
});

// Registro
app.get('/auth/registro', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('registro', { error: null, success: null });
});

app.post('/auth/registro', async (req, res) => {
    try {
        const { nombre_completo, email, password, confirmar_password } = req.body;
        
        // Validar que las contraseñas coincidan
        if (password !== confirmar_password) {
            return res.render('registro', { 
                error: 'Las contraseñas no coinciden.',
                success: null 
            });
        }
        
        const result = await register(nombre_completo, email, password);
        
        if (result.success) {
            // Auto-login después del registro
            const loginResult = await login(email, password);
            
            if (loginResult.success) {
                req.session.user = loginResult.user;
                
                // Redirigir según el rol
                if (loginResult.user.rol === 'admin') {
                    return res.redirect('/admin');
                }
                return res.redirect('/dashboard');
            } else {
                // Si falla el auto-login, mostrar mensaje de éxito con instrucción
                res.render('registro', { 
                    error: null,
                    success: 'Registro exitoso. Por favor inicia sesión.' 
                });
            }
        } else {
            res.render('registro', { 
                error: result.message,
                success: null 
            });
        }
    } catch (error) {
        console.error('Error en registro:', error);
        res.render('registro', { 
            error: 'Error en el servidor. Intente nuevamente.',
            success: null 
        });
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ==================== RUTAS DE CLIENTE ====================

// Dashboard del cliente
app.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const habitaciones = await habitacionesModule.obtenerHabitacionesDisponibles();
        const reservas = await reservasModule.obtenerReservasPorUsuario(req.session.user.id);
        
        res.render('dashboard-cliente', {
            habitaciones,
            reservas,
            error: null,
            success: null
        });
    } catch (error) {
        console.error('Error en dashboard:', error);
        res.render('error', { 
            error: 'Error al cargar el dashboard.',
            code: 500 
        });
    }
});

// Ver habitaciones
app.get('/habitaciones', isAuthenticated, async (req, res) => {
    try {
        const habitaciones = await habitacionesModule.obtenerHabitacionesDisponibles();
        res.render('habitaciones', { habitaciones });
    } catch (error) {
        console.error('Error al obtener habitaciones:', error);
        res.render('error', { 
            error: 'Error al cargar habitaciones.',
            code: 500 
        });
    }
});

// Verificar disponibilidad
app.post('/api/check-disponibilidad', isAuthenticated, async (req, res) => {
    try {
        const { id_habitacion, fecha_inicio, fecha_fin } = req.body;
        const disponible = await habitacionesModule.verificarDisponibilidad(
            id_habitacion,
            fecha_inicio,
            fecha_fin
        );
        res.json({ disponible });
    } catch (error) {
        console.error('Error al verificar disponibilidad:', error);
        res.status(500).json({ error: 'Error al verificar disponibilidad' });
    }
});

// Crear reserva
app.post('/reservar', isAuthenticated, async (req, res) => {
    try {
        const { id_habitacion, fecha_entrada, fecha_salida } = req.body;
        
        const result = await reservasModule.crearReserva(
            req.session.user.id,
            id_habitacion,
            fecha_entrada,
            fecha_salida
        );
        
        if (result.success) {
            res.redirect('/dashboard?success=Reserva creada exitosamente');
        } else {
            res.redirect('/dashboard?error=' + encodeURIComponent(result.message));
        }
    } catch (error) {
        console.error('Error al crear reserva:', error);
        res.redirect('/dashboard?error=Error al crear la reserva');
    }
});

// ==================== RUTAS DE ADMINISTRADOR ====================

// Dashboard del administrador
app.get('/admin', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const habitaciones = await habitacionesModule.obtenerTodasHabitaciones();
        const reservas = await reservasModule.obtenerTodasReservas();
        const estadisticas = await habitacionesModule.obtenerEstadisticas();
        
        res.render('dashboard-admin', {
            habitaciones,
            reservas,
            estadisticas,
            error: null,
            success: null
        });
    } catch (error) {
        console.error('Error en dashboard admin:', error);
        res.render('error', { 
            error: 'Error al cargar el panel de administración.',
            code: 500 
        });
    }
});

// Crear habitación
app.post('/admin/habitaciones', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const result = await habitacionesModule.crearHabitacion(req.body);
        
        if (result.success) {
            res.redirect('/admin?success=Habitación creada exitosamente');
        } else {
            res.redirect('/admin?error=' + encodeURIComponent(result.message));
        }
    } catch (error) {
        console.error('Error al crear habitación:', error);
        res.redirect('/admin?error=Error al crear la habitación');
    }
});

// Actualizar habitación
app.post('/admin/habitaciones/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const result = await habitacionesModule.actualizarHabitacion(req.params.id, req.body);
        
        if (result.success) {
            res.redirect('/admin?success=Habitación actualizada exitosamente');
        } else {
            res.redirect('/admin?error=' + encodeURIComponent(result.message));
        }
    } catch (error) {
        console.error('Error al actualizar habitación:', error);
        res.redirect('/admin?error=Error al actualizar la habitación');
    }
});

// Eliminar habitación
app.post('/admin/habitaciones/:id/eliminar', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const result = await habitacionesModule.eliminarHabitacion(req.params.id);
        
        if (result.success) {
            res.redirect('/admin?success=Habitación eliminada exitosamente');
        } else {
            res.redirect('/admin?error=' + encodeURIComponent(result.message));
        }
    } catch (error) {
        console.error('Error al eliminar habitación:', error);
        res.redirect('/admin?error=Error al eliminar la habitación');
    }
});

// Actualizar estado de reserva
app.post('/admin/reservas/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const { estado } = req.body;
        const result = await reservasModule.actualizarEstadoReserva(req.params.id, estado);
        
        if (result.success) {
            res.redirect('/admin?success=Estado actualizado exitosamente');
        } else {
            res.redirect('/admin?error=' + encodeURIComponent(result.message));
        }
    } catch (error) {
        console.error('Error al actualizar reserva:', error);
        res.redirect('/admin?error=Error al actualizar la reserva');
    }
});

// ==================== MANEJO DE ERRORES ====================

// 404
app.use((req, res) => {
    res.status(404).render('error', {
        error: 'Página no encontrada',
        code: 404
    });
});

// 500
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('error', {
        error: 'Error interno del servidor',
        code: 500
    });
});

// ==================== INICIAR SERVIDOR ====================

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║   🏨 Hotel Flamingo v1.0.0            ║
║   Sistema de Reservas Profesional     ║
║   Servidor iniciado en puerto ${PORT}    ║
╚═══════════════════════════════════════╝
    `);
    console.log(`\n👉 Abrir en navegador: http://localhost:${PORT}\n`);
});

module.exports = app;
