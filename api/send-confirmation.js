export default async function handler(req, res) {
  // Optional CORS headers if needed later
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, vorname, nachname } = req.body || {};

    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
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
        templateId: 1,
        params: {
          VORNAME: vorname || "",
          NACHNAME: nachname || "",
        },
      }),
    });

    const text = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
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
