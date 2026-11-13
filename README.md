# CONTROL 3D

Central para gerenciar modelos, impressões 3D e estoque de filamentos. O projeto é composto por uma API RESTful e uma aplicação React, com suporte a execução local e publicação opcional em serviços gratuitos.

## Tecnologias

- Back-end: Node.js, Express, TypeScript, Prisma, PostgreSQL em produção, SQLite no desenvolvimento/testes, Zod, JWT, bcrypt e Swagger UI.
- Front-end: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, TanStack Query, Sonner e Radix UI Dialog.
- Testes: Vitest + Supertest (API) e Playwright (front-end).

O `Dialog` do Radix UI é o componente externo de interface usado nos formulários e confirmações. Ele fornece foco preso no modal, fechamento por `Esc` e atributos de acessibilidade.

## Recursos

- Cadastro, login e rotas protegidas por JWT.
- CRUD de projetos/modelos e peças, com foto e dimensões do projeto e vínculo em `GET /api/models/:id/prints`.
- Fluxo validado de impressão: pendente, em andamento, concluída ou cancelada.
- Registro de material, cor, suportes, falhas, descarte, peso consumido e duração real da impressão.
- Controle de filamento com reserva ao criar a impressão, liberação ao cancelar sem descarte e baixa definitiva ao concluir ou descartar uma peça.
- Formação de preço por peça com custo de filamento por grama, energia/potência da impressora ativa, manutenção, mão de obra, perdas, embalagem, margem editável e modelagem amortizada pelo número esperado de cópias. A cotação fica salva como snapshot na impressão.
- Catálogo consolidado de filamentos em `/filamentos`, com busca, filtro de estoque baixo e gestão por projeto.
- Página de configurações para personalizar cores e blur, alternar o tema e cadastrar perfis de impressora; dimensões e materiais do perfil alimentam alertas nos formulários.
- Papéis de parede com busca no Wikimedia Commons (sem chave), fallback opcional para Pexels, atribuição de autor/licença e upload local de fotos e vídeos.
- Player oficial do Spotify com OAuth PKCE, transferência de reprodução para o navegador e controles para conta Premium; photocard Polaroid redimensionável e reposicionável.
- Painel administrativo com ativação/manutenção de projetos, impressões, filamentos, wallpapers e Spotify. Os módulos desligados somem da navegação e as rotas protegidas correspondentes da API retornam `503`.
- Upload de arquivos STL com prévia 3D interativa e rotação por mouse/toque; arquivos STL e vídeos locais ficam armazenados no navegador.
- Catálogo de filamentos com ilustração de carretéis coloridos e indicador visual do material restante.
- Painel com indicadores, gráfico de horas e tema claro/escuro.
- Interface responsiva em glassmorphism, navegação lateral/inferior e página pública `/sobre`.

As preferências visuais, posição/tamanho do photocard, perfis personalizados de impressora e arquivos locais STL/vídeo ficam guardados no navegador atual. Fotos são comprimidas no dispositivo antes de serem salvas. A busca principal usa o Wikimedia Commons sem chave e exibe atribuição e licença; se uma `PEXELS_API_KEY` válida estiver configurada no back-end, a Pexels também pode ser consultada e o Commons entra como fallback.

A busca de wallpapers exige login. O Commons contém fotos e vídeos sob licenças livres; confira a licença e a autoria de cada resultado. O catálogo pode não conter fanart específica. A Pexels pausou novas chaves; sem uma chave já válida, o app continua usando a busca do Commons. Também é possível enviar uma foto ou vídeo próprio (MP4/WebM, até 40 MB).

Para controlar e ouvir a conta diretamente no app, crie um app de desenvolvedor no Spotify e configure seu Client ID público em `VITE_SPOTIFY_CLIENT_ID` no arquivo local `frontend/.env`. Cadastre no painel exatamente `http://127.0.0.1:5173/configuracoes` se abrir o app por esse endereço (ou use `http://localhost:5173/configuracoes` e mantenha o mesmo host em todas as etapas). O Client ID não é um segredo; nunca coloque Client Secret no front-end. Apps em modo de desenvolvimento podem exigir que a conta Premium seja adicionada à lista de usuários permitidos. Após iniciar uma faixa em um dispositivo Spotify e conectar a conta, o app transfere a reprodução para o player do navegador. A integração usa OAuth PKCE; tokens ficam somente na sessão da aba.

A estimativa usa os valores informados pelo usuário; não consulta uma tarifa elétrica ou preço de mercado universal. Cadastre o preço de compra por grama em cada filamento e informe tarifa/potência real e custo de manutenção em Configurações. A margem inicial de 35% é editável e não representa cotação garantida de mercado.

A prévia STL aceita arquivos de até 50 MB e até 500 mil faces. A visualização é local ao navegador e não envia os arquivos 3D para a API.

## Como executar

