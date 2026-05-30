// Vercel Serverless Function — POST /api/google-calendar/delete-event
// TODO: Mesmas dependências de configuração que create-event.ts

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const { eventId, calendarId } = await req.json();

  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) {
    return new Response(
      JSON.stringify({ success: false, error: "Google Calendar não autorizado" }),
      { status: 401 }
    );
  }

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
      JSON.stringify({ success: false, error: "Falha ao obter access token" }),
      { status: 500 }
    );
  }

  const calId = encodeURIComponent(calendarId || "primary");
  const evId = encodeURIComponent(eventId);
  const apiRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calId}/events/${evId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }
  );

  if (!apiRes.ok && apiRes.status !== 404) {
    return new Response(JSON.stringify({ success: false, error: "Erro ao apagar evento" }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
