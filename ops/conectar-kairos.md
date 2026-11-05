# Conectar o Kairós em cada lugar

Endereço do servidor: `https://gjsztlroobvohpqsvlkg.supabase.co/functions/v1/kairos`
Chave: no Supabase do Staff → Vault → segredo `kairos_mcp_key` (criado pelo Artur).

## Claude Code (desktop / terminal)
1. Guarde a chave no computador (uma vez): `echo 'export KAIROS_KEY="SUA_CHAVE"' >> ~/.zshrc && source ~/.zshrc`
2. Clone o repositório e abra o Claude Code nele: `gh repo clone medneeds/staff ~/kairos && cd ~/kairos && claude`
3. O `.mcp.json` do repositório já aponta para o Kairós; aceite o servidor "kairos" quando o Claude Code perguntar.
   Para usar o Kairós em qualquer pasta: `claude mcp add --scope user --transport http kairos https://gjsztlroobvohpqsvlkg.supabase.co/functions/v1/kairos --header "Authorization: Bearer $KAIROS_KEY" --header "X-Kairos-Porta: claude-code"`

## Claude (web e app)
Configurações → Conectores → Adicionar conector personalizado → URL: `https://gjsztlroobvohpqsvlkg.supabase.co/functions/v1/kairos/SUA_CHAVE?porta=claude-web`

## ChatGPT
Configurações → Aplicativos e conectores → Modo desenvolvedor → Criar conector → URL: `https://gjsztlroobvohpqsvlkg.supabase.co/functions/v1/kairos/SUA_CHAVE?porta=chatgpt` (sem autenticação).

A chave no endereço é pessoal: não compartilhe o link. Para trocar a chave, edite `kairos_mcp_key` no Vault e atualize os três lugares.
