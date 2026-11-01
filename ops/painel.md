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
| Tráfego pago | Adspirer `get_meta_campaign_performance` (dados consolidados, um dia de atraso) | só 9h52 (cota do plano) |
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
