import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import session from "express-session";
import dotenv from "dotenv";

// ✅ Load .env ONLY locally (Render provides env vars)
if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

import userModel from "./models/userModel.js";
import taxiDriverModel from "./models/taxiDriverModel.js";
import tripModel from "./models/tripModel.js";
import bookingModel from "./models/bookingModel.js";
import feedbackModel from "./models/feedbackModel.js";
import adminModel from "./models/adminModel.js";
import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

const app = express();

// ✅ CORS (you can restrict later)
app.use(cors());
app.use(express.json());

// ✅ Session (works, but MemoryStore warning is normal)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "a-very-strong-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false, // set true only if you use HTTPS + trust proxy
      sameSite: "lax"
    }
  })
);

app.use(authRoutes);
app.use(paymentRoutes);

// ✅ Mongo connection: use ONE env var on Render
// In Render add: MONGODB_URI = mongodb+srv://USER:PASS@cluster.xxxx.mongodb.net/dbname?retryWrites=true&w=majority
const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  process.env.DATABASE_URL;

if (!MONGODB_URI) {
  console.error("❌ Missing MongoDB connection string. Set MONGODB_URI in Render.");
  process.exit(1);
}

try {
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Database Connection Success!");
} catch (err) {
  console.error("❌ Database Connection Failed:", err);
  process.exit(1);
}

// ✅ IMPORTANT: bind to Render PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Travel Buddy Server running on port ${PORT}`);
});

// -------------------- ROUTES --------------------

app.post("/userRegister", async (req, res) => {
  try {
    const exist = await userModel.findOne({ userEmail: req.body.email });
    if (exist) return res.json({ serverMsg: "User already exist !", flag: false });

    const encryptedPassword = await bcrypt.hash(req.body.pwd, 10);

    await userModel.create({
      userName: req.body.fullName,
      userPhone: req.body.phone,
      userEmail: req.body.email,
      userPassword: encryptedPassword,
      userGender: req.body.gender,
      preferredGender: req.body.preferredGender || "any",
    });

    res.json({ serverMsg: "Registration Success !", flag: true });
  } catch (err) {
    res.status(500).json({ serverMsg: "Registration error", flag: false });
  }
});

app.post("/userLogin", async (req, res) => {
  try {
    const user = await userModel.findOne({ userEmail: req.body.userEmail });
    if (!user) return res.json({ serverMsg: "User not found !", loginStatus: false });

    const ok = await bcrypt.compare(req.body.userPassword, user.userPassword);
    if (!ok) return res.json({ serverMsg: "Incorrect Password !", loginStatus: false });

    res.json({ serverMsg: "Welcome", loginStatus: true, user });
  } catch {
    res.status(500).json({ serverMsg: "Login error", loginStatus: false });
  }
});

app.post("/driverRegister", async (req, res) => {
  try {
    const exist = await taxiDriverModel.findOne({ driverEmail: req.body.driverEmail });
    if (exist) return res.json({ serverMsg: "Driver already exists !", flag: false });

    const encryptedPassword = await bcrypt.hash(req.body.driverPassword, 10);

    await taxiDriverModel.create({
      driverName: req.body.driverName,
      driverPhone: req.body.driverPhone,
      driverEmail: req.body.driverEmail,
      driverPassword: encryptedPassword,
    });

    res.json({ serverMsg: "Driver Registration Success !", flag: true });
  } catch {
    res.status(500).json({ serverMsg: "Driver Registration error", flag: false });
  }
});

app.post("/driverLogin", async (req, res) => {
  try {
    const driver = await taxiDriverModel.findOne({ driverEmail: req.body.driverEmail });
    if (!driver) return res.json({ serverMsg: "Driver not found !", loginStatus: false });

    const ok = await bcrypt.compare(req.body.driverPassword, driver.driverPassword);
    if (!ok) return res.json({ serverMsg: "Incorrect Password !", loginStatus: false });

    res.json({ serverMsg: "Welcome Driver", loginStatus: true, driver });
  } catch {
    res.status(500).json({ serverMsg: "Driver login error", loginStatus: false });
  }
});

app.post("/adminLogin", async (req, res) => {
  try {
    const admin = await adminModel.findOne({ adminEmail: req.body.adminEmail });
    if (!admin) return res.json({ serverMsg: "Admin not found !", loginStatus: false });

    const ok = await bcrypt.compare(req.body.adminPassword, admin.adminPassword);
    if (!ok) return res.json({ serverMsg: "Incorrect Password !", loginStatus: false });

    res.json({ serverMsg: "Welcome", loginStatus: true, admin });
  } catch {
    res.status(500).json({ serverMsg: "Login error", loginStatus: false });
  }
});

app.post("/createTrip", async (req, res) => {
  try {
    await tripModel.create({
      ownerEmail: req.body.ownerEmail,
      fromLocation: req.body.fromLocation,
      toLocation: req.body.toLocation,
      travelDate: req.body.travelDate,
      travelTime: req.body.travelTime,
      genderRestriction: req.body.genderRestriction || "any",
      estimatedFare: req.body.estimatedFare || 0,
      maxCompanions: req.body.maxCompanions || 3,
    });
    res.json({ serverMsg: "Trip created", flag: true });
  } catch {
    res.status(500).json({ serverMsg: "Trip creation error", flag: false });
  }
});

app.get("/searchTrips", async (req, res) => {
  try {
    const q = {};
    if (req.query.fromLocation) q.fromLocation = req.query.fromLocation;
    if (req.query.toLocation) q.toLocation = req.query.toLocation;
    if (req.query.gender && req.query.gender !== "any")
      q.genderRestriction = { $in: ["any", req.query.gender] };

    const trips = await tripModel.find(q);
    res.json(trips);
  } catch {
    res.status(500).json({ serverMsg: "Search trips error" });
  }
});

app.post("/confirmBooking", async (req, res) => {
  try {
    const trip = await tripModel.findById(req.body.tripId);
    if (!trip) return res.status(404).json({ serverMsg: "Trip not found" });

    const booking = await bookingModel.create({
      tripId: req.body.tripId,
      participantEmails: req.body.participantEmails || [],
      totalFare: trip.estimatedFare || 0,
      farePerPerson: trip.estimatedFare || 0,
      status: "confirmed",
    });

    res.json({ serverMsg: "Booking confirmed", booking });
  } catch {
    res.status(500).json({ serverMsg: "Booking error" });
  }
});

app.post("/processPayment", (req, res) => {
  res.json({
    serverMsg: "Payment successful",
    paymentStatus: true,
    paymentInfo: {
      bookingId: req.body.bookingId,
      amount: req.body.amount,
      paymentMethod: req.body.paymentMethod,
      transactionId: "TXN-" + Date.now(),
    },
  });
});

app.post("/sendFeedback", async (req, res) => {
  try {
    await feedbackModel.create({
      userEmail: req.body.userEmail,
      rating: req.body.rating,
      comment: req.body.comment,
    });
    res.json({ serverMsg: "Feedback saved. Thank you!" });
  } catch {
    res.status(500).json({ serverMsg: "Feedback error" });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ serverMsg: "Logged out successfully" });
  });
});

app.get("/", (req, res) => {
  res.send("Travel Buddy API is running.");
});
