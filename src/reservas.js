import express from 'express';
import { database } from './database.js';

const router = express.Router();

// Middleware para verificar autenticación
const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    next();
};

// Middleware para verificar rol cliente
const requireCliente = (req, res, next) => {
    if (req.session.id_rol !== 2) {
        return res.status(403).json({ error: 'Solo clientes' });
    }
    next();
};

// Middleware para verificar rol admin
const requireAdmin = (req, res, next) => {
    if (req.session.id_rol !== 1) {
        return res.status(403).json({ error: 'Solo administradores' });
    }
    next();
};

// ============================================
// RUTAS CLIENTE - RESERVAS
// ============================================

// GET /reservas - Obtener mis reservas
router.get('/mis-reservas', requireLogin, requireCliente, async (req, res) => {
    try {
        const [reservas] = await database.execute(
            `SELECT r.*, h.numero, h.tipo, h.precio, u.nombre as cliente
             FROM reservas r
             JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
             JOIN usuarios u ON r.id_usuario = u.id_usuario
             WHERE r.id_usuario = ?
             ORDER BY r.fecha_inicio DESC`,
            [req.session.userId]
        );
        res.json({ success: true, reservas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener reservas' });
    }
});

// POST /reservas - Crear nueva reserva
router.post('/crear-reserva', requireLogin, requireCliente, async (req, res) => {
    try {
        const { id_habitacion, fecha_inicio, fecha_fin, servicios_ids } = req.body;

        // Validar fechas
        const inicio = new Date(fecha_inicio);
        const fin = new Date(fecha_fin);

        if (inicio >= fin) {
            return res.status(400).json({ error: 'Fecha fin debe ser mayor que fecha inicio' });
        }

        // Validar que la habitación esté disponible
        const [habitacionRes] = await database.execute(
            `SELECT * FROM habitaciones WHERE id_habitacion = ? AND estado = 'disponible'`,
            [id_habitacion]
        );

        if (habitacionRes.length === 0) {
            return res.status(404).json({ error: 'Habitación no disponible' });
        }

        const habitacion = habitacionRes[0];

        // Calcular noches y precio
        const noches = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24));
        let total = noches * habitacion.precio;

        // Agregar servicios adicionales si existen
        let servicios_total = 0;
        if (servicios_ids && servicios_ids.length > 0) {
            const [servicios] = await database.execute(
                `SELECT precio FROM servicios_adicionales WHERE id_servicio IN (${servicios_ids.map(() => '?').join(',')}`,
                servicios_ids
            );
            servicios_total = servicios.reduce((sum, s) => sum + parseFloat(s.precio), 0);
        }

        total += servicios_total;

        // Insertar reserva
        const [result] = await database.execute(
            `INSERT INTO reservas (id_usuario, id_habitacion, fecha_inicio, fecha_fin, total, estado)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.session.userId, id_habitacion, fecha_inicio, fecha_fin, total, 'pendiente']
        );

        const reserva_id = result.insertId;

        // Insertar servicios si existen
        if (servicios_ids && servicios_ids.length > 0) {
            for (const id_servicio of servicios_ids) {
                const [servicio] = await database.execute(
                    `SELECT precio FROM servicios_adicionales WHERE id_servicio = ?`,
                    [id_servicio]
                );
                const subtotal = servicio[0].precio;
                await database.execute(
                    `INSERT INTO reserva_servicio (id_reserva, id_servicio, cantidad, subtotal)
                     VALUES (?, ?, ?, ?)`,
                    [reserva_id, id_servicio, 1, subtotal]
                );
            }
        }

        res.json({
            success: true,
            message: 'Reserva creada correctamente',
            id_reserva: reserva_id,
            total: total
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al crear la reserva' });
    }
});

// PUT /reservas/:id/cancelar - Cancelar reserva
router.put('/cancelar/:id', requireLogin, requireCliente, async (req, res) => {
    try {
        const { id } = req.params;

        // Validar que la reserva pertenece al usuario
        const [reservas] = await database.execute(
            `SELECT * FROM reservas WHERE id_reserva = ? AND id_usuario = ?`,
            [id, req.session.userId]
        );

        if (reservas.length === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }

        // Solo permitir cancelar si está pendiente o confirmada
        if (!['pendiente', 'confirmada'].includes(reservas[0].estado)) {
            return res.status(400).json({ error: 'No se puede cancelar esta reserva' });
        }

        await database.execute(
            `UPDATE reservas SET estado = 'cancelada' WHERE id_reserva = ?`,
            [id]
        );

        res.json({ success: true, message: 'Reserva cancelada' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al cancelar' });
    }
});

// DELETE /reservas/:id - Eliminar reserva del historial
router.delete('/reservas/:id', requireLogin, requireCliente, async (req, res) => {
    try {
        const { id } = req.params;

        // Validar que la reserva pertenece al usuario
        const [reservas] = await database.execute(
            `SELECT * FROM reservas WHERE id_reserva = ? AND id_usuario = ?`,
            [id, req.session.userId]
        );

        if (reservas.length === 0) {
            return res.status(404).json({ error: 'Reserva no encontrada' });
        }

        // Solo permitir eliminar si está cancelada o finalizada
        if (!['cancelada', 'finalizada'].includes(reservas[0].estado)) {
            return res.status(400).json({ error: 'Solo se pueden eliminar reservas canceladas o finalizadas' });
        }

        // Eliminar pagos asociados primero (no hay ON DELETE CASCADE)
        await database.execute(
            `DELETE FROM pagos WHERE id_reserva = ?`,
            [id]
        );

        // Eliminar reserva
        await database.execute(
            `DELETE FROM reservas WHERE id_reserva = ?`,
            [id]
        );

        res.json({ success: true, message: 'Reserva eliminada' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al eliminar' });
    }
});

// ============================================
// RUTAS ADMIN - GESTIÓN
// ============================================

// GET /admin/reservas - Listar todas las reservas
router.get('/admin/reservas', requireLogin, requireAdmin, async (req, res) => {
    try {
        const [reservas] = await database.execute(
            `SELECT r.*, h.numero, h.tipo, u.nombre as cliente
             FROM reservas r
             JOIN habitaciones h ON r.id_habitacion = h.id_habitacion
             JOIN usuarios u ON r.id_usuario = u.id_usuario
             ORDER BY r.fecha_inicio DESC`
        );
        res.json({ success: true, reservas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error' });
    }
});

// PUT /admin/reservas/:id - Actualizar estado
router.put('/admin/reservas/:id', requireLogin, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const estados_validos = ['pendiente', 'confirmada', 'cancelada', 'finalizada'];
        if (!estados_validos.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        await database.execute(
            `UPDATE reservas SET estado = ? WHERE id_reserva = ?`,
            [estado, id]
        );

        res.json({ success: true, message: 'Reserva actualizada' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error' });
    }
});

// GET /admin/habitaciones - Listar habitaciones
router.get('/admin/habitaciones', requireLogin, requireAdmin, async (req, res) => {
    try {
        const [habitaciones] = await database.execute(
            `SELECT * FROM habitaciones ORDER BY numero ASC`
        );
        res.json({ success: true, habitaciones });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error' });
    }
});

// POST /admin/habitaciones - Crear habitación
router.post('/admin/habitaciones', requireLogin, requireAdmin, async (req, res) => {
    try {
        const { numero, tipo, precio, capacidad, descripcion, estado } = req.body;

        if (!numero || !tipo || !precio) {
            return res.status(400).json({ error: 'Campos requeridos' });
        }

        const [result] = await database.execute(
            `INSERT INTO habitaciones (numero, tipo, precio, capacidad, descripcion, estado)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [numero, tipo, precio, capacidad || 2, descripcion || '', estado || 'disponible']
        );

        res.json({ success: true, id_habitacion: result.insertId });

    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Número de habitación duplicado' });
        }
        res.status(500).json({ error: 'Error' });
    }
});

