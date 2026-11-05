-- Calendário de posts (Instagram/Facebook) e bucket público de mídia. Aplicada em 05/11/2026.
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  agendado_para timestamptz not null,
  conta text not null default 'instagram:arturbatista'
    check (conta in ('instagram:arturbatista','facebook:arturbatista','instagram:plataformamedstation')),
  formato text not null check (formato in ('carrossel','imagem','reels','story')),
  pilar text,
  titulo text not null,
  legenda text not null default '',
  midias text[] not null default '{}',
  palavra_chave text,
  link_destino text,
  status text not null default 'rascunho'
    check (status in ('rascunho','aguardando_aprovacao','aprovado','publicando','publicado','erro','cancelado')),
  aprovado_em timestamptz, aprovado_por text, publicado_em timestamptz,
  meta_media_id text, permalink text, erro text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists social_posts_fila on public.social_posts (status, agendado_para);
alter table public.social_posts enable row level security;
create or replace function public.social_posts_touch() returns trigger language plpgsql set search_path = public as $$
begin new.atualizado_em := now(); return new; end $$;
drop trigger if exists social_posts_touch on public.social_posts;
create trigger social_posts_touch before update on public.social_posts for each row execute function public.social_posts_touch();
insert into storage.buckets (id, name, public) values ('social-midia', 'social-midia', true) on conflict (id) do nothing;
