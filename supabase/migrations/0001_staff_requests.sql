create table public.staff_requests (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  pedido text not null check (char_length(pedido) between 3 and 600),
  area text not null default 'geral' check (area in ('trafego','conteudo','vendas','recuperacao','crm','financas','engenharia','geral')),
  urgencia text not null default 'normal' check (urgencia in ('agora','hoje','normal')),
  conversa_id text check (conversa_id is null or char_length(conversa_id) <= 120),
  status text not null default 'novo' check (status in ('novo','enviado','aprovado','recusado','feito')),
  nota text,
  atualizado_em timestamptz
);
comment on table public.staff_requests is 'Fila de pedidos que o Artur faz por voz ao Staff. Nada é executado sem aprovação dele.';

alter table public.staff_requests enable row level security;

-- O agente de voz só pode INSERIR pedidos novos; não lê, não altera, não apaga.
create policy "agente insere pedido novo" on public.staff_requests
  for insert to anon
  with check (status = 'novo' and nota is null and atualizado_em is null);

revoke all on public.staff_requests from anon, authenticated;
grant insert (pedido, area, urgencia, conversa_id) on public.staff_requests to anon;
