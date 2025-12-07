# 📋 DOCUMENTACIÓN - SISTEMA DE GESTIÓN HOTELERA

## 🏗️ Arquitectura General

### Stack Tecnológico
- **Backend**: Node.js + Express 5.1.0
- **Base de Datos**: MySQL 8.x (Clever Cloud)
- **Frontend**: EJS + HTML5 + CSS3
- **Autenticación**: Bcryptjs + express-session + Google OAuth 2.0
- **ORM**: mysql2/promise (conexiones asincrónicas)

### Estructura de Carpetas
```
d:\Universidad\Hotel/
├── app.js                    # Punto de entrada principal
├── package.json              # Dependencias
├── .env                      # Variables de entorno (no versionar)
├── .env.example              # Template de variables
├── public/
│   └── css/styles.css        # Estilos globales
├── src/
│   ├── auth.js               # Rutas de autenticación
│   ├── database.js           # Pool de conexión MySQL
│   └── passport.js           # Configuración Google OAuth
├── views/
│   ├── index.ejs             # Landing page
│   ├── login.ejs             # Formulario login
│   ├── registro.ejs          # Formulario registro
│   ├── dashboard-cliente.ejs # Dashboard cliente
│   ├── dashboard-admin.ejs   # Dashboard administrador
│   ├── error.ejs             # Página de errores
│   ├── reservas.ejs          # Gestión de reservas
│   └── habitaciones.ejs      # Catálogo habitaciones
└── docs/
    ├── DOCUMENTACION.md      # Este archivo
    ├── GOOGLE_OAUTH_SETUP.md # Setup OAuth
    └── SCHEMA.md             # Schema de BD
```

---

## 🗄️ Base de Datos

### Tablas Principales

#### `roles`
```sql
CREATE TABLE roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);
-- Valores: 'admin', 'cliente'
```

#### `usuarios`
```sql
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    google_id VARCHAR(255),              -- Para OAuth
    id_rol INT NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
);
```

#### `habitaciones`
```sql
CREATE TABLE habitaciones (
    id_habitacion INT AUTO_INCREMENT PRIMARY KEY,
    numero VARCHAR(10) NOT NULL UNIQUE,
    tipo VARCHAR(50) NOT NULL,          -- estándar, premium, suite, penthouse
    precio DECIMAL(10,2) NOT NULL,
    capacidad INT DEFAULT 2,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'disponible' -- disponible, ocupada, mantenimiento
);
```

#### `reservas`
```sql
CREATE TABLE reservas (
    id_reserva INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_habitacion INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    total DECIMAL(10,2),
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, confirmada, cancelada, finalizada
    fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_habitacion) REFERENCES habitaciones(id_habitacion)
);
```

#### `servicios_adicionales`
```sql
CREATE TABLE servicios_adicionales (
    id_servicio INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL
);
```

#### `reserva_servicio`
```sql
CREATE TABLE reserva_servicio (
    id_reserva INT NOT NULL,
    id_servicio INT NOT NULL,
    cantidad INT DEFAULT 1,
    subtotal DECIMAL(10,2),
    PRIMARY KEY (id_reserva, id_servicio),
    FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva) ON DELETE CASCADE,
    FOREIGN KEY (id_servicio) REFERENCES servicios_adicionales(id_servicio)
);
```

#### `pagos`
```sql
CREATE TABLE pagos (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_reserva INT NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    metodo VARCHAR(50),                 -- tarjeta, efectivo, transferencia
    estado VARCHAR(20) DEFAULT 'pendiente',
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_reserva) REFERENCES reservas(id_reserva)
);
```

---

## 🔐 Autenticación y Sesiones

### Flujo de Login (Email/Contraseña)

```
1. Usuario va a /auth/login
2. POST a /auth/login con email + contrasena
3. Base datos busca usuario por email
4. Comparar bcrypt hash de contraseña
5. Si coincide:
   - Crear sesión en req.session
   - Guardar: userId, nombre, email, id_rol
   - Redirigir a /dashboard
6. Si no coincide: Mostrar error
```

### Flujo de Login con Google OAuth

```
1. Usuario hace clic en "Iniciar sesión con Google"
2. Redirige a GET /auth/google
3. Passport redirige a Google
4. Usuario selecciona cuenta e "Permite" acceso
5. Google redirige a GET /auth/google/callback
6. Passport busca/crea usuario en BD
7. Crear sesión con datos de usuario
8. Redirigir a /dashboard
```

