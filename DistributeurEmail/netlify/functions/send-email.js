import { getStore } from "@netlify/blobs";

// SendPulse (optionnel)
const SENDPULSE_API_ID = process.env.SENDPULSE_API_ID;
const SENDPULSE_API_SECRET = process.env.SENDPULSE_API_SECRET;

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
    // ✅ ACCÈS BLOBS CORRECT
    const store = getStore("email-service");

    const isActive = await store.get("active");

    if (isActive === false) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Service email désactivé" })
      };
    }

    const data = JSON.parse(event.body || "{}");

    if (!data.adminEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "adminEmail manquant" })
      };
    }

    // Mode test
    if (!SENDPULSE_API_ID || !SENDPULSE_API_SECRET) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Service actif – email simulé",
          data
        })
      };
    }

    const token = await getSendPulseToken();

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
          html: `<p>Nouveau rendez-vous</p>`
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
