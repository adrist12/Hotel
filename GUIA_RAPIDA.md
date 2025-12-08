# ✅ SISTEMA CONFIGURADO Y LISTO

## 🎉 Estado Actual

El sistema **Hotel Flamingo** está completamente configurado y funcionando:

✅ **Base de datos creada** - Todas las 10 tablas + 1 vista  
✅ **Datos de prueba insertados** - Usuarios, habitaciones, servicios  
✅ **Servidor corriendo** - http://localhost:3000  
✅ **Autenticación funcional** - Email/Password + Google OAuth  

---

## 🔐 Credenciales de Acceso

### Admin
```
Email: admin@hotel.com
Contraseña: Admin123!
```

### Cliente
```
Email: cliente@test.com
Contraseña: Cliente123!
```

---

## 🚀 Cómo Iniciar

### Opción 1: Crear BD desde cero (primera vez)
```bash
cd d:\Universidad\Hotel
node scripts/crear-tablas.js
node scripts/insertar-datos.js
node app.js
```

### Opción 2: Solo iniciar servidor (si ya existe BD)
```bash
cd d:\Universidad\Hotel
node app.js
```

Luego abre: **http://localhost:3000**

---

## 📊 Base de Datos - Estructura

### Tablas Creadas
1. ✅ **roles** - Admin (1) y Cliente (2)
2. ✅ **usuarios** - Usuarios del sistema con contraseñas hasheadas
3. ✅ **empleados** - Personal del hotel
4. ✅ **habitaciones** - Inventario de cuartos
5. ✅ **fotos_habitaciones** - Imágenes de habitaciones
6. ✅ **servicios_adicionales** - Desayuno, spa, gym, etc.
7. ✅ **reservas** - Reservaciones de clientes
8. ✅ **reserva_servicio** - Servicios solicitados por reserva
9. ✅ **pagos** - Pagos procesados
10. ✅ **vista_reservas** - Vista SQL para reportes

---

## 🧪 Datos Iniciales

### Usuarios
- **Admin**: admin@hotel.com / Admin123! (id_rol=1)
- **Cliente**: cliente@test.com / Cliente123! (id_rol=2)

### Habitaciones (7 disponibles)
- 2x Estándar @ $50
- 2x Premium @ $80
- 2x Suite @ $120
- 1x Penthouse @ $200

### Servicios (5 disponibles)
- Desayuno Buffet - $15
- Spa y Sauna - $50
- Gym 24h - $10
- Parqueadero - $5
- WiFi Premium - $8

---

## 🧾 Flujos Principales

### 1. Registrarse
```
GET /auth/registro → Formulario
POST /auth/registro → Crea usuario con id_rol=2
Redirect → /auth/login
```

### 2. Login
```
GET /auth/login → Formulario
POST /auth/login → Valida email + contraseña (bcrypt)
Redirect → /dashboard
```

### 3. Dashboard (Automático según rol)
```
id_rol = 1 → dashboard-admin.ejs (estadísticas, gestión)
id_rol = 2 → dashboard-cliente.ejs (mis reservas, crear reserva)
```

### 4. Crear Reserva (Solo clientes)
```
POST /reservar
- Validar fechas
- Verificar disponibilidad
- Calcular total (precio × noches + servicios)
- Guardar en BD
```

---

## 🔧 Scripts Disponibles

```bash
# Crear todas las tablas
node scripts/crear-tablas.js

# Insertar datos de prueba
node scripts/insertar-datos.js

# Crear/actualizar usuario admin
node scripts/crear-admin.js

# Crear/actualizar usuario cliente
node scripts/crear-cliente.js

# Iniciar servidor
node app.js
```

---

## 📁 Estructura de Carpetas

```
Hotel/
├── app.js                          # Servidor principal
├── package.json                    # Dependencias
├── .env.example                    # Variables de entorno
│
├── src/
│   ├── auth.js                     # Rutas de autenticación
│   ├── passport.js                 # Google OAuth 2.0
│   ├── reservas.js                 # CRUD de reservas
│   └── database.js                 # Conexión MySQL
│
├── views/
│   ├── index.ejs                   # Landing page
│   ├── login.ejs                   # Formulario login
│   ├── registro.ejs                # Formulario registro
│   ├── dashboard-admin.ejs         # Panel admin
│   ├── dashboard-cliente.ejs       # Panel cliente
│   ├── error.ejs                   # Página error
│   └── habitaciones.ejs            # Listado habitaciones
│
├── public/
│   └── css/
│       └── styles.css              # Estilos CSS
│
├── scripts/
│   ├── crear-tablas.js             # Crear BD
│   ├── insertar-datos.js           # Datos iniciales
│   ├── crear-admin.js              # Usuario admin
│   └── crear-cliente.js            # Usuario cliente
│
└── Documentación/
    ├── README.md                   # Guía rápida
    ├── DOCUMENTACION.md            # Doc técnica
    ├── SCHEMA.md                   # Schema SQL
    ├── ARQUITECTURA.md             # Diagramas
    ├── IMPLEMENTACION.md           # Resumen
    ├── CREDENCIALES_PRUEBA.md      # Usuarios
    └── VERIFICACION_DASHBOARD.md   # Validaciones
```

---

## ✨ Próximos Pasos

1. **Prueba el login** con admin@hotel.com / Admin123!
2. **Explora el dashboard** - Ver estadísticas, habitaciones, reservas
3. **Crea una reserva** con cliente@test.com / Cliente123!
4. **Configura Google OAuth** (opcional) - Ver GOOGLE_OAUTH_SETUP.md

---

## 🐛 Si Algo Falla

### Error 500 en dashboard
- Verifica que `crear-tablas.js` ejecutó exitosamente
- Revisa que `insertar-datos.js` insertó los datos

### Login no funciona
- Verifica credenciales: admin@hotel.com / Admin123!
- Ejecuta `node scripts/crear-admin.js` para regenerar

### Base de datos no conecta
- Verifica `src/database.js` tenga credenciales correctas
- Comprueba conexión a Clever Cloud MySQL

---

## 📞 Archivos de Ayuda

| Archivo | Contenido |
|---------|-----------|
| DOCUMENTACION.md | Guía técnica completa |
| SCHEMA.md | Scripts SQL y explicación |
| ARQUITECTURA.md | Diagramas y flujos |
| GOOGLE_OAUTH_SETUP.md | Configurar OAuth |
| README.md | Inicio rápido |

---

**Estado**: ✅ LISTO PARA USAR  
**Fecha**: Diciembre 6, 2025  
**Versión**: 2.0 Final  

¡A disfrutar! 🎉