### Configuración de Sesión

```javascript
// app.js
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,    // true en producción con HTTPS
        httpOnly: true,   // No accesible desde JavaScript
        maxAge: 1000 * 60 * 60 * 24  // 24 horas
    }
}));
```

### Middlewares de Autenticación

```javascript
// Requiere estar autenticado
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    next();
};

// Requiere ser administrador
const requireAdmin = (req, res, next) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    if (req.session.id_rol !== 1) {  // id_rol 1 = admin
        return res.status(403).render('error', {
            message: 'Acceso denegado',
            codigo: 403
        });
    }
    next();
};
```

---

## 📊 Rutas de la API

### Rutas de Autenticación (GET/POST)

| Método | Ruta | Descripción | Protegida |
|--------|------|-------------|-----------|
| GET | `/auth/login` | Formulario login | No |
| POST | `/auth/login` | Procesar login | No |
| GET | `/auth/registro` | Formulario registro | No |
| POST | `/auth/registro` | Crear usuario nuevo | No |
| GET | `/auth/google` | Iniciar OAuth con Google | No |
| GET | `/auth/google/callback` | Callback de Google | No |
| GET | `/logout` | Cerrar sesión | Sí |

### Rutas de Dashboard

| Método | Ruta | Descripción | Protegida | Rol |
|--------|------|-------------|-----------|-----|
| GET | `/dashboard` | Dashboard personalizado | Sí | Ambos |
| GET | `/` | Landing page | No | - |

### Rutas de Reservas (Cliente)

| Método | Ruta | Descripción | Protegida | Rol |
|--------|------|-------------|-----------|-----|
| GET | `/reservas` | Mis reservas | Sí | Cliente |
| POST | `/reservar` | Crear nueva reserva | Sí | Cliente |
| GET | `/reservas/:id` | Detalle de reserva | Sí | Cliente |
| PUT | `/reservas/:id/cancelar` | Cancelar reserva | Sí | Cliente |

### Rutas de Administración (Admin)

| Método | Ruta | Descripción | Protegida | Rol |
|--------|------|-------------|-----------|-----|
| GET | `/admin/habitaciones` | Listar habitaciones | Sí | Admin |
| POST | `/admin/habitaciones` | Crear habitación | Sí | Admin |
| PUT | `/admin/habitaciones/:id` | Actualizar habitación | Sí | Admin |
| DELETE | `/admin/habitaciones/:id` | Eliminar habitación | Sí | Admin |
| GET | `/admin/reservas` | Listar todas las reservas | Sí | Admin |
| PUT | `/admin/reservas/:id` | Actualizar estado de reserva | Sí | Admin |
| GET | `/admin/usuarios` | Listar usuarios | Sí | Admin |
| GET | `/admin/reportes` | Reportes y estadísticas | Sí | Admin |

### Rutas API (JSON)

| Método | Ruta | Descripción | Protegida |
|--------|------|-------------|-----------|
| GET | `/api/habitaciones/disponibles` | Habitaciones disponibles | No |
| POST | `/api/check-disponibilidad` | Verificar disponibilidad | No |
| GET | `/api/servicios` | Listar servicios adicionales | No |
| POST | `/api/reservas/precio` | Calcular precio de reserva | No |

---

## 👥 Flujos de Usuario

### 1. Nuevo Usuario (Registro)

```
1. Ir a http://localhost:3000
2. Clic en "Crear Cuenta"
3. Completar: Nombre, Email, Contraseña
4. Enviar formulario
   └─ Validar email no exista
   └─ Hash contraseña con bcryptjs
   └─ Insertar en BD tabla usuarios
5. Redirigir a login con mensaje "Registro exitoso"
6. Completar login y acceder a dashboard cliente
```

### 2. Cliente Haciendo Reserva

```
1. Cliente inicia sesión
2. Ve dashboard-cliente.ejs
3. Pestaña "Habitaciones Disponibles"
4. Selecciona habitación y fechas
5. Clic en "Reservar Ahora"
   └─ Validar fechas (fin > inicio)
   └─ Validar habitación disponible
   └─ Calcular noches y precio
   └─ Insertar en tabla reservas (estado='pendiente')
6. Mostrar resumen y opción de pagar
7. POST a /pagos con método de pago
8. Actualizar reserva a estado='confirmada'
```

