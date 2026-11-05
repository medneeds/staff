import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { sb } from './supabase.js'
import { AGENT_ID } from './config.js'

const TZ = 'America/Fortaleza'
const fmt = (iso, opts) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: TZ, ...opts }) : ''
const quando = (iso) => fmt(iso, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const diaLongo = (iso) => fmt(iso, { weekday: 'long', day: '2-digit', month: 'long' })

const AREAS = [
  ['conteudo', 'Conteúdo'],
  ['trafego', 'Tráfego'],
  ['vendas', 'Vendas'],
  ['recuperacao', 'Recuperação'],
  ['crm', 'CRM'],
  ['financas', 'Finanças'],
  ['engenharia', 'Engenharia'],
  ['geral', 'Geral'],
]
const URG = [
  ['normal', 'Sem pressa'],
  ['hoje', 'Hoje'],
  ['agora', 'Agora'],
]
const ST_PEDIDO = {
  novo: ['Na fila', 'neutro'],
  enviado: ['Aguardando seu sim', 'alerta'],
  aprovado: ['Aprovado · em execução', 'ok'],
  recusado: ['Recusado', 'mudo'],
  feito: ['Feito', 'ok'],
}
const ST_POST = {
  rascunho: ['Rascunho', 'neutro'],
  aguardando_aprovacao: ['Aguardando seu sim', 'alerta'],
  aprovado: ['Aprovado · agendado', 'ok'],
  publicando: ['Publicando…', 'ok'],
  publicado: ['Publicado', 'ok'],
  erro: ['Erro', 'erro'],
  cancelado: ['Cancelado', 'mudo'],
}

function Chip({ tipo, children }) {
  return <span className={`chip chip-${tipo}`}>{children}</span>
}

/* ---------------- Login ---------------- */
function Login() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  async function pedir(e) {
    e.preventDefault()
    setErro(''); setOcupado(true)
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin, shouldCreateUser: true },
    })
    setOcupado(false)
    if (error) setErro('Não consegui enviar o acesso agora. Tente de novo em alguns minutos.')
    else setEnviado(true)
  }
  async function confirmar(e) {
    e.preventDefault()
    setErro(''); setOcupado(true)
    const { error } = await sb.auth.verifyOtp({ email: email.trim().toLowerCase(), token: codigo.trim(), type: 'email' })
    setOcupado(false)
    if (error) setErro('Código inválido ou vencido. Peça um novo.')
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="marca"><span className="k">K</span> Staff · Central</div>
        <h1>Seu chefe de plantão</h1>
        <p className="sub">Pedidos, aprovações, posts e números do dia num lugar só.</p>
        {!enviado ? (
          <form onSubmit={pedir}>
            <label>E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu e-mail" autoComplete="email" />
            <button className="btn btn-primario" disabled={ocupado}>{ocupado ? 'Enviando…' : 'Receber link de acesso'}</button>
          </form>
        ) : (
          <form onSubmit={confirmar}>
            <p className="aviso">Mandei um link para <b>{email}</b>. Toque nele neste aparelho, ou cole aqui o código do e-mail, se houver.</p>
            <input inputMode="numeric" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="código (opcional)" />
            <button className="btn btn-primario" disabled={ocupado || !codigo}>Entrar com o código</button>
            <button type="button" className="btn btn-link" onClick={() => setEnviado(false)}>Usar outro e-mail</button>
          </form>
        )}
        {erro && <p className="erro">{erro}</p>}
      </div>
    </div>
  )
}

/* ---------------- Hoje ---------------- */
function Painel({ texto }) {
  const blocos = useMemo(() => {
    if (!texto) return []
    const linhas = texto.split('\n')
    const out = []
    let atual = { titulo: null, itens: [] }
    for (const l of linhas) {
      const t = l.trim()
      if (!t) continue
      if (/^PAINEL DO STAFF/.test(t)) continue
      const base = t.replace(/\s*\(.*\)\s*$/, '')
      const ehTitulo = !t.startsWith('-') && !/^\d+\./.test(t) && base === base.toUpperCase() && /[A-ZÁÉÍÓÚÇ]/.test(base) && base.length < 80
      if (ehTitulo) {
        if (atual.titulo || atual.itens.length) out.push(atual)
        atual = { titulo: t.replace(/\s*\(.*\)\s*$/, ''), itens: [] }
      } else atual.itens.push(t.replace(/^-\s*/, ''))
    }
    out.push(atual)
    return out
  }, [texto])
  return (
    <div className="painel">
      {blocos.map((b, i) => (
        <section key={i} className="bloco">
          {b.titulo && <h3>{b.titulo}</h3>}
          <ul>{b.itens.map((it, j) => <li key={j}>{it}</li>)}</ul>
        </section>
      ))}
    </div>
  )
}

