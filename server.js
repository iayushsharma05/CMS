const express = require("express");
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const path = require("path");
const app = express();
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;


require("dotenv").config(); // 🔥 TOP



const mongourl = 'mongodb+srv://ayush0123sh:lOqpnQy3MNzFUfJz@cluster0.fdxb8e7.mongodb.net/userdetails?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(mongourl);


app.use(express.json());// bodyParser
app.use(cookieParser());



app.set("Trust Proxy", 1);


const cors = require("cors");

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://ayushprojectcollege.vercel.app"
  ],
  credentials: true
}));


// Detect environment and set frontend URL
const FRONTEND_URL = process.env.NODE_ENV === "production" ? "https://ayushprojectcollege.vercel.app" : "http://localhost:5173";






const { Cashfree, CFEnvironment } = require("cashfree-pg");

const cashfree = new Cashfree(
  CFEnvironment.SANDBOX,   // Use PRODUCTION when live
  process.env.CASHFREE_APP_ID,
  process.env.CASHFREE_SECRET_KEY
);





// ================= CLOUDINARY CONFIG =================
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET
});

// ================= STORAGE =================
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {

    let folder = "general";
    let resource_type = "image";


    if (file.fieldname === "documents") {
      folder = "uploads/documents";
      resource_type = "raw";
    }

    else if (file.fieldname === "photo") {
      folder = "uploads/photos";
      resource_type = "image";
    }

    if (file.fieldname === "image") {
      folder = "uploads/announcements/images";
      resource_type = "image";
    }

    if (file.fieldname === "pdf") {
      folder = "uploads/announcements/pdfs";
      resource_type = "raw";
    }

    return {
      folder,
      resource_type,
      public_id: Date.now() + "-" + Math.round(Math.random() * 1e9)
    };
  }
});

// ================= MULTER =================
const upload = multer({ storage });






const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});




const { Userauth } = require('./server/models/userauth');

let authenticate = (req, res, next) => {

  let token = req.headers.authorization;

  if (token && token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      message: "Not Logged In"
    });

  }

  jwt.verify(token, "thisissecret", (err, decoded) => {

    if (err) {
      return res.status(401).json({
        message: "Invalid token"
      });
    }

    req.user = decoded;
    next();

  });

};


app.get("/user/check-auth", (req, res) => {

  let token = req.headers.authorization;

  if (token && token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      authenticated: false
    });
  }

  jwt.verify(token, "thisissecret", (err, decoded) => {

    if (err) {
      return res.status(401).json({
        authenticated: false
      });
    }

    return res.status(200).json({
      authenticated: true,
      user: decoded
    });

  });

});


// ///////////////////////LOGOUT//////////////////
app.post("/user/logout", async (req, res) => {
  try {

    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided"
      });
    }

    // ✅ VERIFY TOKEN
    let decoded;
    try {
      decoded = jwt.verify(token, "thisissecret");
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
    }

    // ✅ FIND USER
    const user = await Userauth.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // ✅ CLEAR COOKIE
    res.clearCookie("user");


    // ✅ SEND RESPONSE FIRST (IMPORTANT ⚡)
    res.status(200).json({
      success: true,
      message: "Logout successful"
    });


    // ✅ EMAIL (RUN IN BACKGROUND - NO AWAIT 🚀)
    transporter.sendMail({
      from: `"College Management System" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Logout Notification – Account Security Alert",

      html: `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:20px">

    <div style="max-width:600px;margin:auto;background:white;padding:30px;border-radius:8px">

      <h2 style="color: #d90400;text-align:center">
        College Management System
      </h2>

      <hr style="margin:20px 0"/>

      <h3>Hello ${user.uname},</h3>

      <p>
        This is a security notification to inform you that your account has 
        <b>successfully Logged Out</b> on the College Management System.
      </p>

      <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:20px 0">

        <p><b>Account:</b> ${user.email}</p>
        <p><b>Action:</b> Logout</p>
        <p><b>Date & Time:</b> ${new Date().toLocaleString()}</p>

      </div>

      <br/>

      <p>
        Regards,<br/>
        <b>College Administration</b><br/>
        College Management System
      </p>

      <hr style="margin-top:25px"/>

      <p style="font-size:12px;color:#777;text-align:center">
        This is an automated security notification. Please do not reply to this email.
      </p>

    </div>

  </div>
  `
    }).catch((e) => {
      console.log("Mail error:", e.message);
    });

  } catch (error) {
    console.log("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Logout failed"
    });
  }
});


app.post(
  "/user/signupuser", upload.fields([{ name: "documents", maxCount: 1 }, { name: "photo", maxCount: 1 }]), async (req, res) => {

    try {

      const uname = req.body.usernameauth;
      const fullname = req.body.nameauth;
      const email = req.body.mailauth;
      const phone = req.body.phoneauth;
      const course = req.body.courseauth;
      const semester = Number(req.body.semesterauth);

      // ===== FILES =====
      const documents = req.files?.documents
        ? req.files.documents[0].path
        : "";

      const photo = req.files?.photo
        ? req.files.photo[0].path
        : "";

      // ================= SEMESTER VALIDATION =================

      const semesterLimits = {
        BA: 6,
        BCA: 6,
        BCOM: 6,
        Bioinfo: 6,
        "B.SC": 6,
        MCA: 4,
        "M.SC": 4,
        MSC: 4,
        "M.Com": 4
      };

      if (semesterLimits[course]) {

        if (semester < 1) {
          return res.status(400).json({
            success: false,
            message: "Semester must be at least 1"
          });
        }

        if (semester > semesterLimits[course]) {
          return res.status(400).json({
            success: false,
            message: `${course} maximum semester is ${semesterLimits[course]}`
          });
        }
      }

      // ================= DUPLICATE CHECK =================

      const existUser = await Userauth.findOne({
        $or: [
          { uname },
          { email },
          { phone }
        ]
      });

      if (existUser) {
        return res.status(409).json({
          success: false,
          message: "Username, Email or Phone already registered!"
        });
      }

      // ================= RANDOM STAFF ASSIGN =================

      const staffs = await Userauth.find({
        role: "staff",
        course: course
      });

      let assignedStaffId = null;

      if (staffs.length > 0) {
        const randomIndex = Math.floor(Math.random() * staffs.length);
        assignedStaffId = staffs[randomIndex]._id;
      }

      // ================= CREATE STUDENT =================

      const authuser = new Userauth({

        uname,
        name: fullname,
        email,
        phone,

        password: req.body.passwordauth,

        dob: req.body.dobauth,
        gender: req.body.genderauth,
        address: req.body.addressauth,

        course,
        semester,

        documents,
        photo,

        role: "student",
        assignedStaff: assignedStaffId,
        status: "pending"

      });

      const doc = await authuser.save();

      // ================= SEND EMAIL =================

      const mailOptions = {
        from: `"CMS  <${process.env.EMAIL_USER}>"`,
        to: email,
        subject: "Student – Awaiting Approval",

        html: `
        <div style="font-family:Arial;background:#f4f6f9;padding:20px">

          <div style="max-width:650px;margin:auto;background:white;padding:30px;border-radius:8px">

            <h2 style="color:#0d6efd;text-align:center">
              College Management System
            </h2>

            <hr/>

            <h3>Hello ${fullname},</h3>

            <p>
              Thank you for registering as a Student in the 
              <b>College Management System</b>.
            </p>

            <p>
              Your registration request has been submitted and is currently 
              <b>under review by the administration team</b>.
            </p>

            <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:20px 0">
              <h4>Registration Details</h4>
              <p><b>Name:</b> ${fullname}</p>
              <p><b>Email:</b> ${email}</p>
              <p><b>Course:</b> ${course}</p>
              <p><b>Submission Time:</b> ${new Date().toLocaleString()}</p>
            </div>

            <p>
              Once approved by admin, you will receive another email notification.
            </p>

            <br/>

            <p>
              Regards,<br/>
              <b>College Administration</b><br/>
              College Management System
            </p>

            <hr/>

            <p style="font-size:12px;color:#777;text-align:center">
              This is an automated email. Please do not reply.
            </p>

          </div>

        </div>
        `
      };

      transporter.sendMail(mailOptions)
        .then(() => console.log("Signup email sent"))
        .catch(err => console.log("Mail error:", err));

      // ================= RESPONSE =================

      return res.status(200).json({
        success: true,
        message: "Success to Register! Wait for admin approval.",
        rollNumber: doc.rno,
        photo,
        documents
      });

    } catch (error) {

      console.error("Signup Error:", error);

      return res.status(500).json({
        success: false,
        message: "Something went wrong while signing up!"
      });

    }
  }
);

// ================= STAFF SIGNUP =================
app.post(
  "/staffsignup",
  upload.fields([{ name: "photo", maxCount: 1 }]),
  async (req, res) => {

    try {

      const username = req.body.username;
      const fullname = req.body.fullname;
      const email = req.body.email;
      const phone = req.body.phone;
      const password = req.body.password;
      const dob = req.body.dob;
      const gender = req.body.gender;
      const address = req.body.address;
      const course = req.body.course;

      // ===== PHOTO =====
      const photo = req.files?.photo
        ? req.files.photo[0].path
        : "";

      // ===== CHECK DUPLICATE =====
      const existingUser = await Userauth.findOne({
        $or: [
          { email },
          { phone },
          { uname: username }
        ]
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Username, Email or Phone already registered!"
        });
      }

      // ===== CREATE STAFF =====
      const newStaff = new Userauth({

        uname: username,
        name: fullname,
        email,
        phone,
        password,

        dob,
        gender,
        address,

        course,
        photo,

        role: "staff",
        status: "pending"

      });

      const staff = await newStaff.save();

      // ===== RESPONSE =====
      res.status(201).json({
        success: true,
        message: "Staff registered successfully. Wait for admin approval.",
        photo: photo
      });

      // ===== SEND EMAIL =====
      const mailOptions = {

        from: `"College Management System" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Staff Registration Received – Awaiting Approval",

        html: `
<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:20px">

  <div style="max-width:650px;margin:auto;background:white;padding:30px;border-radius:8px">

    <h2 style="color:#0d6efd;text-align:center">
      College Management System
    </h2>

    <hr style="margin:20px 0"/>

    <h3>Hello ${fullname},</h3>

    <p>
      Thank you for registering as a staff member in the 
      <b>College Management System</b>.
    </p>

    <p>
      Your registration request has been submitted and is currently 
      <b>under review by the administration team</b>.
    </p>

    <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:20px 0">
      <h4>Registration Details</h4>
      <p><b>Name:</b> ${fullname}</p>
      <p><b>Email:</b> ${email}</p>
      <p><b>Department:</b> ${course}</p>
      <p><b>Submission Time:</b> ${new Date().toLocaleString()}</p>
    </div>

    <p>
      Once approved by admin, you will receive another email notification.
    </p>

    <br/>

    <p>
      Regards,<br/>
      <b>College Administration</b><br/>
      College Management System
    </p>

    <hr style="margin-top:25px"/>

    <p style="font-size:12px;color:#777;text-align:center">
      This is an automated message. Please do not reply to this email.
    </p>

  </div>

</div>
`
      };

      transporter.sendMail(mailOptions)
        .then(() => console.log("Staff signup email sent"))
        .catch(err => console.log("Mail error:", err));

    } catch (error) {

      console.log("Staff signup error:", error);

      res.status(500).json({
        success: false,
        message: "Server Error"
      });

    }

  }
);