// PUT /admin/habitaciones/:id - Actualizar habitación
router.put('/admin/habitaciones/:id', requireLogin, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { numero, tipo, precio, capacidad, descripcion, estado } = req.body;

        await database.execute(
            `UPDATE habitaciones SET numero=?, tipo=?, precio=?, capacidad=?, descripcion=?, estado=?
             WHERE id_habitacion = ?`,
            [numero, tipo, precio, capacidad, descripcion, estado, id]
        );

        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error' });
    }
});

// DELETE /admin/habitaciones/:id - Eliminar habitación
router.delete('/admin/habitaciones/:id', requireLogin, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Validar que no tenga reservas activas
        const [reservas] = await database.execute(
            `SELECT COUNT(*) as count FROM reservas WHERE id_habitacion = ? AND estado != 'cancelada'`,
            [id]
        );

        if (reservas[0].count > 0) {
            return res.status(400).json({ error: 'No se puede eliminar, tiene reservas activas' });
        }

        await database.execute(
            `DELETE FROM habitaciones WHERE id_habitacion = ?`,
            [id]
        );

        res.json({ success: true });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error' });
    }
});

// ============================================
// RUTAS PÚBLICAS - INFORMACIÓN
// ============================================

// GET /api/habitaciones/disponibles - Habitaciones disponibles
router.get('/api/habitaciones/disponibles', async (req, res) => {
    try {
        const [habitaciones] = await database.execute(
            `SELECT * FROM habitaciones WHERE estado = 'disponible' ORDER BY numero ASC`
        );
        res.json({ success: true, habitaciones });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error' });
    }
});

// POST /api/check-disponibilidad - Verificar disponibilidad
router.post('/api/check-disponibilidad', async (req, res) => {
    try {
        const { id_habitacion, fecha_inicio, fecha_fin } = req.body;

        const [reservas] = await database.execute(
            `SELECT COUNT(*) as count FROM reservas 
             WHERE id_habitacion = ? 
             AND estado != 'cancelada'
             AND (
                (fecha_inicio <= ? AND fecha_fin > ?)
                OR (fecha_inicio < ? AND fecha_fin >= ?)
                OR (fecha_inicio >= ? AND fecha_fin <= ?)
             )`,
            [id_habitacion, fecha_fin, fecha_inicio, fecha_fin, fecha_inicio, fecha_inicio, fecha_fin]
        );

        const disponible = reservas[0].count === 0;
        res.json({ success: true, disponible });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error' });
    }
});

// GET /api/servicios - Listar servicios
router.get('/api/servicios', async (req, res) => {
    try {
        const [servicios] = await database.execute(
            `SELECT * FROM servicios_adicionales`
        );
        res.json({ success: true, servicios });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error' });
    }
});

export const reservas = router;
