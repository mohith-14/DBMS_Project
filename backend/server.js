const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// AUTHENTICATION
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Check Users
        const [users] = await db.execute('SELECT * FROM Users WHERE email = ? AND password = ?', [email, password]);
        if (users.length > 0) {
            return res.json({ role: 'user', ...users[0] });
        }
        // Check Managers
        const [managers] = await db.execute('SELECT * FROM Managers WHERE email = ? AND password = ?', [email, password]);
        if (managers.length > 0) {
            return res.json({ role: 'manager', ...managers[0] });
        }
        return res.status(401).json({ message: 'Invalid credentials' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { name, email, phone, password } = req.body;
    try {
        const [result] = await db.execute(
            'INSERT INTO Users (name, email, phone, password) VALUES (?, ?, ?, ?)',
            [name, email, phone, password]
        );
        res.json({ message: 'User registered successfully', userId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// FACILITIES & SLOTS
// ==========================================
app.get('/api/facilities', async (req, res) => {
    try {
        const [facilities] = await db.execute('SELECT * FROM Facility');
        res.json(facilities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/facilities', async (req, res) => {
    const { facility_name, sport_type, price_per_hour, manager_id } = req.body;
    try {
        const [result] = await db.execute(
            'INSERT INTO Facility (facility_name, sport_type, price_per_hour, manager_id) VALUES (?, ?, ?, ?)',
            [facility_name, sport_type, price_per_hour, manager_id]
        );
        res.json({ message: 'Facility created successfully', facilityId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/slots/:facilityId', async (req, res) => {
    const { facilityId } = req.params;
    const { date } = req.query; // optional date filter
    try {
        // Prevent booking slots that have already started/passed
        let query = 'SELECT * FROM Slot WHERE facility_id = ? AND availability_status = "available" AND TIMESTAMP(date, start_time) > NOW()';
        let params = [facilityId];
        if (date) {
            query += ' AND date = ?';
            params.push(date);
        }
        const [slots] = await db.execute(query, params);
        res.json(slots);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/slots', async (req, res) => {
    // Managers can add slots.
    const { date, start_time, facility_id } = req.body;
    try {
        // Enforce 1-hour limit by calculating end time automatically
        const start = new Date(`1970-01-01T${start_time}Z`);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // Add 1 hour
        const end_time = end.toISOString().substr(11, 8); // Extract HH:mm:ss
        
        await db.execute(
            'INSERT INTO Slot (date, start_time, end_time, facility_id) VALUES (?, ?, ?, ?)',
            [date, start_time, end_time, facility_id]
        );
        res.json({ message: '1-hour slot created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// BOOKINGS
// ==========================================
app.post('/api/bookings', async (req, res) => {
    const { slot_id, user_id, date } = req.body;
    try {
        await db.execute('UPDATE Slot SET availability_status = "booked" WHERE slot_id = ?', [slot_id]);
        
        const [result] = await db.execute(
            'INSERT INTO Booking (booking_date, slot_id, user_id) VALUES (?, ?, ?)',
            [date, slot_id, user_id]
        );
        res.json({ message: 'Slot booked successfully', bookingId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/user/:userId/bookings', async (req, res) => {
    try {
        const [bookings] = await db.execute(
            `SELECT b.*, s.date, s.start_time, s.end_time, f.facility_name, f.price_per_hour
             FROM Booking b
             JOIN Slot s ON b.slot_id = s.slot_id
             JOIN Facility f ON s.facility_id = f.facility_id
             WHERE b.user_id = ?`,
            [req.params.userId]
        );
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/bookings/:bookingId', async (req, res) => {
    try {
        // Verify 24h cancellation limit
        const [bookingInfo] = await db.execute(
            `SELECT s.date as slot_date, s.start_time, b.slot_id, b.user_id 
             FROM Booking b 
             JOIN Slot s ON b.slot_id = s.slot_id 
             WHERE b.booking_id = ?`, [req.params.bookingId]
        );
        
        if (bookingInfo.length === 0) return res.status(404).json({ message: 'Booking not found' });
        
        const slotDateTimeStr = `${bookingInfo[0].slot_date.toISOString().split('T')[0]}T${bookingInfo[0].start_time}Z`;
        const slotDate = new Date(slotDateTimeStr);
        const now = new Date();
        
        const hoursDifference = (slotDate - now) / (1000 * 60 * 60);
        
        if (hoursDifference < 24) {
            return res.status(400).json({ message: 'Cannot cancel slots less than 24 hours before the start time.' });
        }
        
        // Allowed to cancel: First, return any rented equipment attached to this slot!
        const [rentals] = await db.execute(
            `SELECT rental_id, quantity, equipment_id FROM Rental WHERE slot_id = ? AND user_id = ? AND status = 'active'`,
            [bookingInfo[0].slot_id, bookingInfo[0].user_id]
        );
        for (let r of rentals) {
            await db.execute('UPDATE Equipment SET quantity = quantity + ? WHERE equipment_id = ?', [r.quantity, r.equipment_id]);
            await db.execute('UPDATE Rental SET status = "cancelled" WHERE rental_id = ?', [r.rental_id]);
        }

        // Now cancel the booking itself
        await db.execute('UPDATE Slot SET availability_status = "available" WHERE slot_id = ?', [bookingInfo[0].slot_id]);
        await db.execute('UPDATE Booking SET booking_status = "cancelled" WHERE booking_id = ?', [req.params.bookingId]);
        
        res.json({ message: 'Booking and associated equipment cancelled successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// EQUIPMENT & RENTALS
// ==========================================
app.get('/api/equipment', async (req, res) => {
    try {
        // Auto-return expired rentals back to inventory
        const [expiredRentals] = await db.execute(`
            SELECT r.rental_id, r.equipment_id, r.quantity 
            FROM Rental r
            JOIN Slot s ON r.slot_id = s.slot_id
            WHERE r.status = 'active'
            AND TIMESTAMP(s.date, s.end_time) < NOW()
        `);

        for (let rental of expiredRentals) {
            await db.execute('UPDATE Equipment SET quantity = quantity + ? WHERE equipment_id = ?', [rental.quantity, rental.equipment_id]);
            await db.execute('UPDATE Rental SET status = "returned" WHERE rental_id = ?', [rental.rental_id]);
        }

        const [equipment] = await db.execute('SELECT * FROM Equipment');
        res.json(equipment);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/equipment', async (req, res) => {
    const { equipment_name, quantity, rental_price, manager_id } = req.body;
    try {
        const [result] = await db.execute(
            'INSERT INTO Equipment (equipment_name, quantity, rental_price, manager_id) VALUES (?, ?, ?, ?)',
            [equipment_name, quantity, rental_price, manager_id]
        );
        res.json({ message: 'Equipment added successfully', equipmentId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/rentals', async (req, res) => {
    const { user_id, equipment_id, rental_date, quantity, slot_id } = req.body;
    try {
        if (!slot_id) return res.status(400).json({ message: 'A booked slot is required to rent equipment.' });
        
        // Strict availability check
        const [equip] = await db.execute('SELECT quantity FROM Equipment WHERE equipment_id = ?', [equipment_id]);
        if (equip.length === 0) return res.status(404).json({ message: 'Equipment not found' });
        if (equip[0].quantity < quantity) {
            return res.status(400).json({ message: 'Not enough equipment available in stock right now.' });
        }

        // Decrease capacity
        await db.execute('UPDATE Equipment SET quantity = quantity - ? WHERE equipment_id = ?', [quantity, equipment_id]);
        
        const [result] = await db.execute(
            'INSERT INTO Rental (rental_date, quantity, user_id, equipment_id, slot_id, status) VALUES (?, ?, ?, ?, ?, "active")',
            [rental_date, quantity, user_id, equipment_id, slot_id]
        );
        res.json({ message: 'Equipment rented successfully', rentalId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/user/:userId/rentals', async (req, res) => {
    try {
        const [rentals] = await db.execute(
            `SELECT r.*, e.equipment_name, e.rental_price, s.date as slot_date, s.start_time, s.end_time 
             FROM Rental r 
             JOIN Equipment e ON r.equipment_id = e.equipment_id 
             JOIN Slot s ON r.slot_id = s.slot_id
             WHERE r.user_id = ? ORDER BY r.rental_id DESC`,
            [req.params.userId]
        );
        res.json(rentals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
