import express from 'express';
import { database } from './database.js';

const router = express.Router();

// Middleware para verificar rol admin
const requireAdmin = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    if (req.session.id_rol !== 1) {
        return res.status(403).json({ error: 'Solo administradores' });
    }
    next();
};

// ============================================
// RUTAS ADMIN - GESTIÓN DE HABITACIONES
// ============================================

// GET /admin/habitaciones - Listar todas las habitaciones
router.get('/admin/habitaciones', requireAdmin, async (req, res) => {
    try {
        const [habitaciones] = await database.execute(
            `SELECT id_habitacion, numero, tipo, precio, estado, Descripcion 
             FROM habitaciones 
             ORDER BY numero ASC`
        );
        res.json({ success: true, habitaciones });
    } catch (error) {
        console.error('Error al obtener habitaciones:', error);
        res.status(500).json({ error: 'Error al obtener habitaciones' });
    }
});

// GET /admin/habitaciones/:id - Obtener habitación específica
router.get('/admin/habitaciones/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const [habitacion] = await database.execute(
            `SELECT * FROM habitaciones WHERE id_habitacion = ?`,
            [id]
        );
        
        if (habitacion.length === 0) {
            return res.status(404).json({ error: 'Habitación no encontrada' });
        }
        
        res.json({ success: true, habitacion: habitacion[0] });
    } catch (error) {
        console.error('Error al obtener habitación:', error);
        res.status(500).json({ error: 'Error al obtener habitación' });
    }
});

// POST /admin/habitaciones - Crear nueva habitación
router.post('/admin/habitaciones', requireAdmin, async (req, res) => {
    try {
        const { numero, tipo, precio, descripcion, estado } = req.body;

        // Validar campos requeridos
        if (!numero || !tipo || !precio) {
            return res.status(400).json({ error: 'Campos requeridos: numero, tipo, precio' });
        }

        // Validar que el número no exista
        const [existing] = await database.execute(
            `SELECT id_habitacion FROM habitaciones WHERE numero = ?`,
            [numero]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Ya existe una habitación con ese número' });
        }

        const [result] = await database.execute(
            `INSERT INTO habitaciones (numero, tipo, precio, Descripcion, estado) 
             VALUES (?, ?, ?, ?, ?)`,
            [numero, tipo, precio, descripcion || '', estado || 'disponible']
        );

        res.json({ 
            success: true, 
            message: 'Habitación creada exitosamente',
            id_habitacion: result.insertId 
        });

    } catch (error) {
        console.error('Error al crear habitación:', error);
        res.status(500).json({ error: 'Error al crear habitación' });
    }
});

// PUT /admin/habitaciones/:id - Actualizar habitación
router.put('/admin/habitaciones/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { numero, tipo, precio, descripcion, estado } = req.body;

        // Validar que la habitación existe
        const [existing] = await database.execute(
            `SELECT id_habitacion FROM habitaciones WHERE id_habitacion = ?`,
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Habitación no encontrada' });
        }

        // Validar que el número no esté en uso por otra habitación
        if (numero) {
            const [duplicate] = await database.execute(
                `SELECT id_habitacion FROM habitaciones WHERE numero = ? AND id_habitacion != ?`,
                [numero, id]
            );

            if (duplicate.length > 0) {
                return res.status(400).json({ error: 'Ya existe otra habitación con ese número' });
            }
        }

        // Construir query dinámica según los campos proporcionados
        let updateQuery = `UPDATE habitaciones SET `;
        let params = [];
        const fields = [];

        if (numero !== undefined) {
            fields.push('numero = ?');
            params.push(numero);
        }
        if (tipo !== undefined) {
            fields.push('tipo = ?');
            params.push(tipo);
        }
        if (precio !== undefined) {
            fields.push('precio = ?');
            params.push(precio);
        }
        if (descripcion !== undefined) {
            fields.push('Descripcion = ?');
            params.push(descripcion);
        }
        if (estado !== undefined) {
            fields.push('estado = ?');
            params.push(estado);
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        updateQuery += fields.join(', ') + ' WHERE id_habitacion = ?';
        params.push(id);

        await database.execute(updateQuery, params);

        res.json({ 
            success: true, 
            message: 'Habitación actualizada exitosamente'
        });

    } catch (error) {
        console.error('Error al actualizar habitación:', error);
        res.status(500).json({ error: 'Error al actualizar habitación' });
    }
});

// DELETE /admin/habitaciones/:id - Eliminar habitación
router.delete('/admin/habitaciones/:id', requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Validar que la habitación existe
        const [existing] = await database.execute(
            `SELECT id_habitacion FROM habitaciones WHERE id_habitacion = ?`,
            [id]
        );

        if (existing.length === 0) {
            return res.status(404).json({ error: 'Habitación no encontrada' });
        }

        // Validar que no tenga reservas activas
        const [reservas] = await database.execute(
            `SELECT COUNT(*) as total FROM reservas 
             WHERE id_habitacion = ? AND estado IN ('pendiente', 'confirmada')`,
            [id]
        );

        if (reservas[0].total > 0) {
            return res.status(400).json({ 
                error: 'No se puede eliminar. La habitación tiene ' + reservas[0].total + ' reserva(s) activa(s)' 
            });
        }

        await database.execute(
            `DELETE FROM habitaciones WHERE id_habitacion = ?`,
            [id]
        );

        res.json({ 
            success: true, 
            message: 'Habitación eliminada exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar habitación:', error);
        res.status(500).json({ error: 'Error al eliminar habitación' });
    }
});

export const habitaciones = router;