function Hoje({ painel, pedidos, posts, irPara }) {
  const aguardandoPedidos = pedidos.filter((p) => p.status === 'enviado').length
  const aguardandoPosts = posts.filter((p) => p.status === 'aguardando_aprovacao').length
  const proximos = posts.filter((p) => p.status === 'aprovado').length
  const velho = painel && Date.now() - new Date(painel.criado_em).getTime() > 6 * 3600e3
  return (
    <>
      <div className="cards">
        <button className={`card ${aguardandoPedidos ? 'card-alerta' : ''}`} onClick={() => irPara('pedidos')}>
          <span className="num">{aguardandoPedidos}</span><span>pedido(s) esperando seu sim</span>
        </button>
        <button className={`card ${aguardandoPosts ? 'card-alerta' : ''}`} onClick={() => irPara('posts')}>
          <span className="num">{aguardandoPosts}</span><span>post(s) para aprovar</span>
        </button>
        <button className="card" onClick={() => irPara('posts')}>
          <span className="num">{proximos}</span><span>post(s) agendado(s)</span>
        </button>
      </div>
      <div className="secao-topo">
        <h2>Painel do dia</h2>
        {painel && <span className={`hora ${velho ? 'velho' : ''}`}>atualizado {quando(painel.criado_em)}{velho ? ' · pode estar desatualizado' : ''}</span>}
      </div>
      {painel ? <Painel texto={painel.texto} /> : <p className="vazio">O painel chega na próxima rodada (9h52, 15h52 ou 21h52).</p>}
    </>
  )
}

