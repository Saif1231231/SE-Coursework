# Advanced Review System for UniShared

This document explains the advanced review system implemented for the UniShared ridesharing platform.

## Features

### For Users
- Create detailed reviews with ratings and comments
- Filter reviews by rating, status, and sort by various metrics
- Mark reviews as helpful/unhelpful
- Report inappropriate reviews
- Report problematic users (drivers or passengers)
- View review statistics and metrics

### For Administrators
- Review moderation system (approve/reject reviews)
- User report management system
- View and investigate user reports
- Take actions on reported users (suspend/unsuspend)
- View statistics and trends

## Setup Instructions

1. **Install database tables and procedures**

   Run the setup script:
   ```
   node setup_review_system.js
   ```
   
   This will create all necessary tables, triggers, and sample data for the advanced review system.

2. **Access the review system**

   Reviews: [http://localhost:3002/reviews](http://localhost:3002/reviews)
   User Reports: [http://localhost:3002/user-reports](http://localhost:3002/user-reports)

## Components

### Review System

- **Reviews Listing**: Filter, sort, and browse all reviews
- **Review Details**: View detailed information about a specific review
- **Review Creation**: Submit new reviews for completed rides
- **Helpfulness Tracking**: Mark reviews as helpful or unhelpful
- **Review Reporting**: Report inappropriate reviews
- **Review Moderation**: Administrators can approve or reject reviews

### User Reporting System

- **User Reports Listing**: Filter, sort, and browse all user reports
- **User Report Details**: View detailed information about a specific report
- **User Report Creation**: Submit new reports about users
- **Report Investigation**: Administrators can track investigation status
- **User Sanctions**: Take actions against reported users

## Technical Implementation

### Database Schema

The review system extends the existing database with:

- Enhanced `review` table with status and helpfulness tracking
- `review_feedback` table to track user feedback on reviews
- `user_report` table for reporting users
- `review_report` table for reporting reviews
- Triggers for automatic rating calculations

### API Endpoints

The system provides several API endpoints:

- `/api/users`: Get users for reporting
- `/api/review-stats/:userId/:userType`: Get review statistics for a user
- `/api/report-stats/:userId/:userType`: Get report statistics for a user

### Key Files

- `advanced_reviews.sql`: Database schema extensions
- `routes/reviews.js`: Review system routes
- `routes/user-reports.js`: User reporting system routes
- `routes/api.js`: API endpoints
- `views/reviews/*.pug`: Review system templates
- `views/reports/*.pug`: Reporting system templates
- `setup_review_system.js`: Setup script

## Using the System

### Submitting a Review

1. Navigate to the Reviews page
2. Fill out the review form with rating, comment, and ride details
3. Submit the form

### Reporting a User

1. Navigate to the User Reports page
2. Click "Create New Report"
3. Select the user type and specific user
4. Provide a reason and detailed description
5. Submit the report

### Moderating Reviews (Admins)

1. Navigate to the Reviews page
2. Find pending reviews
3. Click "View" to see details
4. Use the moderation controls to approve or reject

### Managing User Reports (Admins)

1. Navigate to the User Reports page
2. View reports by status
3. Click on a report to view details
4. Update status and add resolution notes
5. Take action on the reported user if necessary 