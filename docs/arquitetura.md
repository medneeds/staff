# Arquitetura e decisões

## Decisões

1. **Voz no ElevenLabs, cérebro no Claude.** O agente usa `claude-sonnet-5-5` como LLM dentro do ElevenLabs. Equilíbrio entre qualidade e latência de voz.
2. **Sem chaves no agente.** O agente não chama Stripe nem Meta. Quem lê é uma tarefa agendada do Claude com os conectores já autorizados, e ela escreve o resultado em texto no Painel. Se o agente for exposto, não há segredo a vazar.
3. **Painel em modo `prompt`, não RAG.** O painel é pequeno; entrar inteiro evita que o agente "não encontre" um número e invente outro.
4. **Ação só com aprovação.** Nas próximas fases o Staff só anota pedidos; a execução passa por confirmação explícita do Artur.
5. **Meta pela API oficial (desde 05/11/2026).** O Adspirer (Plus, 150 chamadas/mês) estourou a cota em 02/11 e foi abandonado. As tarefas leem e, quando permitido, alteram o Meta pela Graph API (gratuita, sem cota prática), com o usuário do sistema "Claude" do portfólio BM Artur Batista (app "Arsenal Ads"; permissões ads_read, ads_management, business_management). Cobre a conta de anúncios 779483745915168 (MedStation e Arsenal).
   - O token **não fica no repositório nem nos prompts**: está no Vault do projeto Supabase `staff` (`vault.decrypted_secrets`, nome `meta_access_token`). Cada tarefa lê com o conector Supabase e usa só dentro do shell.
   - Para cortar o acesso: BM Artur Batista → Usuários do sistema → Claude → Anular tokens. Para trocar: gerar token novo e atualizar o segredo com `vault.update_secret`.
   - Painel lê o Meta nas três rodadas (9h52, 15h52, 21h52); o relatório da Black (7h41) lê ontem e 7 dias.

## Ids

Ver `agent/config.json`.

## Próximo passo técnico (fase 2)

- Projeto Supabase `staff` (gratuito): tabela `staff_requests(id, created_at, text, area, urgency, status, decided_at)`.
- Edge function `staff-request` (POST) protegida por um segredo, cadastrado como secret no ElevenLabs e usado como header da ferramenta webhook do agente.
- Ferramenta do agente `anotar_pedido(texto, area, urgencia)`.
- A rotina do painel passa a ler `staff_requests` com `status = 'novo'` e mandar ao Artur a lista para aprovação.