// ================= LOGIN =================
app.post("/user/login", async (req, res) => {
  try {

    const { usernameauth, passwordauth } = req.body;

    // ❌ Validate input
    if (!usernameauth || !passwordauth) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required"
      });
    }

    // 🔍 Find user
    const user = await Userauth.findOne({
      $or: [{ email: usernameauth }, { uname: usernameauth }]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    // 🔑 Compare password
    const isMatch = await user.comparepassword(passwordauth);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password"
      });
    }

    // ⛔ Account status checks
    if (user.status === "pending") {
      return res.status(403).json({
        success: false,
        message: "Your account is waiting for admin approval"
      });
    }

    if (user.status === "rejected") {
      return res.status(403).json({
        success: false,
        message: "Your account has been rejected by admin"
      });
    }

    // 🔐 Generate token
    const token = user.generatetoken();

    res.cookie("user", user, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000
    });
    res.cookie("role", user.role, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000
    });

    const mailOptions = {
      from: `"College Management System" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Login Notification – Account Security Alert",

      html: `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:20px">

    <div style="max-width:600px;margin:auto;background:white;padding:30px;border-radius:8px">

      <h2 style="color:#11b50b;text-align:center">
        College Management System
      </h2>

      <hr style="margin:20px 0"/>

      <h3>Hello ${user.uname},</h3>

      <p>
        This is a security notification to inform you that your account has 
        <b>successfully Logged In</b> on the College Management System.
      </p>

      <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:20px 0">

        <p><b>Account:</b> ${user.email}</p>
        <p><b>Action:</b> Login</p>
        <p><b>Date & Time:</b> ${new Date().toLocaleString()}</p>

      </div>

      <p>
        If this Login action was performed by you, no further action is required.
      </p>

      <p>
        If you did <b>not</b> initiate this action, we strongly recommend that you 
        change your password immediately and contact the system administrator.
      </p>

      <br/>

      <p>
        Regards,<br/>
        <b>College Administration</b><br/>
        College Management System
      </p>

      <hr style="margin-top:25px"/>

      <p style="font-size:12px;color:#777;text-align:center">
        This is an automated security notification. Please do not reply to this email.
      </p>

    </div>

  </div>
  `
    };

    transporter.sendMail(mailOptions)
      .then(() => console.log("Login email sent"))
      .catch(err => console.log("Mail error:", err));

    // ✅ Send response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: token,
      user: {
        id: user._id,
        uname: user.uname,
        email: user.email,
        phone: user.phone,
        role: user.role,
        rno: user.rno,
        dob: user.dob,
        gender: user.gender,
        address: user.address,
        course: user.course,
        semester: user.semester
      }
    });


  } catch (error) {

    console.log("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error"
    });

  }
});








///////////////////////forgetpassword/////////////////////
////////////////////////////////////////////////////////
const otpGenerator = require("otp-generator");

app.post("/forgot-password", async (req, res) => {

  try {

    const { email } = req.body;

    const user = await Userauth.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "Email not registered"
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // reset counter if new day
    if (!user.forgotPasswordDate || user.forgotPasswordDate < today) {

      user.forgotPasswordCount = 0;
      user.forgotPasswordDate = today;

    }

    // allow only 2 times per day
    if (user.forgotPasswordCount >= 2) {

      return res.status(429).json({
        message: "You can only reset password 2 times per day."
      });

    }

    // Generate OTP
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false
    });

    user.otp = otp;
    user.otpExpire = Date.now() + 5 * 60 * 1000;

    user.otpAttempts = 0;
    user.otpBlockedUntil = null;

    await user.save();


    const mailOptions = {
      from: `"CMS ${process.env.EMAIL_USER}"`,
      to: user.email,

      subject: "Password Reset OTP – College Management System",

      html: `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:20px">

      <div style="max-width:650px;margin:auto;background:white;padding:30px;border-radius:8px">

        <h2 style="color:#0d6efd;text-align:center">
          College Management System
        </h2>

        <hr style="margin:20px 0"/>

        <h3>Hello ${user.uname},</h3>

        <p>
          We received a request to reset the password for your account.
          Please use the following One-Time Password (OTP) to continue the password reset process.
        </p>

        <div style="text-align:center;margin:25px 0">

          <div style="
            display:inline-block;
            background:#f8f9fa;
            padding:15px 25px;
            border-radius:6px;
            font-size:28px;
            font-weight:bold;
            letter-spacing:4px;
            color:#333;
          ">
            ${otp}
          </div>

        </div>

        <p style="text-align:center">
          This OTP is valid for <b>5 minutes</b>.
        </p>

        <div style="background:#fff3cd;padding:12px;border-radius:6px;margin-top:20px">
          <p style="margin:0;font-size:14px">
            Attempts used today: <b>${user.forgotPasswordCount}/2</b>
          </p>
        </div>

        <p style="margin-top:20px">
          <b>Time:</b> ${new Date().toLocaleString()}
        </p>

        <p>
          If you did not request a password reset, please ignore this email or contact the administration immediately.
        </p>

        <br/>

        <p>
          Regards,<br/>
          <b>College Administration</b><br/>
          College Management System
        </p>

        <hr style="margin-top:25px"/>

        <p style="font-size:12px;color:#777;text-align:center">
          This is an automated security message. Please do not reply to this email.
        </p>

      </div>

    </div>
    `
    }
    transporter.sendMail(mailOptions)
      .then(() => console.log("Staff signup email sent"))
      .catch(err => console.log("Mail error:", err));

    res.json({
      success: true,
      message: `OTP sent to email. Attempts used today: ${user.forgotPasswordCount}/2`
    });

  }

  catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error"
    });

  }

});

app.post("/reset-password", async (req, res) => {

  try {

    const { email, otp, newPassword } = req.body;

    const user = await Userauth.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found"
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Reset counter if new day
    if (!user.forgotPasswordDate || user.forgotPasswordDate < today) {
      user.forgotPasswordCount = 0;
      user.forgotPasswordDate = today;
    }

    // Limit check
    if (user.forgotPasswordCount >= 2) {
      return res.status(429).json({
        message: "Password reset limit reached (2 per day)"
      });
    }

    // OTP validation
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({
        message: "Invalid OTP"
      });
    }

    // Expiry check
    if (user.otpExpire < Date.now()) {
      return res.status(400).json({
        message: "OTP expired"
      });
    }

    // Change password
    user.password = newPassword;

    // Invalidate OTP
    user.otp = null;
    user.otpExpire = null;

    // Increase reset counter
    user.forgotPasswordCount += 1;

    await user.save();

    const mailOptions = {
      from: `"College Management System" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Successful – College Management System",

      html: `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:20px">

    <div style="max-width:650px;margin:auto;background:white;padding:30px;border-radius:8px">

      <h2 style="color:#198754;text-align:center">
        Password Reset Successful
      </h2>

      <hr style="margin:20px 0"/>

      <h3>Hello ${user.uname},</h3>

      <p>
        This email confirms that the password for your 
        <b>College Management System</b> account has been successfully updated.
      </p>

      <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:20px 0">

        <p><b>Account Email:</b> ${user.email}</p>
        <p><b>Reset Time:</b> ${new Date().toLocaleString()}</p>
        <p><b>Resets Used Today:</b> ${user.forgotPasswordCount}/2</p>

      </div>

      <p>
        If you performed this password reset, no further action is required.
      </p>

      <p style="color:#dc3545">
        <b>If you did NOT request this password change, please reset your password immediately or contact the administration.</b>
      </p>

      <div style="text-align:center;margin:25px 0">

        <a href="${process.env.FRONTEND_URL}/forgetpassword"
          style="
            background:#dc3545;
            color:white;
            padding:12px 25px;
            text-decoration:none;
            border-radius:20px;
            font-size:15px;
            display:inline-block;
          ">

          Secure My Account

        </a>

      </div>

      <br/>

      <p>
        Regards,<br/>
        <b>College Administration</b><br/>
        College Management System
      </p>

      <hr style="margin-top:25px"/>

      <p style="font-size:12px;color:#777;text-align:center">
        This is an automated security notification. Please do not reply to this email.
      </p>

    </div>

  </div>
  `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: `Password reset successful (${user.forgotPasswordCount}/2 used today)`
    });

  }

  catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server error"
    });

  }

});



app.get("/admin/pending-students", async (req, res) => {
  try {

    const students = await Userauth.find({
      role: "student",
      status: "pending"
    });

    res.json(students);

  } catch (error) {
    res.status(500).json({ message: "Error fetching students" });
  }
});


