const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const xlsx = require("xlsx");
const path = require("path");

const app = express();
app.use(express.json());
app.use(cors());

// ===== MONGODB CONNECTION =====
const dbURI =
  "mongodb+srv://singhdevendra13753_db_user:Devendra123@skpscluster.ct6w3qu.mongodb.net/skpsResultDB?retryWrites=true&w=majority";

mongoose
  .connect(dbURI)
  .then(() => console.log("Cloud MongoDB Connected! ✅"))
  .catch((err) => console.log("Database Error:", err.message));

// ===== SCHEMAS =====
const resultSchema = new mongoose.Schema({
  rollNo: String,
  regNo: String,
  name: String,
  fatherName: String,
  dob: String,
  totalQuestions: Number,
  correct: Number,
  wrong: Number,
  totalMarks: Number,
});
const Result = mongoose.model("Result", resultSchema);

const logSchema = new mongoose.Schema({
  userName: String,
  action: String,
  timestamp: { type: Date, default: Date.now },
});
const Log = mongoose.model("Log", logSchema);

// ===== MULTER SETUP =====
const upload = multer({ storage: multer.memoryStorage() });

// ===== ADMIN USERS =====
const users = [
  { username: "Admin", password: "SKPS@9389" },
  { username: "President", password: "SKPS@9389" },
  { username: "Founder", password: "SKPS@9389" },
];

// ===== API ROUTES =====

// Upload Excel
app.post("/api/results/upload", upload.single("file"), async (req, res) => {
  try {
    const { user } = req.query;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (data.length > 0) {
      await Result.insertMany(data);

      await Log.create({
        userName: user || "Admin",
        action: `Uploaded Excel with ${data.length} records`,
      });

      res.json({
        success: true,
        message: `Successfully uploaded ${data.length} records! ✅`,
      });
    } else {
      res.status(400).json({ message: "Excel file is empty!" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error processing Excel file" });
  }
});

// Login
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (user) res.json({ success: true, username: user.username });
  else res.status(401).json({ success: false, message: "Invalid ID/Password" });
});

// Search Result
app.get("/api/results/search", async (req, res) => {
  try {
    const rollNo = req.query.rollNo?.trim();
    const dob = req.query.dob?.trim();

    let query = {};

    if (rollNo && dob) {
      query = { rollNo, dob };
    } else if (rollNo) {
      query = { rollNo };
    } else if (dob) {
      query = { dob };
    } else {
      return res.status(400).json({
        message: "Roll No or DOB required",
      });
    }

    const result = await Result.findOne(query);

    if (result) {
      res.json(result);
    } else {
      res.status(404).json({
        message: "Result Not Found",
      });
    }

  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server Error",
    });
  }
});
// Delete Result
app.delete("/api/results/delete/:id", async (req, res) => {
  const { adminUser } = req.query;

  const deleted = await Result.findByIdAndDelete(req.params.id);

  if (deleted) {
    await Log.create({
      userName: adminUser,
      action: `Deleted: ${deleted.name} (${deleted.rollNo})`,
    });

    res.json({ success: true });
  } else {
    res.status(404).json({ message: "Not Found" });
  }
});

// Get All Results
app.get("/api/results/all", async (req, res) => {
  res.json(await Result.find());
});

// Logs
app.get("/api/admin/logs", async (req, res) => {
  res.json(await Log.find().sort({ timestamp: -1 }).limit(20));
});

// ===== FRONTEND =====
const frontendPath = path.join(__dirname, "../frontend");

app.use(express.static(frontendPath));

app.use("/uploads",
    express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ===== SERVER =====
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});