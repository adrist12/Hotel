-- ========================================
-- 🔧 SCRIPT DE CORRECCIÓN DE BASE DE DATOS
-- Ejecuta este script en phpMyAdmin para corregir la estructura
-- ========================================

USE Hotel_DB;

-- ========================================
-- CORREGIR TABLA USUARIOS
-- ========================================

-- Agregar columna nombre_completo si no existe
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS nombre_completo VARCHAR(100) AFTER id;

-- Si tienes una columna 'nombre', copiar datos a nombre_completo
UPDATE usuarios 
SET nombre_completo = COALESCE(nombre_completo, nombre, email) 
WHERE nombre_completo IS NULL OR nombre_completo = '';

-- Asegurar que la columna password existe (no contraseña)
ALTER TABLE usuarios 
CHANGE COLUMN IF EXISTS contraseña password VARCHAR(255) NOT NULL;

-- Asegurar que telefono existe
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS telefono VARCHAR(10) AFTER password;

-- ========================================
-- CORREGIR TABLA HABITACIONES
-- ========================================

-- Cambiar id_habitacion a id (si existe)
ALTER TABLE habitaciones 
CHANGE COLUMN IF EXISTS id_habitacion id INT AUTO_INCREMENT PRIMARY KEY;

-- Asegurar que disponible es BOOLEAN
ALTER TABLE habitaciones 
MODIFY COLUMN IF EXISTS disponible BOOLEAN DEFAULT TRUE;

-- Cambiar estado a disponible si existe
-- Primero agregar disponible si no existe
ALTER TABLE habitaciones 
ADD COLUMN IF NOT EXISTS disponible BOOLEAN DEFAULT TRUE;

-- Si tienes columna 'estado', convertir a disponible
UPDATE habitaciones 
SET disponible = CASE 
    WHEN estado = 'disponible' THEN TRUE 
    ELSE FALSE 
END
WHERE EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'habitaciones' 
    AND COLUMN_NAME = 'estado'
);

-- Renombrar fecha_creacion a created_at si existe
ALTER TABLE habitaciones 
CHANGE COLUMN IF EXISTS fecha_creacion created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ========================================
-- CORREGIR TABLA RESERVAS
-- ========================================

-- Cambiar id_reserva a id
ALTER TABLE reservas 
CHANGE COLUMN IF EXISTS id_reserva id INT AUTO_INCREMENT PRIMARY KEY;

-- Cambiar id_usuario a usuario_id
ALTER TABLE reservas 
CHANGE COLUMN IF EXISTS id_usuario usuario_id INT NOT NULL;

-- Cambiar id_habitacion a habitacion_id
ALTER TABLE reservas 
CHANGE COLUMN IF EXISTS id_habitacion habitacion_id INT NOT NULL;

-- Cambiar fecha_inicio a fecha_entrada
ALTER TABLE reservas 
CHANGE COLUMN IF EXISTS fecha_inicio fecha_entrada DATE NOT NULL;

-- Cambiar fecha_fin a fecha_salida
ALTER TABLE reservas 
CHANGE COLUMN IF EXISTS fecha_fin fecha_salida DATE NOT NULL;

-- Cambiar total a costo_total
ALTER TABLE reservas 
CHANGE COLUMN IF EXISTS total costo_total DECIMAL(10, 2) NOT NULL;

-- Cambiar fecha_creacion a fecha_reserva
ALTER TABLE reservas 
CHANGE COLUMN IF EXISTS fecha_creacion fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================

-- Ver estructura final de usuarios
SELECT 'Estructura de USUARIOS:' as Tabla;
DESCRIBE usuarios;

-- Ver estructura final de habitaciones
SELECT 'Estructura de HABITACIONES:' as Tabla;
DESCRIBE habitaciones;

-- Ver estructura final de reservas
SELECT 'Estructura de RESERVAS:' as Tabla;
DESCRIBE reservas;

-- ========================================
-- FIN DE LA CORRECCIÓN
-- ========================================
