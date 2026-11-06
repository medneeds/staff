import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useConversation } from '@elevenlabs/react'
import { AGENT_ID } from './config.js'
import { sb } from './supabase.js'

/* Núcleo de voz do Staff: um "reator" que reage ao som.
   Ouvindo → anéis dourados seguem a sua voz. Falando → o núcleo pulsa com a voz do Staff. */
function Reator({ convRef, estado, tamanho = 320 }) {
  const ref = useRef(null)
  const nivel = useRef(0)
  useEffect(() => {
    const cv = ref.current
    const ctx = cv.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    cv.width = tamanho * dpr; cv.height = tamanho * dpr
    ctx.scale(dpr, dpr)
    const c = tamanho / 2
    const N = 96
    let raf, t0 = performance.now()
    const vazio = new Uint8Array(128)

    function quadro(agora) {
      const t = (agora - t0) / 1000
      const conv = convRef.current
      const ligado = estado === 'ouvindo' || estado === 'falando'
      let dados = vazio
      try {
        if (conv && ligado) dados = estado === 'falando' ? conv.getOutputByteFrequencyData() : conv.getInputByteFrequencyData()
      } catch { dados = vazio }
      let soma = 0
      const n = Math.min(dados.length || 0, 64)
      for (let i = 0; i < n; i++) soma += dados[i]
      const alvo = n ? soma / n / 255 : 0
      const respira = estado === 'conectando' ? 0.18 + 0.12 * Math.sin(t * 4) : 0.06 + 0.04 * Math.sin(t * 1.4)
      nivel.current += ((ligado ? Math.max(alvo * 1.6, 0.04) : respira) - nivel.current) * 0.18
      const L = Math.min(nivel.current, 1)

      const ouro = estado === 'falando' ? [255, 214, 120] : [217, 165, 43]
      const rgba = (a) => `rgba(${ouro[0]},${ouro[1]},${ouro[2]},${a})`
      ctx.clearRect(0, 0, tamanho, tamanho)

      // halo
      const R0 = tamanho * 0.16
      const halo = ctx.createRadialGradient(c, c, R0 * 0.2, c, c, tamanho * 0.5)
      halo.addColorStop(0, rgba(0.28 + L * 0.35))
      halo.addColorStop(0.35, rgba(0.08 + L * 0.12))
      halo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = halo
      ctx.fillRect(0, 0, tamanho, tamanho)

      // barras radiais (espectro)
      const Rb = tamanho * 0.27
      for (let i = 0; i < N; i++) {
        const ang = (i / N) * Math.PI * 2 - Math.PI / 2 + t * 0.15
        const idx = Math.floor((i < N / 2 ? i : N - i) / (N / 2) * Math.max(n - 1, 1))
        const v = ligado && n ? dados[idx] / 255 : 0.15 + 0.1 * Math.sin(t * 2 + i * 0.4)
        const len = 4 + v * tamanho * (ligado ? 0.13 : 0.03)
        const x1 = c + Math.cos(ang) * Rb, y1 = c + Math.sin(ang) * Rb
        const x2 = c + Math.cos(ang) * (Rb + len), y2 = c + Math.sin(ang) * (Rb + len)
        ctx.strokeStyle = rgba(0.35 + v * 0.65)
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
      }

      // anéis em rotação
      const aneis = [
        { r: 0.215, w: 1.5, seg: 3, vel: 0.6, a: 0.9 },
        { r: 0.235, w: 1, seg: 24, vel: -0.25, a: 0.45 },
        { r: 0.44, w: 1, seg: 6, vel: 0.12, a: 0.35 },
        { r: 0.465, w: 2, seg: 2, vel: -0.35, a: 0.5 },
      ]
      for (const a of aneis) {
        const r = tamanho * a.r * (1 + L * 0.04)
        const giro = t * a.vel * (1 + L * 3)
        const passo = (Math.PI * 2) / a.seg
        ctx.strokeStyle = rgba(a.a)
        ctx.lineWidth = a.w
        for (let s = 0; s < a.seg; s++) {
          const ini = giro + s * passo
          ctx.beginPath(); ctx.arc(c, c, r, ini, ini + passo * (a.seg > 6 ? 0.5 : 0.62)); ctx.stroke()
        }
      }

      // núcleo
      const Rn = R0 * (1 + L * 0.35)
      const nucleo = ctx.createRadialGradient(c - Rn * 0.25, c - Rn * 0.3, Rn * 0.1, c, c, Rn)
      nucleo.addColorStop(0, 'rgba(255,248,225,0.98)')
      nucleo.addColorStop(0.45, rgba(0.95))
      nucleo.addColorStop(1, rgba(0.15))
      ctx.fillStyle = nucleo
      ctx.beginPath(); ctx.arc(c, c, Rn, 0, Math.PI * 2); ctx.fill()

      // filamentos abstratos girando dentro do núcleo (sem letra)
      ctx.save()
      ctx.beginPath(); ctx.arc(c, c, Rn * 0.96, 0, Math.PI * 2); ctx.clip()
      ctx.globalCompositeOperation = 'lighter'
      for (let k = 0; k < 4; k++) {
        const ang = t * (0.5 + k * 0.23) * (k % 2 ? -1 : 1) * (1 + L * 2)
        const rx = Rn * (0.78 - k * 0.1) * (1 + L * 0.15 * Math.sin(t * 3 + k))
        const ry = Rn * (0.22 + 0.06 * k)
        ctx.strokeStyle = `rgba(255,246,220,${0.22 + L * 0.3})`
        ctx.lineWidth = 1.2 + L * 1.5
        ctx.beginPath(); ctx.ellipse(c, c, rx, ry, ang, 0, Math.PI * 2); ctx.stroke()
      }
      const brilho = ctx.createRadialGradient(c, c, 0, c, c, Rn * (0.35 + L * 0.2))
      brilho.addColorStop(0, 'rgba(255,255,245,0.95)')
      brilho.addColorStop(1, 'rgba(255,240,200,0)')
      ctx.fillStyle = brilho
      ctx.beginPath(); ctx.arc(c, c, Rn * 0.6, 0, Math.PI * 2); ctx.fill()
      ctx.restore()

      raf = requestAnimationFrame(quadro)
    }
    raf = requestAnimationFrame(quadro)
    return () => cancelAnimationFrame(raf)
  }, [estado, tamanho, convRef])
  return <canvas ref={ref} style={{ width: tamanho, height: tamanho }} aria-hidden="true" />
}