/* ---------------- Pedidos ---------------- */
function NovoPedido({ aoCriar }) {
  const [texto, setTexto] = useState('')
  const [area, setArea] = useState('conteudo')
  const [urg, setUrg] = useState('normal')
  const [ok, setOk] = useState('')
  const [erro, setErro] = useState('')
  async function enviar(e) {
    e.preventDefault()
    setOk(''); setErro('')
    const pedido = texto.trim()
    if (pedido.length < 3) return
    const { error } = await sb.from('staff_requests').insert({ pedido: pedido.slice(0, 600), area, urgencia: urg })
    if (error) setErro('Não consegui anotar. Tente de novo.')
    else { setTexto(''); setOk('Anotado. Entra na próxima rodada da fila (minuto 22 de cada hora, das 8h às 23h).'); aoCriar() }
  }
  return (
    <form className="novo" onSubmit={enviar}>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={600} rows={3}
        placeholder="O que você quer? Ex.: agenda um carrossel sobre intubação para sexta às 19h, pedindo para salvar." />
      <div className="linha">
        <select value={area} onChange={(e) => setArea(e.target.value)}>{AREAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select value={urg} onChange={(e) => setUrg(e.target.value)}>{URG.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <button className="btn btn-primario" disabled={texto.trim().length < 3}>Anotar</button>
      </div>
      {ok && <p className="ok">{ok}</p>}
      {erro && <p className="erro">{erro}</p>}
    </form>
  )
}

function Pedidos({ pedidos, recarregar }) {
  const [filtro, setFiltro] = useState('abertos')
  const lista = pedidos.filter((p) =>
    filtro === 'abertos' ? ['novo', 'enviado', 'aprovado'].includes(p.status) : true)
  async function decidir(p, status) {
    const { error } = await sb.from('staff_requests')
      .update({ status, atualizado_em: new Date().toISOString() }).eq('id', p.id)
    if (error) alert('Não consegui registrar. Tente de novo.')
    recarregar()
  }
  return (
    <>
      <NovoPedido aoCriar={recarregar} />
      <div className="secao-topo">
        <h2>Pedidos</h2>
        <div className="seg">
          <button className={filtro === 'abertos' ? 'on' : ''} onClick={() => setFiltro('abertos')}>Em aberto</button>
          <button className={filtro === 'todos' ? 'on' : ''} onClick={() => setFiltro('todos')}>Todos</button>
        </div>
      </div>
      {lista.length === 0 && <p className="vazio">Nenhum pedido em aberto.</p>}
      {lista.map((p) => {
        const [rot, tipo] = ST_PEDIDO[p.status] || [p.status, 'neutro']
        return (
          <article key={p.id} className={`item ${p.status === 'enviado' ? 'item-alerta' : ''}`}>
            <div className="item-topo">
              <span className="id">#{p.id}</span>
              <Chip tipo={tipo}>{rot}</Chip>
              <span className="meta">{AREAS.find((a) => a[0] === p.area)?.[1] || p.area} · {quando(p.created_at)}</span>
            </div>
            <p className="pedido">{p.pedido}</p>
            {p.nota && <p className="nota"><b>{p.status === 'enviado' ? 'Proposta: ' : 'Nota: '}</b>{p.nota}</p>}
            <div className="acoes">
              {p.status === 'enviado' && <>
                <button className="btn btn-ok" onClick={() => decidir(p, 'aprovado')}>Sim, pode fazer</button>
                <button className="btn" onClick={() => decidir(p, 'recusado')}>Não</button>
              </>}
              {p.clickup_url && <a className="btn btn-link" href={p.clickup_url} target="_blank" rel="noreferrer">Ver no ClickUp</a>}
            </div>
          </article>
        )
      })}
    </>
  )
}

/* ---------------- Posts ---------------- */
function Posts({ posts, recarregar }) {
  const [aberto, setAberto] = useState(null)
  const grupos = useMemo(() => {
    const g = {}
    for (const p of posts) {
      const k = fmt(p.agendado_para, { year: 'numeric', month: '2-digit', day: '2-digit' })
      ;(g[k] ||= { dia: p.agendado_para, itens: [] }).itens.push(p)
    }
    return Object.values(g).sort((a, b) => new Date(b.dia) - new Date(a.dia))
  }, [posts])
  async function decidir(p, status) {
    const patch = { status }
    if (status === 'aprovado') { patch.aprovado_em = new Date().toISOString(); patch.aprovado_por = 'Artur (Central)' }
    const { error } = await sb.from('social_posts').update(patch).eq('id', p.id)
    if (error) alert('Não consegui registrar. Tente de novo.')
    recarregar()
  }
  return (
    <>
      <div className="secao-topo">
        <h2>Calendário de posts</h2>
        <span className="hora">publica sozinho na hora marcada, depois do seu sim</span>
      </div>
      {posts.length === 0 && <p className="vazio">Nenhum post no calendário. Peça um em Pedidos ou por voz.</p>}
      {grupos.map((g) => (
        <section key={g.dia} className="dia">
          <h3 className="dia-titulo">{diaLongo(g.dia)}</h3>
          {g.itens.map((p) => {
            const [rot, tipo] = ST_POST[p.status] || [p.status, 'neutro']
            const conta = p.conta.replace('instagram:', 'Instagram @').replace('facebook:', 'Facebook · ')
            return (
              <article key={p.id} className={`item ${p.status === 'aguardando_aprovacao' ? 'item-alerta' : ''}`}>
                <div className="item-topo">
                  <Chip tipo={tipo}>{rot}</Chip>
                  <span className="meta">{fmt(p.agendado_para, { hour: '2-digit', minute: '2-digit' })} · {p.formato} · {conta}</span>
                </div>
                <p className="pedido"><b>{p.titulo}</b>{p.pilar ? <span className="pilar"> · {p.pilar}</span> : null}</p>
                {p.midias?.length > 0 && (
                  <div className="tira">{p.midias.map((u, i) => <img key={i} src={u} alt={`slide ${i + 1}`} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />)}</div>
                )}
                {p.legenda && (
                  <p className={`legenda ${aberto === p.id ? 'aberta' : ''}`} onClick={() => setAberto(aberto === p.id ? null : p.id)}>{p.legenda}</p>
                )}
                {p.erro && <p className="erro">{p.erro}</p>}
                <div className="acoes">
                  {p.status === 'aguardando_aprovacao' && <>
                    <button className="btn btn-ok" onClick={() => decidir(p, 'aprovado')}>Sim, pode publicar</button>
                    <button className="btn" onClick={() => decidir(p, 'cancelado')}>Cancelar</button>
                  </>}
                  {p.status === 'aprovado' && <button className="btn" onClick={() => decidir(p, 'aguardando_aprovacao')}>Segurar</button>}
                  {p.permalink && <a className="btn btn-link" href={p.permalink} target="_blank" rel="noreferrer">Ver no Instagram</a>}
                </div>
              </article>
            )
          })}
        </section>
      ))}
    </>
  )
}

/* ---------------- Falar ---------------- */
function Falar() {
  useEffect(() => { import('@elevenlabs/convai-widget-embed') }, [])
  return (
    <>
      <div className="secao-topo"><h2>Falar com o Staff</h2></div>
      <p className="sub">Por voz ou por texto. O que você pedir vira pedido na fila e aparece em Pedidos para o seu sim.</p>
      <div className="voz">
        <elevenlabs-convai agent-id={AGENT_ID} variant="expanded"></elevenlabs-convai>
      </div>
    </>
  )
}

/* ---------------- App ---------------- */
const ABAS = [
  ['hoje', 'Hoje'],
  ['pedidos', 'Pedidos'],
  ['posts', 'Posts'],
  ['falar', 'Falar'],
]

export default function App() {
  const [sessao, setSessao] = useState(undefined)
  const [admin, setAdmin] = useState(null)
  const [aba, setAba] = useState(() => (location.hash.slice(1) || 'hoje'))
  const [painel, setPainel] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [posts, setPosts] = useState([])

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const carregar = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      sb.rpc('staff_e_admin'),
      sb.from('staff_painel').select('criado_em,texto').order('criado_em', { ascending: false }).limit(1),
      sb.from('staff_requests').select('id,created_at,pedido,area,urgencia,status,nota,clickup_url,atualizado_em').order('created_at', { ascending: false }).limit(60),
      sb.from('social_posts').select('*').order('agendado_para', { ascending: false }).limit(90),
    ])
    setAdmin(!!a.data)
    setPainel(b.data?.[0] || null)
    setPedidos(c.data || [])
    setPosts(d.data || [])
  }, [])

  useEffect(() => {
    if (!sessao) return
    carregar()
    const t = setInterval(carregar, 60000)
    const ch = sb.channel('central')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_requests' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, carregar)
      .subscribe()
    return () => { clearInterval(t); sb.removeChannel(ch) }
  }, [sessao, carregar])

  useEffect(() => { history.replaceState(null, '', `#${aba}`) }, [aba])

  if (sessao === undefined) return <div className="carregando">Carregando…</div>
  if (!sessao) return <Login />
  if (admin === false) return (
    <div className="login"><div className="login-card">
      <h1>Acesso restrito</h1>
      <p className="sub">Este e-mail não tem acesso à Central do Staff.</p>
      <button className="btn" onClick={() => sb.auth.signOut()}>Sair</button>
    </div></div>
  )

  const pend = pedidos.filter((p) => p.status === 'enviado').length + posts.filter((p) => p.status === 'aguardando_aprovacao').length

  return (
    <div className="app">
      <header className="topo">
        <div className="marca"><span className="k">K</span><span className="txt">Staff</span></div>
        <nav className="abas">
          {ABAS.map(([k, l]) => (
            <button key={k} className={aba === k ? 'on' : ''} onClick={() => setAba(k)}>
              {l}{k === 'hoje' && pend > 0 ? <span className="bolinha">{pend}</span> : null}
            </button>
          ))}
        </nav>
        <button className="sair" onClick={() => sb.auth.signOut()} title="Sair">Sair</button>
      </header>
      <main className="conteudo">
        {aba === 'hoje' && <Hoje painel={painel} pedidos={pedidos} posts={posts} irPara={setAba} />}
        {aba === 'pedidos' && <Pedidos pedidos={pedidos} recarregar={carregar} />}
        {aba === 'posts' && <Posts posts={posts} recarregar={carregar} />}
        {aba === 'falar' && <Falar />}
      </main>
    </div>
  )
}
