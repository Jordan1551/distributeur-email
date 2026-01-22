import { getStore } from "@netlify/blobs";

export async function handler(event) {
  try {
    // 🔒 Autoriser uniquement POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Méthode non autorisée" })
      };
    }

    // 🧠 Accès au stockage persistant (auto-configuré)
    const store = getStore("email-service");

    // 📥 Lecture des données envoyées
    const body = JSON.parse(event.body || "{}");
    const active = body.active === true;

    // 💾 Sauvegarde de l’état
    await store.set("active", active);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        active,
        message: active
          ? "🟢 Service email ACTIVÉ"
          : "🔴 Service email DÉSACTIVÉ"
      })
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
