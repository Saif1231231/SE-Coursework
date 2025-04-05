// ⚠️ IMPORTANT NOTICE ⚠️
// This file is not being used by the application.
// The actual app.js file is located in the app directory.
// Please make changes to app/app.js instead of this file.
// This file is kept for reference purposes only.

const express = require("express");
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');

// Load environment variables
dotenv.config();

// Import routes
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const driverRouter = require('./routes/driver');
const studentRouter = require('./routes/student');
const adminRouter = require('./routes/admin');
const ridesRouter = require('./routes/rides');
const bookingsRouter = require('./routes/bookings');
const profileRouter = require('./routes/profile');
const reviewsRouter = require('./routes/reviews');
const messagesRouter = require('./routes/messages');

// Import services
const messageService = require('./services/messaging');

// Import error handler
const errorHandler = require('./routes/error-handler');

// Initialize Express app
const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration with enhanced security
const sessionSecret = process.env.SESSION_SECRET || 'ride_sharing_secret_replace_in_production';
console.log(`Using session secret: ${sessionSecret.substr(0, 3)}...`);

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false, // Only save session when data exists
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Session debugging middleware
app.use((req, res, next) => {
  if (req.session) {
    console.log('Session exists:', req.sessionID);
    if (req.session.userId) {
      console.log('User is logged in:', req.session.userId, req.session.userType);
    }
  } else {
    console.log('No session exists');
  }
  next();
});

// Load unread message count for all routes when user is logged in
app.use(async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      console.log('Getting global unread count for user:', req.session.userId, req.session.userType);
      const unreadCount = await messageService.getUnreadMessageCount(
        req.session.userId,
        req.session.userType
      );
      
      console.log('Global unread message count:', unreadCount);
      // Store the count in the session for the navigation bar badge
      req.session.unreadMessageCount = unreadCount;
    } catch (err) {
      console.error('Error getting global unread message count:', err);
      // Continue even if there's an error
    }
  }
  next();
});

// Make user session data available to templates
app.use((req, res, next) => {
  res.locals.session = req.session;
  if (req.session && req.session.userId) {
    console.log('Setting session data for templates:', {
      userId: req.session.userId,
      userType: req.session.userType,
      name: req.session.name,
      unreadMessageCount: req.session.unreadMessageCount
    });
  }
  next();
});

// Routes
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/driver', driverRouter);
app.use('/student', studentRouter);
app.use('/admin', adminRouter);
app.use('/rides', ridesRouter);
app.use('/bookings', bookingsRouter);
app.use('/profile', profileRouter);
app.use('/reviews', reviewsRouter);
app.use('/messages', messagesRouter);

// Ensure messaging tables exist
(async () => {
  try {
    await messageService.ensureMessagingTablesExist();
    console.log('Messaging tables setup completed!');
  } catch (err) {
    console.error('Error setting up messaging tables:', err);
  }
})();

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Error handler middleware
app.use(errorHandler.errorMiddleware);

// Start server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server running at http://127.0.0.1:${PORT}/`);
}); 