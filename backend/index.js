require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Configure CORS to accept all origins
app.use(express.json());

// Ticket routes
app.use('/tickets', require('./routes/tickets'));

// Simple health check route
app.get('/', (req, res) => {
  res.json({ message: "Welcome to the DeskFlow Ticket Triage API" });
});

// Connect to MongoDB (with fallback to your Atlas Cluster URI)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://sanjuydv7:Sanjay2026@cluster0.x5kuecw.mongodb.net/deskflow?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("Successfully connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
    process.exit(1);
  });