app.get("/admin/pending-staff", async (req, res) => {
  try {

    const staff = await Userauth.find({
      role: "staff",
      status: "pending"
    });

    res.json(staff);

  } catch (error) {
    res.status(500).json({ message: "Error fetching staff" });
  }
});
app.put("/admin/approve-user/:id", async (req, res) => {
  try {

    const user = await Userauth.findByIdAndUpdate(
      req.params.id,
      { status: "active" },
      { new: true }
    );
    res.json({
      success: true,
      message: "User approved and email sent"
    });

    /////////EMAILS//////////////

    const mailOptions = {
      from: `"College Management System" <${process.env.EMAIL_USER}>`,
      to: user.email,

      subject: "Your Account Has Been Approved – College Management System",

      html: `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:20px">

      <div style="max-width:650px;margin:auto;background:white;padding:30px;border-radius:8px">

        <h2 style="color:#198754;text-align:center">
          Account Approved
        </h2>

        <hr style="margin:20px 0"/>

        <h3>Hello ${user.uname},</h3>

        <p>
          We are pleased to inform you that your account for the 
          <b>College Management System</b> has been successfully 
          <b>approved by the administration</b>.
        </p>

        <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:20px 0">
          <h4 style="margin-top:0">Account Details</h4>
          <p><b>Name:</b> ${user.uname}</p>
          <p><b>Email:</b> ${user.email}</p>
          <p><b>Course / Department:</b> ${user.course || "-"}</p>
          <p><b>Approval Time:</b> ${new Date().toLocaleString()}</p>
        </div>

        <p>
          You can now log in to your account and access all available features of the system.
        </p>

        <div style="text-align:center;margin:25px 0">

          <a href="${process.env.FRONTEND_URL}/login"
            style="background:#0d6efd;color:white;padding:12px 25px;
            text-decoration:none;border-radius:6px;font-size:16px;
            display:inline-block;">

            Login to Your Account

          </a>

        </div>

        <p>
          If you experience any issues accessing your account, please contact the college administration.
        </p>

        <br/>

        <p>
          Regards,<br/>
          <b>College Administration</b><br/>
          College Management System
        </p>

        <hr style="margin-top:25px"/>

        <p style="font-size:12px;color:#777;text-align:center">
          This is an automated message. Please do not reply to this email.
        </p>

      </div>

    </div>
    `
    }
    transporter.sendMail(mailOptions)
      .then(() => console.log("Signup email sent"))
      .catch(err => console.log("Mail error:", err));


  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error approving user"
    });

  }
});
app.put("/admin/reject-user/:id", async (req, res) => {
  try {

    const user = await Userauth.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    res.json({
      success: true,
      message: "User rejected and email sent"
    });

    // EMAIL TO USER
    const mailOptions = {
      from: `"College Management System" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Account Registration Update – Request Not Approved",

      html: `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:20px">

      <div style="max-width:650px;margin:auto;background:white;padding:30px;border-radius:8px">

        <h2 style="color:#dc3545;text-align:center">
          Account Request Rejected
        </h2>

        <hr style="margin:20px 0"/>

        <h3>Hello ${user.uname},</h3>

        <p>
          Thank you for your interest in registering with the 
          <b>College Management System</b>.
        </p>

        <p>
          After reviewing your registration request, we regret to inform you that 
          your account request has <b>not been approved</b> by the administration.
        </p>

        <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:20px 0">
          <h4 style="margin-top:0">Request Details</h4>
          <p><b>Name:</b> ${user.uname}</p>
          <p><b>Email:</b> ${user.email}</p>
          <p><b>Date Reviewed:</b> ${new Date().toLocaleString()}</p>
        </div>

        <p>
          If you believe this decision was made in error or if you require further clarification,
          please contact the college administration for assistance.
        </p>

        <p>
          You may also submit a new registration request with the correct details if necessary.
        </p>

        <br/>

        <p>
          Regards,<br/>
          <b>College Administration</b><br/>
          College Management System
        </p>

        <hr style="margin-top:25px"/>

        <p style="font-size:12px;color:#777;text-align:center">
          This is an automated message from the College Management System.
        </p>

      </div>

    </div>
    `}
    transporter.sendMail(mailOptions)
      .then(() => console.log("Signup email sent"))
      .catch(err => console.log("Mail error:", err));


  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error rejecting user"
    });

  }
});

app.get("/user/my-profile", authenticate, async (req, res) => {

  try {

    const user = await Userauth.findById(req.user.id)
      .select("-password");

    res.json(user);

  } catch (error) {

    res.status(500).json({
      message: "Error fetching profile"
    });

  }

});





// ADMIN SUBJECTS UPLOAD AND SEE

const Subject = require("./server/models/subjects");

app.post("/subjects/upload", authenticate, async (req, res) => {
  try {
    const { course, semester, subjects } = req.body;
    if (!course || !semester || !subjects || subjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Course, semester and subjects are required",
      });
    }

    const data = await Subject.findOneAndUpdate(
      { course, semester },
      { subjects },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Subjects uploaded successfully",
      data,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error uploading subjects",
    });
  }
});


// get all subjects (admin)
app.get("/subjects/all", authenticate, async (req, res) => {
  try {
    const data = await Subject.find({});
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Error fetching subjects" });
  }
});



// total staff and students 

// 🔵 GET TOTAL COUNT OF STAFF & STUDENTS
app.get("/admin/dashboard-count", authenticate, async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const totalStudents = await Userauth.countDocuments({ role: "student", status: "active" });
    const totalStaff = await Userauth.countDocuments({ role: "staff" });

    res.status(200).json({
      success: true,
      totalStudents,
      totalStaff
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error fetching counts"
    });
  }
});

app.get("/admin/all-students", authenticate, async (req, res) => {

  console.log("Admin requesting students:", req.user);

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const students = await Userauth.find({
      role: "student",
      status: { $ne: "graduated" }
    })
      .populate("assignedStaff", "uname email")
      .select("-password");

    console.log("Students found:", students.length);

    res.json(students);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching students" });
  }
});

app.get("/admin/graduated-students", authenticate, async (req, res) => {

  const students = await Userauth.find({
    role: "student",
    status: "graduated"
  }).select("-password");

  res.json(students);
});


// admin get all courses

app.get("/admin/all-courses", async (req, res) => {
  try {
    const courses = await Userauth.distinct("course", {
      role: "student"
    });

    res.json(courses);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching courses"
    });
  }
});

// ////get semester by courses 

app.get("/admin/semesters-by-course", async (req, res) => {
  try {
    const { course } = req.query;

    if (!course) {
      return res.status(400).json({
        message: "Course is required"
      });
    }

    const semesters = await Userauth.distinct("semester", {
      role: "student",
      course: course
    });

    // Sort semesters properly
    semesters.sort((a, b) => a - b);

    res.json(semesters);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching semesters"
    });
  }
});



// ===============================
// ADMIN → CHANGE STUDENT STAFF
// ===============================
app.put("/admin/change-student-staff", authenticate, async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin allowed"
      });
    }

    const { studentId, newStaffId } = req.body;

    if (!studentId || !newStaffId) {
      return res.status(400).json({
        message: "Student ID and New Staff ID required"
      });
    }

    // 🔹 Find student
    const student = await Userauth.findById(studentId);
    if (!student || student.role !== "student") {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    // 🔹 Find new staff
    const newStaff = await Userauth.findById(newStaffId);
    if (!newStaff || newStaff.role !== "staff") {
      return res.status(404).json({
        message: "Staff not found"
      });
    }

    // 🔹 Remove student from old staff
    if (student.assignedStaff) {
      await Userauth.findByIdAndUpdate(
        student.assignedStaff,
        { $pull: { assignedStudents: studentId } }
      );
    }

    // 🔹 Assign new staff to student
    student.assignedStaff = newStaffId;
    await student.save();

    // 🔹 Add student to new staff
    await Userauth.findByIdAndUpdate(
      newStaffId,
      { $addToSet: { assignedStudents: studentId } }
    );

    res.status(200).json({
      success: true,
      message: "Student reassigned successfully"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error updating assignment"
    });
  }
});





app.put("/admin/unassign-student", authenticate, async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin allowed"
      });
    }

    const { studentId } = req.body;

    const student = await Userauth.findById(studentId);

    if (!student || student.role !== "student") {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    if (student.assignedStaff) {
      await Userauth.findByIdAndUpdate(
        student.assignedStaff,
        { $pull: { assignedStudents: studentId } }
      );
    }

    student.assignedStaff = null;
    await student.save();

    res.json({
      success: true,
      message: "Student unassigned successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: "Error unassigning student"
    });
  }
});



/////////////ADMIN CAN UPDATE ANYONE STUDENT OR STAFF//////////////////
// GET users by role

app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/admin/users/:role", async (req, res) => {
  try {

    const { role } = req.params;

    if (!["student", "staff"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // FILTER ACTIVE STUDENTS ONLY
    let query = { role };

    if (role === "student") {
      query.status = "active";
    }

    const users = await Userauth.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(users);

  } catch (error) {
    console.log("Fetch Users Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

app.get("/admin/user/:id", async (req, res) => {
  try {

    const user = await Userauth.findById(req.params.id)
      .select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json(user);

  } catch (error) {

    console.log("Fetch User Error:", error);

    res.status(500).json({
      message: "Error fetching user"
    });

  }
});


app.put("/admin/user/:id", async (req, res) => {
  try {

    const { uname, email, course, semester, status } = req.body;

    const updatedUser = await Userauth.findByIdAndUpdate(
      req.params.id,
      {
        uname,
        email,
        course,
        semester,
        status
      },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      user: updatedUser
    });

  } catch (error) {

    console.log("Update Error:", error);

    res.status(500).json({
      message: "Error updating user"
    });

  }
});






app.post("/staff/assign-students", authenticate, async (req, res) => {
  try {

    const { studentIds } = req.body;
    const staffId = req.user.id;

    if (!studentIds || studentIds.length === 0) {
      return res.status(400).json({
        message: "No students selected"
      });
    }

    const staff = await Userauth.findById(staffId);

    if (!staff || staff.role !== "staff") {
      return res.status(403).json({
        message: "Only staff can assign students"
      });
    }

    // 🔴 STEP 1: Check if any student already assigned
    const alreadyAssigned = await Userauth.find({
      _id: { $in: studentIds },
      assignedStaff: { $ne: null }
    });

    if (alreadyAssigned.length > 0) {
      return res.status(400).json({
        message: "Some students are already assigned to another staff"
      });
    }

    // 🟢 STEP 2: Update students → assign staff
    await Userauth.updateMany(
      { _id: { $in: studentIds } },
      { $set: { assignedStaff: staffId } }
    );

    // 🟢 STEP 3: Update staff → add students
    await Userauth.findByIdAndUpdate(
      staffId,
      {
        $addToSet: { assignedStudents: { $each: studentIds } }
      }
    );

    res.json({
      success: true,
      message: "Students assigned successfully"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error assigning students"
    });
  }
});












// =====================
// STUDENT → MY SUBJECTS
// =====================
app.get("/student/my-subjects", authenticate, async (req, res) => {
  try {
    // 🔹 Get logged-in student
    const student = await Userauth.findById(req.user.id);

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    if (student.role !== "student") {
      return res.status(403).json({
        message: "Only students can access subjects",
      });
    }

    // 🔹 Fetch subjects from DB using course + semester
    const subjectDoc = await Subject.findOne({
      course: student.course,
      semester: student.semester,
    });

    // 🔹 If no subjects uploaded yet
    if (!subjectDoc) {
      return res.status(200).json({
        course: student.course,
        semester: student.semester,
        subjects: [],
      });
    }

    // 🔹 Success
    res.status(200).json({
      course: subjectDoc.course,
      semester: subjectDoc.semester,
      subjects: subjectDoc.subjects,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error fetching subjects",
    });
  }
});


// ===============================
// STAFF → MY CLASSES WITH STUDENTS
// ===============================

app.get("/staff/my-classes", authenticate, async (req, res) => {

  try {

    const staff = await Userauth.findById(req.user.id);

    if (!staff || staff.role !== "staff") {
      return res.status(403).json({
        message: "Only staff allowed"
      });
    }

    const timetables = await TimeTable.find({
      course: staff.course
    });

    let classes = [];

    for (let tt of timetables) {

      for (let day of tt.schedule) {

        for (let period of day.periods) {

          if (period.faculty === staff.uname) {

            const students = await Userauth.find({
              role: "student",
              course: tt.course,
              semester: tt.semester
            }).select("uname rno email");

            classes.push({
              course: tt.course,
              semester: tt.semester,
              subject: period.subject,
              day: day.day,
              time: period.time,
              roomNo: period.roomNo,
              students
            });

          }

        }

      }

    }

    res.json(classes);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching classes"
    });

  }

});

app.get("/staff/all-students", authenticate, async (req, res) => {
  try {

    const staff = await Userauth.findById(req.user.id);

    if (!staff || staff.role !== "staff") {
      return res.status(403).json({
        message: "Only staff allowed",
      });
    }

    // Get students NOT already assigned
    const students = await Userauth.find({
      role: "student",
      assignedStaff: null,
      _id: { $nin: staff.assignedStudents }
    }).select("uname course semester rno email");

    res.json(students);

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error fetching students"
    });
  }
});


app.get("/student/my-teacher", authenticate, async (req, res) => {
  try {

    const student = await Userauth.findById(req.user.id)
      .populate("assignedStaff", "uname email");

    if (!student || student.role !== "student") {
      return res.status(403).json({
        message: "Only students can access this"
      });
    }

    res.json({
      teacher: student.assignedStaff,
      course: student.course,
      semester: student.semester,
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error fetching teacher"
    });
  }
});


app.get("/student/my-details", authenticate, async (req, res) => {
  try {

    const student = await Userauth.findById(req.user.id)
      .populate("assignedStaff", "uname email");

    if (!student || student.role !== "student") {
      return res.status(403).json({
        message: "Only students allowed"
      });
    }

    res.json({
      teacher: student.assignedStaff,
      course: student.course,
      semester: student.semester,
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching details"
    });
  }
});


// fetch all staf members 
// 🔵 GET ALL STAFF MEMBERS
app.get("/allstafflist", async (req, res) => {
  try {

    // Fetch only staff
    const staffMembers = await Userauth.find({
      role: "staff",
      status: "active"

    })
      .select("-password -token");   // hide password

    // 🔥 VERY IMPORTANT:
    // Return ARRAY directly (not object)
    res.status(200).json(staffMembers);

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error fetching staff members"
    });
  }
});
















// =====================
// ADMIN → STAFF WITH STUDENTS ONLY
// =====================
app.get("/admin/staff-with-students", authenticate, async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin allowed"
      });
    }

    // Find staff who have at least one assigned student
    const staffWithStudents = await Userauth.find({
      role: "staff",
      assignedStudents: { $exists: true, $not: { $size: 0 } }
    }).select("-password");

    res.json(staffWithStudents);

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error fetching staff"
    });
  }
});









// /////////////////TIME TABLE 
const TimeTable = require("./server/models/timetable");

app.post("/admin/upload-timetable", authenticate, async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin can upload timetable"
      });
    }

    const { course, semester, schedule } = req.body;

    if (!course || !semester || !schedule) {
      return res.status(400).json({
        message: "Course, semester and schedule required"
      });
    }

    const timetable = await TimeTable.findOneAndUpdate(
      { course, semester },
      { schedule },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      message: "Timetable saved successfully",
      timetable
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error saving timetable"
    });
  }
});





// fetch subjects for Uploadin timetable at admin level
app.get("/subjects/by-course-semester", authenticate, async (req, res) => {
  try {
    const { course, semester } = req.query;

    const subjectDoc = await Subject.findOne({
      course: course,
      semester: Number(semester),
    });

    if (!subjectDoc) {
      return res.json({ subjects: [] });
    }

    res.json({ subjects: subjectDoc.subjects });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching subjects" });
  }
});

app.get("/student/my-timetable", authenticate, async (req, res) => {

  try {

    const student = await Userauth.findById(req.user.id);

    if (!student || student.role !== "student") {
      return res.status(403).json({
        message: "Only students allowed"
      });
    }

    const timetable = await TimeTable.findOne({
      course: student.course,
      semester: student.semester
    });

    const leaves = await Leave.find({
      status: "Approved",
      $or: [
        { userId: student._id },
        { role: "staff" }
      ]
    }).populate("userId", "uname role");

    if (!timetable) {
      return res.status(200).json({
        message: "No timetable uploaded yet",
        schedule: [],
      });
    }

    res.status(200).json({
      course: timetable.course,
      semester: timetable.semester,
      schedule: timetable.schedule,
      leaves
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching timetable"
    });

  }

});








// =====================
// STAFF → MY SUBJECTS
// =====================
app.get("/staff/my-subjects", authenticate, async (req, res) => {
  try {

    const staff = await Userauth.findById(req.user.id);

    if (!staff || staff.role !== "staff") {
      return res.status(403).json({
        message: "Only staff allowed"
      });
    }

    // Get all timetables of staff course
    const timetables = await TimeTable.find({
      course: staff.course
    });

    if (!timetables.length) {
      return res.json({
        course: staff.course,
        subjects: []
      });
    }

    let subjectSet = new Set();

    timetables.forEach((tt) => {

      tt.schedule.forEach((day) => {

        day.periods.forEach((period) => {

          if (period.faculty === staff.uname) {

            subjectSet.add(
              JSON.stringify({
                subject: period.subject,
                semester: tt.semester
              })
            );

          }

        });

      });

    });

    const subjects = Array.from(subjectSet).map(s =>
      JSON.parse(s)
    );

    res.json({
      course: staff.course,
      subjects
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error fetching subjects"
    });
  }
});





// staff Timetable 
// =====================
// STAFF → MY TIMETABLE
// =====================
app.get("/staff/my-timetable", authenticate, async (req, res) => {
  try {

    const staff = await Userauth.findById(req.user.id);

    if (!staff || staff.role !== "staff") {
      return res.status(403).json({
        message: "Only staff allowed"
      });
    }

    // 🔹 Get timetable for staff course
    const timetables = await TimeTable.find({
      course: staff.course
    });

    // 🔹 Get staff approved leaves
    const leaves = await Leave.find({
      userId: staff._id,
      status: "Approved"
    });

    if (!timetables.length) {
      return res.json({
        course: staff.course,
        data: [],
        leaves
      });
    }

    let groupedData = [];

    timetables.forEach((tt) => {

      let semesterSchedule = [];

      tt.schedule.forEach((day) => {

        const filteredPeriods = day.periods.filter(
          (p) => p.faculty === staff.uname
        );

        if (filteredPeriods.length > 0) {

          semesterSchedule.push({
            day: day.day,
            periods: filteredPeriods
          });

        }

      });

      if (semesterSchedule.length > 0) {

        groupedData.push({
          semester: tt.semester,
          schedule: semesterSchedule
        });

      }

    });

    res.json({
      course: staff.course,
      data: groupedData,
      leaves
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching timetable"
    });

  }
});



// admin show timetable 
app.get("/admin/get-timetable", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin allowed" });
    }

    const { course, semester } = req.query;

    const timetable = await TimeTable.findOne({
      course,
      semester: Number(semester),
    });

    if (!timetable) {
      return res.json({ schedule: [] });
    }

    res.json(timetable);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching timetable" });
  }
});








// ///////////fees //////////////////////////////


const FeeStructure = require("./server/models/FeesStructure");

// Admin sets fee structure
app.post("/admin/set-fee-structure", async (req, res) => {
  try {

    const {
      course,
      semester,
      tuitionFee,
      examFee,
      otherFee
    } = req.body;

    // Calculate total
    const totalFee =
      Number(tuitionFee) +
      Number(examFee) +
      Number(otherFee || 0);

    // Check if already exists
    const existing = await FeeStructure.findOne({
      course,
      semester
    });

    if (existing) {
      // Update existing
      existing.tuitionFee = tuitionFee;
      existing.examFee = examFee;
      existing.otherFee = otherFee;
      existing.totalFee = totalFee;

      await existing.save();

      return res.json({
        message: "Fee Structure Updated Successfully"
      });
    }

    // Create new
    const newFee = new FeeStructure({
      course,
      semester,
      tuitionFee,
      examFee,
      otherFee,
      totalFee
    });

    await newFee.save();

    res.json({
      message: "Fee Structure Created Successfully"
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get("/admin/fee-structure-by-course-semester", async (req, res) => {
  try {
    const { course, semester } = req.query;

    if (!course || !semester) {
      return res.status(400).json({
        message: "Course and semester required"
      });
    }

    const fee = await FeeStructure.findOne({
      course,
      semester: Number(semester)
    });

    if (!fee) {
      return res.json(null); // No data found
    }

    res.json(fee);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching fee structure"
    });
  }
});

// 🔥 Generate Fees For ALL Students (ALL COURSES + SEMESTERS)

app.post("/admin/generate-fees-for-all", authenticate, async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admin allowed"
      });
    }

    const feeStructures = await FeeStructure.find({});

    if (feeStructures.length === 0) {
      return res.status(400).json({
        message: "No fee structures found"
      });
    }

    let generatedCount = 0;

    for (let structure of feeStructures) {

      const students = await Userauth.find({
        role: "student",
        course: structure.course,
        semester: structure.semester,
        status: "active"
      });

      for (let student of students) {

        const existing = await StudentFee.findOne({
          studentId: student._id,
          semester: structure.semester
        });

        if (!existing) {

          await StudentFee.create({
            studentId: student._id,
            course: structure.course,
            semester: structure.semester,
            totalFee: structure.totalFee,
            paidAmount: 0,
            dueAmount: structure.totalFee,
            status: "Pending"
          });

          generatedCount++;

        }

      }

    }

    res.json({
      success: true,
      message: `Fees generated for ${generatedCount} students`
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error generating fees"
    });

  }

});


app.get("/admin/all-fee-structures", async (req, res) => {
  try {
    const fees = await FeeStructure.find().sort({
      course: 1,
      semester: 1
    });

    res.json(fees);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// ADMIN → VIEW GENERATED FEES
// ==============================
app.get("/admin/generated-fees", async (req, res) => {
  try {
    const { course, semester } = req.query;

    const fees = await StudentFee.find({
      course,
      semester
    })
      .populate("studentId", "uname rno email")
      .sort({ createdAt: -1 });

    res.json(fees);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});




const StudentFee = require("./server/models/StudentFee");

// ==========================
// STUDENT → MY FEES
// ==========================
app.get("/student/my-fees", authenticate, async (req, res) => {
  try {

    const student = await Userauth.findById(req.user.id);

    if (!student) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    if (student.role !== "student") {
      return res.status(403).json({
        message: "Only students allowed"
      });
    }

    const fees = await StudentFee.find({
      studentId: student._id
    }).sort({ semester: 1 });

    res.status(200).json({
      course: student.course,
      fees
    });

  } catch (error) {
    console.log("ERROR:", error);
    res.status(500).json({
      message: "Server error"
    });
  }
});


//////////////// CREATE ORDER //////////////////
app.post("/payment/create-order", authenticate, async (req, res) => {

  try {

    const { feeId } = req.body;

    const student = await Userauth.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const fee = await StudentFee.findById(feeId);
    if (!fee) {
      return res.status(404).json({ message: "Fee not found" });
    }

    if (fee.status === "Paid") {
      return res.status(400).json({ message: "Fee already paid" });
    }

    const orderId = `order_${Date.now()}`;

    const orderRequest = {
      order_id: orderId,
      order_amount: Number(fee.dueAmount),
      order_currency: "INR",

      customer_details: {
        customer_id: student._id.toString(),
        customer_name: student.uname,
        customer_email: student.email,
        customer_phone: student.phone
      },

      order_meta: {
        return_url: `${FRONTEND_URL}/payment-success?order_id=${orderId}`
      }
    };

    const response = await cashfree.PGCreateOrder(orderRequest);

    res.json({
      success: true,
      paymentSessionId: response.data.payment_session_id,
      orderId,
      feeId
    });

  } catch (err) {

    console.log("Create Order Error:", err.response?.data || err);

    res.status(500).json({
      success: false,
      message: "Order creation failed"
    });

  }

});

//////////////// VERIFY PAYMENT //////////////////
//////////////// VERIFY PAYMENT //////////////////
app.post("/payment/verify", authenticate, async (req, res) => {

  try {

    const { orderId, feeId } = req.body;

    const response = await cashfree.PGOrderFetchPayments(orderId);

    const payments = response.data;

    if (!payments || payments.length === 0) {
      return res.json({
        success: false,
        message: "No payment found"
      });
    }

    const successfulPayment = payments.find(
      p => p.payment_status === "SUCCESS"
    );

    if (!successfulPayment) {
      return res.json({
        success: false,
        message: "Payment not successful"
      });
    }

    const fee = await StudentFee.findById(feeId).populate("studentId");

    if (!fee) {
      return res.status(404).json({
        message: "Fee not found"
      });
    }

    fee.paidAmount = fee.totalFee;
    fee.dueAmount = 0;
    fee.status = "Paid";

    await fee.save();

    const student = fee.studentId;

    ////////////////// SEND EMAIL //////////////////

    const mailOptions = {

      from: `"College Management System" <${process.env.EMAIL_USER}>`,
      to: student.email,
      subject: "Fee Payment Successful - Receipt",

      html: `
      <div style="font-family:Arial;padding:30px;background:#f4f6f9">

        <div style="max-width:600px;margin:auto;background:white;padding:30px;border-radius:10px">

          <h2 style="color:#28a745">Payment Successful </h2>

          <p>Hello <strong>${student.uname}</strong>,</p>

          <p>Your fee payment has been successfully processed.</p>

          <table style="width:100%;margin-top:20px;border-collapse:collapse">

            <tr>
              <td style="padding:8px;border-bottom:1px solid #eee"><strong>Order ID</strong></td>
              <td style="padding:8px;border-bottom:1px solid #eee">${orderId}</td>
            </tr>

            <tr>
              <td style="padding:8px;border-bottom:1px solid #eee"><strong>Course</strong></td>
              <td style="padding:8px;border-bottom:1px solid #eee">${fee.course}</td>
            </tr>

            <tr>
              <td style="padding:8px;border-bottom:1px solid #eee"><strong>Semester</strong></td>
              <td style="padding:8px;border-bottom:1px solid #eee">${fee.semester}</td>
            </tr>

            <tr>
              <td style="padding:8px;border-bottom:1px solid #eee"><strong>Amount Paid</strong></td>
              <td style="padding:8px;border-bottom:1px solid #eee">₹${fee.totalFee}</td>
            </tr>

            <tr>
              <td style="padding:8px"><strong>Status</strong></td>
              <td style="padding:8px;color:#28a745"><strong>PAID</strong></td>
            </tr>

          </table>

          <p style="margin-top:20px">
            Your receipt is now available in your student portal.
          </p>

          <a href="${process.env.FRONTEND_URL}/fees"
             style="display:inline-block;margin-top:15px;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px">
             View Receipt
          </a>

          <hr style="margin-top:30px">

          <p style="font-size:12px;color:#777">
            This is an automated message from the College Fee Portal.
          </p>

        </div>

      </div>
      `
    };

    transporter.sendMail(mailOptions)
      .then(() => console.log("Success email sent"))
      .catch(err => console.log("Mail error:", err));

    res.json({
      success: true
    });

  } catch (err) {

    console.log("Verify Error:", err);

    res.status(500).json({
      success: false,
      message: "Verification failed"
    });

  }

});



///////////////////////DOWNLOAD PAYMENT RECIEPT//////////////////////////

const PDFDocument = require("pdfkit");
const GeneratedFee = require("./server/models/StudentFee"); // adjust path

app.get("/payment/receipt/:feeId", async (req, res) => {
  try {

    const { feeId } = req.params;
    const { download } = req.query;

    const fee = await GeneratedFee.findById(feeId).populate("studentId");

    if (!fee) {
      return res.status(404).json({ message: "Fee not found" });
    }

    const doc = new PDFDocument({
      size: "A4",
      margin: 50
    });

    /* ---------- DOWNLOAD OR VIEW ---------- */

    if (download === "true") {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=receipt-${fee.studentId.rno}.pdf`
      );
    } else {
      res.setHeader("Content-Disposition", "inline");
    }

    res.setHeader("Content-Type", "application/pdf");

    doc.pipe(res);

    /* ---------- HEADER ---------- */

    doc
      .fontSize(22)
      .fillColor("#b91c1c")
      .text("SHARMA'S COLLEGE OF MANAGEMENT", {
        align: "center"
      });

    doc
      .fontSize(11)
      .fillColor("gray")
      .text("Affiliated to Sharma's University", {
        align: "center"
      });

    doc.moveDown(0.5);

    doc
      .strokeColor("#999")
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown();

    doc
      .fontSize(16)
      .fillColor("black")
      .text("FEE PAYMENT RECEIPT", { align: "center" });

    doc.moveDown(2);

    /* ---------- RECEIPT DETAILS ---------- */

    const receiptNo = `RCPT-${Date.now()}`;
    const paymentDate = new Date().toLocaleString();

    doc
      .fontSize(12)
      .fillColor("black")
      .text(`Receipt No : ${receiptNo}`)
      .text(`Transaction ID : ${fee._id}`)
      .text(`Payment Date : ${paymentDate}`);

    doc.moveDown(1.5);

    /* ---------- STUDENT DETAILS ---------- */

    doc
      .fontSize(14)
      .fillColor("#1d4ed8")
      .text("Student Information");

    doc.moveDown(0.5);

    const startY = doc.y;

    doc
      .rect(50, startY - 5, 500, 110)
      .stroke("#ccc");

    doc
      .fontSize(12)
      .fillColor("black")
      .text(`Name : ${fee.studentId.uname}`, 60, startY)
      .text(`Roll No : ${fee.studentId.rno}`)
      .text(`Email : ${fee.studentId.email}`)
      .text(`Course : ${fee.course}`)
      .text(`Semester : ${fee.semester}`)
      .text(`Fees Paid For : ${fee.description}`);

    doc.moveDown(3);

    /* ---------- PAYMENT TABLE ---------- */

    const tableTop = doc.y;

    doc
      .rect(50, tableTop, 500, 25)
      .fillAndStroke("#f3f4f6", "#ccc");

    doc
      .fillColor("black")
      .fontSize(12)
      .text("Description", 60, tableTop + 7)
      .text("Total", 300, tableTop + 7)
      .text("Paid", 380, tableTop + 7)
      .text("Due", 460, tableTop + 7);

    const rowTop = tableTop + 25;

    doc
      .rect(50, rowTop, 500, 25)
      .stroke("#ccc");

    const total = Number(fee.totalFee).toLocaleString("en-IN");
    const paid = Number(fee.paidAmount).toLocaleString("en-IN");
    const due = Number(fee.dueAmount).toLocaleString("en-IN");

    doc
      .fontSize(12)
      .fillColor("black")
      .text(`Semester ${fee.semester} Fees`, 60, rowTop + 7)
      .text(`₹ ${total}`, 300, rowTop + 7)
      .text(`₹ ${paid}`, 380, rowTop + 7)
      .text(`₹ ${due}`, 460, rowTop + 7);

    doc.moveDown(3);

    /* ---------- PAYMENT STATUS ---------- */

    doc
      .fontSize(14)
      .fillColor(fee.status === "Paid" ? "green" : "red")
      .text(`Payment Status : ${fee.status}`, {
        align: "center"
      });

    doc.moveDown(2);

    /* ---------- SIGNATURE ---------- */

    doc
      .strokeColor("#999")
      .moveTo(400, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc
      .fontSize(11)
      .fillColor("black")
      .text("Authorized Signature", 410, doc.y + 5);

    doc.moveDown(4);

    /* ---------- FOOTER ---------- */

    doc
      .fontSize(10)
      .fillColor("gray")
      .text(
        "This is a computer generated receipt. No physical signature required.",
        { align: "center" }
      );

    doc.end();

  } catch (error) {

    console.log("Receipt Error:", error);

    res.status(500).json({
      message: "Error generating receipt"
    });

  }
});










