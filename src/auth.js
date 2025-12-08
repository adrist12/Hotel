import express from 'express';
import { database } from './database.js';
import bcrypt from 'bcryptjs';

//configurar el enrutador
const router = express.Router();

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/registro', (req, res) => {
    res.render('registro');
});

router.post('/login', async (req, res) => {
    const { email, contrasena } = req.body;
    if (!email || !contrasena) {
        return res.render('login', { error: 'Por favor complete todos los campos' });
    }
    try {
        const [rows] = await database.execute(
            `SELECT u.*, r.nombre as rol_nombre FROM usuarios u 
             JOIN roles r ON u.id_rol = r.id_rol 
             WHERE u.email = ?`, 
            [email]
        );
        if (rows.length === 0) {
            return res.render('login', { error: 'Usuario no encontrado' });
        }
        const user = rows[0];
        const passwordMatch = await bcrypt.compare(contrasena, user.password);

        if (!passwordMatch) {
            return res.render('login', { error: 'Contraseña incorrecta' });
        }

        // Guardar datos en la sesión
        req.session.userId = user.id_usuario;
        req.session.nombre = user.nombre;
        req.session.email = user.email;
        req.session.id_rol = user.id_rol;
        req.session.rol_nombre = user.rol_nombre;

        // Redirigir al dashboard unificado
        res.redirect('/dashboard');

        
    } catch (error) {
        console.error(error);
        res.render('login', { error: 'Error en el servidor' });
    }
});

router.post('/registro', async (req, res) => {
    const { nombre, email, contrasena } = req.body;
    
    console.log('📝 Intento de registro:', { nombre, email, contrasena: '***' });
    
    if (!nombre || !email || !contrasena) {
        console.warn('⚠️ Campos incompletos en registro');
        return res.render('registro', { error: 'Por favor complete todos los campos' });
    }
    try {
        // Validar que el email sea válido
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.render('registro', { error: 'El email no es válido' });
        }
        
        // Validar que la contraseña tenga al menos 6 caracteres
        if (contrasena.length < 6) {
            return res.render('registro', { error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        
        const [existingUser] = await database.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
        if (existingUser.length > 0){
            console.warn('⚠️ Email ya registrado:', email);
            return res.render('registro', { error: 'El email ya está registrado' });
        }
        
        const hashedPassword = await bcrypt.hash(contrasena, 10);
        // id_rol 2 = cliente
        const result = await database.execute(
            'INSERT INTO usuarios (nombre, email, password, id_rol) VALUES (?, ?, ?, ?)', 
            [nombre, email, hashedPassword, 2]
        );
        
        console.log('✅ Usuario registrado exitosamente:', email);
        res.render('login', { mensaje: 'Registro exitoso, por favor inicie sesión' });
    }catch (error) {
        console.error('❌ Error en registro:', error);
        res.render('registro', { error: 'Error en el servidor: ' + error.message });
    }
});

export const auth = router;