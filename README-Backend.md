# Uni Ride Sharing - Backend Features

## Overview

This document outlines the backend features implemented for the Uni Ride Sharing application.

## Authentication System

### User Authentication
- Complete authentication system for passengers, drivers, and admins
- Secure password hashing and session management
- Role-based access control for different user types

### Password Reset
- Secure password reset functionality with email verification
- Token-based reset system with expiring links
- Tokens stored in database with user association

### Email Verification
- Email verification for new accounts
- Verification tokens sent via email
- Email verification status tracked in user profiles

## Ride Matching Algorithm

- Advanced ride matching algorithm to connect passengers with drivers
- Matching based on:
  - Location proximity (pickup and dropoff)
  - Time compatibility
  - Seat availability
  - Price constraints
- Search optimization for quick results

## Points and Ratings System

### Points System
- Points earned for:
  - Completing rides
  - Submitting reviews
  - Referrals
  - Special promotions
- Points redemption functionality
- Full tracking of point history

### Driver Ratings
- Advanced rating system for drivers (1-5 stars)
- Review moderation with approval workflow
- Helpful/unhelpful vote functionality
- Automatic driver rating calculation
- Review reporting for inappropriate content

### Rewards System
- Rewards can be claimed using earned points
- Different reward tiers based on point requirements
- Reward redemption codes for discounts and free rides

## Messaging System

- Direct messaging between users
- Conversation threading with thread management
- Ride-specific messaging
- Unread message notifications
- Message status tracking (read/unread)
- Message search capabilities

## Reporting System

### User Reports
- Comprehensive reporting system for users to report issues
- Multiple report categories (safety concerns, inappropriate behavior, etc.)
- Report status tracking (pending, investigating, resolved)
- Support for evidence uploads
- Admin review process for reports

### Driver Reports
- Specific reporting system for driver-related issues
- Categorized reporting for different driver issues
- Supporting evidence and documentation
- Report resolution workflow

## Security and Validation

- Input validation and sanitization
- XSS protection
- CSRF protection
- Rate limiting for API endpoints
- Secure session management
- Password hashing

## API Documentation

- Comprehensive Swagger documentation for all API endpoints
- Interactive API explorer
- Authentication details
- Request/response examples
- Error code documentation

## Database Optimizations

- Optimized database schema with proper indexing
- Stored procedures for complex operations
- Transaction support for critical operations
- Efficient query optimization

## Favorite Routes

- Users can save favorite routes for quick access
- Management of saved routes 
- Last used tracking

## How to Run

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables in `.env` file:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=ridesharing
   
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   
   SESSION_SECRET=your_session_secret
   BASE_URL=http://localhost:3002
   ```

3. Run SQL scripts to set up the database:
   ```
   mysql -u root -p < ridesharing.sql
   mysql -u root -p < messaging.sql
   mysql -u root -p < advanced_reviews.sql
   mysql -u root -p < reports.sql
   mysql -u root -p < favorite_routes.sql
   ```

4. Start the application:
   ```
   npm start
   ```

5. Access the application at `http://localhost:3002`
6. API documentation is available at `http://localhost:3002/api-docs`

## Docker Support

You can also run the application using Docker:

```
docker-compose up -d
```

This will start the web server, database, and phpMyAdmin.

- Main application: http://localhost:3002
- phpMyAdmin: http://localhost:8080 (Username: root, Password: as configured)

## Testing

Run the test suite:
```
npm test
``` 