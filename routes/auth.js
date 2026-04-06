// routes/auth.js
const {refreshTokens} = require("../data/store");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const { users } = require("../data/store");

const router = express.Router();
const REFRESH_SECRET = "refresh_secret";
const ACCESS_SECRET = "access_secret";

// POST /signup
router.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  //Validate input
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  //Check for duplicate user
  const existingUser = users.find(u => u.username === username);
  if (existingUser) {
    return res.status(409).json({ error: "Username already exists" });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = {
    id: randomUUID(),
    username,
    password: hashedPassword,
  };

  users.push(user);

  res.status(201).json({ message: "User created" });
});

// POST /login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const accessToken = jwt.sign(
    { userId: user.id, role: "user" },
    ACCESS_SECRET,
    { expiresIn: "15min" }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    REFRESH_SECRET,
    { expiresIn: "7d" }
  );

  refreshTokens.push(refreshToken);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.json({
    accessToken,
    user: {
      id: user.id,
      username: user.username,
    },
  });
});

module.exports = router;
