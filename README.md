# White-Label Guide: Webflow + Vercel + Brevo Confirmation Email

This repository is meant to be used as a **white-label starter**.

The code already exists.  
You do **not** need to rebuild the project from scratch.

This guide explains how to take this repository, reuse it for a new project, connect it to Brevo, connect it to Vercel, configure the environment variables, and finally connect it to Webflow.

---

## What this repository does

This repository contains a Vercel serverless function that:

1. receives form data from Webflow
2. validates the request origin
3. uses the Brevo API securely on the backend
4. sends a transactional confirmation email
5. returns a response to the frontend

This means:

- the Brevo API key stays on the backend
- the Webflow frontend never exposes the API key
- you can reuse the same logic for multiple projects

---

## White-label workflow

For each new project, the process is:

1. create a new Brevo account or configure a new sender/template in an existing Brevo account
2. duplicate this repository into a new GitHub repository
3. update the backend code with the new allowed domains if needed
4. connect the new GitHub repository to Vercel
5. configure the Vercel environment variables
6. add the frontend script into Webflow
7. test locally and in production

---

# 1. Start from this repository

Base repository example:

```txt
https://github.com/alexisxz/haecker-metal-event-confirmation
```

You can use it as the base for new projects.

---

# 2. Create a new GitHub repository from this one

There are two common ways.

## Option A: Duplicate manually

Clone the base repository:

```bash
git clone https://github.com/alexisxz/haecker-metal-event-confirmation.git
cd haecker-metal-event-confirmation
```

Remove the old Git history:

```bash
rm -rf .git
```

Create a brand new Git repository:

```bash
git init
git branch -M main
```

Create a new repository in GitHub, for example:

```txt
my-client-event-confirmation
```

Then connect it:

```bash
git remote add origin https://github.com/YOUR-USERNAME/my-client-event-confirmation.git
git add .
git commit -m "Initial white-label setup"
git push -u origin main
```

## Option B: Create a template-style copy in GitHub

If you prefer, you can upload the files into a new GitHub repo directly through the GitHub web interface.

---

# 3. Open the project locally

Open the project in VS Code.

Install dependencies:

```bash
npm install
```

Run Vercel locally:

```bash
npm run vercel:dev
```

This usually starts on:

```txt
http://localhost:3000
```

---

# 4. The backend code

Current backend code:

```js
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
        templateId: Number(process.env.BREVO_TEMPLATE_ID),
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
```

This code is already white-label friendly because:

- the API key comes from `process.env.BREVO_API_KEY`
- the template ID comes from `process.env.BREVO_TEMPLATE_ID`
- development vs production is controlled through `process.env.VERCEL_ENV`
- the allowed domains can be changed per project

---

# 5. What must be customized for each new project

For each new project, you will usually change:

1. `allowedOrigins`
2. `BREVO_API_KEY`
3. `BREVO_TEMPLATE_ID`
4. the Webflow frontend endpoint URL
5. the email template content inside Brevo

---

# 6. Create or configure the Brevo account

## Step 1: Create a Brevo account

Go to Brevo and create an account.

You can either:

- use a dedicated Brevo account per client/project
- or use one shared Brevo account and create separate templates/senders

For white-label work, a separate account or at least separate senders/templates is usually cleaner.

---

## Step 2: Add a sender

In Brevo:

- go to **Senders, Domains & Dedicated IP**
- add a sender email
- verify the sender email

For testing, you can start with a sender email verification.

For production, it is better to authenticate the domain.

---

## Step 3: Authenticate the domain

If the project uses a custom domain email address, add the DNS records given by Brevo.

Typical records:

- TXT verification record
- DKIM CNAME 1
- DKIM CNAME 2

If the domain already uses Outlook / Microsoft 365, keep the existing Outlook records and merge SPF if necessary.

Example:

Existing SPF:

```txt
v=spf1 include:spf.protection.outlook.com include:spf.eu.exclaimer.net include:_spf.mlsend.com ~all
```

Merged SPF:

```txt
v=spf1 include:spf.protection.outlook.com include:spf.eu.exclaimer.net include:_spf.mlsend.com include:spf.brevo.com ~all
```

Important:

- keep only one SPF record
- do not replace MX records
- do not delete Outlook records
- Brevo DKIM CNAMEs are safe to add

---

