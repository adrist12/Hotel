import passport from 'passport';
import GoogleStrategy from 'passport-google-oauth20';
import { database } from './database.js';

// Configura el serializado/deserializado de usuario
passport.serializeUser((user, done) => {
    done(null, user.id_usuario);
});

passport.deserializeUser(async (id, done) => {
    try {
        const [rows] = await database.execute('SELECT * FROM usuarios WHERE id_usuario = ?', [id]);
        if (rows.length > 0) {
            done(null, rows[0]);
        } else {
            done(null, false);
        }
    } catch (err) {
        done(err, null);
    }
});

// Configura la estrategia de Google
passport.use(new GoogleStrategy.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'GOOGLE_CLIENT_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'GOOGLE_CLIENT_SECRET',
    callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Buscar usuario por googleId o email
        const [rows] = await database.execute(
            'SELECT * FROM usuarios WHERE google_id = ? OR email = ?', 
            [profile.id, profile.emails[0].value]
        );
        if (rows.length > 0) {
            // Si existe, actualizar google_id si es necesario
            if (!rows[0].google_id) {
                await database.execute(
                    'UPDATE usuarios SET google_id = ? WHERE id_usuario = ?', 
                    [profile.id, rows[0].id_usuario]
                );
            }
            return done(null, rows[0]);
        } else {
            // Si no existe, crear usuario nuevo (id_rol = 2 para cliente)
            const [result] = await database.execute(
                'INSERT INTO usuarios (nombre, email, google_id, id_rol, password) VALUES (?, ?, ?, ?, ?)',
                [profile.displayName, profile.emails[0].value, profile.id, 2, 'oauth_google']
            );
            const user = {
                id_usuario: result.insertId,
                nombre: profile.displayName,
                email: profile.emails[0].value,
                google_id: profile.id,
                id_rol: 2
            };
            return done(null, user);
        }
    } catch (err) {
        return done(err, null);
    }
}));

export { passport };
