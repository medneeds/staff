# Operar o Staff pelo Claude Code

Qualquer sessão do Claude (Claude Code no terminal, na web ou no app) com o conector **Supabase** consegue operar o Staff. Abra uma sessão neste repositório e peça em português.

## O que dá para pedir
- "Como está a fila do Staff?" → `select id, created_at, pedido, status, nota, clickup_url from public.staff_requests order by id desc limit 20;`
- "Anota um pedido: …" → `insert into public.staff_requests (pedido, area, urgencia) values ('…','conteudo','hoje');`
- "Aprova o pedido 7" → `update public.staff_requests set status='aprovado', atualizado_em=now() where id=7 and status='enviado';` (a fila executa na próxima rodada, minuto 22)
- "O que está no calendário?" → `select agendado_para, conta, formato, titulo, status, permalink from public.social_posts order by agendado_para desc;`
- "Aprova o post X" → `update public.social_posts set status='aprovado', aprovado_em=now(), aprovado_por='Artur (Claude Code)' where id='…';`
- "Mostra o painel" → `select criado_em, texto from public.staff_painel order by criado_em desc limit 1;`

Projeto Supabase: `gjsztlroobvohpqsvlkg` (staff).

## Regras
- Nada que gaste dinheiro, publique ou mande mensagem a cliente sem o "sim" do Artur.
- O token do Meta fica só no Vault (`meta_access_token`); use dentro do shell, nunca em arquivo, commit ou mensagem.
- Campanhas [ZION] são de outro gestor: só leitura.
- Receitas de publicação (Instagram e Página) e de anúncios: ver o prompt da tarefa "Staff: fila de pedidos" e `docs/arquitetura.md`.
