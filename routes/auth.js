const express = require('express');
const router = express.Router();
const db = require('../services/db');
const bcrypt = require('bcryptjs');

// Temporary debug route
router.get('/debug/users', async (req, res) => {
    try {
        const [drivers] = await db.query('SELECT driver_id, name, email, password_hash FROM driver');
        const [passengers] = await db.query('SELECT passenger_id, name, email, password_hash FROM passenger');
        const [admins] = await db.query('SELECT admin_id, name, email, password_hash FROM admin');
        
        res.json({
            drivers,
            passengers,
            admins
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Test route to help with login troubleshooting
router.get('/debug/check-login/:email/:userType', async (req, res) => {
    try {
        const { email, userType } = req.params;
        let tableName;

        // Map student type to passenger table
        if (userType === 'student') {
            tableName = 'passenger';
        } else if (userType === 'driver') {
            tableName = 'driver';
        } else if (userType === 'admin') {
            tableName = 'admin';
        } else {
            return res.json({ error: 'Invalid user type' });
        }

        // Get user from appropriate table
        const [users] = await db.query(`SELECT * FROM ${tableName} WHERE email = ?`, [email]);
        const user = users[0];
        
        if (!user) {
            return res.json({ 
                found: false,
                message: 'No user found with this email'
            });
        }

        return res.json({
            found: true,
            user: {
                email: user.email,
                name: user.name,
                passwordStored: user.password_hash,
                passwordType: user.password_hash.startsWith('$2') ? 'bcrypt hash' : 'plain text'
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Show Login Form
router.get('/login', (req, res) => {
    const message = req.query.message || '';
    const userType = req.query.userType || '';
    res.render('auth/login', { message, userType });
});

// Handle Login
router.post('/login', async (req, res) => {
    try {
        const { email, password, userType } = req.body;
        console.log('Login attempt:', { email, userType });
        
        let tableName;
        let idField;

        // Map student type to passenger table
        if (userType === 'student') {
            tableName = 'passenger';
            idField = 'passenger_id';
        } else if (userType === 'driver') {
            tableName = 'driver';
            idField = 'driver_id';
        } else if (userType === 'admin') {
            tableName = 'admin';
            idField = 'admin_id';
        } else {
            return res.render('auth/login', {
                message: 'Invalid user type',
                userType
            });
        }

        // Get user from appropriate table
        const [users] = await db.query(`SELECT * FROM ${tableName} WHERE email = ?`, [email]);
        const user = users[0];
        
        if (!user) {
            console.log('No user found with email:', email);
            return res.render('auth/login', { 
                message: 'Invalid email or password', 
                userType 
            });
        }

        console.log('Found user:', {
            email: user.email,
            storedHash: user.password_hash,
            providedPassword: password
        });

        // First try direct comparison for test data
        let isPasswordValid = password === user.password_hash;
        
        // If direct comparison fails and it looks like a bcrypt hash, try bcrypt
        if (!isPasswordValid && user.password_hash.startsWith('$2')) {
            try {
                isPasswordValid = await bcrypt.compare(password, user.password_hash);
            } catch (err) {
                console.error('Bcrypt error:', err);
                // Continue with isPasswordValid = false
            }
        }

        if (!isPasswordValid) {
            console.log('Password invalid for user:', email);
            return res.render('auth/login', { 
                message: 'Invalid email or password', 
                userType 
            });
        }

        // Set session
        req.session.userId = user[idField];
        req.session.userType = userType === 'student' ? 'passenger' : userType;
        req.session.name = user.name;

        console.log('Login successful for:', {
            userId: req.session.userId,
            userType: req.session.userType,
            name: req.session.name
        });

        // Redirect based on user type
        if (userType === 'driver') {
            res.redirect('/driver');
        } else if (userType === 'student') {
            res.redirect('/');
        } else {
            res.redirect('/admin');
        }
    } catch (err) {
        console.error('Login error:', err);
        res.render('auth/login', { 
            message: 'An error occurred during login', 
            userType: req.body.userType 
        });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router; 