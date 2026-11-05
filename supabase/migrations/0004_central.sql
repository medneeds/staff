-- Central do Staff (05/11/2026): o Artur, logado, lê e decide pedidos e posts e vê o painel.
-- Quem é admin fica em staff_admins (o e-mail é inserido direto no banco, não no repositório).
create table if not exists public.staff_admins (email text primary key);
alter table public.staff_admins enable row level security;
revoke all on public.staff_admins from anon, authenticated;

create or replace function public.staff_e_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_admins where email = lower(coalesce(auth.jwt()->>'email','')));
$$;
revoke all on function public.staff_e_admin() from public;
grant execute on function public.staff_e_admin() to authenticated;

grant select, insert on public.staff_requests to authenticated;
grant update (status, nota, atualizado_em) on public.staff_requests to authenticated;
create policy "admin le pedidos" on public.staff_requests for select to authenticated using (public.staff_e_admin());
create policy "admin cria pedido" on public.staff_requests for insert to authenticated with check (public.staff_e_admin() and status = 'novo');
create policy "admin decide pedido" on public.staff_requests for update to authenticated
  using (public.staff_e_admin() and status in ('novo','enviado'))
  with check (public.staff_e_admin() and status in ('aprovado','recusado'));

grant select on public.social_posts to authenticated;
grant update (status, aprovado_em, aprovado_por, agendado_para, legenda) on public.social_posts to authenticated;
create policy "admin le posts" on public.social_posts for select to authenticated using (public.staff_e_admin());
create policy "admin decide post" on public.social_posts for update to authenticated
  using (public.staff_e_admin() and status in ('rascunho','aguardando_aprovacao','aprovado','erro'))
  with check (public.staff_e_admin() and status in ('aguardando_aprovacao','aprovado','cancelado'));

create table if not exists public.staff_painel (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  texto text not null
);
alter table public.staff_painel enable row level security;
revoke all on public.staff_painel from anon, authenticated;
grant select on public.staff_painel to authenticated;
create policy "admin le painel" on public.staff_painel for select to authenticated using (public.staff_e_admin());

alter publication supabase_realtime add table public.staff_requests;
alter publication supabase_realtime add table public.social_posts;
