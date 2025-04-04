/**
 * Error Handler Module
 * Provides unified error handling for the application
 */

// Format error messages for display
const formatErrorMessage = (err) => {
  // Handle common database errors
  if (err.code === 'ER_DUP_ENTRY') {
    return 'This information already exists in our database.';
  }
  
  if (err.code === 'ER_NO_REFERENCED_ROW') {
    return 'Cannot add this record as it references a non-existent item.';
  }
  
  if (err.code === 'ER_NO_SUCH_TABLE') {
    return 'A required database table is missing.';
  }
  
  if (err.code === 'ER_BAD_FIELD_ERROR') {
    return 'A database field is incorrect or missing.';
  }
  
  if (err.code === 'ENOENT') {
    return 'A required file or directory could not be found.';
  }
  
  // Return a generic message for unhandled errors
  return 'An unexpected error occurred. Please try again later.';
};

// Log errors to console with additional details
const logError = (location, err) => {
  console.error(`[ERROR] ${location}:`, {
    message: err.message,
    code: err.code,
    stack: err.stack
  });
};

// Handle API errors (return JSON)
const handleApiError = (res, err, location, status = 500) => {
  logError(location, err);
  
  return res.status(status).json({
    success: false,
    error: formatErrorMessage(err),
    message: err.message
  });
};

// Handle web errors (render error page or redirect with message)
const handleWebError = (res, err, location, redirectUrl = null) => {
  logError(location, err);
  
  const userMessage = formatErrorMessage(err);
  
  if (redirectUrl) {
    // Redirect with error message
    return res.redirect(`${redirectUrl}${redirectUrl.includes('?') ? '&' : '?'}error=${encodeURIComponent(userMessage)}`);
  } else {
    // Render error page
    return res.status(500).render('error', { 
      message: userMessage,
      title: 'Error'
    });
  }
};

// Create an Express error-handling middleware
const errorMiddleware = (err, req, res, next) => {
  logError('Unhandled Exception', err);
  
  // Determine if request is expecting JSON
  const isApiRequest = req.xhr || /application\/json/.test(req.get('accept'));
  
  if (isApiRequest) {
    return res.status(500).json({
      success: false,
      error: formatErrorMessage(err),
      message: err.message
    });
  } else {
    return res.status(500).render('error', { 
      message: formatErrorMessage(err),
      title: 'Error'
    });
  }
};

module.exports = {
  formatErrorMessage,
  logError,
  handleApiError,
  handleWebError,
  errorMiddleware
}; 