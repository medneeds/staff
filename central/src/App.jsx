import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ConversationProvider } from '@elevenlabs/react'
import { sb } from './supabase.js'
import Voz, { ReatorMini } from './Voz.jsx'
import { SegundoFator, verificarNivel, useBloqueioPorInatividade } from './Seguranca.jsx'

const TZ = 'America/Fortaleza'
const fmt = (iso, opts) => (iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: TZ, ...opts }) : '')
const quando = (iso) => fmt(iso, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const diaLongo = (iso) => fmt(iso, { weekday: 'long', day: '2-digit', month: 'long' })
const horaLocal = () => Number(new Date().toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }))
const saudacao = () => { const h = horaLocal(); return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite' }

export const AREAS = [
  ['estrategia', 'Estratégia'], ['vendas', 'Vendas'], ['trafego', 'Tráfego pago'], ['conteudo', 'Conteúdo'],
  ['copy', 'Copy'], ['projetos', 'Projetos'], ['auditoria', 'Auditoria'], ['recuperacao', 'Recuperação'],
  ['crm', 'CRM'], ['financas', 'Finanças'], ['engenharia', 'Engenharia'], ['geral', 'Geral'],
]
const nomeArea = (a) => AREAS.find((x) => x[0] === a)?.[1] || a
const URG = [['normal', 'Sem pressa'], ['hoje', 'Hoje'], ['agora', 'Agora']]
const ST_PEDIDO = {
  novo: ['Na fila', 'neutro'], enviado: ['Esperando seu sim', 'alerta'], aprovado: ['Aprovado · em execução', 'ok'],
  recusado: ['Recusado', 'mudo'], feito: ['Feito', 'ok'],
}
const ST_POST = {
  rascunho: ['Rascunho', 'neutro'], aguardando_aprovacao: ['Esperando seu sim', 'alerta'], aprovado: ['Agendado', 'ok'],
  publicando: ['Publicando…', 'ok'], publicado: ['Publicado', 'ok'], erro: ['Erro', 'erro'], cancelado: ['Cancelado', 'mudo'],
}
const FASE = { ativo: ['Ativo', 'ok'], em_construcao: ['Em construção', 'alerta'], pausado: ['Pausado', 'mudo'], concluido: ['Concluído', 'neutro'] }

const ATALHOS = [
  ['estrategia', 'Plano da semana', 'Monta o plano da semana com prioridades por projeto e o que depende de mim.'],
  ['trafego', 'Raio-x das campanhas', 'Faz o raio-x das campanhas ativas (gasto, custo por resultado, melhor e pior anúncio) e propõe até 3 ajustes.'],
  ['copy', 'Copy de anúncio', 'Escreve 3 variações de copy de anúncio para '],
  ['auditoria', 'Auditar uma página', 'Audita a página '],
  ['vendas', 'Ideias para vender mais', 'Me traz 5 ideias concretas para aumentar as vendas de '],
  ['projetos', 'Checklist de lançamento', 'Monta o checklist de lançamento de '],
  ['conteudo', 'Ideias de post', 'Sugere 5 posts para o @arturbatista nesta semana, alternando formatos e chamadas (salvar, print, compartilhar).'],
]

function Chip({ tipo, children }) { return <span className={`chip chip-${tipo}`}>{children}</span> }

const Icone = {
  hoje: <svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>,
  pedidos: <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5z M8 9h8 M8 13h8 M8 17h5" fill="none" strokeWidth="1.8" stroke="currentColor"/></svg>,
  falar: <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="4 3"/></svg>,
  projetos: <svg viewBox="0 0 24 24"><path d="M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z"/></svg>,
  posts: <svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z M4 15l4-4 4 4 3-3 5 5" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>,
}

/* ---------------- Login ---------------- */
function Login() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  async function pedir(e) {
    e.preventDefault(); setErro(''); setOcupado(true)
    const { error } = await sb.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: window.location.origin, shouldCreateUser: false } })
    setOcupado(false)
    if (error) setErro('Não consegui enviar o acesso agora. Tente de novo em alguns minutos.')
    else setEnviado(true)
  }
  async function confirmar(e) {
    e.preventDefault(); setErro(''); setOcupado(true)
    const { error } = await sb.auth.verifyOtp({ email: email.trim().toLowerCase(), token: codigo.trim(), type: 'email' })
    setOcupado(false)
    if (error) setErro('Código inválido ou vencido. Peça um novo.')
  }
  return (
    <div className="login">
      <div className="login-fundo" aria-hidden="true"><ReatorMini onClick={() => {}} /></div>
      <div className="login-card">
        <div className="marca"><span className="k">K</span> Staff · Central</div>
        <h1>Seu braço direito</h1>
        <p className="sub">Estratégia, vendas, tráfego, conteúdo e projetos num lugar só. Você decide, o Staff executa.</p>
        {!enviado ? (
          <form onSubmit={pedir}>
            <label>E-mail</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu e-mail" autoComplete="email" />
            <button className="btn btn-primario" disabled={ocupado}>{ocupado ? 'Enviando…' : 'Receber link de acesso'}</button>
          </form>
        ) : (
          <form onSubmit={confirmar}>
            <p className="aviso">Mandei um link para <b>{email}</b>. Abra o e-mail neste aparelho e toque no link. Se o e-mail trouxer um código, cole aqui.</p>
            <input inputMode="numeric" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="código (se houver)" />
            <button className="btn btn-primario" disabled={ocupado || !codigo}>Entrar com o código</button>
            <button type="button" className="btn btn-link" onClick={() => setEnviado(false)}>Usar outro e-mail</button>
          </form>
        )}
        {erro && <p className="erro">{erro}</p>}
      </div>
    </div>
  )
}

