// Kairós — servidor MCP (Streamable HTTP, sem estado) do braço direito do Artur.
// Todas as portas (Claude Code, Claude web, ChatGPT) falam com o mesmo banco do Staff.
// Autenticação: chave do Vault "kairos_mcp_key", enviada como Authorization: Bearer <chave>
// ou no próprio endereço (/kairos/<chave>), para clientes que não aceitam cabeçalho.
import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const VERSAO = '1.0.0'
const AREAS = ['estrategia', 'vendas', 'trafego', 'conteudo', 'copy', 'projetos', 'auditoria', 'recuperacao', 'crm', 'financas', 'engenharia', 'geral']

const INSTRUCOES = `Você está conectado ao Kairós, o braço direito do Artur Batista (médico, fundador da MedStation e do Arsenal Med).
Responda sempre em português do Brasil, curto, com números primeiro.
Regras fixas: dinheiro, publicação, mensagem para cliente e mudança no site só com o "sim" explícito do Artur. Campanhas [ZION] são de outro gestor: só leitura. Copy da Black: nunca parcelamento, boleto, Pix, "60% off" nem "de R$ 999,90 por R$ 399,90". Conteúdo clínico só a partir do material do Artur; nunca invente dose ou conduta.
Comece lendo a memória (ler_memoria) e o painel (painel_do_dia) quando o assunto for estratégia, vendas ou projetos.
Pedidos que exigem execução (anúncios, publicação, site) vão para a fila com anotar_pedido; a rotina da fila (minuto 22, 8h às 23h) prepara a proposta e executa o que o Artur aprovar.
Quando ajudar, responda com gráfico ou diagrama (Mermaid ou tabela).`

type Args = Record<string, unknown>
const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

