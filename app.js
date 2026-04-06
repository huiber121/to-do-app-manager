// app.js
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");
const listRoutes = require("./routes/lists");

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", authRoutes);
app.use("/lists", listRoutes);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (require.main === module) {
  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
}

module.exports = app;
