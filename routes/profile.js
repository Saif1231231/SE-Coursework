const express = require('express');
const router = express.Router();
const db = require('../services/db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const errorHandler = require('./error-handler');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../public/uploads/profile');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    // Use userType and userId to create unique filenames
    const userType = req.session.userType;
    const userId = req.session.userId;
    const fileExt = path.extname(file.originalname);
    cb(null, `${userType}_${userId}${fileExt}`);
  }
});

// File filter for image uploads
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB limit
  }
});

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/auth/login?message=Please login to view your profile');
};

// View profile page
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userType = req.session.userType;
    let tableName, idField;

    // Determine table and ID field based on user type
    if (userType === 'passenger') {
      tableName = 'passenger';
      idField = 'passenger_id';
    } else if (userType === 'driver') {
      tableName = 'driver';
      idField = 'driver_id';
    } else if (userType === 'admin') {
      tableName = 'admin';
      idField = 'admin_id';
    } else {
      return res.status(400).render('error', { message: 'Invalid user type' });
    }

    // Get user profile data
    const [users] = await db.query(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [userId]);
    
    if (!users || users.length === 0) {
      return res.status(404).render('error', { message: 'User not found' });
    }

    const user = users[0];
    
    // Check if profile picture exists
    const profilePicPath = `/uploads/profile/${userType}_${userId}`;
    const possibleExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    let profilePicUrl = null;

    for (const ext of possibleExtensions) {
      const fullPath = path.join(__dirname, '../public', profilePicPath + ext);
      if (fs.existsSync(fullPath)) {
        profilePicUrl = profilePicPath + ext;
        break;
      }
    }

    // Get user ride history if passenger or driver
    let rides = [];
    if (userType === 'passenger') {
      [rides] = await db.query(`
        SELECT r.*, d.name as driver_name
        FROM ride r
        JOIN booking b ON r.ride_id = b.ride_id
        LEFT JOIN driver d ON r.driver_id = d.driver_id
        WHERE b.passenger_id = ?
        ORDER BY r.departureTime DESC
      `, [userId]);
    } else if (userType === 'driver') {
      [rides] = await db.query(`
        SELECT r.*, COUNT(b.booking_id) as passenger_count
        FROM ride r
        LEFT JOIN booking b ON r.ride_id = b.ride_id
        WHERE r.driver_id = ?
        GROUP BY r.ride_id
        ORDER BY r.departureTime DESC
      `, [userId]);
    }

    res.render('profile/index', { 
      user, 
      profilePicUrl, 
      userType,
      rides,
      successMessage: req.query.success,
      errorMessage: req.query.error
    });
  } catch (err) {
    return errorHandler.handleWebError(res, err, 'profile/view');
  }
});

// Edit profile form
router.get('/edit', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userType = req.session.userType;
    let tableName, idField;

    // Determine table and ID field based on user type
    if (userType === 'passenger') {
      tableName = 'passenger';
      idField = 'passenger_id';
    } else if (userType === 'driver') {
      tableName = 'driver';
      idField = 'driver_id';
    } else if (userType === 'admin') {
      tableName = 'admin';
      idField = 'admin_id';
    } else {
      return res.status(400).render('error', { message: 'Invalid user type' });
    }

    // Get user profile data
    const [users] = await db.query(`SELECT * FROM ${tableName} WHERE ${idField} = ?`, [userId]);
    
    if (!users || users.length === 0) {
      return res.status(404).render('error', { message: 'User not found' });
    }

    const user = users[0];
    
    // Check if profile picture exists
    const profilePicPath = `/uploads/profile/${userType}_${userId}`;
    const possibleExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
    let profilePicUrl = null;

    for (const ext of possibleExtensions) {
      const fullPath = path.join(__dirname, '../public', profilePicPath + ext);
      if (fs.existsSync(fullPath)) {
        profilePicUrl = profilePicPath + ext;
        break;
      }
    }

    res.render('profile/edit', { 
      user, 
      profilePicUrl, 
      userType,
      successMessage: req.query.success,
      errorMessage: req.query.error
    });
  } catch (err) {
    return errorHandler.handleWebError(res, err, 'profile/edit');
  }
});

// Update profile
router.post('/update', isAuthenticated, upload.single('profilePicture'), async (req, res) => {
  try {
    const userId = req.session.userId;
    const userType = req.session.userType;
    let tableName, idField;

    // Determine table and ID field based on user type
    if (userType === 'passenger') {
      tableName = 'passenger';
      idField = 'passenger_id';
    } else if (userType === 'driver') {
      tableName = 'driver';
      idField = 'driver_id';
    } else if (userType === 'admin') {
      tableName = 'admin';
      idField = 'admin_id';
    } else {
      return res.status(400).render('error', { message: 'Invalid user type' });
    }

    // Sanitize and extract data from request
    const { name, email, phone } = req.body;
    
    // Update user in database
    await db.query(`
      UPDATE ${tableName}
      SET name = ?, email = ?, phone = ?
      WHERE ${idField} = ?
    `, [name, email, phone, userId]);

    // If profile picture was uploaded, it's already saved by multer
    if (req.file) {
      console.log('Profile picture uploaded:', req.file.filename);
    }

    // Update session name
    req.session.name = name;

    res.redirect('/profile?success=Profile updated successfully');
  } catch (err) {
    return errorHandler.handleWebError(res, err, 'profile/update', '/profile/edit');
  }
});

module.exports = router; 