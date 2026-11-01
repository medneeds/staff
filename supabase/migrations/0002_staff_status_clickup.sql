alter table public.staff_requests add column if not exists clickup_task_id text;
alter table public.staff_requests add column if not exists clickup_url text;

-- Leitura intencional pelo agente de voz (anon, chave publicável): só um resumo dos 15 últimos pedidos.
create or replace function public.staff_status(limite int default 8)
returns table (numero bigint, quando text, pedido text, equipe text, situacao text, observacao text)
language sql
security definer
set search_path = public
as $$
  select id,
         to_char(created_at at time zone 'America/Fortaleza', 'DD/MM HH24:MI'),
         left(pedido, 200),
         area,
         case status when 'novo' then 'aguardando preparo'
                     when 'enviado' then 'aguardando sua aprovação'
                     when 'aprovado' then 'aprovado, em execução'
                     when 'recusado' then 'recusado'
                     when 'feito' then 'feito' end,
         left(coalesce(nota, ''), 240)
  from public.staff_requests
  order by created_at desc
  limit least(greatest(coalesce(limite, 8), 1), 15);
$$;
revoke all on function public.staff_status(int) from public;
revoke execute on function public.staff_status(int) from authenticated;
grant execute on function public.staff_status(int) to anon;
