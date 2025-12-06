-- ========================================
-- 🏨 HOTEL FLAMINGO - SCHEMA DE BASE DE DATOS
-- ========================================
CREATE DATABASE IF NOT EXISTS Hotel_DB;
USE Hotel_DB;

-- ==================== TABLA DE USUARIOS ====================
CREATE TABLE IF NOT EXISTS usuarios(
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(10),
    rol ENUM('admin', 'cliente') DEFAULT 'cliente', 
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== TABLA DE HABITACIONES ====================
CREATE TABLE IF NOT EXISTS habitaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero VARCHAR(10) NOT NULL UNIQUE,      
    tipo VARCHAR(50) NOT NULL,               
    descripcion TEXT,                      
    precio_noche DECIMAL(10, 2) NOT NULL,    
    capacidad INT NOT NULL,                  
    imagen_url VARCHAR(255),                 
    disponible BOOLEAN DEFAULT TRUE,         
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== TABLA DE RESERVAS ====================
CREATE TABLE IF NOT EXISTS reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    habitacion_id INT NOT NULL,
    fecha_entrada DATE NOT NULL,
    fecha_salida DATE NOT NULL,
    costo_total DECIMAL(10, 2) NOT NULL,
    estado ENUM('pendiente', 'confirmada', 'cancelada', 'completada') DEFAULT 'pendiente',
    fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_reserva_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
        ON DELETE CASCADE, 

    CONSTRAINT fk_reserva_habitacion
        FOREIGN KEY (habitacion_id) REFERENCES habitaciones(id)
        ON DELETE RESTRICT 
);

-- ==================== FIN DEL SCHEMA ====================
