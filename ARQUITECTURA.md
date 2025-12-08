# 🏗️ ARQUITECTURA DEL SISTEMA

## Diagrama General

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USUARIO / NAVEGADOR                        │
│                         (EJS + HTML5 + CSS)                         │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/HTTPS
                                    │
┌──────────────────────────────────────────────────────────────────────┐
│                      EXPRESS.JS (Node.js)                           │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    MIDDLEWARES                              │   │
│  │  • session (express-session)                               │   │
│  │  • passport (Google OAuth)                                 │   │
│  │  • body parser                                             │   │
│  │  • cookie parser                                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                    │                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    ROUTERS                                  │   │
│  │                                                              │   │
│  │  /auth           (auth.js)      ─→ Login, Registro         │   │
│  │  /               (reservas.js)  ─→ Reservas, Admin         │   │
│  │  /api            (reservas.js)  ─→ APIs públicas           │   │
│  │  /admin          (reservas.js)  ─→ Gestión                 │   │
│  │  /logout         (app.js)       ─→ Cerrar sesión           │   │
│  │  /dashboard      (app.js)       ─→ Panel personalizado      │   │
│  └─────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌───────────────┐  ┌──────────┐  ┌──────────────┐
            │   Google      │  │ Express  │  │  MySQL Pool  │
            │   OAuth 2.0   │  │ Session  │  │  (Clever     │
            │               │  │ (Memory) │  │   Cloud)     │
            └───────────────┘  └──────────┘  └──────────────┘
                    │                              │
                    │                              ▼
                    │                    ┌──────────────────────┐
                    │                    │     DATABASE         │
                    │                    │                      │
                    │                    │  • roles             │
                    │                    │  • usuarios          │
                    │                    │  • habitaciones      │
                    │                    │  • reservas          │
                    │                    │  • servicios_add...  │
                    │                    │  • reserva_servicio  │
                    │                    │  • pagos             │
                    │                    │  • vista_reservas    │
                    │                    └──────────────────────┘
                    │
                    ▼
            ┌──────────────────────┐
            │   Usuarios de        │
            │   Google registrados │
            └──────────────────────┘
```

---

## Flujo de Autenticación

### Opción 1: Email + Contraseña

```
┌─────────────┐
│ Login Page  │
└──────┬──────┘
       │
       │ POST /auth/login
       │ {email, password}
       │
       ▼
┌──────────────────────────────────┐
│ auth.js - POST /login            │
│                                  │
│ 1. Validar datos                 │
│ 2. Buscar user en BD             │
│ 3. bcrypt.compare(pwd)           │
│ 4. if OK → crear sesión          │
│    if NO → error                 │
└──────┬───────────────────────────┘
       │
       ├──> req.session = {
       │      userId, nombre,
       │      email, id_rol
       │    }
       │
       └──> Redirect /dashboard
            │
            └──> Dashboard (admin/cliente)
```

### Opción 2: Google OAuth 2.0

```
┌──────────────────────────────┐
│ Login Page                   │
│ [Iniciar con Google] ◄───┐  │
└──────┬───────────────────────┘
       │
       │ GET /auth/google
       │
       ▼
┌──────────────────────────────┐
│ Passport.js authenticate()   │
│                              │
│ Redirige a: accounts.google..│
└──────┬───────────────────────┘
       │
       │ Usuario selecciona
       │ cuenta Google
       │
       ▼
┌──────────────────────────────┐
│ Google OAuth Server          │
│ Usuario "Permite"            │
└──────┬───────────────────────┘
       │
       │ Google redirige a:
       │ /auth/google/callback
       │ + authorization_code
       │
       ▼
┌──────────────────────────────────────┐
│ Passport callback handler            │
│                                      │
│ 1. Intercambiar code por token      │
│ 2. Obtener info de usuario          │
│ 3. Buscar en BD por google_id       │
│ 4. Si existe → traer datos          │
│    Si NO existe → crear usuario     │
│ 5. Crear sesión                     │
└──────┬───────────────────────────────┘
       │
       └──> Redirect /dashboard
```

---

## Flujo de Reserva (Cliente)

```
┌──────────────────────────────────┐
│ Dashboard Cliente                │
│ Tab "Habitaciones Disponibles"   │
└──────┬───────────────────────────┘
       │
       │ Ve galería de habitaciones
       │ Selecciona: Habitación, Fechas, Servicios
       │
       ▼
┌─────────────────────────────────────┐
│ Modal de Reserva                    │
│ [Formulario]                        │
│ [Botón: Reservar]                   │
└──────┬────────────────────────────────┘
       │
       │ POST /crear-reserva
       │ {id_habitacion, fecha_inicio, fecha_fin, servicios_ids}
       │
       ▼
┌───────────────────────────────────────────────────┐
│ src/reservas.js - POST /crear-reserva            │
│                                                   │
│ 1. Validar sesión (requireLogin)                 │
│ 2. Validar fechas (fin > inicio)                 │
│ 3. Verificar disponibilidad en BD                │
│ 4. Obtener precio de habitación                  │
│ 5. Calcular: noches × precio                     │
│ 6. Sumar servicios adicionales                   │
│ 7. INSERT INTO reservas                          │
│ 8. INSERT INTO reserva_servicio (servicios)      │
│ 9. Retornar: id_reserva, total                   │
└───────┬────────────────────────────────────────────┘
        │
        ├──> Validación OK
        │    ▼
        │ Mostrar confirmación
        │ Total: $XXX
        │ [Ir a Pagar]
        │
        └──> Validación ERROR
             ▼
          Mostrar error
          "Habitación no disponible"
