# 🎓 College Management System (CMS)

A full-stack MERN (MongoDB, Express, React, Node.js) based College Management System designed to automate and manage academic and administrative activities efficiently.

---

## 📌 Features

### 👨‍🎓 Student Panel
- View Profile  
- View Subjects & Classes  
- Check Timetable  
- View Attendance  
- Submit Assignments  
- Fee Details & Status  

### 👨‍🏫 Staff Panel
- Manage Profile  
- View Assigned Classes & Subjects  
- Upload Assignments  
- Mark Attendance  
- View Timetable  
- Generate Reports  

### 🛠️ Admin Panel
- Manage Users (Students & Staff)  
- Approve Pending Users  
- Upload Subjects  
- Upload & Generate Fees  
- Upload & View Timetable  
- Manage Assignments  
- Promote Students  
- Reset Attendance  
- Generate Attendance Fine  
- Send Email Notifications  
- Generate Staff Payslip  

---

## 🏗️ Tech Stack

**Frontend:**
- React.js  
- Bootstrap / CSS  

**Backend:**
- Node.js  
- Express.js  

**Database:**
- MongoDB (Mongoose)

---

## 📂 Project Structure

CMS/
│
├── client/                 # React Frontend
│   ├── src/
│   ├── components/
│   └── pages/
│
├── server/                 # Node + Express Backend
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   └── config/
│
├── .env
├── package.json
└── README.md

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/cms-project.git
cd cms-project
```

### 2️⃣ Install Dependencies

#### Backend
```bash
cd server
npm install
```

#### Frontend
```bash
cd client
npm install
```

---

### 3️⃣ Environment Variables

Create a `.env` file in the server folder:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
EMAIL_USER=your_email
EMAIL_PASS=your_password
```

---

### 4️⃣ Run the Application

#### Start Backend
```bash
cd server
npm run dev
```

#### Start Frontend
```bash
cd client
npm start
```

---

## 🚀 Key Modules

- 🔐 Authentication System (Login / Signup with JWT)
- 📅 Timetable Management
- 💰 Fee Management System
- 📊 Attendance Tracking
- 📂 Assignment Upload System
- 📧 Email Notification System
- 👨‍💼 Admin Control Panel

---

## 📸 Screenshots

_Add your project screenshots here_

---

## 🤝 Contribution

Contributions are welcome!

1. Fork the repository  
2. Create a new branch  
3. Make your changes  
4. Submit a Pull Request  

---

## 🐛 Issues

If you find any bugs or issues, feel free to open an issue.

---

## 📜 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

Ayush Sharma  
GitHub: https://github.com/iayushsharma05  

---

## ⭐ Support

If you like this project, please give it a ⭐ on GitHub!
