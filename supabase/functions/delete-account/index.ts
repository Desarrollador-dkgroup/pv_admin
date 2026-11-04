// Borrado de cuenta del cliente. La sesión del usuario se verifica dentro de la función; por eso
// el gateway no exige JWT, para que las solicitudes previas (OPTIONS) de CORS sí respondan.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'missing_authorization' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Actúa como el propio usuario (su JWT), nunca como service_role en esta parte.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'invalid_session' }, 401);
    const userId = userData.user.id;

    const { data: prep, error: prepError } = await callerClient.rpc('prepare_account_deletion');
    if (prepError) return json({ error: prepError.message }, 400);

    // service_role solo para la operación de auth.users, que no tiene endpoint para el usuario.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (prep?.hadHistory) {
      await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: '876000h',
        email: `deleted-${userId}@deleted.invalid`,
        user_metadata: {},
      });
      return json({ status: 'anonymized' });
    }

    await adminClient.auth.admin.deleteUser(userId);
    return json({ status: 'deleted' });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
