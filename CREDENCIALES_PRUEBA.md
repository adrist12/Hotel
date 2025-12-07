# 🔑 Credenciales de Prueba

## ✅ Usuarios Creados en la BD

### Admin
```
Email: admin@hotel.com
Contraseña: Admin123!
Rol: Administrador
```

### Cliente
```
Email: cliente@test.com
Contraseña: Cliente123!
Rol: Cliente
```

---

## 📝 Notas Importantes

1. **Los hashes de contraseña en la BD son válidos** - Fueron generados con bcryptjs 10 rondas
2. **Prueba primero con Admin** - Acceso a panel completo
3. **Prueba con Cliente** - Acceso a funciones de reserva

---

## 🚀 Pasos para Iniciar

```bash
# 1. Ir a la raíz del proyecto
cd d:\Universidad\Hotel

# 2. Instalar dependencias (si no las tienes)
npm install

# 3. Iniciar el servidor
node app.js

# 4. Abrir en navegador
http://localhost:3000

# 5. Login con alguno de los usuarios arriba
```

---

## 🔧 Si Necesitas Cambiar Contraseñas

Ejecuta cualquiera de estos scripts:

```bash
# Para recrear el admin
node scripts/crear-admin.js

# Para recrear el cliente
node scripts/crear-cliente.js
```

Los scripts actualizan automáticamente el hash en la BD si el usuario ya existe.