```

---

## Estructura de Sesión

```
req.session = {
    userId: 5,              // id_usuario
    nombre: "Juan Pérez",
    email: "juan@email.com",
    id_rol: 2,              // 1=admin, 2=cliente
    rol_nombre: "cliente",
    
    cookie: {
        secure: false,      // true en producción
        httpOnly: true,
        maxAge: 86400000    // 24 horas
    }
}

// Disponible en todas las vistas como:
res.locals.usuario = {
    id: userId,
    nombre: "Juan...",
    email: "juan@...",
    id_rol: 2,
    rol_nombre: "cliente"
}
```

---

## Protección de Rutas

```
┌─────────────────────────────────────────────────┐
│ Ruta Pública: GET /                             │
│ → Sin middlewares                               │
│ → Acceso para todos                             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Ruta Protegida: GET /dashboard                  │
│                                                 │
│ requireLogin → if (!req.session.userId)         │
│                  redirect /auth/login           │
│               else → next()                     │
│                                                 │
│ → Solo usuarios autenticados                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Ruta Admin: DELETE /admin/habitaciones/:id      │
│                                                 │
│ requireLogin → if (!req.session.userId)         │
│                  redirect /auth/login           │
│                                                 │
│ requireAdmin → if (req.session.id_rol !== 1)   │
│                  res.status(403)                │
│               else → next()                     │
│                                                 │
│ → Solo administradores                          │
└─────────────────────────────────────────────────┘
```

---

## Stack de Tecnologías

```
PRESENTACIÓN (Frontend)
├─ EJS (Template engine)
├─ HTML5
├─ CSS3 (+ variables CSS)
└─ JavaScript Vanilla (sin frameworks)

LÓGICA (Backend)
├─ Node.js 16+
├─ Express 5.1.0
├─ Passport.js (OAuth)
├─ bcryptjs (Password hashing)
└─ express-session (Session management)

PERSISTENCIA (Database)
├─ MySQL 8.x (Clever Cloud)
├─ mysql2/promise (Async driver)
├─ 8 tablas normalizadas
└─ 1 vista para reportes

SEGURIDAD
├─ bcryptjs (10 rounds)
├─ express-session (httpOnly)
├─ Prepared statements
├─ Google OAuth 2.0
└─ Session timeout (24h)
```

---

## Configuración de Seguridad

```javascript
// Session security
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,      // ← true en PRODUCCIÓN
        httpOnly: true,     // ← Previene XSS
        maxAge: 24 * 60 * 60 * 1000  // 24 horas
    }
}));

// Password hashing
bcrypt.hash(password, 10);  // 10 rondas

// Prepared statements
database.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
// ^ Previene SQL injection

// Validación de entrada
if (!email || !password) return error;
```

---

## Índices de Base de Datos

```
tabla: usuarios
├─ PRIMARY KEY (id_usuario)
├─ UNIQUE (email)
├─ INDEX (google_id)
└─ INDEX (id_rol)

tabla: habitaciones
├─ PRIMARY KEY (id_habitacion)
├─ UNIQUE (numero)
└─ INDEX (estado)

tabla: reservas
├─ PRIMARY KEY (id_reserva)
├─ FK (id_usuario)
├─ FK (id_habitacion)
├─ INDEX (estado)
└─ INDEX (fecha_inicio, fecha_fin)

tabla: pagos
├─ PRIMARY KEY (id_pago)
├─ FK (id_reserva)
└─ INDEX (estado)
```

---

## Ciclo de Vida de una Solicitud

```
Usuario (Browser)
       │
       ▼
HTTP REQUEST
       │
       ▼ Express App
┌──────────────────────────────────────┐
│ Middlewares                          │
│ ├─ body-parser                       │
│ ├─ session                           │
│ └─ passport                          │
└──────────────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │ Routing                  │
        │ ├─ /auth → auth.js       │
        │ ├─ / → reservas.js       │
        │ └─ /admin → reservas.js  │
        └──────────────┬───────────┘
                       │
                       ▼
            ┌────────────────────────┐
            │ Middleware específica  │
            │ (requireLogin,etc)     │
            └──────────────┬─────────┘
                           │
                    ┌──────┴──────┐
                    │             │
            ✅ AUTORIZADO   ❌ NO AUTORIZADO
                    │             │
                    ▼             ▼
            Ejecutar controlador   Render error /
            (handler function)     Redirect
                    │             │
                    └──────┬──────┘
                           │
                           ▼
                    Consultar BD (si aplica)
                           │
                           ▼
                    Render vista / JSON response
                           │
                           ▼
                    HTTP RESPONSE
                           │
                           ▼
                    Usuario (Browser)
```

---

## Escalabilidad Futura

```
Nivel 1: MVP (Actual)
├─ Sesión en memoria
├─ Single server
└─ MySQL directo

Nivel 2: Crecimiento
├─ Redis para sesiones
├─ Load balancer (nginx)
├─ Cache con Redis
└─ DB replication

Nivel 3: Producción
├─ Microservicios
├─ Docker containers
├─ Kubernetes
├─ CDN para assets
├─ Message queue
└─ Logging centralizado
```

---

**Última actualización**: Diciembre 2025  
**Versión**: 2.0.0