const AttendanceFineRule = require("./server/models/AttendanceFineRule");

// ============================
// ADMIN → SAVE ATTENDANCE FINE RULES
// ============================

app.post("/admin/set-attendance-fine", authenticate, async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { rules } = req.body;

    if (!rules || rules.length === 0) {
      return res.status(400).json({
        message: "Rules required"
      });
    }

    for (const rule of rules) {

      await AttendanceFineRule.findOneAndUpdate(
        {
          minAttendance: rule.minAttendance,
          maxAttendance: rule.maxAttendance
        },
        {
          fineAmount: rule.fineAmount
        },
        {
          upsert: true,   // create if not exists
          new: true
        }
      );

    }

    res.json({
      success: true,
      message: "Fine rules updated successfully"
    });

  }

  catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error saving rules"
    });

  }

});

app.delete("/admin/delete-attendance-fine/:id", authenticate, async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { id } = req.params;

    await AttendanceFineRule.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Fine rule deleted successfully"
    });

  }

  catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error deleting rule"
    });

  }

});


// ============================
// ADMIN → GET ATTENDANCE FINE RULES
// ============================

app.get("/admin/get-attendance-fine-rule", authenticate, async (req, res) => {

  try {

    const rules = await AttendanceFineRule
      .find()
      .sort({ minAttendance: 1 });

    res.json(rules);

  }

  catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching rules"
    });

  }

});// ===============================
// ADMIN → GENERATE ATTENDANCE FINE
// ===============================