## Step 4: Create the transactional email template

In Brevo:

- go to **Transactional > Templates**
- create a new template
- define the subject
- define the sender
- write the message content

Example variables:

```txt
{{params.VORNAME}}
{{params.NACHNAME}}
```

If you want the email to be static, you can also avoid using variables.

Example email:

```txt
Sehr geehrte Damen und Herren,

vielen Dank für Ihre Anmeldung zu unserer Veranstaltung.

Hiermit bestätigen wir Ihnen die erfolgreiche Registrierung und freuen uns,
Sie am 09. Oktober 2026 um 14:30 Uhr in der Stuttgarter Straße 36 begrüßen zu dürfen.

Weitere Informationen zur Veranstaltung folgen und werden Ihnen rechtzeitig per E-Mail mitgeteilt.

Mit freundlichen Grüßen
Ihr Team
```

---

## Step 5: Get the Brevo API key

In Brevo:

- go to **SMTP & API**
- create or copy the API key

This key will be used as:

```env
BREVO_API_KEY=your_real_api_key
```

Do not place it in frontend code.

---

## Step 6: Get the Brevo template ID

Find the numeric ID of the transactional template.

Example:

```env
BREVO_TEMPLATE_ID=1
```

That value is used by the backend here:

```js
templateId: process.env.BREVO_TEMPLATE_ID
```

If you change the template in Brevo, update the environment variable in Vercel too.

---

# 7. Configure local environment variables

Create a `.env` file locally.

Example:

```env
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BREVO_TEMPLATE_ID=1
VERCEL_ENV=development
```

Notes:

- `BREVO_API_KEY` is the secret Brevo API key
- `BREVO_TEMPLATE_ID` is the Brevo transactional template ID
- `VERCEL_ENV=development` is useful locally for enabling localhost origins

Do not commit `.env` to GitHub.

---

# 8. Git ignore

Your `.gitignore` should include at least:

```gitignore
node_modules/
.env
.env.local
.env.development
.env.production
.vercel
.DS_Store
Thumbs.db
```

Do not ignore `.git`.

---

# 9. Update allowed domains in the code

For each white-label project, update:

```js
const allowedOrigins = new Set([
  "https://haecker-metall-event.webflow.io",
  "https://www.event.haecker-metall.com",
  "https://event.haecker-metall.com",
]);
```

Replace those with the domains for the new project.

Example:

```js
const allowedOrigins = new Set([
  "https://new-client-event.webflow.io",
  "https://www.event.new-client.com",
  "https://event.new-client.com",
]);
```

Development origins remain enabled automatically when `VERCEL_ENV !== "production"`.

---

# 10. Test the backend locally

Start local development:

```bash
npm run vercel:dev
```

Then test in the browser console:

```js
fetch("http://localhost:3000/api/send-confirmation", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    email: "your@email.com",
    vorname: "Max",
    nachname: "Mustermann"
  })
})
.then(async (res) => {
  const text = await res.text();
  console.log("status:", res.status);
  console.log("body:", text);
})
.catch(console.error);
```

If it works:

- local backend works
- Brevo credentials work
- template ID works

---

# 11. Commit and push the customized project

After updating the code and configuration:

```bash
git add .
git commit -m "Configure project for new client"
git push origin main
```

---

# 12. Connect the new repository to Vercel

In Vercel:

1. create a new project
2. import the new GitHub repository
3. connect the repository
4. configure the environment variables
5. deploy

---

# 13. Add the environment variables in Vercel

In the Vercel project settings, add:

```env
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BREVO_TEMPLATE_ID=1
VERCEL_ENV=production
```

Explanation:

- `BREVO_API_KEY` = Brevo secret API key
- `BREVO_TEMPLATE_ID` = template used for sending
- `VERCEL_ENV=production` = ensures only production origins are accepted

Locally you can use:

```env
VERCEL_ENV=development
```

On Vercel, use:

```env
VERCEL_ENV=production
```

After saving the environment variables, redeploy if needed.

---

# 14. Get the deployed Vercel URL

After deployment, Vercel gives you a URL such as:

```txt
https://my-client-event-confirmation.vercel.app
```

Your backend endpoint becomes:

```txt
https://my-client-event-confirmation.vercel.app/api/send-confirmation
```

You will use this URL in Webflow.

---

