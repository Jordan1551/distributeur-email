import { getStore } from "@netlify/blobs";

// 🔐 Variables Netlify (OBLIGATOIRES)
const SITE_ID = process.env.NETLIFY_SITE_ID;
const API_TOKEN = process.env.NETLIFY_API_TOKEN;

// 🔐 Variables SendPulse (optionnelles pour l’instant)
const SENDPULSE_API_ID = process.env.SENDPULSE_API_ID;
const SENDPULSE_API_SECRET = process.env.SENDPULSE_API_SECRET;

// 🧠 Récupération du token SendPulse
async function getSendPulseToken() {
  const response = await fetch(
    "https://api.sendpulse.com/oauth/access_token",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: SENDPULSE_API_ID,
        client_secret: SENDPULSE_API_SECRET
      })
    }
  );

  return response.json();
}

export async function handler(event) {
  try {
    // 🧠 Accès au stockage persistant
    const store = getStore("email-service", {
      siteID: SITE_ID,
      token: API_TOKEN
    });

    // 🔒 Vérifier l’état du service
    const isActive = await store.get("active");

    if (isActive === false) {
      return {
        statusCode: 403,
        body: JSON.stringify({
          error: "Service email désactivé"
        })
      };
    }

    // 📥 Données reçues
    const data = JSON.parse(event.body || "{}");

    if (!data.adminEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "adminEmail manquant" })
      };
    }

    // ⚠️ Mode test (SendPulse pas encore configuré)
    if (!SENDPULSE_API_ID || !SENDPULSE_API_SECRET) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Service actif – email simulé",
          data
        })
      };
    }

    // 🔑 Token SendPulse
    const token = await getSendPulseToken();

    // 📧 Envoi email
    await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: {
          subject: "📅 Nouveau rendez-vous",
          from: {
            name: "Rendez-vous",
            email: "no-reply@ta-plateforme.com"
          },
          to: [{ email: data.adminEmail }],
          html: `
            <h2>Nouveau rendez-vous</h2>
            <p><strong>Nom :</strong> ${data.name || "-"}</p>
            <p><strong>Email :</strong> ${data.email || "-"}</p>
            <p><strong>Date :</strong> ${data.date || "-"}</p>
            <p><strong>Heure :</strong> ${data.time || "-"}</p>
            <p><strong>Message :</strong><br>${data.message || "-"}</p>
          `
        }
      })
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erreur serveur",
        details: error.message
      })
    };
  }
}
