const bcrypt = require('bcryptjs');
const { query } = require('./database');

// Registrar nuevo usuario
async function register(nombre_completo, email, password) {
    try {
        // Verificar si el email ya existe
        const existingUser = await query(
            'SELECT id FROM usuarios WHERE email = ?',
            [email]
        );
        
        if (existingUser.length > 0) {
            return {
                success: false,
                message: 'El email ya está registrado'
            };
        }
        
        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insertar usuario
        const result = await query(
            'INSERT INTO usuarios (nombre_completo, email, password, rol) VALUES (?, ?, ?, ?)',
            [nombre_completo, email, hashedPassword, 'cliente']
        );
        
        return {
            success: true,
            message: 'Usuario registrado exitosamente',
            userId: result.insertId
        };
    } catch (error) {
        console.error('Error en registro:', error);
        return {
            success: false,
            message: 'Error al registrar usuario'
        };
    }
}

// Login de usuario
async function login(email, password) {
    try {
        // Buscar usuario
        const users = await query(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return {
                success: false,
                message: 'Email o contraseña incorrectos'
            };
        }
        
        const user = users[0];
        
        // Verificar contraseña
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            return {
                success: false,
                message: 'Email o contraseña incorrectos'
            };
        }
        
        // No enviar la contraseña al cliente
        delete user.password;
        
        return {
            success: true,
            message: 'Login exitoso',
            user: user
        };
    } catch (error) {
        console.error('Error en login:', error);
        return {
            success: false,
            message: 'Error al iniciar sesión'
        };
    }
}

// Middleware para verificar autenticación
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/auth/login');
}

// Middleware para verificar rol de administrador
function isAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.rol === 'admin') {
        return next();
    }
    res.status(403).render('error', {
        error: 'Acceso denegado. Se requieren permisos de administrador.',
        code: 403
    });
}

module.exports = {
    register,
    login,
    isAuthenticated,
    isAdmin
};