app.post("/admin/generate-attendance-fine", authenticate, async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const { course, semester } = req.body;

    let filter = { role: "student" };

    if (course && course !== "") {
      filter.course = course;
    }

    if (semester && semester !== "") {
      filter.semester = Number(semester);
    }

    const students = await Userauth.find(filter);

    if (students.length === 0) {
      return res.json({
        message: "No students found"
      });
    }

    const rules = await AttendanceFineRule
      .find()
      .sort({ minAttendance: -1 });

    if (rules.length === 0) {
      return res.status(400).json({
        message: "Fine rules not set"
      });
    }

    let finedStudents = [];

    for (let student of students) {

      const records = await Attendance.find({
        course: student.course,
        semester: student.semester
      });

      let totalClasses = 0;
      let totalPresent = 0;

      records.forEach(record => {

        record.students.forEach(s => {

          if (s.studentId.toString() === student._id.toString()) {

            totalClasses++;

            if (s.status === "Present") {
              totalPresent++;
            }

          }

        });

      });

      if (totalClasses === 0) continue;

      const percentage = (totalPresent / totalClasses) * 100;

      let fineAmount = 0;

      for (let rule of rules) {

        if (
          percentage >= rule.minAttendance &&
          percentage <= rule.maxAttendance
        ) {
          fineAmount = rule.fineAmount;
          break;
        }

      }

      if (fineAmount > 0) {

        const existing = await StudentFee.findOne({

          studentId: student._id,

          type: "attendance",

          semester: student.semester

        });

        if (!existing) {

          await StudentFee.create({

            studentId: student._id,

            course: student.course,

            semester: student.semester,

            type: "attendance",

            description: "Attendance Fine",

            totalFee: fineAmount,

            paidAmount: 0,

            dueAmount: fineAmount,

            status: "Pending"

          });

        }

        finedStudents.push({

          name: student.uname,

          course: student.course,

          semester: student.semester,

          attendance: percentage.toFixed(1),

          fine: fineAmount

        });

      }

    }

    res.json({

      message: `Fine generated for ${finedStudents.length} students`,

      finedStudents

    });

  }

  catch (error) {

    console.log("FINE ERROR:", error);

    res.status(500).json({
      message: "Error generating fine"
    });

  }

});