const ROTULO = {
  parado: 'Toque no núcleo para falar',
  conectando: 'Conectando…',
  ouvindo: 'Ouvindo…',
  falando: 'Staff falando…',
}

export default function Voz({ aoAnotar }) {
  const [falas, setFalas] = useState([])
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [tam, setTam] = useState(320)
  const fimRef = useRef(null)
  const convRef = useRef(null)

  const conv = useConversation({
    onMessage: (m) => {
      const quem = (m.role || m.source) === 'user' ? 'voce' : 'staff'
      setFalas((f) => [...f.slice(-40), { quem, texto: m.message, id: `${m.event_id}-${quem}-${f.length}` }])
    },
    onError: () => setErro('A conexão com o Staff caiu. Toque no núcleo para tentar de novo.'),
  })
  convRef.current = conv

  const status = conv.status
  const estado = status === 'connected' ? (conv.isSpeaking ? 'falando' : 'ouvindo') : status === 'connecting' ? 'conectando' : 'parado'

  useEffect(() => {
    const ajustar = () => setTam(Math.min(360, Math.max(240, window.innerWidth - 64)))
    ajustar(); window.addEventListener('resize', ajustar)
    return () => window.removeEventListener('resize', ajustar)
  }, [])
  useEffect(() => { fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [falas])
  useEffect(() => () => { try { convRef.current?.endSession() } catch {} }, [])

  const alternar = useCallback(async () => {
    setErro('')
    if (status === 'connected' || status === 'connecting') { conv.endSession(); return }
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      // Link assinado e temporário, emitido só para o Artur com 2º fator.
      const { data, error } = await sb.functions.invoke('kairos-voz', { method: 'POST' })
      if (data?.signedUrl) conv.startSession({ signedUrl: data.signedUrl, connectionType: 'websocket' })
      else if (data?.erro === 'voz_nao_configurada' || error?.context?.status === 503) conv.startSession({ agentId: AGENT_ID, connectionType: 'websocket' })
      else { setErro('Acesso à voz negado. Entre de novo na Central.'); return }
    } catch {
      setErro('Preciso do microfone. Libere o acesso no navegador e toque de novo.')
    }
  }, [status, conv])

  async function enviar(e) {
    e.preventDefault()
    const t = texto.trim()
    if (!t) return
    if (status === 'connected') {
      conv.sendUserMessage(t)
      setFalas((f) => [...f, { quem: 'voce', texto: t, id: `t-${Date.now()}` }])
      setTexto('')
    } else {
      const { error } = await sb.from('staff_requests').insert({ pedido: t.slice(0, 600), area: 'geral', urgencia: 'hoje' })
      if (error) setErro('Não consegui anotar. Tente de novo.')
      else { setFalas((f) => [...f, { quem: 'voce', texto: t, id: `p-${Date.now()}` }, { quem: 'sistema', texto: 'Anotado como pedido. Entra na próxima rodada da fila.', id: `s-${Date.now()}` }]); setTexto(''); aoAnotar?.() }
    }
  }

  return (
    <section className="voz-tela">
      <div className="voz-grade" aria-hidden="true" />
      <div className="voz-topo">
        <span className={`voz-led ${estado}`} />
        <span className="voz-status">{ROTULO[estado]}</span>
      </div>
      <button className={`reator ${estado}`} onClick={alternar} aria-label={estado === 'parado' ? 'Começar a falar com o Staff' : 'Encerrar a conversa'}>
        <Reator convRef={convRef} estado={estado} tamanho={tam} />
      </button>
      <div className="voz-acoes">
        {status === 'connected' ? (
          <>
            <button className="voz-btn" onClick={() => conv.setMuted(!conv.isMuted)}>{conv.isMuted ? 'Ativar microfone' : 'Silenciar'}</button>
            <button className="voz-btn voz-btn-fim" onClick={() => conv.endSession()}>Encerrar</button>
          </>
        ) : (
          <span className="voz-dica">"Me passa o plantão" · "Como estão as campanhas?" · "Anota: …"</span>
        )}
      </div>
      {erro && <p className="voz-erro">{erro}</p>}
      <div className="voz-transcricao">
        {falas.length === 0 && <p className="voz-vazio">A conversa aparece aqui.</p>}
        {falas.map((f) => (
          <p key={f.id} className={`fala fala-${f.quem}`}><span>{f.quem === 'voce' ? 'Você' : f.quem === 'staff' ? 'Staff' : '·'}</span>{f.texto}</p>
        ))}
        <div ref={fimRef} />
      </div>
      <form className="voz-texto" onSubmit={enviar}>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={status === 'connected' ? 'Digite para o Staff…' : 'Digite um pedido (vai para a fila)…'} />
        <button className="voz-enviar" disabled={!texto.trim()} aria-label="Enviar">➤</button>
      </form>
    </section>
  )
}

export function ReatorMini({ onClick }) {
  const convRef = useRef(null)
  return (
    <button className="reator-mini" onClick={onClick} aria-label="Falar com o Staff">
      <Reator convRef={convRef} estado="parado" tamanho={148} />
    </button>
  )
}
