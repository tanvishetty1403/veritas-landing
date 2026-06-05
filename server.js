const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const SIGNUPS_FILE = path.join(DATA_DIR, "signups.json");

app.use(express.json());
app.use(express.static(__dirname));

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(SIGNUPS_FILE)) {
    fs.writeFileSync(SIGNUPS_FILE, "[]", "utf8");
  }
}

function readSignups() {
  ensureDataFile();
  return JSON.parse(fs.readFileSync(SIGNUPS_FILE, "utf8"));
}

function writeSignups(signups) {
  ensureDataFile();
  fs.writeFileSync(SIGNUPS_FILE, JSON.stringify(signups, null, 2), "utf8");
}

// 1. Existing endpoint to accept new submissions
app.post("/api/signup", (req, res) => {
  const { name, email, role, interviewOk } = req.body;

  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: "Name and email are required." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "Please enter a valid email." });
  }

  const signups = readSignups();
  const normalizedEmail = email.trim().toLowerCase();

  if (signups.some((s) => s.email === normalizedEmail)) {
    return res.status(409).json({ error: "This email is already registered." });
  }

  signups.push({
    id: Date.now().toString(36),
    name: name.trim(),
    email: normalizedEmail,
    role: role?.trim() || "Other",
    interviewOk: Boolean(interviewOk),
    signedUpAt: new Date().toISOString(),
  });

  writeSignups(signups);
  res.json({ success: true, total: signups.length });
});

// 2. Existing endpoint to read the total submission count
app.get("/api/signups/count", (_req, res) => {
  const signups = readSignups();
  res.json({ count: signups.length });
});

// 3. Existing endpoint to view raw data as JSON
app.get("/api/signups", (_req, res) => {
  const signups = readSignups();
  res.json(signups);
});

// 4. NEW EXTRACTION ENGINE: Dynamic CSV Spreadsheet Converter and Downloader
app.get("/api/signups/download", (_req, res) => {
  const signups = readSignups();
  
  // Define our neat sheet column headers
  const headers = ["ID", "Full Name", "Email Address", "Profession / Field", "Willing to Interview?", "Timestamp (UTC)"];
  
  // Helper utility to safely escape characters like commas or quotes in user names
  const escapeCSV = (val) => {
    let str = String(val === null || val === undefined ? "" : val);
    str = str.replace(/"/g, '""'); // Double up internal quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str}"`; // Wrap string in quotes if special characters exist
    }
    return str;
  };

  // Compile rows
  const csvRows = [
    headers.join(","), // Insert the top label row
    ...signups.map(s => [
      escapeCSV(s.id),
      escapeCSV(s.name),
      escapeCSV(s.email),
      escapeCSV(s.role),
      escapeCSV(s.interviewOk ? "YES" : "NO"),
      escapeCSV(s.signedUpAt)
    ].join(","))
  ];

  const csvContent = csvRows.join("\r\n");

  // Force the browser to treat this stream as an attachment download prompt
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="veritas_early_access_leads.csv"');
  
  res.status(200).send(csvContent);
});

app.listen(PORT, () => {
  ensureDataFile();
  console.log(`VERITAS landing page running at http://localhost:${PORT}`);
});