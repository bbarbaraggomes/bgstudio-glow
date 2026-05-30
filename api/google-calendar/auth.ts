// Vercel Serverless Function — GET /api/google-calendar/auth
// Callback OAuth 2.0 do Google — guarda refresh_token no Supabase
//
// TODO: Configurar este URL como Redirect URI no Google Cloud Console:
// https://bgstudio-glow.vercel.app/api/google-calendar/auth
//
// Variáveis de ambiente necessárias:
// GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (service role para acesso server-side)

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return new Response(
      `<html><body><script>window.close();alert("Erro OAuth: ${error ?? "código ausente"}");</script></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }

  // Trocar code por tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
      code,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.refresh_token) {
    return new Response(
      `<html><body><script>window.close();alert("OAuth falhou: refresh_token não recebido");</script></body></html>`,
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }

  // TODO: Guardar refresh_token no Supabase settings (requer SUPABASE_SERVICE_ROLE_KEY)
  // Exemplo:
  // await fetch(`${process.env.SUPABASE_URL}/rest/v1/settings?id=eq.SETTINGS_ID`, {
  //   method: "PATCH",
  //   headers: {
  //     apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  //     Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
  //     "Content-Type": "application/json",
  //   },
  //   body: JSON.stringify({ google_connected: true }),
  // });

  return new Response(
    `<html><body><script>window.opener?.postMessage("google_auth_success","*");window.close();</script><p>Conectado com sucesso! Pode fechar esta janela.</p></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html" } }
  );
}
