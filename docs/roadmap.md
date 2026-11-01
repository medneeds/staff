# Roadmap do Staff

## Fase 0 — Voz e identidade (01/11, feito)
- Agente de voz no ElevenLabs, prompt de identidade e regras.

## Fase 1 — Números do dia (01/11, feito)
- Painel do Staff na base de conhecimento, atualizado 3x ao dia por tarefa agendada (Stripe + Meta).
- Cérebro trocado para Claude.

## Fase 2 — Pedidos anotados (01/11, feito)
- Ferramenta do agente `anotar_pedido`: quando o Artur pede uma ação por voz, o Staff grava o pedido (o quê, quando, urgência) numa fila.
- A rotina das 9h52/15h52/21h52 lê a fila, prepara a ação e manda ao Artur para aprovação no celular. Nada é executado sem "sim".
- Fila: tabela `staff_requests` no projeto Supabase `staff` (gratuito). O agente grava direto pela API REST com a chave publicável; a RLS só permite inserir pedidos novos, então a chave não dá leitura nem aprovação.

## Fase 3 — Times com mandato
- Tráfego: já existe (relatório 7h41). Ganha mandato para pausar anúncio individual dentro das regras.
- Recuperação: e-mails 1 h e 24 h (repositório medstation) + lista de WhatsApp para o Artur.
- Conteúdo: calendário de novembro e publicação via Supermetrics (depende da renovação).
- CRM: lista de assinantes, renovações e risco de cancelamento.

## Fase 4 — Migração para fora do Lovable
- O Staff coordena a migração dos projetos (MedStation primeiro) para infraestrutura própria, com plano e checklist aprovados pelo Artur.
