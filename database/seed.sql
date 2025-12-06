-- ========================================
-- 🏨 HOTEL FLAMINGO - DATOS DE PRUEBA
-- ========================================
USE Hotel_DB;

-- ==================== USUARIOS DE PRUEBA ====================
-- NOTA: Debes registrar usuarios desde la aplicación para generar passwords hasheados correctamente
-- Estas son solo consultas de ejemplo comentadas

-- Para crear usuarios, usa la página de registro en: http://localhost:3000/auth/registro

-- Usuario Admin (debes crearlo manualmente):
-- INSERT INTO usuarios (nombre_completo, email, password, rol) VALUES
-- ('Admin Hotel', 'admin@hotel.com', '[hash_generado_por_bcrypt]', 'admin');

-- ==================== HABITACIONES ====================
INSERT INTO habitaciones (numero, tipo, descripcion, precio_noche, capacidad, imagen_url, disponible) VALUES
-- Habitaciones Individuales
('101', 'Individual', 'Habitación individual con cama queen size, escritorio y baño privado.', 50.00, 1, '', TRUE),
('102', 'Individual', 'Habitación acogedora perfecta para viajeros solitarios.', 50.00, 1, '', TRUE),
('103', 'Individual', 'Habitación individual con vista a la ciudad.', 55.00, 1, '', TRUE),

-- Habitaciones Dobles
('201', 'Doble', 'Amplia habitación con dos camas matrimoniales o una king size.', 80.00, 2, '', TRUE),
('202', 'Doble', 'Habitación doble con balcón y vista al jardín.', 85.00, 2, '', TRUE),
('203', 'Doble', 'Habitación confortable para parejas o amigos.', 80.00, 2, '', TRUE),

-- Suites
('301', 'Suite', 'Suite de lujo con sala de estar, jacuzzi y vista panorámica.', 150.00, 3, '', TRUE),
('302', 'Suite', 'Suite ejecutiva con área de trabajo y sala de reuniones.', 160.00, 3, '', TRUE),

-- Habitaciones Familiares
('401', 'Familiar', 'Habitación familiar con dos habitaciones separadas.', 120.00, 4, '', TRUE),
('402', 'Familiar', 'Amplia habitación para familias grandes con cocina pequeña.', 125.00, 5, '', TRUE);

-- ==================== CONSULTAS ÚTILES ====================

-- Ver todas las habitaciones
-- SELECT * FROM habitaciones ORDER BY numero;

-- Ver habitaciones disponibles
-- SELECT * FROM habitaciones WHERE disponible = TRUE;

-- Contar habitaciones por tipo
-- SELECT tipo, COUNT(*) as cantidad FROM habitaciones GROUP BY tipo;

-- ==================== FIN DE DATOS DE PRUEBA ====================
