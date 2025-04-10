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

// Show Registration Form
router.get('/register', (req, res) => {
    const userType = req.query.userType || 'student';
    const message = req.query.message || '';
    const status = req.query.status || '';
    const formData = req.query.formData ? JSON.parse(req.query.formData) : null;
    
    res.render('auth/register', { 
        userType, 
        message, 
        status,
        formData
    });
});

// Handle Registration
router.post('/register', async (req, res) => {
    try {
        console.log('🟢 Registration process started');
        console.log('Request body:', req.body);
        
        const { name, email, phone, password, confirmPassword, userType, licenseNumber, vehicleDetails } = req.body;
        
        console.log('🟢 Registration attempt:', { name, email, phone, userType });
        
        // Basic validation
        if (!name || !email || !phone || !password || !confirmPassword || !userType) {
            console.log('🔴 Missing required fields');
            return res.render('auth/register', {
                userType: userType || 'student',
                message: 'All required fields must be filled',
                status: 'error',
                formData: req.body
            });
        }
        
        if (password !== confirmPassword) {
            console.log('🔴 Password mismatch');
            return res.render('auth/register', {
                userType,
                message: 'Passwords do not match',
                status: 'error',
                formData: req.body
            });
        }

        if (password.length < 6) {
            console.log('🔴 Password too short');
            return res.render('auth/register', {
                userType,
                message: 'Password must be at least 6 characters',
                status: 'error',
                formData: req.body
            });
        }

        // Check if email already exists
        let tableName = userType === 'driver' ? 'driver' : 'passenger';
        console.log('🟢 Checking for existing user in table:', tableName);
        
        try {
            const [existingUsers] = await db.query(`SELECT * FROM ${tableName} WHERE email = ?`, [email]);
            console.log('🟢 Email check result:', existingUsers.length > 0 ? 'Email exists' : 'Email available');
            
            if (existingUsers.length > 0) {
                console.log('🔴 Email already exists:', email);
                return res.render('auth/register', {
                    userType,
                    message: 'Email already registered',
                    status: 'error',
                    formData: req.body
                });
            }
        } catch (dbErr) {
            console.error('🔴 Database error checking existing email:', dbErr);
            throw dbErr;
        }

        // Hash password
        console.log('🟢 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('🟢 Password hashed successfully');

        // Insert user into appropriate table
        if (userType === 'driver') {
            console.log('🟢 Inserting driver...');
            if (!licenseNumber) {
                console.log('🔴 License number required for driver');
                return res.render('auth/register', {
                    userType,
                    message: 'License number is required for drivers',
                    status: 'error',
                    formData: req.body
                });
            }
            
            try {
                const [result] = await db.query(
                    `INSERT INTO driver (name, email, phone, password_hash, license_number, vehicle_details, verified, suspended) 
                     VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
                    [name, email, phone, hashedPassword, licenseNumber, vehicleDetails || '']
                );
                console.log('🟢 Driver insert result:', result);
            } catch (insertErr) {
                console.error('🔴 Error inserting driver:', insertErr);
                throw insertErr;
            }
        } else {
            console.log('🟢 Inserting passenger...');
            try {
                const [result] = await db.query(
                    `INSERT INTO passenger (name, email, phone, password_hash, verified, suspended) 
                     VALUES (?, ?, ?, ?, 0, 0)`,
                    [name, email, phone, hashedPassword]
                );
                console.log('🟢 Passenger insert result:', result);
            } catch (insertErr) {
                console.error('🔴 Error inserting passenger:', insertErr);
                throw insertErr;
            }
        }

        console.log('🟢 Registration successful for:', email);
        
        // Verify the user was actually inserted
        try {
            const [checkUser] = await db.query(`SELECT * FROM ${tableName} WHERE email = ?`, [email]);
            console.log('🟢 Verification after insert:', checkUser.length > 0 ? 'User found' : 'User not found');
            
            if (checkUser.length === 0) {
                console.log('🔴 Warning: User not found after insert');
            }
        } catch (verifyErr) {
            console.error('🔴 Error verifying user after insert:', verifyErr);
            // Continue despite this error
        }
        
        // Redirect to success page
        return res.render('auth/registration-success', {
            userType,
            email
        });
    } catch (err) {
        console.error('🔴 Registration error:', err);
        return res.render('auth/register', {
            userType: req.body?.userType || 'student',
            message: 'An error occurred during registration: ' + err.message,
            status: 'error',
            formData: req.body
        });
    }
});

// Test database connection and table existence
router.get('/test-db', async (req, res) => {
    try {
        // Test database connection
        const [testResult] = await db.query('SELECT 1 as test');
        console.log('Database connection test:', testResult);

        // Check if passenger table exists
        const [tables] = await db.query(`
            SELECT TABLE_NAME 
            FROM information_schema.tables 
            WHERE table_schema = DATABASE() 
            AND table_name = 'passenger'
        `);
        
        console.log('Passenger table check:', tables);

        // If table exists, show some sample data
        if (tables.length > 0) {
            const [passengers] = await db.query('SELECT * FROM passenger LIMIT 5');
            console.log('Sample passenger data:', passengers);
        }

        res.json({
            connection: 'success',
            passengerTableExists: tables.length > 0,
            sampleData: tables.length > 0 ? await db.query('SELECT * FROM passenger LIMIT 5') : null
        });
    } catch (err) {
        console.error('Database test error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Test direct insert into passenger table
router.get('/test-insert', async (req, res) => {
    try {
        // Generate a unique test email
        const testEmail = `test_${Date.now()}@example.com`;
        
        console.log('Attempting direct test insert with email:', testEmail);
        
        // First check if the database connection is working
        const [connectionTest] = await db.query('SELECT 1 as test');
        console.log('Database connection test:', connectionTest);
        
        // Try a simple direct insert with minimal fields
        const insertSQL = `
            INSERT INTO passenger (name, email, phone, password_hash, verified, suspended) 
            VALUES (?, ?, ?, ?, 0, 0)
        `;
        
        // Log the exact SQL and parameters
        console.log('SQL:', insertSQL);
        console.log('Parameters:', ['Test User', testEmail, '07000000000', 'test_password']);
        
        // Execute the insert
        const [insertResult] = await db.query(
            insertSQL,
            ['Test User', testEmail, '07000000000', 'test_password']
        );
        
        console.log('Insert result:', insertResult);
        
        // Verify the insert by querying the record
        const [verifyResult] = await db.query(
            'SELECT * FROM passenger WHERE email = ?',
            [testEmail]
        );
        
        console.log('Verification query result:', verifyResult);
        
        // Show detailed database info
        const [dbInfo] = await db.query('SELECT DATABASE() as current_db');
        
        res.json({
            status: 'success',
            message: 'Test insert completed',
            insertResult,
            verifyResult,
            databaseInfo: dbInfo
        });
    } catch (err) {
        console.error('Test insert error:', err);
        
        // Get more detailed error information
        let errorInfo = {
            message: err.message,
            code: err.code,
            errno: err.errno,
            sqlState: err.sqlState,
            sqlMessage: err.sqlMessage
        };
        
        res.status(500).json({ 
            error: 'Test insert failed',
            details: errorInfo
        });
    }
});

module.exports = router; 