// ===============================
// ADMIN → VIEW GENERATED FINES
// ===============================

app.get("/admin/generated-attendance-fines", authenticate, async (req, res) => {

  try {

    const { course, semester } = req.query;

    let filter = { type: "attendance" };

    if (course) filter.course = course;
    if (semester) filter.semester = semester;

    const fines = await StudentFee.find(filter)
      .populate("studentId", "uname rno email")
      .sort({ createdAt: -1 });

    res.json(fines);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching fines"
    });

  }

});








// ==============================
// ADMIN → PROMOTE STUDENTS
// ==============================
// ==============================
// ADMIN → PROMOTE STUDENTS (ADVANCED)

app.get("/admin/course-semesters", async (req, res) => {
  try {

    const courses = await Userauth.distinct("course", {
      role: "student"
    });

    const semesters = await Userauth.distinct("semester", {
      role: "student"
    });

    res.json({
      courses: courses.sort(),
      semesters: semesters.sort((a, b) => a - b)
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch data" });
  }
});

app.post("/admin/promote-students", authenticate, async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admin allowed" });
    }

    const { course, semester } = req.body;

    const semesterLimits = {
      BA: 6,
      BCA: 6,
      BCOM: 6,
      "B.SC": 6,
      MCA: 4,
      "M.Sc": 4,
      "M.Com": 4,
      "B.voc": 6
    };

    // 🔎 Build dynamic filter
    let filter = {
      role: "student",
      status: "active"
    };

    if (course) {
      filter.course = course;
    }

    if (semester) {
      filter.semester = Number(semester);
    }

    const students = await Userauth.find(filter);

    let promotedCount = 0;
    let graduatedCount = 0;

    for (let student of students) {

      const maxSemester = semesterLimits[student.course];
      if (!maxSemester) continue;

      if (student.semester < maxSemester) {

        student.semester += 1;
        await student.save();
        promotedCount++;

      } else {

        student.status = "graduated";
        await student.save();
        graduatedCount++;
      }
    }

    res.json({
      success: true,
      message: "Promotion Completed",
      promoted: promotedCount,
      graduated: graduatedCount
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Promotion failed" });
  }
});




//////////////////// ATTENDANCE SYSTEM ///////////////////

const Attendance = require("./server/models/attendence");


// =======================================
// STAFF → GET TODAY LECTURES
// =======================================
app.get("/staff/today-lectures", authenticate, async (req, res) => {

  try {

    const staff = await Userauth.findById(req.user.id);

    const date = req.query.date
      ? new Date(req.query.date)
      : new Date();

    const dayName = date.toLocaleDateString("en-US", {
      weekday: "long"
    });

    const timetables = await TimeTable.find({
      course: staff.course
    });

    let lectures = [];

    timetables.forEach((tt) => {

      tt.schedule.forEach((day) => {

        if (day.day === dayName) {

          day.periods.forEach((p) => {

            if (p.faculty === staff.uname) {

              lectures.push({
                course: tt.course,
                semester: tt.semester,
                subject: p.subject,
                time: p.time,
                roomNo: p.roomNo
              });

            }

          });

        }

      });

    });

    res.json(lectures);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching lectures"
    });

  }

});


// =======================================
// STAFF → GET STUDENTS FOR ATTENDANCE
// =======================================
app.get("/staff/students-for-attendance", authenticate, async (req, res) => {

  try {

    const { course, semester } = req.query;

    const students = await Userauth.find({
      role: "student",
      course: course,
      semester: Number(semester),
      status: "active"
    }).select("uname rno email _id");

    res.json(students);
  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching students"
    });

  }

});



// =======================================
// STAFF → GET ATTENDANCE BY DATE
// =======================================
app.get("/staff/get-attendance", authenticate, async (req, res) => {

  try {

    const {
      course,
      semester,
      subject,
      time,
      date
    } = req.query;

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      course,
      semester,
      subject,
      time,
      date: attendanceDate
    });

    if (!attendance) {
      return res.json({ students: [] });
    }

    res.json(attendance);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching attendance"
    });

  }

});
// =======================================
// =======================================
// STAFF → MARK / UPDATE ATTENDANCE
// =======================================
app.post("/staff/mark-attendance", authenticate, async (req, res) => {

  try {

    const staff = await Userauth.findById(req.user.id);

    if (!staff || staff.role !== "staff") {
      return res.status(403).json({
        message: "Only staff allowed"
      });
    }

    const {
      course,
      semester,
      subject,
      time,
      date,
      students
    } = req.body;

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // check leve for staff


    // CHECK LEAVE FOR EACH STUDENT

    const leaves = await Leave.find({
      status: "Approved",
      fromDate: { $lte: attendanceDate },
      toDate: { $gte: attendanceDate }
    });

    const leaveIds = leaves.map(l => l.userId.toString());

    const updatedStudents = students.map(s => {

      if (leaveIds.includes(s.studentId.toString())) {
        return { studentId: s.studentId, status: "Leave" };
      }

      return s;
    });


    await Attendance.findOneAndUpdate(
      {
        course,
        semester,
        subject,
        time,
        date: attendanceDate
      },
      {
        course,
        semester,
        subject,
        faculty: staff.uname,
        time,
        date: attendanceDate,
        students: updatedStudents
      },
      {
        new: true,
        upsert: true
      }
    );

    res.json({
      success: true,
      message: "Attendance saved / updated successfully"
    });

  } catch (error) {

    console.log(error);
    res.status(500).json({
      message: "Error saving attendance" + error
    });
  }

});




