const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { default: mongoose } = require("mongoose");
require("dotenv").config();
const morgan = require("morgan");
const authRouter = require("./routes/auth.route.js");
const uploadsRouter = require("./routes/uploads.route.js");

mongoose
  .connect(process.env.MONGO_DB_URL)
  .then((response) => {
    console.log("MongoDB Connection Succeeded.");
  })
  .catch((error) => {
    console.log("Error in DB connection: " + error);
  });

app.use(cookieParser());
app.use(cors({ origin: ["http://localhost:5173" , "https://photo-flow-front-end.vercel.app/"], credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", authRouter);
app.use("/api/uploads", uploadsRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("App running in port: " + PORT);
});