/* ---------------- Painel do dia ---------------- */
function Painel({ texto }) {
  const blocos = useMemo(() => {
    if (!texto) return []
    const out = []; let atual = { titulo: null, itens: [] }
    for (const l of texto.split('\n')) {
      const t = l.trim(); if (!t) continue
      if (/^PAINEL DO STAFF/.test(t)) continue
      const base = t.replace(/\s*\(.*\)\s*$/, '')
      const ehTitulo = !t.startsWith('-') && !/^\d+\./.test(t) && base === base.toUpperCase() && /[A-ZÁÉÍÓÚÇ]/.test(base) && base.length < 80
      if (ehTitulo) { if (atual.titulo || atual.itens.length) out.push(atual); atual = { titulo: base, itens: [] } }
      else atual.itens.push(t.replace(/^-\s*/, ''))
    }
    out.push(atual); return out
  }, [texto])
  const [aberto, setAberto] = useState(null)
  return (
    <div className="painel">
      {blocos.map((b, i) => (
        <section key={i} className={`bloco ${aberto === i ? 'aberto' : ''}`} onClick={() => setAberto(aberto === i ? null : i)}>
          {b.titulo && <h3>{b.titulo}<span className="seta">{aberto === i ? '−' : '+'}</span></h3>}
          <ul>{(aberto === i ? b.itens : b.itens.slice(0, 3)).map((it, j) => <li key={j}>{it}</li>)}</ul>
          {aberto !== i && b.itens.length > 3 && <p className="mais">+{b.itens.length - 3} itens</p>}
        </section>
      ))}
    </div>
  )
}

/* ---------------- Checklist ---------------- */
function ItemCheck({ c, recarregar, mostrarProjeto, projetos }) {
  async function alternar() {
    await sb.from('staff_checklist').update({ feito: !c.feito, feito_em: !c.feito ? new Date().toISOString() : null }).eq('id', c.id)
    recarregar()
  }
  const p = projetos?.find((x) => x.slug === c.projeto)
  return (
    <li className={`check ${c.feito ? 'feito' : ''}`}>
      <button className="caixa" onClick={alternar} aria-label={c.feito ? 'Desmarcar' : 'Marcar como feito'}>{c.feito ? '✓' : ''}</button>
      <span className="check-texto">
        {c.item}
        <span className="check-meta">
          {mostrarProjeto && p && <span className="tag" style={{ borderColor: p.cor, color: p.cor }}>{p.nome}</span>}
          {c.dono === 'staff' && <span className="tag">Staff</span>}
          {c.prazo && <span className="tag">até {fmt(c.prazo + 'T12:00:00Z', { day: '2-digit', month: '2-digit' })}</span>}
        </span>
      </span>
    </li>
  )
}

