export default async function handler(req, res) {
  const isDev = process.env.VERCEL_ENV !== "production";

  const allowedOrigins = new Set([
    "https://haecker-metall-event.webflow.io",
    "https://www.event.haecker-metall.com",
    "https://event.haecker-metall.com",
  ]);

  if (isDev) {
    allowedOrigins.add("http://localhost:3000");
    allowedOrigins.add("http://127.0.0.1:3000");
    allowedOrigins.add("http://localhost:5500");
    allowedOrigins.add("http://127.0.0.1:5500");
  }

  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    if (!origin || !allowedOrigins.has(origin)) {
      return res.status(403).json({ error: "Origin not allowed" });
    }
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!origin || !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  try {
    const { email, vorname, nachname } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    const brevoRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        to: [
          {
            email,
            name: `${vorname || ""} ${nachname || ""}`.trim(),
          },
        ],
        templateId: process.env.BREVO_TEMPLATE_ID,
        params: {
          VORNAME: vorname || "",
          NACHNAME: nachname || "",
        },
      }),
    });

    const text = await brevoRes.text();

    if (!brevoRes.ok) {
      return res.status(brevoRes.status).json({
        error: "Brevo API error",
        details: text,
      });
    }

    return res.status(200).json({
      ok: true,
      details: text,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Server error",
      details: String(error),
    });
  }
}
