// Vercel Serverless Function — POST /api/google-calendar/create-event
//
// TODO: Configurar Google Cloud Console:
// 1. Activar Google Calendar API no projecto
// 2. Definir no Vercel: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
// 3. Completar o fluxo OAuth em /api/google-calendar/auth para obter refresh_token
// 4. Guardar refresh_token no Supabase settings para uso aqui
//
// Variáveis de ambiente necessárias (Vercel + .env.local):
// GOOGLE_CLIENT_ID=
// GOOGLE_CLIENT_SECRET=
// GOOGLE_REDIRECT_URI=https://bgstudio-glow.vercel.app/api/google-calendar/auth
// GOOGLE_REFRESH_TOKEN=  (guardado após OAuth flow)

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const { event, calendarId } = await req.json();

  // TODO: Trocar pelo refresh token guardado no Supabase após OAuth
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Google Calendar não autorizado. Complete o fluxo OAuth em Configurações.",
      }),
      { status: 401 }
    );
  }

  // Obter access token usando refresh token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    return new Response(
      JSON.stringify({ success: false, error: "Falha ao obter access token do Google" }),
      { status: 500 }
    );
  }

  const calId = encodeURIComponent(calendarId || "primary");
  const apiRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!apiRes.ok) {
    const errData = await apiRes.json();
    return new Response(
      JSON.stringify({ success: false, error: errData.error?.message ?? "Erro Google Calendar" }),
      { status: 500 }
    );
  }

  const data = await apiRes.json();
  return new Response(JSON.stringify({ success: true, eventId: data.id }), { status: 200 });
}
