const express = require("express");
// Explicitly require tracking module to prevent container startup crashes
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: Triple check there are no spaces or hidden newline blocks here
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzb9SPVPDWU0bncyi2lMin69vKZD2iWfNvIPyaqukZesR4aO5YfFGHDbfvjvRMiuYtb/exec".trim();

app.use(express.json());
app.use(express.static(__dirname));

// 1. Submit form data directly to permanent Google Sheets storage
app.post("/api/signup", async (req, res) => {
  const { name, email, role, interviewOk } = req.body;

  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: "Name and email are required." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "Please enter a valid email." });
  }

  const payload = {
    id: Date.now().toString(36),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: role?.trim() || "Other",
    interviewOk: Boolean(interviewOk),
    signedUpAt: new Date().toISOString(),
  };

  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Google remote storage rejected transmission.");
    
    res.json({ success: true });
  } catch (err) {
    console.error("Cloud storage backup split error:", err);
    res.status(500).json({ error: "Failed to securely save lead entry node to permanent cloud." });
  }
});

// 2. Fetch live count straight from the Google Sheet records dynamically
app.get("/api/signups/count", async (_req, res) => {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL);
    const data = await response.json();
    res.json({ count: data.count || 0 });
  } catch (err) {
    res.json({ count: 0 }); // Safe fallback
  }
});

// Advanced Error Catching Wrapper for Render Instance Boot sequence
try {
  app.listen(PORT, () => {
    console.log(`VERITAS landing page running at http://localhost:${PORT}`);
  });
} catch (startupError) {
  console.error("FATAL INSTANCE STARTUP EXCEPTION:", startupError);
  process.exit(1);
}