# 15. Connect Webflow

In Webflow, add the frontend script to the page containing the form.

Place it in:

**Page Settings -> Before `</body>`**

---

# 16. Webflow script

Replace the endpoint URL with the Vercel URL for the current project.

```html
<script>
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("wf-form-Formular");
  if (!form) return;

  let processed = false;

  form.addEventListener("submit", async function (e) {
    if (!processed) {
      e.preventDefault();
      processed = true;

      const email = document.getElementById("E-Mail-Adresse")?.value?.trim();
      const vorname = document.getElementById("Vorname")?.value?.trim() || "";
      const nachname = document.getElementById("Nachname")?.value?.trim() || "";

      try {
        const response = await fetch("https://YOUR-PROJECT.vercel.app/api/send-confirmation", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            vorname,
            nachname
          })
        });

        const result = await response.text();
        console.log("Backend response:", result);

        if (!response.ok) {
          console.error("Backend error:", response.status, result);
        }
      } catch (err) {
        console.error("Backend fetch error:", err);
      }

      form.requestSubmit();
    }
  });
});
</script>
```

---

# 17. Why `requestSubmit()` matters

Do not replace this with `form.submit()`.

Use:

```js
form.requestSubmit();
```

Reason:

- `form.submit()` bypasses Webflow's normal handling
- that can reset the page and break the success message
- `form.requestSubmit()` allows Webflow to continue its normal submit flow

This is the correct behavior for this setup.

---

# 18. What must be updated in Webflow for each white-label project

Usually only these parts:

1. the Vercel endpoint URL
2. the form field IDs if the Webflow form structure changes

Current script expects:

- form id: `wf-form-Formular`
- email field id: `E-Mail-Adresse`
- first name field id: `Vorname`
- last name field id: `Nachname`

If a new project uses different field IDs, update the script.

---

# 19. Suggested white-label checklist

For each new project:

## GitHub
- [ ] duplicate the repository
- [ ] rename it for the client/project
- [ ] push the customized code

## Brevo
- [ ] create or configure the account
- [ ] verify sender
- [ ] authenticate domain if needed
- [ ] create transactional template
- [ ] get API key
- [ ] get template ID

## Code
- [ ] update `allowedOrigins`
- [ ] confirm expected form field IDs
- [ ] test locally

## Vercel
- [ ] import repository
- [ ] add `BREVO_API_KEY`
- [ ] add `BREVO_TEMPLATE_ID`
- [ ] add `VERCEL_ENV=production`
- [ ] deploy

## Webflow
- [ ] paste the frontend script
- [ ] replace the endpoint URL
- [ ] publish site
- [ ] test form submission
- [ ] confirm success message appears
- [ ] confirm email is received

---

# 20. Troubleshooting

## 403 Origin not allowed
Cause:
- the requesting domain is not in `allowedOrigins`

Fix:
- add the correct domain to `allowedOrigins`
- redeploy

## 400 Missing email
Cause:
- the frontend did not send `email`

Fix:
- check the field ID in Webflow
- check the JSON payload

## Brevo API error
Cause:
- wrong API key
- wrong template ID
- inactive template
- invalid sender/domain setup

Fix:
- verify `BREVO_API_KEY`
- verify `BREVO_TEMPLATE_ID`
- verify sender/template in Brevo

## Email not personalized
Cause:
- template variables do not match the `params` names

Fix:
Use these variables in Brevo:

```txt
{{params.VORNAME}}
{{params.NACHNAME}}
```

## Success message not showing in Webflow
Cause:
- using `form.submit()` instead of `form.requestSubmit()`

Fix:
- keep `form.requestSubmit()`

---

# 21. Security notes

This repository is safer than putting the Brevo API key in frontend JavaScript.

Still, for future improvements, you can add:

- rate limiting
- honeypot field
- captcha / turnstile
- hidden token validation

For now, this setup is already a solid white-label baseline.

---

# 22. Final white-label summary

This repository can be reused project after project.

For each new client/project, you mainly change:

- GitHub repository name
- allowed origins
- Brevo account or sender
- Brevo template
- Brevo API key
- Brevo template ID
- Vercel environment variables
- Webflow endpoint URL
- Webflow field IDs if necessary

That makes this repository a clean reusable base for Webflow event confirmation flows using Brevo and Vercel.
