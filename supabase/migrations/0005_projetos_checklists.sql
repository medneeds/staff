-- Braço direito (05/11/2026): áreas novas nos pedidos, projetos e checklists na Central.
alter table public.staff_requests drop constraint if exists staff_requests_area_check;
alter table public.staff_requests add constraint staff_requests_area_check check (area in
 ('estrategia','vendas','trafego','conteudo','copy','projetos','auditoria','recuperacao','crm','financas','engenharia','geral'));
alter table public.staff_requests add column if not exists projeto text;
grant insert (pedido, area, urgencia, projeto) on public.staff_requests to authenticated;

create table if not exists public.staff_projetos (
  slug text primary key, nome text not null, descricao text,
  fase text not null default 'ativo' check (fase in ('ativo','em_construcao','pausado','concluido')),
  prioridade int not null default 3 check (prioridade between 1 and 5),
  objetivo text, proximo_passo text, metrica text, link text, cor text,
  ordem int not null default 100, atualizado_em timestamptz not null default now()
);
alter table public.staff_projetos enable row level security;
revoke all on public.staff_projetos from anon, authenticated;
grant select on public.staff_projetos to authenticated;
grant update (fase, prioridade, objetivo, proximo_passo) on public.staff_projetos to authenticated;
create policy "admin le projetos" on public.staff_projetos for select to authenticated using (public.staff_e_admin());
create policy "admin edita projetos" on public.staff_projetos for update to authenticated using (public.staff_e_admin()) with check (public.staff_e_admin());

create table if not exists public.staff_checklist (
  id bigint generated always as identity primary key,
  projeto text not null references public.staff_projetos(slug) on delete cascade,
  item text not null check (char_length(item) between 2 and 300),
  dono text not null default 'artur' check (dono in ('artur','staff')),
  feito boolean not null default false, prazo date, ordem int not null default 100,
  criado_em timestamptz not null default now(), feito_em timestamptz
);
alter table public.staff_checklist enable row level security;
revoke all on public.staff_checklist from anon, authenticated;
grant select, insert, delete on public.staff_checklist to authenticated;
grant update (feito, feito_em, item, prazo, dono) on public.staff_checklist to authenticated;
create policy "admin le checklist" on public.staff_checklist for select to authenticated using (public.staff_e_admin());
create policy "admin cria checklist" on public.staff_checklist for insert to authenticated with check (public.staff_e_admin());
create policy "admin edita checklist" on public.staff_checklist for update to authenticated using (public.staff_e_admin()) with check (public.staff_e_admin());
create policy "admin apaga checklist" on public.staff_checklist for delete to authenticated using (public.staff_e_admin());
alter publication supabase_realtime add table public.staff_checklist;
-- A carga inicial de projetos e itens foi feita direto no banco em 05/11/2026.
