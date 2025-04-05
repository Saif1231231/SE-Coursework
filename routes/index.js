// Add this route to check session information
router.get('/debug-session', (req, res) => {
  const sessionData = {
    exists: !!req.session,
    id: req.session ? req.session.id : null,
    userId: req.session ? req.session.userId : null,
    userType: req.session ? req.session.userType : null,
    name: req.session ? req.session.name : null,
    unreadMessageCount: req.session ? req.session.unreadMessageCount : null,
    allSession: req.session ? req.session : null
  };
  
  res.json(sessionData);
});

// Navigation debug page
router.get('/nav-debug', (req, res) => {
  res.render('nav-debug', { title: 'Navigation Debug' });
});

// Simple standalone messaging test
router.get('/simple-messaging', async (req, res) => {
  // Generate simple HTML directly without Pug templating
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Simple Messaging Test</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css">
    </head>
    <body>
      <div class="container mt-4">
        <h1>Simple Messaging Test</h1>
        <div class="card mb-4">
          <div class="card-header">Session Information</div>
          <div class="card-body">
  `;
  
  if (req.session && req.session.userId) {
    // User is logged in
    html += `
      <p>Logged in as: ${req.session.name} (${req.session.userType} #${req.session.userId})</p>
      <ul>
        <li><a href="/messages">Go to Messages</a></li>
        <li><a href="/messages/test">Test Direct Messaging</a></li>
        <li><a href="/messages/new">New Message</a></li>
        <li><a href="/nav-debug">Navigation Debug</a></li>
        <li><a href="/auth/logout">Logout</a></li>
      </ul>
    `;
    
    // Try to get message count
    try {
      const messageService = require('../services/messaging');
      const count = await messageService.getUnreadMessageCount(req.session.userId, req.session.userType);
      html += `<p>Unread messages: ${count}</p>`;
    } catch (err) {
      html += `<p>Error getting unread messages: ${err.message}</p>`;
    }
  } else {
    // Not logged in
    html += `
      <p>You are not logged in.</p>
      <a href="/auth/login" class="btn btn-primary">Login</a>
    `;
  }
  
  html += `
          </div>
        </div>
        <div class="card">
          <div class="card-header">Debug Links</div>
          <div class="card-body">
            <ul>
              <li><a href="/debug-session">View Raw Session Data</a></li>
              <li><a href="/nav-debug">Navigation Bar Debug</a></li>
              <li><a href="/">Return to Home</a></li>
            </ul>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Send the HTML response
  res.send(html);
}); 