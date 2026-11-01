# Staff (Kairós)

O "chefe de plantão" de Artur Batista: um assistente de voz que coordena os times de IA da MedStation e da MedNeeds (tráfego, conteúdo, vendas, recuperação, CRM, finanças e engenharia). O cérebro é o Claude; a voz e a conversa ficam no ElevenLabs.

> Nome do projeto: **Kairós**. Apelido de uso: **Staff**.

## Onde está hoje (v0.4, 01/11/2026)

| Peça | Onde | Estado |
|---|---|---|
| Agente de voz "Staff · MedStation" | ElevenLabs, `agent_9901m6c3d59mf2cvr62jrddp8dmn` | no ar |
| Cérebro (LLM) | `claude-sonnet-5-5`, fuso America/Fortaleza | no ar |
| Painel do Staff (números do dia) | base de conhecimento, modo `prompt`, reescrito às 9h52, 15h52 e 21h52 | no ar |
| Memória do Staff (decisões e combinados) | base de conhecimento, modo `prompt`, atualizada quando uma decisão muda | no ar |
| Anotar pedido por voz | ferramenta `anotar_pedido` → Supabase `staff_requests` (só insere) | no ar |
| Consultar andamento por voz | ferramenta `consultar_pedidos` → função `staff_status` | no ar |
| Fila de hora em hora | tarefa agendada às :22, das 8h às 23h: prepara, cria tarefa no ClickUp e manda para aprovação | no ar |
| Tarefas no ClickUp | espaço TI, lista "Staff · Pedidos" | no ar |
| Rede de segurança | a fila relê as conversas e anota o que o Staff deixou passar | no ar |
| Relatório diário de tráfego | tarefa agendada às 7h41 | no ar |
| Voz brasileira (Kpelo) | ElevenLabs | aguarda o Artur adicionar a voz em "My Voices" |

Testar: https://elevenlabs.io/app/talk-to?agent_id=agent_9901m6c3d59mf2cvr62jrddp8dmn

## Como funciona

```
Artur (voz) ──► ElevenLabs Agent "Staff" ──► Claude (LLM)
                       │ anotar_pedido ─────► Supabase staff_requests (só insere)
                       │ consultar_pedidos ─► staff_status() (resumo)
                       ▲
                       │ lê (modo prompt)
        Painel do Staff + Memória do Staff
                       ▲
                       │ 9h52 · 15h52 · 21h52
   Tarefa "painel e memória" ──► Stripe · Adspirer/Meta · fila · conversas

   Tarefa "fila" (de hora em hora) ──► staff_requests ──► ClickUp "Staff · Pedidos"
                                                      └─► Artur aprova no celular ──► execução
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
