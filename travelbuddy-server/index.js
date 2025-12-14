import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

console.log("===== ENV CHECK =====");
console.log("EMAIL_USER =", process.env.EMAIL_USER);
console.log("EMAIL_PASS exists =", !!process.env.EMAIL_PASS);
console.log("PORT =", process.env.PORT);
console.log("ENV PATH =", path.join(__dirname, ".env"));
console.log("=====================");

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import session from "express-session";
import userModel from "./models/userModel.js";
import taxiDriverModel from "./models/taxiDriverModel.js";
import tripModel from "./models/tripModel.js";
import bookingModel from "./models/bookingModel.js";
import feedbackModel from "./models/feedbackModel.js";
import adminModel from "./models/adminModel.js";
import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";

const TravelBuddy_App = express();
TravelBuddy_App.use(express.json());
TravelBuddy_App.use(cors());

TravelBuddy_App.use(
  session({
    secret: process.env.SESSION_SECRET || "a-very-strong-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

TravelBuddy_App.use(authRoutes);
TravelBuddy_App.use(paymentRoutes);

try {
  const conn = `mongodb+srv://${process.env.MONGODB_USERID}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_CLUSTER}/${process.env.MONGODB_DATABASE}`;
  await mongoose.connect(conn);
  console.log("Database Connection Success !");
} catch (err) {
  console.error("Database Connection Failed:", err);
  process.exit(1);
}

const PORT = process.env.PORT || 7500;
TravelBuddy_App.listen(PORT, () => {
  console.log(`Travel Buddy Server running at port ${PORT} ...!`);
});

TravelBuddy_App.post("/userRegister", async (req, res) => {
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

TravelBuddy_App.post("/userLogin", async (req, res) => {
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

TravelBuddy_App.post("/driverRegister", async (req, res) => {
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

TravelBuddy_App.post("/driverLogin", async (req, res) => {
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

TravelBuddy_App.post("/adminLogin", async (req, res) => {
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

TravelBuddy_App.post("/createTrip", async (req, res) => {
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

TravelBuddy_App.get("/searchTrips", async (req, res) => {
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

TravelBuddy_App.post("/confirmBooking", async (req, res) => {
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

TravelBuddy_App.post("/processPayment", (req, res) => {
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

TravelBuddy_App.post("/sendFeedback", async (req, res) => {
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

TravelBuddy_App.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ serverMsg: "Logged out successfully" });
  });
});

TravelBuddy_App.get("/", (req, res) => {
  res.send("Travel Buddy API is running.");
});
