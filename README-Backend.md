# Uni Ride Sharing - Backend Features

## Overview

This document outlines the backend features implemented for the Uni Ride Sharing application.

## Improved Authentication System

### Password Reset
- Implemented secure password reset functionality with email verification
- Created token-based reset system with expiring links
- Tokens stored in database with user association

### Email Verification
- Added email verification for new accounts
- Verification tokens sent via email
- Email verification status tracked in user profiles

## Ride Matching Algorithm

- Implemented a ride matching algorithm to connect passengers with drivers
- Matching based on:
  - Location matching (pickup and dropoff)
  - Time proximity
  - Seat availability
  - Price constraints
- Search optimization for quick results

## User Points and Ratings System

### Points System
- Points earned for:
  - Completing rides
  - Submitting reviews
  - Referrals
  - Special promotions
- Points can be redeemed for rewards
- Full tracking of point history

### Driver Ratings
- Rating system for drivers (1-5 stars)
- Average rating calculated from passenger reviews
- Rating displayed on driver profiles

### Rewards System
- Rewards can be claimed using earned points
- Different reward tiers based on point requirements
- Reward redemption codes for discounts and free rides

## Messaging System

- Direct messaging between users
- Threaded conversations for easy tracking
- Ride-specific messaging
- Unread message notifications
- Support for reply tracking

## Security and Validation

- Input validation and sanitization
- XSS protection
- CSRF protection
- Rate limiting for API endpoints
- Secure session management
- Password hashing

## API Documentation

- Swagger documentation for all API endpoints
- Interactive API explorer
- Authentication details
- Request/response examples

## Database Optimizations

- Improved database schema with proper indexing
- Stored procedures for complex operations
- Transaction support for critical operations
- Efficient query optimization

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
   mysql -u root -p < db/token.sql
   mysql -u root -p < db/messaging.sql
   mysql -u root -p < db/ratings.sql
   mysql -u root -p < db/rewards.sql
   ```

4. Start the application:
   ```
   npm start
   ```

5. Access the application at `http://localhost:3002`
6. API documentation is available at `http://localhost:3002/api-docs`

## Testing

Run the test suite:
```
npm test
``` 