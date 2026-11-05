# Painel do Staff

Documento de texto na base de conhecimento do agente, anexado em modo `prompt` (entra inteiro em toda conversa). É a única fonte de números do Staff.

## Rotação

O ElevenLabs não edita o texto de um documento existente, então cada atualização:

1. cria um documento novo `Painel do Staff (atualizado em DD/MM HHhMM)`;
2. aponta o agente para ele (`knowledge_base` com um só item);
3. apaga o documento anterior, só depois de confirmar o passo 2.

## Fontes

| Seção | Fonte | Frequência |
|---|---|---|
| Vendas da Black | Stripe: payment intents `succeeded` com `metadata.offer = black_2026` | 9h52, 15h52, 21h52 |
| Checkouts de clientes hoje | Stripe: checkout sessions do dia, `offer = black_2026`, sem os testes do Artur | 9h52, 15h52, 21h52 |
| Tráfego pago | API oficial do Meta (`/act_779483745915168/insights`, por campanha: 7 dias e hoje) | 9h52, 15h52, 21h52 |
| Recuperação, conteúdo, pendências | reaproveitado do painel anterior; atualizado à mão quando algo muda | quando muda |

## Formato

```
PAINEL DO STAFF — atualizado em <dia>, <data>, às <hora> (horário de Fortaleza).

VENDAS DA BLACK
TRÁFEGO PAGO
RECUPERAÇÃO DE CHECKOUT
CONTEÚDO
PENDÊNCIAS DO ARTUR
OBSERVAÇÃO
```

Se uma fonte falhar, a seção antiga fica e ganha a nota "(sem atualização às HHhMM: <conector> não respondeu)".

## Rede de segurança das conversas (desde 01/11, 16h)

A cada rodada, a tarefa também lê as conversas de voz desde a rodada anterior. Se o Artur pediu uma ação e a ferramenta `anotar_pedido` não gravou (não foi chamada ou deu erro), a própria tarefa insere o pedido na fila, sem duplicar o mesmo `conversa_id`. Erros do Staff (número errado, regra quebrada) viram uma linha "Ajuste no Staff" na mensagem de aprovação.

## Recuperação no painel

O painel passa a mostrar abandonos de checkout de clientes no dia e quantos pagaram depois pelo link de recuperação da Stripe (`recovered_from`). Nomes e e-mails de clientes não entram no painel; a lista fica no `/admin/black`.