/* ---------------- Hoje ---------------- */
function Hoje({ painel, pedidos, posts, checklist, projetos, irPara, atalho, recarregar }) {
  const aguardandoPedidos = pedidos.filter((p) => p.status === 'enviado')
  const aguardandoPosts = posts.filter((p) => p.status === 'aguardando_aprovacao')
  const emExecucao = pedidos.filter((p) => p.status === 'aprovado' || p.status === 'novo').length
  const minhas = checklist.filter((c) => c.dono === 'artur' && !c.feito).sort((a, b) => (a.prazo || '9') < (b.prazo || '9') ? -1 : 1)
  const velho = painel && Date.now() - new Date(painel.criado_em).getTime() > 6 * 3600e3
  return (
    <>
      <section className="hero">
        <div className="hero-texto">
          <p className="hero-data">{fmt(new Date().toISOString(), { weekday: 'long', day: '2-digit', month: 'long' })}</p>
          <h1>{saudacao()}, Artur.</h1>
          <p className="hero-resumo">
            {aguardandoPedidos.length + aguardandoPosts.length > 0
              ? <>Você tem <b>{aguardandoPedidos.length + aguardandoPosts.length}</b> decisão(ões) esperando o seu sim.</>
              : <>Nenhuma decisão pendente. {emExecucao > 0 ? `${emExecucao} pedido(s) em andamento.` : 'O time está em dia.'}</>}
          </p>
          <button className="btn btn-ouro" onClick={() => irPara('falar')}>Falar com o Staff</button>
        </div>
        <ReatorMini onClick={() => irPara('falar')} />
      </section>

      <div className="cards">
        <button className={`card ${aguardandoPedidos.length ? 'card-alerta' : ''}`} onClick={() => irPara('pedidos')}><span className="num">{aguardandoPedidos.length}</span><span>pedido(s) para aprovar</span></button>
        <button className={`card ${aguardandoPosts.length ? 'card-alerta' : ''}`} onClick={() => irPara('posts')}><span className="num">{aguardandoPosts.length}</span><span>post(s) para aprovar</span></button>
        <button className="card" onClick={() => irPara('projetos')}><span className="num">{minhas.length}</span><span>tarefa(s) suas</span></button>
      </div>

      <div className="secao-topo"><h2>Peça ao Staff</h2></div>
      <div className="atalhos">
        {ATALHOS.map(([area, rot, txt]) => (
          <button key={rot} className="atalho" onClick={() => atalho(area, txt)}><span>{nomeArea(area)}</span>{rot}</button>
        ))}
      </div>

      {minhas.length > 0 && <>
        <div className="secao-topo"><h2>O que depende de você</h2><button className="btn-link btn" onClick={() => irPara('projetos')}>ver projetos</button></div>
        <ul className="checks caixa-branca">{minhas.slice(0, 6).map((c) => <ItemCheck key={c.id} c={c} recarregar={recarregar} mostrarProjeto projetos={projetos} />)}</ul>
      </>}

      <div className="secao-topo">
        <h2>Painel do dia</h2>
        {painel && <span className={`hora ${velho ? 'velho' : ''}`}>atualizado {quando(painel.criado_em)}{velho ? ' · pode estar desatualizado' : ''}</span>}
      </div>
      {painel ? <Painel texto={painel.texto} /> : <p className="vazio">O painel chega na próxima rodada (9h52, 15h52 ou 21h52).</p>}
    </>
  )
}

