const { query } = require('./database');

// Obtener todas las habitaciones (admin)
async function obtenerTodasHabitaciones() {
    try {
        const habitaciones = await query(
            'SELECT * FROM habitaciones ORDER BY numero ASC'
        );
        return habitaciones;
    } catch (error) {
        console.error('Error al obtener habitaciones:', error);
        throw error;
    }
}

// Obtener solo habitaciones disponibles (cliente)
async function obtenerHabitacionesDisponibles() {
    try {
        const habitaciones = await query(
            'SELECT * FROM habitaciones WHERE disponible = TRUE ORDER BY precio_noche ASC'
        );
        return habitaciones;
    } catch (error) {
        console.error('Error al obtener habitaciones disponibles:', error);
        throw error;
    }
}

// Verificar disponibilidad de habitación en un rango de fechas
async function verificarDisponibilidad(idHabitacion, fecha_entrada, fecha_salida) {
    try {
        const reservas = await query(`
            SELECT COUNT(*) as count 
            FROM reservas 
            WHERE habitacion_id = ? 
            AND estado != 'cancelada'
            AND (
                (fecha_entrada BETWEEN ? AND ?) OR
                (fecha_salida BETWEEN ? AND ?) OR
                (fecha_entrada <= ? AND fecha_salida >= ?)
            )
        `, [idHabitacion, fecha_entrada, fecha_salida, fecha_entrada, fecha_salida, fecha_entrada, fecha_salida]);
        
        return reservas[0].count === 0;
    } catch (error) {
        console.error('Error al verificar disponibilidad:', error);
        throw error;
    }
}

// Crear nueva habitación (admin)
async function crearHabitacion(datos) {
    try {
        const { numero, tipo, precio_noche, capacidad, descripcion, imagen_url } = datos;
        
        // Verificar que el número no exista
        const existing = await query(
            'SELECT id FROM habitaciones WHERE numero = ?',
            [numero]
        );
        
        if (existing.length > 0) {
            return {
                success: false,
                message: 'Ya existe una habitación con ese número'
            };
        }
        
        const result = await query(
            `INSERT INTO habitaciones (numero, tipo, precio_noche, capacidad, descripcion, imagen_url, disponible) 
             VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
            [numero, tipo, precio_noche, capacidad, descripcion || '', imagen_url || '']
        );
        
        return {
            success: true,
            message: 'Habitación creada exitosamente',
            habitacionId: result.insertId
        };
    } catch (error) {
        console.error('Error al crear habitación:', error);
        return {
            success: false,
            message: 'Error al crear habitación'
        };
    }
}

// Actualizar habitación (admin)
async function actualizarHabitacion(idHabitacion, datos) {
    try {
        const { numero, tipo, precio_noche, capacidad, descripcion, imagen_url, disponible } = datos;
        
        await query(
            `UPDATE habitaciones 
             SET numero = ?, tipo = ?, precio_noche = ?, capacidad = ?, 
                 descripcion = ?, imagen_url = ?, disponible = ?
             WHERE id = ?`,
            [numero, tipo, precio_noche, capacidad, descripcion, imagen_url, disponible === 'true' || disponible === true || disponible === 1, idHabitacion]
        );
        
        return {
            success: true,
            message: 'Habitación actualizada exitosamente'
        };
    } catch (error) {
        console.error('Error al actualizar habitación:', error);
        return {
            success: false,
            message: 'Error al actualizar habitación'
        };
    }
}

// Eliminar habitación (admin)
async function eliminarHabitacion(idHabitacion) {
    try {
        // Verificar que no tenga reservas activas
        const reservasActivas = await query(
            `SELECT COUNT(*) as count FROM reservas 
             WHERE habitacion_id = ? AND estado IN ('pendiente', 'confirmada')`,
            [idHabitacion]
        );
        
        if (reservasActivas[0].count > 0) {
            return {
                success: false,
                message: 'No se puede eliminar. La habitación tiene reservas activas.'
            };
        }
        
        await query('DELETE FROM habitaciones WHERE id = ?', [idHabitacion]);
        
        return {
            success: true,
            message: 'Habitación eliminada exitosamente'
        };
    } catch (error) {
        console.error('Error al eliminar habitación:', error);
        return {
            success: false,
            message: 'Error al eliminar habitación'
        };
    }
}

// Obtener estadísticas (admin)
async function obtenerEstadisticas() {
    try {
        const [totalHabitaciones] = await query('SELECT COUNT(*) as total FROM habitaciones');
        const [habitacionesDisponibles] = await query(
            'SELECT COUNT(*) as total FROM habitaciones WHERE disponible = TRUE'
        );
        const [reservasActivas] = await query(
            "SELECT COUNT(*) as total FROM reservas WHERE estado IN ('pendiente', 'confirmada')"
        );
        const [ingresosMes] = await query(
            `SELECT COALESCE(SUM(costo_total), 0) as total FROM reservas 
             WHERE MONTH(fecha_reserva) = MONTH(CURRENT_DATE()) 
             AND YEAR(fecha_reserva) = YEAR(CURRENT_DATE())
             AND estado != 'cancelada'`
        );
        
        return {
            totalHabitaciones: totalHabitaciones.total,
            habitacionesDisponibles: habitacionesDisponibles.total,
            reservasActivas: reservasActivas.total,
            ingresosMensuales: ingresosMes.total
        };
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return {
            totalHabitaciones: 0,
            habitacionesDisponibles: 0,
            reservasActivas: 0,
            ingresosMensuales: 0
        };
    }
}

module.exports = {
    obtenerTodasHabitaciones,
    obtenerHabitacionesDisponibles,
    verificarDisponibilidad,
    crearHabitacion,
    actualizarHabitacion,
    eliminarHabitacion,
    obtenerEstadisticas
};
