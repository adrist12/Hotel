const { query } = require('./database');
const { verificarDisponibilidad } = require('./habitaciones');

// Obtener todas las reservas (admin)
async function obtenerTodasReservas() {
    try {
        const reservas = await query(`
            SELECT r.*, u.nombre_completo as nombre_cliente, u.email,
                   h.numero as numero_habitacion, h.tipo as tipo_habitacion
            FROM reservas r
            JOIN usuarios u ON r.usuario_id = u.id
            JOIN habitaciones h ON r.habitacion_id = h.id
            ORDER BY r.fecha_reserva DESC
        `);
        return reservas;
    } catch (error) {
        console.error('Error al obtener reservas:', error);
        throw error;
    }
}

// Obtener reservas de un usuario específico
async function obtenerReservasPorUsuario(idUsuario) {
    try {
        const reservas = await query(`
            SELECT r.*, h.numero as numero_habitacion, h.tipo as tipo_habitacion, h.imagen_url
            FROM reservas r
            JOIN habitaciones h ON r.habitacion_id = h.id
            WHERE r.usuario_id = ?
            ORDER BY r.fecha_reserva DESC
        `, [idUsuario]);
        return reservas;
    } catch (error) {
        console.error('Error al obtener reservas del usuario:', error);
        throw error;
    }
}

// Crear nueva reserva
async function crearReserva(idUsuario, idHabitacion, fecha_entrada, fecha_salida) {
    try {
        // Validar fechas
        const entrada = new Date(fecha_entrada);
        const salida = new Date(fecha_salida);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (entrada < hoy) {
            return {
                success: false,
                message: 'La fecha de entrada no puede ser en el pasado'
            };
        }
        
        if (salida <= entrada) {
            return {
                success: false,
                message: 'La fecha de salida debe ser posterior a la fecha de entrada'
            };
        }
        
        // Verificar disponibilidad
        const disponible = await verificarDisponibilidad(idHabitacion, fecha_entrada, fecha_salida);
        
        if (!disponible) {
            return {
                success: false,
                message: 'La habitación no está disponible en las fechas seleccionadas'
            };
        }
        
        // Obtener precio de la habitación
        const habitaciones = await query(
            'SELECT precio_noche FROM habitaciones WHERE id = ?',
            [idHabitacion]
        );
        
        if (habitaciones.length === 0) {
            return {
                success: false,
                message: 'Habitación no encontrada'
            };
        }
        
        // Calcular total (días * precio por noche)
        const dias = Math.ceil((salida - entrada) / (1000 * 60 * 60 * 24));
        const total = dias * habitaciones[0].precio_noche;
        
        // Crear reserva
        const result = await query(
            `INSERT INTO reservas (usuario_id, habitacion_id, fecha_entrada, fecha_salida, costo_total, estado)
             VALUES (?, ?, ?, ?, ?, 'pendiente')`,
            [idUsuario, idHabitacion, fecha_entrada, fecha_salida, total]
        );
        
        return {
            success: true,
            message: 'Reserva creada exitosamente',
            reservaId: result.insertId,
            total: total,
            dias: dias
        };
    } catch (error) {
        console.error('Error al crear reserva:', error);
        return {
            success: false,
            message: 'Error al crear la reserva'
        };
    }
}

// Actualizar estado de reserva (admin)
async function actualizarEstadoReserva(idReserva, nuevoEstado) {
    try {
        const estadosValidos = ['pendiente', 'confirmada', 'cancelada', 'completada'];
        
        if (!estadosValidos.includes(nuevoEstado)) {
            return {
                success: false,
                message: 'Estado inválido'
            };
        }
        
        await query(
            'UPDATE reservas SET estado = ? WHERE id = ?',
            [nuevoEstado, idReserva]
        );
        
        return {
            success: true,
            message: 'Estado actualizado exitosamente'
        };
    } catch (error) {
        console.error('Error al actualizar estado:', error);
        return {
            success: false,
            message: 'Error al actualizar el estado'
        };
    }
}

// Cancelar reserva (cliente)
async function cancelarReserva(idReserva, idUsuario) {
    try {
        // Verificar que la reserva pertenezca al usuario
        const reservas = await query(
            'SELECT * FROM reservas WHERE id = ? AND usuario_id = ?',
            [idReserva, idUsuario]
        );
        
        if (reservas.length === 0) {
            return {
                success: false,
                message: 'Reserva no encontrada'
            };
        }
        
        const reserva = reservas[0];
        
        // No permitir cancelar si ya está completada
        if (reserva.estado === 'completada') {
            return {
                success: false,
                message: 'No se puede cancelar una reserva completada'
            };
        }
        
        // No permitir cancelar si ya está cancelada
        if (reserva.estado === 'cancelada') {
            return {
                success: false,
                message: 'La reserva ya está cancelada'
            };
        }
        
        // Cancelar reserva
        await query(
            'UPDATE reservas SET estado = ? WHERE id = ?',
            ['cancelada', idReserva]
        );
        
        return {
            success: true,
            message: 'Reserva cancelada exitosamente'
        };
    } catch (error) {
        console.error('Error al cancelar reserva:', error);
        return {
            success: false,
            message: 'Error al cancelar la reserva'
        };
    }
}

module.exports = {
    obtenerTodasReservas,
    obtenerReservasPorUsuario,
    crearReserva,
    actualizarEstadoReserva,
    cancelarReserva
};
