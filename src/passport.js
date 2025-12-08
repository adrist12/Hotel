import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { Strategy as GitHubStrategy } from 'passport-github2';
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

// ================================
// ESTRATEGIA GOOGLE
// ================================
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'GOOGLE_CLIENT_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'GOOGLE_CLIENT_SECRET',
    callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails[0].value;
        const [rows] = await database.execute(
            'SELECT * FROM usuarios WHERE google_id = ? OR email = ?', 
            [profile.id, email]
        );
        if (rows.length > 0) {
            if (!rows[0].google_id) {
                await database.execute(
                    'UPDATE usuarios SET google_id = ? WHERE id_usuario = ?', 
                    [profile.id, rows[0].id_usuario]
                );
            }
            return done(null, rows[0]);
        } else {
            const [result] = await database.execute(
                'INSERT INTO usuarios (nombre, email, google_id, id_rol, password) VALUES (?, ?, ?, ?, ?)',
                [profile.displayName, email, profile.id, 2, 'oauth_google']
            );
            const user = {
                id_usuario: result.insertId,
                nombre: profile.displayName,
                email: email,
                google_id: profile.id,
                id_rol: 2
            };
            return done(null, user);
        }
    } catch (err) {
        return done(err, null);
    }
}));

// ================================
// ESTRATEGIA MICROSOFT (Outlook)
// ================================
passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID || 'MICROSOFT_CLIENT_ID',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'MICROSOFT_CLIENT_SECRET',
    callbackURL: '/auth/microsoft/callback',
    scope: ['user.read']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : profile._json.mail || profile._json.userPrincipalName;
        const [rows] = await database.execute(
            'SELECT * FROM usuarios WHERE microsoft_id = ? OR email = ?', 
            [profile.id, email]
        );
        if (rows.length > 0) {
            if (!rows[0].microsoft_id) {
                await database.execute(
                    'UPDATE usuarios SET microsoft_id = ? WHERE id_usuario = ?', 
                    [profile.id, rows[0].id_usuario]
                );
            }
            return done(null, rows[0]);
        } else {
            const [result] = await database.execute(
                'INSERT INTO usuarios (nombre, email, microsoft_id, id_rol, password) VALUES (?, ?, ?, ?, ?)',
                [profile.displayName, email, profile.id, 2, 'oauth_microsoft']
            );
            const user = {
                id_usuario: result.insertId,
                nombre: profile.displayName,
                email: email,
                microsoft_id: profile.id,
                id_rol: 2
            };
            return done(null, user);
        }
    } catch (err) {
        return done(err, null);
    }
}));

// ================================
// ESTRATEGIA GITHUB
// ================================
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || 'GITHUB_CLIENT_ID',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'GITHUB_CLIENT_SECRET',
    callbackURL: '/auth/github/callback',
    scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // GitHub puede no tener email público, obtener del array de emails
        let email = null;
        if (profile.emails && profile.emails.length > 0) {
            email = profile.emails.find(e => e.primary)?.value || profile.emails[0].value;
        } else if (profile._json.email) {
            email = profile._json.email;
        } else {
            email = `${profile.username}@github.local`; // Fallback
        }
        
        const [rows] = await database.execute(
            'SELECT * FROM usuarios WHERE github_id = ? OR email = ?', 
            [profile.id.toString(), email]
        );
        if (rows.length > 0) {
            if (!rows[0].github_id) {
                await database.execute(
                    'UPDATE usuarios SET github_id = ? WHERE id_usuario = ?', 
                    [profile.id.toString(), rows[0].id_usuario]
                );
            }
            return done(null, rows[0]);
        } else {
            const nombre = profile.displayName || profile.username;
            const [result] = await database.execute(
                'INSERT INTO usuarios (nombre, email, github_id, id_rol, password) VALUES (?, ?, ?, ?, ?)',
                [nombre, email, profile.id.toString(), 2, 'oauth_github']
            );
            const user = {
                id_usuario: result.insertId,
                nombre: nombre,
                email: email,
                github_id: profile.id.toString(),
                id_rol: 2
            };
            return done(null, user);
        }
    } catch (err) {
        return done(err, null);
    }
}));

export { passport };
