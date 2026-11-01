# Arquitetura e decisões

## Decisões

1. **Voz no ElevenLabs, cérebro no Claude.** O agente usa `claude-sonnet-5-5` como LLM dentro do ElevenLabs. Equilíbrio entre qualidade e latência de voz.
2. **Sem chaves no agente.** O agente não chama Stripe nem Meta. Quem lê é uma tarefa agendada do Claude com os conectores já autorizados, e ela escreve o resultado em texto no Painel. Se o agente for exposto, não há segredo a vazar.
3. **Painel em modo `prompt`, não RAG.** O painel é pequeno; entrar inteiro evita que o agente "não encontre" um número e invente outro.
4. **Ação só com aprovação.** Nas próximas fases o Staff só anota pedidos; a execução passa por confirmação explícita do Artur.
5. **Cota do Adspirer.** O plano tem cerca de 150 chamadas por mês e os dados de Meta são consolidados uma vez por dia. Por isso o Meta é lido uma vez por dia no painel (9h52) e uma vez no relatório (7h41).

## Ids

Ver `agent/config.json`.

## Próximo passo técnico (fase 2)

- Projeto Supabase `staff` (gratuito): tabela `staff_requests(id, created_at, text, area, urgency, status, decided_at)`.
- Edge function `staff-request` (POST) protegida por um segredo, cadastrado como secret no ElevenLabs e usado como header da ferramenta webhook do agente.
- Ferramenta do agente `anotar_pedido(texto, area, urgencia)`.
- A rotina do painel passa a ler `staff_requests` com `status = 'novo'` e mandar ao Artur a lista para aprovação.