### 3. Administrador Gestionando Reservas

```
1. Admin inicia sesión
2. Ve dashboard-admin.ejs
3. Pestaña "Reservas"
4. Ve todas las reservas de todos los usuarios
5. Puede:
   └─ Cambiar estado (pendiente → confirmada → finalizada)
   └─ Ver detalles del cliente y habitación
   └─ Cancelar reserva
6. Pestaña "Habitaciones"
   └─ Ver todas
   └─ Crear nueva
   └─ Editar estado y precio
   └─ Eliminar
```

---

## 🎨 Vistas (Plantillas EJS)

### index.ejs
- Landing page con hero section
- Características del hotel
- CTA (Call To Action) a login/registro
- Footer

### login.ejs
- Formulario email + contraseña
- Botón "Iniciar sesión con Google"
- Link a página de registro
- Mensajes de error/éxito

### registro.ejs
- Formulario nombre + email + contraseña
- Validaciones frontend
- Nota de seguridad para contraseña
- Link a login

### dashboard-cliente.ejs
- Tabs: Mis Reservas | Reservar | Mi Perfil
- **Mis Reservas**: Tabla con historial
- **Reservar**: Galería de habitaciones + modal de reserva
- **Mi Perfil**: Datos del usuario

### dashboard-admin.ejs
- Tabs: Dashboard | Habitaciones | Reservas | Usuarios
- **Dashboard**: Estadísticas (usuarios, habitaciones, reservas activas, ingresos)
- **Habitaciones**: Tabla CRUD completo
- **Reservas**: Tabla con status updatable
- **Usuarios**: Lista de usuarios registrados

---

## 🌐 Variables de Entorno (.env)

```env
# Google OAuth
GOOGLE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu_client_secret
CALLBACK_URL=http://localhost:3000/auth/google/callback

# Sesión
SESSION_SECRET=UnaClaveSecretaMuyLargaYCompleja

# Base de Datos (ya configurada en database.js)
# HOST=brvt658lkj42ridoadsa-mysql.services.clever-cloud.com
# USER=urzvmjaoqrumzldr
# PASSWORD=uBPy1lZAJpo2iFAfmDeD
# DATABASE=brvt658lkj42ridoadsa
```

---

## 🚀 Instalación y Ejecución

### Requisitos
- Node.js 16+
- MySQL 8.x (conexión a Clever Cloud)
- npm

### Pasos

```bash
# 1. Clonar o descargar el proyecto
cd d:\Universidad\Hotel

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env (copiar de .env.example)
cp .env.example .env
# Editar .env con tus credenciales

# 4. Crear la base de datos (ejecutar en MySQL)
# Ver archivo SCHEMA.md

# 5. Ejecutar el servidor
node app.js

# 6. Abrir en navegador
# http://localhost:3000
```

---

## 🔍 Solucionar Problemas

### Error: "ENOTFOUND" en la BD
- **Causa**: No hay conexión a BD o credenciales incorrectas
- **Solución**: Verificar host, usuario, contraseña en `database.js`

### Error: "GOOGLE_CLIENT_ID is undefined"
- **Causa**: No existe archivo `.env`
- **Solución**: Crear `.env` con variables de GOOGLE_OAUTH_SETUP.md

### Usuario no puede login después de registro
- **Causa**: Contraseña no hasheada correctamente
- **Solución**: Verificar que auth.js usa `bcrypt.hash()` con 10 rondas

### Sesión expira inmediatamente
- **Causa**: `secure: true` sin HTTPS
- **Solución**: En desarrollo, usar `secure: false`; en producción usar HTTPS

---

## 📈 Mejoras Futuras

- [ ] Fotos de habitaciones
- [ ] Sistema de reviews y ratings
- [ ] Notificaciones por email
- [ ] Integración con Stripe para pagos
- [ ] Dashboard con gráficos (Chart.js)
- [ ] Exportar reportes (PDF/Excel)
- [ ] Soporte multi-idioma
- [ ] App móvil (React Native)
- [ ] Chat en vivo con soporte

---

## 📞 Contacto y Soporte

Para dudas o reportar bugs:
- Email: admin@hotel.com
- GitHub: [Repositorio del proyecto]
- Documentación: Ver archivos .md en la raíz

---

**Última actualización**: Diciembre 2025  
**Versión**: 2.0.0  
**Autor**: Adrian Acosta