/* ---------------- Pedidos ---------------- */
function NovoPedido({ aoCriar, rascunho, projetos }) {
  const [texto, setTexto] = useState('')
  const [area, setArea] = useState('estrategia')
  const [urg, setUrg] = useState('normal')
  const [projeto, setProjeto] = useState('')
  const [ok, setOk] = useState(''); const [erro, setErro] = useState('')
  useEffect(() => { if (rascunho) { setTexto(rascunho.texto); setArea(rascunho.area); if (rascunho.projeto) setProjeto(rascunho.projeto) } }, [rascunho])
  async function enviar(e) {
    e.preventDefault(); setOk(''); setErro('')
    const pedido = texto.trim(); if (pedido.length < 3) return
    const { error } = await sb.from('staff_requests').insert({ pedido: pedido.slice(0, 600), area, urgencia: urg, projeto: projeto || null })
    if (error) setErro('Não consegui anotar. Tente de novo.')
    else { setTexto(''); setOk('Anotado. O Staff prepara a proposta na próxima rodada (minuto 22 de cada hora, das 8h às 23h) e ela aparece aqui para o seu sim.'); aoCriar() }
  }
  return (
    <form className="novo" onSubmit={enviar}>
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={600} rows={3}
        placeholder="O que você quer? Ex.: audita o funil do Arsenal e me diz onde estamos perdendo venda." />
      <div className="linha">
        <select value={area} onChange={(e) => setArea(e.target.value)}>{AREAS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select value={projeto} onChange={(e) => setProjeto(e.target.value)}><option value="">Projeto (opcional)</option>{projetos.map((p) => <option key={p.slug} value={p.slug}>{p.nome}</option>)}</select>
        <select value={urg} onChange={(e) => setUrg(e.target.value)}>{URG.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <button className="btn btn-primario" disabled={texto.trim().length < 3}>Anotar</button>
      </div>
      {ok && <p className="ok">{ok}</p>}{erro && <p className="erro">{erro}</p>}
    </form>
  )
}

function Pedidos({ pedidos, projetos, recarregar, rascunho }) {
  const [filtro, setFiltro] = useState('abertos')
  const lista = pedidos.filter((p) => (filtro === 'abertos' ? ['novo', 'enviado', 'aprovado'].includes(p.status) : true))
  async function decidir(p, status) {
    const { error } = await sb.from('staff_requests').update({ status, atualizado_em: new Date().toISOString() }).eq('id', p.id)
    if (error) alert('Não consegui registrar. Tente de novo.')
    recarregar()
  }
  return (
    <>
      <div className="secao-topo"><h2>Novo pedido</h2></div>
      <NovoPedido aoCriar={recarregar} rascunho={rascunho} projetos={projetos} />
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
        const proj = projetos.find((x) => x.slug === p.projeto)
        return (
          <article key={p.id} className={`item ${p.status === 'enviado' ? 'item-alerta' : ''}`}>
            <div className="item-topo">
              <span className="id">#{p.id}</span><Chip tipo={tipo}>{rot}</Chip>
              <span className="meta">{nomeArea(p.area)}{proj ? ` · ${proj.nome}` : ''} · {quando(p.created_at)}</span>
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

/* ---------------- Projetos ---------------- */
function Projeto({ p, itens, recarregar, pedir }) {
  const [novo, setNovo] = useState('')
  const [verFeitos, setVerFeitos] = useState(false)
  const abertos = itens.filter((c) => !c.feito), feitos = itens.filter((c) => c.feito)
  const [rot, tipo] = FASE[p.fase] || [p.fase, 'neutro']
  const pct = itens.length ? Math.round((feitos.length / itens.length) * 100) : 0
  async function adicionar(e) {
    e.preventDefault(); const t = novo.trim(); if (t.length < 2) return
    await sb.from('staff_checklist').insert({ projeto: p.slug, item: t.slice(0, 300), dono: 'artur' })
    setNovo(''); recarregar()
  }
  return (
    <article className="projeto" style={{ '--cor': p.cor || '#1f2a1c' }}>
      <div className="projeto-topo">
        <h3>{p.nome}</h3><Chip tipo={tipo}>{rot}</Chip>
        {p.prioridade <= 1 && <span className="tag tag-ouro">prioridade</span>}
      </div>
      {p.descricao && <p className="projeto-desc">{p.descricao}</p>}
      <dl className="projeto-dl">
        {p.objetivo && <><dt>Objetivo</dt><dd>{p.objetivo}</dd></>}
        {p.proximo_passo && <><dt>Próximo passo</dt><dd>{p.proximo_passo}</dd></>}
        {p.metrica && <><dt>Métrica</dt><dd>{p.metrica}</dd></>}
      </dl>
      <div className="barra"><span style={{ width: `${pct}%` }} /></div>
      <p className="meta">{feitos.length} de {itens.length} itens feitos</p>
      <ul className="checks">{abertos.map((c) => <ItemCheck key={c.id} c={c} recarregar={recarregar} />)}</ul>
      {feitos.length > 0 && <button className="btn btn-link" onClick={() => setVerFeitos(!verFeitos)}>{verFeitos ? 'Esconder feitos' : `Ver ${feitos.length} feito(s)`}</button>}
      {verFeitos && <ul className="checks">{feitos.map((c) => <ItemCheck key={c.id} c={c} recarregar={recarregar} />)}</ul>}
      <form className="add-item" onSubmit={adicionar}>
        <input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Novo item do checklist" maxLength={300} />
        <button className="btn" disabled={novo.trim().length < 2}>Adicionar</button>
      </form>
      <div className="acoes">
        <button className="btn btn-ok" onClick={() => pedir('auditoria', `Audita o projeto ${p.nome}: o que está travando o objetivo e quais os 3 próximos passos.`, p.slug)}>Auditar com o Staff</button>
        <button className="btn" onClick={() => pedir('estrategia', `Plano de alavancagem para ${p.nome} nas próximas 2 semanas.`, p.slug)}>Plano de alavancagem</button>
        {p.link && <a className="btn btn-link" href={p.link} target="_blank" rel="noreferrer">Abrir</a>}
      </div>
    </article>
  )
}

function Projetos({ projetos, checklist, recarregar, pedir }) {
  return (
    <>
      <div className="secao-topo"><h2>Projetos</h2><span className="hora">objetivo, próximo passo e checklist de cada frente</span></div>
      {projetos.length === 0 && <p className="vazio">Nenhum projeto cadastrado.</p>}
      <div className="projetos">
        {projetos.map((p) => <Projeto key={p.slug} p={p} itens={checklist.filter((c) => c.projeto === p.slug)} recarregar={recarregar} pedir={pedir} />)}
      </div>
    </>
  )
}

/* ---------------- Posts ---------------- */
function Posts({ posts, recarregar, pedir }) {
  const [aberto, setAberto] = useState(null)
  const grupos = useMemo(() => {
    const g = {}
    for (const p of posts) { const k = fmt(p.agendado_para, { year: 'numeric', month: '2-digit', day: '2-digit' }); (g[k] ||= { dia: p.agendado_para, itens: [] }).itens.push(p) }
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
      <div className="secao-topo"><h2>Conteúdo</h2><span className="hora">publica sozinho na hora marcada, depois do seu sim</span></div>
      <div className="atalhos atalhos-linha">
        <button className="atalho" onClick={() => pedir('conteudo', 'Carrossel estilo print do X sobre ', 'instagram')}><span>Carrossel</span>Novo carrossel</button>
        <button className="atalho" onClick={() => pedir('conteudo', 'Roteiro de Reels de até 45 s sobre ', 'instagram')}><span>Reels</span>Roteiro de vídeo</button>
        <button className="atalho" onClick={() => pedir('conteudo', 'Calendário das próximas 2 semanas para o @arturbatista, alternando carrossel, Reels e divulgação leve.', 'instagram')}><span>Calendário</span>Próximas 2 semanas</button>
      </div>
      {posts.length === 0 && <p className="vazio">Nenhum post no calendário.</p>}
      {grupos.map((g) => (
        <section key={g.dia} className="dia">
          <h3 className="dia-titulo">{diaLongo(g.dia)}</h3>
          {g.itens.map((p) => {
            const [rot, tipo] = ST_POST[p.status] || [p.status, 'neutro']
            const conta = p.conta.replace('instagram:', 'Instagram @').replace('facebook:', 'Facebook · ')
            return (
              <article key={p.id} className={`item ${p.status === 'aguardando_aprovacao' ? 'item-alerta' : ''}`}>
                <div className="item-topo"><Chip tipo={tipo}>{rot}</Chip><span className="meta">{fmt(p.agendado_para, { hour: '2-digit', minute: '2-digit' })} · {p.formato} · {conta}</span></div>
                <p className="pedido"><b>{p.titulo}</b>{p.pilar ? <span className="pilar"> · {p.pilar}</span> : null}</p>
                {p.midias?.length > 0 && <div className="tira">{p.midias.map((u, i) => <img key={i} src={u} alt={`slide ${i + 1}`} loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />)}</div>}
                {p.legenda && <p className={`legenda ${aberto === p.id ? 'aberta' : ''}`} onClick={() => setAberto(aberto === p.id ? null : p.id)}>{p.legenda}</p>}
                {p.erro && <p className="erro">{p.erro}</p>}
                <div className="acoes">
                  {p.status === 'aguardando_aprovacao' && <><button className="btn btn-ok" onClick={() => decidir(p, 'aprovado')}>Sim, pode publicar</button><button className="btn" onClick={() => decidir(p, 'cancelado')}>Cancelar</button></>}
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

/* ---------------- App ---------------- */
const ABAS = [['hoje', 'Hoje'], ['pedidos', 'Pedidos'], ['falar', 'Falar'], ['projetos', 'Projetos'], ['posts', 'Conteúdo']]

export default function App() {
  const [sessao, setSessao] = useState(undefined)
  const [nivel, setNivel] = useState('checando')
  const [aba, setAba] = useState(() => { const h = location.hash.slice(1); return ABAS.some((a) => a[0] === h) ? h : 'hoje' })
  const [painel, setPainel] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [posts, setPosts] = useState([])
  const [projetos, setProjetos] = useState([])
  const [checklist, setChecklist] = useState([])
  const [rascunho, setRascunho] = useState(null)

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const conferir = useCallback(async () => {
    setNivel('checando')
    try { setNivel(await verificarNivel()) } catch { setNivel('desafio') }
  }, [])
  useEffect(() => { if (sessao) conferir(); else setNivel('checando') }, [sessao?.user?.id, conferir])
  useBloqueioPorInatividade(!!sessao, 30)

  const carregar = useCallback(async () => {
    const [a, b, c, d, e, f] = await Promise.all([
      sb.rpc('staff_e_admin'),
      sb.from('staff_painel').select('criado_em,texto').order('criado_em', { ascending: false }).limit(1),
      sb.from('staff_requests').select('id,created_at,pedido,area,projeto,urgencia,status,nota,clickup_url,atualizado_em').order('created_at', { ascending: false }).limit(80),
      sb.from('social_posts').select('*').order('agendado_para', { ascending: false }).limit(90),
      sb.from('staff_projetos').select('*').order('ordem'),
      sb.from('staff_checklist').select('*').order('ordem').order('id'),
    ])
    if (!a.data) { setNivel('desafio'); return }
    setPainel(b.data?.[0] || null)
    setPedidos(c.data || []); setPosts(d.data || []); setProjetos(e.data || []); setChecklist(f.data || [])
  }, [])

  useEffect(() => {
    if (!sessao || nivel !== 'ok') return
    carregar()
    const t = setInterval(carregar, 60000)
    const ch = sb.channel('central')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_requests' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, carregar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_checklist' }, carregar)
      .subscribe()
    return () => { clearInterval(t); sb.removeChannel(ch) }
  }, [sessao, nivel, carregar])

  useEffect(() => { history.replaceState(null, '', `#${aba}`); window.scrollTo(0, 0) }, [aba])

  const pedir = useCallback((area, texto, projeto) => { setRascunho({ area, texto, projeto, k: Date.now() }); setAba('pedidos') }, [])

  if (sessao === undefined) return <div className="carregando"><span className="k">K</span></div>
  if (!sessao) return <Login />
  if (nivel === 'checando') return <div className="carregando"><span className="k">K</span></div>
  if (nivel === 'nao_dono') return (
    <div className="login"><div className="login-card"><h1>Acesso restrito</h1><p className="sub">Este e-mail não tem acesso à Central do Staff.</p><button className="btn" onClick={() => sb.auth.signOut()}>Sair</button></div></div>
  )
  if (nivel === 'cadastrar' || nivel === 'desafio') return <SegundoFator modo={nivel} aoConcluir={conferir} />

  const pend = pedidos.filter((p) => p.status === 'enviado').length + posts.filter((p) => p.status === 'aguardando_aprovacao').length

  return (
    <ConversationProvider>
      <div className={`app aba-${aba}`}>
        <header className="topo">
          <div className="marca"><span className="k">K</span><span className="txt">Staff</span></div>
          <nav className="abas-topo">
            {ABAS.map(([k, l]) => <button key={k} className={aba === k ? 'on' : ''} onClick={() => setAba(k)}>{l}{k === 'hoje' && pend > 0 ? <span className="bolinha">{pend}</span> : null}</button>)}
          </nav>
          <button className="sair" onClick={() => sb.auth.signOut()}>Sair</button>
        </header>
        <main className="conteudo">
          {aba === 'hoje' && <Hoje painel={painel} pedidos={pedidos} posts={posts} checklist={checklist} projetos={projetos} irPara={setAba} atalho={(a, t) => pedir(a, t)} recarregar={carregar} />}
          {aba === 'pedidos' && <Pedidos pedidos={pedidos} projetos={projetos} recarregar={carregar} rascunho={rascunho} />}
          {aba === 'falar' && <Voz aoAnotar={carregar} />}
          {aba === 'projetos' && <Projetos projetos={projetos} checklist={checklist} recarregar={carregar} pedir={pedir} />}
          {aba === 'posts' && <Posts posts={posts} recarregar={carregar} pedir={pedir} />}
        </main>
        <nav className="abas-baixo">
          {ABAS.map(([k, l]) => (
            <button key={k} className={`${aba === k ? 'on' : ''} ${k === 'falar' ? 'meio' : ''}`} onClick={() => setAba(k)}>
              <span className="ic">{Icone[k]}</span><span>{l}</span>
              {k === 'hoje' && pend > 0 ? <span className="bolinha">{pend}</span> : null}
            </button>
          ))}
        </nav>
      </div>
    </ConversationProvider>
  )
}
