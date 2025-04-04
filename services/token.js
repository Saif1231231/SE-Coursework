const db = require('./db');
const emailService = require('./email');

// Create a token for password reset or email verification
async function createToken(userId, userType, tokenType, expiresHours = 24) {
  try {
    const token = emailService.generateToken();
    
    // Call the stored procedure to create a token
    await db.query(
      'CALL create_token(?, ?, ?, ?, ?)',
      [userId, userType, token, tokenType, expiresHours]
    );
    
    return token;
  } catch (error) {
    console.error('Error creating token:', error);
    throw error;
  }
}

// Verify a token
async function verifyToken(token, tokenType) {
  try {
    const [results] = await db.query(
      'CALL verify_token(?, ?)',
      [token, tokenType]
    );
    
    // Stored procedure returns a result set with valid, user_id, and user_type
    const valid = results[0][0].valid;
    
    if (valid) {
      return {
        valid: true,
        userId: results[0][0].user_id,
        userType: results[0][0].user_type
      };
    } else {
      return { valid: false };
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    return { valid: false };
  }
}

// Create a password reset token and send email
async function sendPasswordResetToken(email, userType) {
  try {
    // First, find the user to get their ID
    let tableName, idField;
    
    if (userType === 'student' || userType === 'passenger') {
      tableName = 'passenger';
      idField = 'passenger_id';
      userType = 'passenger';
    } else if (userType === 'driver') {
      tableName = 'driver';
      idField = 'driver_id';
    } else if (userType === 'admin') {
      tableName = 'admin';
      idField = 'admin_id';
    } else {
      throw new Error('Invalid user type');
    }
    
    const [users] = await db.query(
      `SELECT ${idField} FROM ${tableName} WHERE email = ?`,
      [email]
    );
    
    if (users.length === 0) {
      return { success: false, message: 'Email not found' };
    }
    
    const userId = users[0][idField];
    
    // Create a token (expires in 1 hour)
    const token = await createToken(userId, userType, 'password_reset', 1);
    
    // Send the email
    await emailService.sendPasswordResetEmail(email, token, userType);
    
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset token:', error);
    return { success: false, message: 'Server error' };
  }
}

// Create an email verification token and send email
async function sendVerificationToken(email, userType, userId) {
  try {
    // Map student type to passenger
    if (userType === 'student') {
      userType = 'passenger';
    }
    
    // Create a token (expires in 24 hours)
    const token = await createToken(userId, userType, 'email_verification', 24);
    
    // Send the email
    await emailService.sendVerificationEmail(email, token, userType);
    
    return { success: true };
  } catch (error) {
    console.error('Error sending verification token:', error);
    return { success: false, message: 'Server error' };
  }
}

module.exports = {
  createToken,
  verifyToken,
  sendPasswordResetToken,
  sendVerificationToken
}; 