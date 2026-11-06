// Entrega à Central um link assinado e temporário para a conversa de voz com o Kairós.
// Só para o e-mail do Artur com segundo fator (staff_e_admin exige aal2).
// A chave do ElevenLabs fica no segredo ELEVENLABS_API_KEY das Edge Functions (nunca no app).
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const AGENTE = 'agent_9901m6c3d59mf2cvr62jrddp8dmn'
const ORIGENS = ['https://staff-central-artur.vercel.app', 'https://central-bice-xi.vercel.app']

Deno.serve(async (req) => {
  const origem = req.headers.get('origin') || ''
  const cors = {
    'Access-Control-Allow-Origin': ORIGENS.includes(origem) ? origem : ORIGENS[0],
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ erro: 'método' }, 405)

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('authorization') || '' } },
    auth: { persistSession: false },
  })
  const { data: ok } = await sb.rpc('staff_e_admin')
  if (!ok) return json({ erro: 'não autorizado' }, 403)

  const chave = Deno.env.get('ELEVENLABS_API_KEY')
  if (!chave) return json({ erro: 'voz_nao_configurada' }, 503)
  const r = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${AGENTE}`, { headers: { 'xi-api-key': chave } })
  if (!r.ok) return json({ erro: 'elevenlabs', status: r.status }, 502)
  const { signed_url } = await r.json()
  return json({ signedUrl: signed_url })
})
