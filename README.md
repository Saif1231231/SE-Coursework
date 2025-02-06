Ride Sharing to University
This is a university ride-sharing platform designed to help students connect and share rides efficiently, reducing transportation costs and allowing sustainability to lower students transportation cost and save time.

Project Overview
Many university students face challenges with transportation mostly, including high transportation costs and unreliable public transport,because of this many students enter late to important lectures and miss vital information that could pontentially effect their results. Statistics indicate that approximately 15-20% of public transport services in the UK experience delays. Additionally, around 20% of university students report struggling to afford public transport, with some even missing classes due to these costs. This project provides a ride-sharing web application that allows students to:

* Find and book rides with other students traveling on similar routes.
* Offer empty seats as drivers and share travel costs.
* Enhance safety through a user rating and review system.
* Ensure secure authentication restricted to verified university affiliates.
* Ensure the the cost is convenient for most students.
The application is built using Node.js, Express.js, and MySQL, with a PUG-based frontend. It is containerised using Docker, and CI/CD pipelines are managed through GitHub Actions.

Features
* User Registration & Login: Secure authentication via university email ensures a trusted community.
* Ride Posting & Booking: Drivers can list available seats, and passengers can book rides with filtering options.
* Ride Search & Filtering: Users can refine results based on schedule, route, and user ratings.
* Rating & Review System: Post-ride feedback fosters accountability and safety.
* Admin Moderation Panel: Enables management of user reports, disputes, and platform integrity.

Tech Stack
Category  Technologies Used
Frontend  HTML, CSS, JavaScript, PUG (Templating Engine)
Backend Node.js, Express.js
Database  MySQL
DevOps & CI/CD  Docker, GitHub Actions
Project Management  GitHub Projects (Kanban Board)
Getting Started
1. Clone the Repository
sh
CopyEdit
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git  
cd YOUR_REPOSITORY_NAME
2. Set Up Environment Variables
Copy the sample .env file and update it with your database credentials:
sh
CopyEdit
cp env-sample .env
3. Install Dependencies
sh
CopyEdit
npm install
4. Run the Application (Locally)
sh
CopyEdit
npm start
The server should be running at http://localhost:3000.

Running with Docker
1. Build and Run Containers
sh
CopyEdit
docker-compose up --build
2. Access Services
* Web Application: http://localhost:3000
* phpMyAdmin: http://localhost:8082 (for database management)
* MySQL Database: mysql://db:3306
3. Stop Containers
sh
CopyEdit
docker-compose down

Contributing
Contributions are welcomed. Follow the standard workflow:
1. Fork the repository
2. Create a new feature branch
sh
CopyEdit
git checkout -b feature-name
1. Commit changes
sh
CopyEdit
git commit -m "Added feature: [brief description]"
1. Push updates
sh
CopyEdit
git push origin feature-name
1. Open a Pull Request
2. Submit for review via GitHub

Useful Links
* GitHub Repository: [https://github.com/Saif1231231/SE-Coursework]
* Kanban Board: [https://github.com/users/Saif1231231/projects/1]

License
This project is licensed under the MIT License. It is open-source and can be modified for educational and personal use.







Ride Sharing to University
This is a university ride-sharing platform designed to help students connect and share rides efficiently, reducing transportation costs and allowing sustainability to lower students transportation cost and save time.

Project Overview
Many university students face challenges with transportation mostly, including high transportation costs and unreliable public transport,because of this many students enter late to important lectures and miss vital information that could pontentially effect their results. Statistics indicate that approximately 15-20% of public transport services in the UK experience delays. Additionally, around 20% of university students report struggling to afford public transport, with some even missing classes due to these costs. This project provides a ride-sharing web application that allows students to:

* Find and book rides with other students traveling on similar routes.
* Offer empty seats as drivers and share travel costs.
* Enhance safety through a user rating and review system.
* Ensure secure authentication restricted to verified university affiliates.
* Ensure the the cost is convenient for most students.
The application is built using Node.js, Express.js, and MySQL, with a PUG-based frontend. It is containerised using Docker, and CI/CD pipelines are managed through GitHub Actions.

Features
* User Registration & Login: Secure authentication via university email ensures a trusted community.
* Ride Posting & Booking: Drivers can list available seats, and passengers can book rides with filtering options.
* Ride Search & Filtering: Users can refine results based on schedule, route, and user ratings.
* Rating & Review System: Post-ride feedback fosters accountability and safety.
* Admin Moderation Panel: Enables management of user reports, disputes, and platform integrity.

Tech Stack
Category  Technologies Used
Frontend  HTML, CSS, JavaScript, PUG (Templating Engine)
Backend Node.js, Express.js
Database  MySQL
DevOps & CI/CD  Docker, GitHub Actions
Project Management  GitHub Projects (Kanban Board)
Getting Started
1. Clone the Repository
git clone https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git  
cd YOUR_REPOSITORY_NAME
2. Set Up Environment Variables
Copy the sample .env file and update it with your database credentials:

cp env-sample .env
3. Install Dependencies

npm install
4. Run the Application (Locally)

npm start
The server should be running at http://localhost:3000.

Running with Docker
1. Build and Run Containers

docker-compose up --build
2. Access Services
* Web Application: http://localhost:3000
* phpMyAdmin: http://localhost:8082 (for database management)
* MySQL Database: mysql://db:3306
3. Stop Containers

docker-compose down

Contributing
Contributions are welcomed. Follow the standard workflow:
1. Fork the repository
2. Create a new feature branch
git checkout -b feature-name

1. Commit changes
git commit -m "Added feature: [brief description]"
1. Push updates
git push origin feature-name
1. Open a Pull Request
2. Submit for review via GitHub

Useful Links
* GitHub Repository: [https://github.com/Saif1231231/SE-Coursework]
* Kanban Board: [https://github.com/users/Saif1231231/projects/1]

License
This project is licensed under the MIT License. It is open-source and can be modified for educational and personal use.
