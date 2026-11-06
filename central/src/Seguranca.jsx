import React, { useEffect, useState } from 'react'
import { sb } from './supabase.js'

/* Blindagem da Central
   1) só o e-mail do Artur entra (lista no banco, cadastro novo desligado);
   2) segundo fator obrigatório: código de 6 dígitos de um app autenticador;
   3) o banco só entrega dados a esse e-mail COM o segundo fator (RLS exige aal2).
   Mais: sessão encerra sozinha após 30 min sem uso. */

export async function verificarNivel() {
  const dono = await sb.rpc('staff_e_dono')
  if (!dono.data) return 'nao_dono'
  const { data: fatores } = await sb.auth.mfa.listFactors()
  const totp = (fatores?.totp || []).filter((f) => f.status === 'verified')
  if (!totp.length) return 'cadastrar'
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel()
  return aal?.currentLevel === 'aal2' ? 'ok' : 'desafio'
}

export function SegundoFator({ modo, aoConcluir }) {
  const [qr, setQr] = useState(null)
  const [segredo, setSegredo] = useState('')
  const [fatorId, setFatorId] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      if (modo === 'cadastrar') {
        // limpa tentativas antigas não verificadas
        const { data: f } = await sb.auth.mfa.listFactors()
        for (const x of f?.all || []) if (x.status !== 'verified') await sb.auth.mfa.unenroll({ factorId: x.id })
        const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Central do Staff' })
        if (!vivo) return
        if (error) { setErro('Não consegui iniciar o segundo fator. Recarregue a página.'); return }
        setFatorId(data.id); setQr(data.totp.qr_code); setSegredo(data.totp.secret)
      } else {
        const { data } = await sb.auth.mfa.listFactors()
        const f = (data?.totp || []).find((x) => x.status === 'verified')
        if (vivo) setFatorId(f?.id || null)
      }
    })()
    return () => { vivo = false }
  }, [modo])

  async function confirmar(e) {
    e.preventDefault()
    if (!fatorId) return
    setErro(''); setOcupado(true)
    const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: fatorId, code: codigo.replace(/\D/g, '') })
    setOcupado(false)
    if (error) { setErro('Código inválido. Confira o relógio do celular e use o código atual.'); setCodigo(''); return }
    aoConcluir()
  }

  return (
    <div className="login">
      <div className="login-card">
        <div className="marca"><span className="k">K</span> Staff · Central</div>
        {modo === 'cadastrar' ? (
          <>
            <h1>Ative a proteção</h1>
            <p className="sub">Segunda camada de segurança: a Central só abre com um código de 6 dígitos que muda a cada 30 segundos, gerado no seu celular.</p>
            <ol className="passos">
              <li>Instale um app autenticador (Google Authenticator, Microsoft Authenticator, 1Password ou Authy).</li>
              <li>No app, toque em <b>+</b> e leia o QR code abaixo. No celular, use "inserir chave" com o código embaixo dele.</li>
              <li>Digite aqui o código de 6 dígitos que aparecer.</li>
            </ol>
            {qr ? <img className="qr" src={qr} alt="QR code para o app autenticador" /> : <div className="qr qr-vazio">Gerando…</div>}
            {segredo && <p className="segredo"><span>Chave para inserir no app</span><code>{segredo}</code></p>}
          </>
        ) : (
          <>
            <h1>Código de segurança</h1>
            <p className="sub">Abra o app autenticador e digite o código de 6 dígitos da Central do Staff.</p>
          </>
        )}
        <form onSubmit={confirmar}>
          <input className="codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={codigo}
            onChange={(e) => setCodigo(e.target.value)} placeholder="000000" autoFocus />
          <button className="btn btn-primario" disabled={ocupado || codigo.replace(/\D/g, '').length !== 6}>{ocupado ? 'Conferindo…' : 'Confirmar'}</button>
          <button type="button" className="btn btn-link" onClick={() => sb.auth.signOut()}>Sair</button>
        </form>
        {erro && <p className="erro">{erro}</p>}
      </div>
    </div>
  )
}

export function useBloqueioPorInatividade(ativo, minutos = 30) {
  useEffect(() => {
    if (!ativo) return
    let t
    const reiniciar = () => { clearTimeout(t); t = setTimeout(() => sb.auth.signOut(), minutos * 60 * 1000) }
    const ev = ['pointerdown', 'keydown', 'visibilitychange', 'scroll']
    ev.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }))
    reiniciar()
    return () => { clearTimeout(t); ev.forEach((e) => window.removeEventListener(e, reiniciar)) }
  }, [ativo, minutos])
}