const TOOLS = [
  { name: 'painel_do_dia', description: 'Painel mais recente do Staff: vendas, checkouts, tráfego pago, conteúdo, pedidos e pendências do Artur.', inputSchema: { type: 'object', properties: {} } },
  { name: 'ler_memoria', description: 'Memória do Kairós: decisões, preços, regras e combinados do Artur, por seção.', inputSchema: { type: 'object', properties: { secao: { type: 'string', description: 'Opcional: nome (ou parte) da seção' } } } },
  { name: 'registrar_memoria', description: 'Grava ou atualiza uma seção da memória com uma decisão duradoura que o Artur tomou (preço, regra, combinado). Reescreva a seção inteira.', inputSchema: { type: 'object', required: ['secao', 'texto'], properties: { secao: { type: 'string' }, texto: { type: 'string', description: 'Texto completo da seção, uma linha por fato, começando com "- "' } } } },
  { name: 'listar_pedidos', description: 'Pedidos da fila do Staff. Sem filtro, mostra os abertos (novo, enviado, aprovado).', inputSchema: { type: 'object', properties: { status: { type: 'string', enum: ['abertos', 'novo', 'enviado', 'aprovado', 'feito', 'recusado', 'todos'] }, limite: { type: 'number' } } } },
  { name: 'anotar_pedido', description: 'Anota um pedido do Artur na fila. A rotina da fila prepara a proposta e pede o sim dele.', inputSchema: { type: 'object', required: ['pedido'], properties: { pedido: { type: 'string' }, area: { type: 'string', enum: AREAS }, urgencia: { type: 'string', enum: ['normal', 'hoje', 'agora'] }, projeto: { type: 'string', description: 'slug do projeto (ver listar_projetos)' } } } },
  { name: 'decidir_pedido', description: 'Registra a decisão do Artur sobre um pedido com proposta (status enviado). Use só quando o próprio Artur disser sim ou não nesta conversa.', inputSchema: { type: 'object', required: ['id', 'decisao'], properties: { id: { type: 'number' }, decisao: { type: 'string', enum: ['aprovado', 'recusado'] } } } },
  { name: 'listar_projetos', description: 'Projetos do Artur com fase, objetivo, próximo passo, métrica e checklist.', inputSchema: { type: 'object', properties: { projeto: { type: 'string', description: 'Opcional: slug de um projeto' } } } },
  { name: 'atualizar_projeto', description: 'Atualiza objetivo, próximo passo, métrica ou fase de um projeto (ou cria um novo, com nome).', inputSchema: { type: 'object', required: ['projeto'], properties: { projeto: { type: 'string', description: 'slug' }, nome: { type: 'string' }, descricao: { type: 'string' }, fase: { type: 'string', enum: ['ativo', 'em_construcao', 'pausado', 'concluido'] }, prioridade: { type: 'number' }, objetivo: { type: 'string' }, proximo_passo: { type: 'string' }, metrica: { type: 'string' }, link: { type: 'string' } } } },
  { name: 'adicionar_item_checklist', description: 'Adiciona item ao checklist de um projeto.', inputSchema: { type: 'object', required: ['projeto', 'item'], properties: { projeto: { type: 'string' }, item: { type: 'string' }, dono: { type: 'string', enum: ['artur', 'staff'] }, prazo: { type: 'string', description: 'AAAA-MM-DD' } } } },
  { name: 'marcar_item_checklist', description: 'Marca (ou desmarca) um item do checklist como feito.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'number' }, feito: { type: 'boolean' } } } },
  { name: 'calendario_posts', description: 'Posts do calendário (Instagram/Facebook): agendados, aguardando aprovação e publicados.', inputSchema: { type: 'object', properties: { dias: { type: 'number', description: 'janela para trás e para frente, padrão 14' } } } },
  { name: 'decidir_post', description: 'Aprova, segura ou cancela um post do calendário. Use só com o sim/não do Artur nesta conversa.', inputSchema: { type: 'object', required: ['id', 'decisao'], properties: { id: { type: 'string' }, decisao: { type: 'string', enum: ['aprovado', 'aguardando_aprovacao', 'cancelado'] } } } },
]

async function log(porta: string, ferramenta: string, resumo: string) {
  await sb.from('kairos_log').insert({ porta, ferramenta, resumo: resumo.slice(0, 300) })
}

async function chamar(nome: string, a: Args, porta: string): Promise<string> {
  switch (nome) {
    case 'painel_do_dia': {
      const { data } = await sb.from('staff_painel').select('criado_em,texto').order('criado_em', { ascending: false }).limit(1)
      if (!data?.length) return 'Ainda não há painel gravado.'
      return `(gravado em ${data[0].criado_em})\n\n${data[0].texto}`
    }
    case 'ler_memoria': {
      let q = sb.from('staff_memoria').select('secao,texto,atualizado_em').order('ordem')
      const s = str(a.secao, 120)
      if (s) q = q.ilike('secao', `%${s}%`)
      const { data, error } = await q
      if (error) throw error
      return (data || []).map((m) => `## ${m.secao} (atualizado ${m.atualizado_em.slice(0, 10)})\n${m.texto}`).join('\n\n') || 'Nada encontrado.'
    }
    case 'registrar_memoria': {
      const secao = str(a.secao, 120), texto = str(a.texto, 6000)
      if (!secao || !texto) throw new Error('secao e texto são obrigatórios')
      const { error } = await sb.from('staff_memoria').upsert({ secao, texto, fonte: porta, atualizado_em: new Date().toISOString() })
      if (error) throw error
      await log(porta, nome, secao)
      return `Memória "${secao}" gravada. Todas as portas (voz, Central, Claude, ChatGPT) passam a ver.`
    }
    case 'listar_pedidos': {
      const st = str(a.status, 20) || 'abertos'
      const lim = Math.min(Number(a.limite) || 30, 100)
      let q = sb.from('staff_requests').select('id,created_at,pedido,area,projeto,urgencia,status,nota,clickup_url').order('id', { ascending: false }).limit(lim)
      if (st === 'abertos') q = q.in('status', ['novo', 'enviado', 'aprovado'])
      else if (st !== 'todos') q = q.eq('status', st)
      const { data, error } = await q
      if (error) throw error
      if (!data?.length) return 'Nenhum pedido nesse filtro.'
      return data.map((p) => `#${p.id} [${p.status}] ${p.area}${p.projeto ? ' · ' + p.projeto : ''} · ${p.created_at.slice(0, 16)}\n  Pedido: ${p.pedido}${p.nota ? `\n  Nota/proposta: ${p.nota}` : ''}${p.clickup_url ? `\n  ClickUp: ${p.clickup_url}` : ''}`).join('\n')
    }
    case 'anotar_pedido': {
      const pedido = str(a.pedido, 600)
      if (pedido.length < 3) throw new Error('pedido vazio')
      const area = AREAS.includes(str(a.area)) ? str(a.area) : 'geral'
      const urgencia = ['normal', 'hoje', 'agora'].includes(str(a.urgencia)) ? str(a.urgencia) : 'normal'
      const { data, error } = await sb.from('staff_requests').insert({ pedido: `${pedido} (via ${porta})`.slice(0, 600), area, urgencia, projeto: str(a.projeto, 60) || null }).select('id').single()
      if (error) throw error
      await log(porta, nome, `#${data.id} ${pedido}`)
      return `Anotado como pedido #${data.id}. A fila prepara a proposta na próxima rodada (minuto 22, das 8h às 23h) e ela aparece na Central para o sim do Artur.`
    }
    case 'decidir_pedido': {
      const id = Number(a.id), decisao = str(a.decisao)
      if (!['aprovado', 'recusado'].includes(decisao)) throw new Error('decisão inválida')
      const { data, error } = await sb.from('staff_requests').update({ status: decisao, atualizado_em: new Date().toISOString() }).eq('id', id).in('status', ['novo', 'enviado']).select('id,pedido')
      if (error) throw error
      if (!data?.length) return `Pedido #${id} não está aguardando decisão.`
      await log(porta, nome, `#${id} ${decisao}`)
      return decisao === 'aprovado' ? `Pedido #${id} aprovado. A fila executa na próxima rodada.` : `Pedido #${id} recusado.`
    }
    case 'listar_projetos': {
      let q = sb.from('staff_projetos').select('*').order('ordem')
      const p = str(a.projeto, 60)
      if (p) q = q.eq('slug', p)
      const [{ data: projs, error }, { data: itens }] = await Promise.all([q, sb.from('staff_checklist').select('*').order('ordem').order('id')])
      if (error) throw error
      return (projs || []).map((pr) => {
        const its = (itens || []).filter((c) => c.projeto === pr.slug)
        const feitos = its.filter((c) => c.feito).length
        return `## ${pr.nome} (${pr.slug}) · ${pr.fase} · prioridade ${pr.prioridade}\n- Objetivo: ${pr.objetivo || '—'}\n- Próximo passo: ${pr.proximo_passo || '—'}\n- Métrica: ${pr.metrica || '—'}${pr.link ? `\n- Link: ${pr.link}` : ''}\n- Checklist ${feitos}/${its.length}:\n${its.map((c) => `  [${c.feito ? 'x' : ' '}] #${c.id} ${c.item} (${c.dono}${c.prazo ? ', até ' + c.prazo : ''})`).join('\n')}`
      }).join('\n\n') || 'Nenhum projeto.'
    }
    case 'atualizar_projeto': {
      const slug = str(a.projeto, 60).toLowerCase().replace(/[^a-z0-9-]/g, '-')
      if (!slug) throw new Error('projeto obrigatório')
      const campos: Record<string, unknown> = { atualizado_em: new Date().toISOString() }
      for (const k of ['nome', 'descricao', 'fase', 'objetivo', 'proximo_passo', 'metrica', 'link']) if (str(a[k])) campos[k] = str(a[k], 400)
      if (a.prioridade) campos.prioridade = Math.min(5, Math.max(1, Number(a.prioridade)))
      const { data: existe } = await sb.from('staff_projetos').select('slug').eq('slug', slug).maybeSingle()
      if (existe) { const { error } = await sb.from('staff_projetos').update(campos).eq('slug', slug); if (error) throw error }
      else { if (!campos.nome) throw new Error('para criar projeto novo, informe nome'); const { error } = await sb.from('staff_projetos').insert({ slug, ...campos }); if (error) throw error }
      await log(porta, nome, slug)
      return `Projeto ${slug} ${existe ? 'atualizado' : 'criado'}.`
    }
    case 'adicionar_item_checklist': {
      const { data, error } = await sb.from('staff_checklist').insert({ projeto: str(a.projeto, 60), item: str(a.item, 300), dono: str(a.dono) === 'staff' ? 'staff' : 'artur', prazo: str(a.prazo, 10) || null }).select('id').single()
      if (error) throw error
      await log(porta, nome, `${a.projeto}: ${a.item}`)
      return `Item #${data.id} adicionado.`
    }
    case 'marcar_item_checklist': {
      const feito = a.feito !== false
      const { error } = await sb.from('staff_checklist').update({ feito, feito_em: feito ? new Date().toISOString() : null }).eq('id', Number(a.id))
      if (error) throw error
      await log(porta, nome, `#${a.id} ${feito}`)
      return `Item #${a.id} ${feito ? 'feito' : 'reaberto'}.`
    }
    case 'calendario_posts': {
      const dias = Math.min(Number(a.dias) || 14, 90)
      const ini = new Date(Date.now() - dias * 864e5).toISOString(), fim = new Date(Date.now() + dias * 864e5).toISOString()
      const { data, error } = await sb.from('social_posts').select('id,agendado_para,conta,formato,titulo,status,permalink,legenda').gte('agendado_para', ini).lte('agendado_para', fim).order('agendado_para')
      if (error) throw error
      return (data || []).map((p) => `${p.agendado_para.slice(0, 16)} · ${p.conta} · ${p.formato} · [${p.status}] ${p.titulo} (id ${p.id})${p.permalink ? '\n  ' + p.permalink : ''}`).join('\n') || 'Calendário vazio nessa janela.'
    }
    case 'decidir_post': {
      const decisao = str(a.decisao)
      if (!['aprovado', 'aguardando_aprovacao', 'cancelado'].includes(decisao)) throw new Error('decisão inválida')
      const patch: Record<string, unknown> = { status: decisao }
      if (decisao === 'aprovado') { patch.aprovado_em = new Date().toISOString(); patch.aprovado_por = `Artur (${porta})` }
      const { data, error } = await sb.from('social_posts').update(patch).eq('id', str(a.id, 60)).in('status', ['rascunho', 'aguardando_aprovacao', 'aprovado', 'erro']).select('titulo')
      if (error) throw error
      if (!data?.length) return 'Post não encontrado ou já publicado.'
      await log(porta, nome, `${data[0].titulo} → ${decisao}`)
      return `Post "${data[0].titulo}": ${decisao}. Aprovado publica sozinho na hora marcada.`
    }
  }
  throw new Error(`ferramenta desconhecida: ${nome}`)
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version, x-kairos-porta',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

async function responder(msg: any, porta: string) {
  const { id, method, params } = msg || {}
  if (id === undefined || id === null) return null // notificação
  try {
    switch (method) {
      case 'initialize':
        return { jsonrpc: '2.0', id, result: { protocolVersion: params?.protocolVersion || '2025-06-18', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'kairos', title: 'Kairós · braço direito do Artur', version: VERSAO }, instructions: INSTRUCOES } }
      case 'ping':
        return { jsonrpc: '2.0', id, result: {} }
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: TOOLS } }
      case 'tools/call': {
        try {
          const texto = await chamar(params?.name, params?.arguments || {}, porta)
          return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: texto }] } }
        } catch (e) {
          return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Erro: ${(e as Error).message}` }], isError: true } }
        }
      }
      case 'resources/list': return { jsonrpc: '2.0', id, result: { resources: [] } }
      case 'prompts/list': return { jsonrpc: '2.0', id, result: { prompts: [] } }
      default:
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `método não suportado: ${method}` } }
    }
  } catch (e) {
    return { jsonrpc: '2.0', id, error: { code: -32603, message: (e as Error).message } }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  const url = new URL(req.url)
  const partes = url.pathname.split('/').filter(Boolean)
  const i = partes.indexOf('kairos')
  const chaveCaminho = i >= 0 ? partes[i + 1] : undefined
  const chave = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || chaveCaminho || ''
  const { data: ok } = await sb.rpc('kairos_chave_ok', { k: chave })
  if (!ok) return json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'não autorizado' } }, 401)
  if (req.method === 'GET') return new Response('Kairós MCP: use POST (Streamable HTTP, sem SSE).', { status: 405, headers: { ...CORS, Allow: 'POST' } })
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: CORS })

  const porta = (req.headers.get('x-kairos-porta') || url.searchParams.get('porta') || req.headers.get('user-agent') || 'desconhecida').slice(0, 60)
  let corpo: any
  try { corpo = await req.json() } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }, 400) }

  if (Array.isArray(corpo)) {
    const r = (await Promise.all(corpo.map((m) => responder(m, porta)))).filter(Boolean)
    return r.length ? json(r) : new Response(null, { status: 202, headers: CORS })
  }
  const r = await responder(corpo, porta)
  return r ? json(r) : new Response(null, { status: 202, headers: CORS })
})
