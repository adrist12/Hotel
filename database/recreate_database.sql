-- ========================================
-- RECREAR BASE DE DATOS DESDE CERO
-- ========================================

-- Eliminar tablas existentes
DROP TABLE IF EXISTS reservas;
DROP TABLE IF EXISTS habitaciones;
DROP TABLE IF EXISTS usuarios;

-- ========================================
-- TABLA USUARIOS
-- ========================================
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    telefono VARCHAR(10),
    rol ENUM('admin', 'cliente') DEFAULT 'cliente', 
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- TABLA HABITACIONES
-- ========================================
CREATE TABLE habitaciones (
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

-- ========================================
-- TABLA RESERVAS
-- ========================================
CREATE TABLE reservas (
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

-- ========================================
-- DATOS DE PRUEBA - HABITACIONES
-- ========================================
INSERT INTO habitaciones (numero, tipo, descripcion, precio_noche, capacidad, imagen_url, disponible) VALUES
('101', 'Individual', 'Habitación individual con cama queen size, escritorio y baño privado.', 50.00, 1, '', TRUE),
('102', 'Individual', 'Habitación acogedora perfecta para viajeros solitarios.', 50.00, 1, '', TRUE),
('103', 'Individual', 'Habitación individual con vista a la ciudad.', 55.00, 1, '', TRUE),
('201', 'Doble', 'Amplia habitación con dos camas matrimoniales o una king size.', 80.00, 2, '', TRUE),
('202', 'Doble', 'Habitación doble con balcón y vista al jardín.', 85.00, 2, '', TRUE),
('203', 'Doble', 'Habitación confortable para parejas o amigos.', 80.00, 2, '', TRUE),
('301', 'Suite', 'Suite de lujo con sala de estar, jacuzzi y vista panorámica.', 150.00, 3, '', TRUE),
('302', 'Suite', 'Suite ejecutiva con área de trabajo y sala de reuniones.', 160.00, 3, '', TRUE),
('401', 'Familiar', 'Habitación familiar con dos habitaciones separadas.', 120.00, 4, '', TRUE),
('402', 'Familiar', 'Amplia habitación para familias grandes con cocina pequeña.', 125.00, 5, '', TRUE);

-- ========================================
-- VERIFICACIÓN
-- ========================================
SELECT '✅ Tablas creadas correctamente' AS Resultado;
SELECT CONCAT('Total habitaciones: ', COUNT(*)) AS Info FROM habitaciones;
