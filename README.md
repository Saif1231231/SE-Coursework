# UniShared - Ridesharing Platform

UniShared is a ridesharing platform designed for university students and drivers. It allows students to find, book, and manage rides, while drivers can offer rides and manage their databse schedueles 

## Quick Start Guide

### Running the Application

1. **Start the application:**
   ```
   docker-compose up -d
   ```
   This will start the web server, database, and phpMyAdmin.

2. **Stop the application:**
   ```
   docker-compose down
   ```

3. **Access the website:**
   - Main application: [http://localhost:3002](http://localhost:3002)
   - phpMyAdmin: [http://localhost:8080](http://localhost:8080)
     - Username: `root`
     - Password: `newpassword`

### Making Changes

1. **Editing Code:**
   - Make changes to the files in your code editor
   - The application will automatically reload with your changes

2. **Database Management:**
   - All database structure is defined in `ridesharing.sql`
   - Use phpMyAdmin to manage data directly

3. **After Major Changes:**
   If you've made significant changes to dependencies or Docker configuration:
   ```
   docker-compose down
   docker-compose build --no-cache
   docker-compose up 
   ```

## Project Structure

- **`/routes`**: Contains all route handlers
  - `auth.js`: Authentication routes (login, logout)
  - `profile.js`: User profile management
  - `student.js`: Student-specific routes
  - `driver.js`: Driver-specific routes
  - `admin.js`: Admin dashboard routes
  - `rides.js`: Ride management
  - `bookings.js`: Booking management
  - `reviews.js`: Reviews system

- **`/views`**: Pug templates for all pages
  - `layout.pug`: Main layout template
  - `home.pug`: Homepage
  - `/student`: Student-specific pages
  - `/driver`: Driver-specific pages
  - `/profile`: User profile pages
  - `/auth`: Authentication pages

- **`/services`**: Core services
  - `db.js`: Database connection and query functions

- **`/public`**: Static assets (CSS, JavaScript, images)

## Key Features

1. **User Authentication**
   - Login for students, drivers, and admins
   - Session management

2. **Student Features**
   - Browse available rides
   - Search for rides by location
   - Book rides
   - View and manage bookings
   - User profile management

3. **Driver Features**
   - Create and offer rides
   - Manage ride details and availability
   - View passenger bookings
   - Profile management

4. **Profile Management**
   - View and edit profile information
   - Upload profile pictures
   - View ride history

## Development

### Git Workflow

1. **Commit Changes:**
   ```
   git add .
   git commit -m "Description of changes"
   git push
   ```

### Technology Stack

- **Frontend**: Pug, Bootstrap, JavaScript
- **Backend**: Node.js, Express
- **Database**: MySQL
- **Containerization**: Docker

## Troubleshooting

1. **Database Connection Issues**:
   - Check the `.env` file to ensure database credentials are correct
   - Ensure the database container is running: `docker ps`

2. **Application Not Starting**:
   - Check logs: `docker-compose logs web`
   - Verify ports are not in use by other applications

3. **Changes Not Appearing**:
   - Clear browser cache

   - Restart the application: `docker-compose restart web` 





## Troubleshooting

1. **Database Connection Issues**:
   - Check the `.env` file to ensure database credentials are correct
   - Ensure the database container is running: `docker ps`

2. **Application Not Starting**:
   - Check logs: `docker-compose logs web`
   - Verify ports are not in use by other applications

3. **Changes Not Appearing**:
   - Clear browser cache
   - Restart the application: `docker-compose restart web` 