// =======================================
// STUDENT → VIEW MY ATTENDANCE
// =======================================
app.get("/student/my-attendance", authenticate, async (req, res) => {

  try {

    const student = await Userauth.findById(req.user.id);

    if (!student || student.role !== "student") {
      return res.status(403).json({
        message: "Only students allowed"
      });
    }

    const attendanceRecords = await Attendance.find({
      course: student.course,
      semester: student.semester
    });

    let result = [];

    attendanceRecords.forEach(record => {

      record.students.forEach(s => {

        if (s.studentId.toString() === student._id.toString()) {

          result.push({
            subject: record.subject,
            date: record.date,
            time: record.time,
            status: s.status
          });

        }

      });

    });
    res.json(result);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching attendance"
    });

  }

});




// ==============================
// STUDENT ATTENDANCE SUMMARY
// ==============================

app.get("/student/attendance-summary", authenticate, async (req, res) => {

  try {

    const student = await Userauth.findById(req.user.id);

    if (!student || student.role !== "student") {
      return res.status(403).json({
        message: "Only students allowed"
      });
    }

    const attendanceRecords = await Attendance.find({
      course: student.course,
      semester: student.semester
    });

    let totalClasses = 0;
    let totalPresent = 0;
    let totalAbsent = 0;

    attendanceRecords.forEach(record => {

      record.students.forEach(s => {

        if (s.studentId.toString() === student._id.toString()) {

          totalClasses++;

          if (s.status === "Present") totalPresent++;

          if (s.status === "Absent") totalAbsent++;

        }

      });

    });

    const percentage =
      totalClasses > 0
        ? ((totalPresent / totalClasses) * 100).toFixed(1)
        : 0;


    // ================= RESPONSE =================

    res.json({
      totalClasses,
      totalPresent,
      totalAbsent,
      percentage
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching attendance summary"
    });

  }

});



//////////////////Reset Attendence/////////////////////////
// ================= RESET ATTENDANCE =================
app.delete("/admin/reset-all-attendance", authenticate, async (req, res) => {

  try {

    const admin = await Userauth.findById(req.user.id);

    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    const result = await Attendance.deleteMany({});

    res.json({
      success: true,
      deletedCount: result.deletedCount
    });

  } catch (error) {

    res.status(500).json({ message: "Server error" });

  }

});


app.delete("/admin/reset-course-attendance", authenticate, async (req, res) => {

  try {

    const { course, semester } = req.body;

    const result = await Attendance.deleteMany({
      course,
      semester
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount
    });

  } catch (error) {

    res.status(500).json({ message: "Error resetting course attendance" });

  }

});


const Leave = require("./server/models/Leave")
////////////////////Apply Leave /////////////////

// ================= APPLY LEAVE =================
app.post("/leave/apply", authenticate, async (req, res) => {
  try {

    const { fromDate, toDate, reason } = req.body;

    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const start = new Date(fromDate + "T00:00:00");
    const end = new Date(toDate + "T00:00:00");

    // ❌ Sunday validation
    if (start.getDay() === 0 || end.getDay() === 0) {
      return res.status(400).json({
        message: "Leave cannot start or end on Sunday"
      });
    }

    let checkDate = new Date(start);

    while (checkDate <= end) {
      if (checkDate.getDay() === 0) {
        return res.status(400).json({
          message: "Leave period cannot include Sunday"
        });
      }
      checkDate.setDate(checkDate.getDate() + 1);
    }

    const days =
      Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (days <= 0) {
      return res.status(400).json({
        message: "Invalid leave dates"
      });
    }

    let status = "Pending";

    // Staff leave auto approval
    if (req.user.role === "staff") {
      status = "Approved";
    }

    const leave = new Leave({
      userId: req.user.id,
      role: req.user.role,
      fromDate,
      toDate,
      days,
      reason,
      status
    });

    await leave.save();

    const student = await Userauth.findById(req.user.id);

    // ================= EMAIL TO STUDENT =================

    const studentMail = {
      from: `"College Management System" <${process.env.EMAIL_USER}>`,
      to: student.email,
      subject: "Leave Request Submitted – College Management System",

      html: `
      <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:20px">

      <div style="max-width:650px;margin:auto;background:white;padding:30px;border-radius:8px">

      <h2 style="color:#0d6efd;text-align:center">
      Leave Request Submitted
      </h2>

      <hr/>

      <h3>Hello ${student.uname},</h3>

      <p>
      Your leave request has been successfully submitted in the 
      <b>College Management System</b>.
      </p>

      <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:20px 0">

      <p><b>From Date:</b> ${new Date(leave.fromDate).toDateString()}</p>
      <p><b>To Date:</b> ${new Date(leave.toDate).toDateString()}</p>
      <p><b>Total Days:</b> ${leave.days}</p>
      <p><b>Reason:</b> ${leave.reason}</p>
      <p><b>Status:</b> ${leave.status}</p>

      </div>

      <p>
      You will receive another notification once your leave request is reviewed.
      </p>

      <br/>

      <p>
      Regards,<br>
      <b>College Administration</b><br>
      College Management System
      </p>

      <hr/>

      <p style="font-size:12px;color:#777;text-align:center">
      This is an automated message. Please do not reply.
      </p>

      </div>
      </div>
      `
    };

    await transporter.sendMail(studentMail);

    // ================= EMAIL TO STAFF =================

    if (student.assignedStaff) {

      const staff = await Userauth.findById(student.assignedStaff);

      if (staff) {

        const staffMail = {
          from: `"College Management System" <${process.env.EMAIL_USER}>`,
          to: staff.email,
          subject: "New Student Leave Request",

          html: `
          <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:20px">

          <div style="max-width:650px;margin:auto;background:white;padding:30px;border-radius:8px">

          <h2 style="color:#dc3545;text-align:center">
          New Leave Request Submitted
          </h2>

          <hr/>

          <h3>Dear ${staff.uname},</h3>

          <p>
          A student has submitted a leave request that requires your review.
          </p>

          <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:20px 0">

          <h4>Student Details</h4>

          <p><b>Name:</b> ${student.uname}</p>
          <p><b>Email:</b> ${student.email}</p>

          </div>

          <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:20px 0">

          <h4>Leave Details</h4>

          <p><b>From Date:</b> ${new Date(leave.fromDate).toDateString()}</p>
          <p><b>To Date:</b> ${new Date(leave.toDate).toDateString()}</p>
          <p><b>Total Days:</b> ${leave.days}</p>
          <p><b>Reason:</b> ${leave.reason}</p>
          <p><b>Status:</b> ${leave.status}</p>

          </div>

          <p>
          Please review this leave request in the College Management System dashboard.
          </p>

          <br/>

          <p>
          Regards,<br>
          <b>College Management System</b>
          </p>

          </div>
          </div>
          `
        };

        await transporter.sendMail(staffMail);

      }
    }

    res.json({
      success: true,
      message:
        req.user.role === "staff"
          ? "Leave applied and automatically approved"
          : "Leave request submitted successfully"
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error"
    });

  }
});


// ================= MY LEAVES =================
app.get("/leave/my-leaves", authenticate, async (req, res) => {

  try {

    const leaves = await Leave.find({
      userId: req.user.id
    }).sort({ createdAt: -1 });

    res.json(leaves);

  } catch {

    res.status(500).json({
      message: "Error fetching leaves"
    });

  }

});

// ================= STAFF → LEAVES OF ASSIGNED STUDENTS =================
app.get("/leave/staff-leaves", authenticate, async (req, res) => {

  try {

    const staff = await Userauth.findById(req.user.id);

    if (!staff || staff.role !== "staff") {
      return res.status(403).json({
        message: "Only staff allowed"
      });
    }

    // find students assigned to this staff
    const students = await Userauth.find({
      assignedStaff: staff._id,
      role: "student"
    }).select("_id");

    const studentIds = students.map(s => s._id);

    // get leaves of those students
    const leaves = await Leave.find({
      userId: { $in: studentIds }
    })
      .populate("userId", "uname email course semester")
      .sort({ createdAt: -1 });

    res.json(leaves);

    try {

      const mailOptions = {
        from: `"College Management System" <${process.env.EMAIL_USER}>`,
        to: staff.email,

        subject: "Leave Request Approved – College Management System",

        html: `
<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:20px">

  <div style="max-width:650px;margin:auto;background:white;padding:30px;border-radius:8px">

    <h2 style="color:#198754;text-align:center">
      Leave Request Approved
    </h2>

    <hr style="margin:20px 0"/>

    <h3>Hello ${staff.uname},</h3>

    <p>
      Your leave request has been successfully submitted through the 
      <b>College Management System</b>.
    </p>

    <p>
      As per the system policy, this leave request has been 
      <b>automatically approved</b>.
    </p>

    <div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:20px 0">

      <h4 style="margin-top:0">Leave Details</h4>

      <p><b>From Date:</b> ${fromDate}</p>
      <p><b>To Date:</b> ${toDate}</p>
      <p><b>Total Days:</b> ${days}</p>
      <p><b>Reason:</b> ${reason}</p>
      <p><b>Status:</b> Approved</p>

    </div>

    <p>
      Your leave has been recorded in the system. Please ensure that any
      academic or administrative responsibilities are properly managed
      during your absence.
    </p>

    <p>
      If you need to modify or cancel your leave request, please contact
      the administration office.
    </p>

    <br/>

    <p>
      Regards,<br/>
      <b>College Administration</b><br/>
      College Management System
    </p>

    <hr style="margin-top:25px"/>

    <p style="font-size:12px;color:#777;text-align:center">
      This is an automated notification from the College Management System.
    </p>

  </div>

</div>
`
      };

      await transporter.sendMail(mailOptions);

      console.log("Email Sent Successfully");

    } catch (error) {

      console.log("Email Not Sent:", error);

    }

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching staff leaves"
    });



  }

});