Pré-requisito: Node.js 20 LTS ou superior.

### Back-end

```powershell
cd backend
npm install
Copy-Item .env.example .env # apenas na primeira execução
$jwtSecret = node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64url'))"
(Get-Content .env) -replace '^JWT_SECRET=.*$', "JWT_SECRET=`"$jwtSecret`"" | Set-Content .env
# Configure a chave opcional de wallpapers no editor: PEXELS_API_KEY="..."
npm run db:push:local
npm run dev
```

A API fica em `http://localhost:3000` e o Swagger em `http://localhost:3000/api-docs`. `npm run dev` e `npm test` usam o schema SQLite local; `npm run build` gera o cliente Prisma para PostgreSQL.

O comando acima gera e grava um `JWT_SECRET` aleatório exclusivo. A API recusa iniciar fora dos testes se o segredo estiver ausente ou tiver menos de 32 caracteres. Não envie `backend/.env` ao repositório ou ao ZIP de entrega.

### Criar o administrador

Para promover uma conta existente, configure `ADMIN_EMAIL` com o e-mail dessa conta no ambiente do back-end e reinicie a API. Para criar uma conta administrativa nova, configure também `ADMIN_PASSWORD` (mínimo de 12 caracteres) e, opcionalmente, `ADMIN_NAME`. A senha só deve ser definida no painel privado do provedor; nunca a envie no chat nem a inclua no repositório. A senha de uma conta já existente não é sobrescrita.

### Front-end

Em outro terminal:

```powershell
cd frontend
Copy-Item .env.example .env # configure o Client ID do Spotify no arquivo se desejar o player completo
# VITE_SPOTIFY_CLIENT_ID="seu-client-id-publico"
# VITE_SPOTIFY_REDIRECT_URI="http://127.0.0.1:5173/configuracoes"
npm install
npm run dev
```

Abra `http://localhost:5173`.

### Publicar nos planos gratuitos (Vercel + Render + Neon)

1. Crie um projeto PostgreSQL no plano Free do Neon e copie as duas connection strings: use a conexão pooled em `DATABASE_URL` e a conexão direta em `DIRECT_URL` para operações de schema. São credenciais privadas: não as coloque no repositório nem as envie no chat.
2. Conecte o repositório GitHub ao Render e crie um Blueprint usando o `render.yaml` da raiz. A configuração cria uma API Node no plano Free, executa o build do backend e verifica `/api/health`. Informe as duas URLs Neon; o Render gera `JWT_SECRET`.
3. Aguarde o deploy e copie o domínio HTTPS da API no Render.
4. Importe o mesmo repositório na Vercel, selecione `frontend` como diretório raiz e configure `VITE_API_URL` com o domínio HTTPS do Render, sem `/api` no final. Sem essa variável, o app agora interrompe as requisições com uma mensagem explícita em vez de enviar o login para o host da interface. Para o Spotify, configure também `VITE_SPOTIFY_CLIENT_ID` e `VITE_SPOTIFY_REDIRECT_URI=https://<dominio-vercel>/configuracoes`; cadastre exatamente essa URL de retorno no painel do Spotify e publique novamente o frontend.
5. Cadastre a primeira conta pelo app. Para torná-la administradora, configure `ADMIN_EMAIL` no Render com o e-mail dessa conta e faça um novo deploy. Como a conta já existirá no Neon, a inicialização a promoverá sem alterar sua senha.

Neon Free é um plano permanente sem cartão, sujeito a cotas (inclui 1 GB de armazenamento por projeto e compute que suspende após inatividade). O serviço web gratuito do Render pode suspender após períodos sem tráfego, causando uma demora na primeira requisição. Vercel Hobby também tem limites de uso e regras próprias. Os limites e a disponibilidade dos planos podem mudar; confira os painéis antes de publicar. Conecte somente contas e repositórios aos quais você tem acesso.

## Testes

### API

```powershell
cd backend
npm test
```

Os testes usam um banco separado e cobrem autenticação, modelos, impressões, filamentos, reservas de estoque e cálculo de preços.

### Front-end

```powershell
cd frontend
npx playwright install chromium
npm run test:e2e
```

O Playwright inicia API e interface automaticamente, cria `backend/prisma/e2e.db` e executa cadastro, login e CRUD completo de modelos. Esse banco e os relatórios de teste são ignorados pelo Git.

## Estrutura

```text
backend/       API Express, Prisma, Swagger e testes Vitest
frontend/      Aplicação React, componentes, páginas e testes Playwright
frontend/src/data/members.ts  Dados exibidos na página /sobre
```

## Entrega

Antes de compactar o projeto, rode os dois conjuntos de testes e preencha os integrantes, disciplina e semestre em `frontend/src/data/members.ts`. Não inclua `node_modules`, `dist`, `.env`, arquivos `*.db`, `playwright-report` ou `test-results` no ZIP.
