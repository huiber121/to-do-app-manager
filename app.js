// app.js
const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");
const listRoutes = require("./routes/lists");

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/", authRoutes);
app.use("/lists", listRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});