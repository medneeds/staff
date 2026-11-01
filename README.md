# Staff (Kairós)

O "chefe de plantão" de Artur Batista: um assistente de voz que coordena os times de IA da MedStation e da MedNeeds (tráfego, conteúdo, vendas, recuperação, CRM, finanças e engenharia). O cérebro é o Claude; a voz e a conversa ficam no ElevenLabs.

> Nome do projeto: **Kairós**. Apelido de uso: **Staff**.

## Onde está hoje (v0.3, 01/11/2026)

| Peça | Onde | Estado |
|---|---|---|
| Agente de voz "Staff · MedStation" | ElevenLabs, `agent_9901m6c3d59mf2cvr62jrddp8dmn` | no ar |
| Cérebro (LLM) | `claude-sonnet-5-5`, fuso America/Fortaleza | no ar |
| Painel do Staff (números do dia) | base de conhecimento do agente, modo `prompt` | no ar |
| Painel + fila | tarefa agendada às 9h52, 15h52 e 21h52 (Stripe + Meta + pedidos) | no ar |
| Relatório diário de tráfego | tarefa agendada às 7h41 | no ar (desde 01/11) |
| Voz brasileira (Kpelo) | ElevenLabs | aguarda o Artur adicionar a voz em "My Voices" |
| Fila de pedidos por voz | ferramenta `anotar_pedido` → Supabase `staff` / `staff_requests` | no ar |
| Aprovação no celular | a tarefa das 9h52/15h52/21h52 prepara e manda os pedidos; executa só com "sim" | no ar |

Testar: https://elevenlabs.io/app/talk-to?agent_id=agent_9901m6c3d59mf2cvr62jrddp8dmn

## Como funciona

```
Artur (voz) ──► ElevenLabs Agent "Staff" ──► Claude (LLM)
                       │ anotar_pedido ──► Supabase staff_requests (só insere)
                       ▲
                       │ lê (modo prompt)
              Painel do Staff (texto)
                       ▲
                       │ reescreve 3x ao dia
       Tarefa agendada (Claude) ──► Stripe (vendas, checkouts)
                                ├─► Adspirer / Meta Ads (campanhas)
                                └─► staff_requests ──► Artur aprova no celular ──► execução
```

Nenhuma chave secreta fica no agente, no repositório ou no chat: quem lê Stripe e Meta é a tarefa agendada, pelos conectores já autorizados na conta do Artur. O agente só carrega a chave publicável do Supabase `staff`, que pela RLS serve apenas para inserir pedidos novos.

## Estrutura

- `agent/prompt.md` — prompt do sistema do Staff (fonte da verdade; copiar para o ElevenLabs quando mudar).
- `agent/config.json` — ids e configurações do agente.
- `supabase/migrations/` — fila de pedidos (RLS: o agente só insere).
- `ops/painel.md` — formato do Painel do Staff e regras da rotina que o atualiza.
- `docs/arquitetura.md` — decisões e próximos passos técnicos.
- `docs/roadmap.md` — fases do projeto.

## Regras inegociáveis

1. Dinheiro, mensagem para cliente, publicação e mudança no site só com o "sim" do Artur.
2. Sem conduta clínica; o médico revisa e decide.
3. Sem dados de pacientes.
4. Sem números inventados: só o que veio das ferramentas.
5. Copy da Black: sem parcelamento, boleto, Pix, "60% off" ou "de R$ 999,90 por R$ 399,90".
6. Campanhas [ZION] são de outro gestor: só leitura.