// ================= UPDATE LEAVE =================
app.put("/leave/update/:id", authenticate, async (req, res) => {

  try {

    const staff = await Userauth.findById(req.user.id);

    if (!staff || staff.role !== "staff") {
      return res.status(403).json({
        message: "Only staff can approve leave"
      });
    }

    const { status } = req.body;

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        message: "Leave not found"
      });
    }

    // check student belongs to this teacher
    const student = await Userauth.findById(leave.userId);

    if (!student.assignedStaff || student.assignedStaff.toString() !== staff._id.toString()) {
      return res.status(403).json({
        message: "You can only approve your assigned students leave"
      });
    }

    leave.status = status;
    await leave.save();

    res.json({
      success: true,
      message: "Leave updated",
      leave
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Update failed"
    });

  }

});


// ================= LEAVE BALANCE =================
app.get("/leave/balance", authenticate, async (req, res) => {

  try {

    const leaves = await Leave.find({
      userId: req.user.id,
      status: { $in: ["Approved", "Pending"] }
    });

    let usedDays = 0;

    leaves.forEach(l => {
      usedDays += l.days || 0; // ✅ safe
    });

    // ✅ Role-based leave limit (ONLY ONE LOGIC)
    const leaveLimit = {
      staff: 20,
      student: 10
    };

    const total = leaveLimit[req.user.role] || 0;

    const remaining = Math.max(total - usedDays, 0);

    res.json({
      total,
      used: usedDays,
      remaining
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching leave balance"
    });

  }

});


app.get("/leave/today", authenticate, async (req, res) => {

  try {

    const { date } = req.query;

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const leaves = await Leave.find({
      status: "Approved",
      fromDate: { $lte: end },
      toDate: { $gte: start }
    }).populate("userId", "_id uname role");

    res.json(leaves);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching leave data"
    });

  }

});
// ================= DELETE LEAVE (ONLY PENDING) =================
app.delete("/leave/delete/:id", authenticate, async (req, res) => {

  try {

    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        message: "Leave not found"
      });
    }

    // only owner can delete
    if (leave.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You cannot delete this leave"
      });
    }

    // only pending leaves can be deleted
    if (leave.status !== "Pending") {
      return res.status(400).json({
        message: "Only pending leaves can be deleted"
      });
    }

    await Leave.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Leave request deleted successfully"
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error deleting leave"
    });

  }

});



app.post(
  "/admin/send-mail",
  authenticate,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdf", maxCount: 1 }
  ]),
  async (req, res) => {

    try {

      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin only" });
      }

      const { subject, heading, message, course, semester, sendTo } = req.body;

      let users = [];

      /* ================= SELECT USERS ================= */

      if (sendTo === "allStudents") {
        users = await Userauth.find({ role: "student" });
      }

      if (sendTo === "courseStudents") {
        users = await Userauth.find({ role: "student", course });
      }

      if (sendTo === "semesterStudents") {
        users = await Userauth.find({ role: "student", course, semester });
      }

      if (sendTo === "allStaff") {
        users = await Userauth.find({ role: "staff" });
      }

      if (sendTo === "courseStaff") {
        users = await Userauth.find({ role: "staff", course });
      }

      if (!users.length) {
        return res.status(404).json({
          message: "No users found"
        });
      }

      const emails = users.map(u => u.email);

      /* ================= FILE URLS ================= */

      let imageUrl = "";
      let pdfUrl = "";

      if (req.files?.image) {
        imageUrl = req.files.image[0].path; // Cloudinary URL
      }

      if (req.files?.pdf) {
        pdfUrl = req.files.pdf[0].path; // Cloudinary URL
      }

      /* ================= ATTACHMENTS ================= */

      let attachments = [];
      if (pdfUrl) {
        attachments.push({
          filename: "announcement.pdf",
          href: pdfUrl
        });
      }

      /* ================= EMAIL HTML ================= */

      const mailOptions = {

        from: `"College Management System" <${process.env.EMAIL_USER}>`,

        bcc: emails,

        subject: subject,

        attachments: attachments,

        html: `
<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:20px">

  <div style="max-width:700px;margin:auto;background:white;padding:30px;border-radius:10px">

    <h2 style="color:#0d6efd;text-align:center">
      📢 Official College Announcement
    </h2>

    <p style="color:#666;font-size:14px">
      <b>Subject:</b> ${subject}
    </p>

    <hr/>

    <h1 style="color:#333">
      ${heading || subject}
    </h1>

    <p style="font-size:16px;color:#555;line-height:1.6">
      ${message}
    </p>

    ${imageUrl
            ? `
        <div style="text-align:center;margin-top:20px">
          <img src="${imageUrl}" 
               style="max-width:100%;border-radius:8px"/>
        </div>
      `
            : ""
          }

    <br/>

    <hr/>

    <p style="font-size:15px">
      Regards,<br/>
      <b>Administration Office</b><br/>
      Sharma's College
    </p>

  </div>

</div>
`
      };

      await transporter.sendMail(mailOptions);

      res.json({
        success: true,
        message: `Email sent to ${users.length} users`
      });

      console.log("Admin Email Sent Successfully!");

    } catch (error) {

      console.log("Email Not Sent:", error);

      res.status(500).json({
        message: "Server error"
      });

    }

  }
);

const Marks = require("./server/models/Marks");

app.post("/marks/upload/bulk", authenticate, async (req, res) => {
  try {

    const marksData = req.body;

    const operations = marksData.map((m) => ({
      updateOne: {

        filter: {
          studentId: m.studentId,
          subject: m.subject,
          course: m.course,
          semester: m.semester,
          examType: m.examType
        },

        update: {
          $set: {
            marks: m.marks,
            maxMarks: m.maxMarks
          }
        },

        upsert: true
      }
    }));

    await Marks.bulkWrite(operations);

    res.json({
      success: true,
      message: "Marks saved successfully"
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      success: false,
      message: "Error uploading marks"
    });

  }
});

app.get("/marks/by-class", authenticate, async (req, res) => {

  try {

    const { subject, course, semester, examType } = req.query;

    const filter = {
      subject,
      course,
      semester
    };

    // add examType only if provided
    if (examType) {
      filter.examType = examType;
    }

    const marks = await Marks.find(filter);

    res.json(marks);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching marks"
    });

  }

});

app.get("/student/my-marks", authenticate, async (req, res) => {
  try {

    const studentId = req.user.id;

    const marks = await Marks.find({ studentId });

    res.json(marks);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error fetching marks"
    });

  }
});


app.get("/admin/staff-list", authenticate, async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only"
      });
    }

    const staff = await Userauth.find({ role: "staff" })
      .select("_id uname email course");

    res.json(staff);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }

});




const Payslip = require("./server/models/Payslip");

app.post("/admin/generate-payslip", authenticate, async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only"
      });
    }

    const {
      staffId,
      staffName,
      email,
      month,
      year,
      basicSalary,
      hra,
      da,
      bonus,
      deductions
    } = req.body;

    const existing = await Payslip.findOne({
      staffId,
      month,
      year
    });

    if (existing) {
      return res.status(400).json({
        message: "Payslip already generated for this month"
      });
    }

    const netSalary =
      Number(basicSalary) +
      Number(hra) +
      Number(da) +
      Number(bonus) -
      Number(deductions);

    const payslip = new Payslip({
      staffId,
      staffName,
      email,
      month,
      year,
      basicSalary,
      hra,
      da,
      bonus,
      deductions,
      netSalary,
      generatedBy: req.user.id
    });

    await payslip.save();

    // ================= EMAIL =================

    try {

      const mailOptions = {

        from: `"College Management System" <${process.env.EMAIL_USER}>`,
        to: email,

        subject: `Payslip Generated - ${month} ${year}`,

        html: `
<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f6f9;padding:20px">

<div style="max-width:650px;margin:auto;background:white;padding:30px;border-radius:8px">

<h2 style="color:#0d6efd;text-align:center">
Staff Payslip Generated
</h2>

<hr/>

<h3>Hello ${staffName},</h3>

<p>
Your payslip for <b>${month} ${year}</b> has been generated successfully in the 
<b>College Management System</b>.
</p>

<div style="background:#f8f9fa;padding:15px;border-radius:6px;margin:20px 0">

<h4>Salary Details</h4>

<p><b>Basic Salary:</b> ₹${basicSalary}</p>
<p><b>HRA:</b> ₹${hra}</p>
<p><b>DA:</b> ₹${da}</p>
<p><b>Bonus:</b> ₹${bonus}</p>
<p><b>Deductions:</b> ₹${deductions}</p>

<hr/>

<p style="font-size:18px;color:#198754">
<b>Net Salary: ₹${netSalary}</b>
</p>

</div>

<p>
You can log in to the College Management System dashboard to download or view your payslip.
</p>

<br/>

<p>
Regards,<br/>
<b>College Administration</b><br/>
College Management System
</p>

<hr/>

<p style="font-size:12px;color:#777;text-align:center">
This is an automated notification. Please do not reply to this email.
</p>

</div>
</div>
`
      };

      await transporter.sendMail(mailOptions);

      console.log("Payslip email sent");

    } catch (mailError) {

      console.log("Payslip email failed:", mailError);

    }

    res.json({
      success: true,
      message: "Payslip generated and email sent",
      payslip
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

});

app.get("/admin/payslips", authenticate, async (req, res) => {

  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin only"
      });
    }

    const { month, year } = req.query;

    let filter = {};

    if (month && year) {
      filter = { month, year };
    }

    const payslips = await Payslip.find(filter)
      .sort({ createdAt: -1 });

    res.json(payslips);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

});
app.get("/staff/my-payslips", authenticate, async (req, res) => {

  try {

    const staff = await Userauth.findById(req.user.id);

    if (!staff || staff.role !== "staff") {
      return res.status(403).json({
        message: "Only staff allowed"
      });
    }

    const { month, year } = req.query;

    let filter = {
      staffId: req.user.id
    };

    // If month & year provided → filter month wise
    if (month && year) {
      filter.month = month;
      filter.year = year;
    }

    const payslips = await Payslip.find(filter)
      .sort({ createdAt: -1 });

    res.json(payslips);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

});



const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
// mongodb+srv://ayush0123sh:lOqpnQy3MNzFUfJz@cluster0.fdxb8e7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

// Password:  lOqpnQy3MNzFUfJz
