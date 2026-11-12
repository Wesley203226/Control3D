# CONTROL 3D

Central local para gerenciar modelos, impressões 3D e estoque de filamentos. O projeto é composto por uma API RESTful e uma aplicação React, sem depender de serviços em nuvem.

## Tecnologias

- Back-end: Node.js, Express, TypeScript, Prisma, SQLite, Zod, JWT, bcrypt e Swagger UI.
- Front-end: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, TanStack Query, Sonner e Radix UI Dialog.
- Testes: Vitest + Supertest (API) e Playwright (front-end).

O `Dialog` do Radix UI é o componente externo de interface usado nos formulários e confirmações. Ele fornece foco preso no modal, fechamento por `Esc` e atributos de acessibilidade.

## Recursos

- Cadastro, login e rotas protegidas por JWT.
- CRUD de projetos/modelos e peças, com foto e dimensões do projeto e vínculo em `GET /api/models/:id/prints`.
- Fluxo validado de impressão: pendente, em andamento, concluída ou cancelada.
- Registro de material, cor, suportes, falhas, descarte, peso consumido e duração real da impressão.
- Controle de filamento com baixa atômica do estoque ao concluir ou descartar uma peça.
- Catálogo consolidado de filamentos em `/filamentos`, com busca, filtro de estoque baixo e gestão por projeto.
- Página de configurações para personalizar cores e blur, alternar o tema e cadastrar perfis de impressora; dimensões e materiais do perfil alimentam alertas nos formulários.
- Painel com indicadores, gráfico de horas e tema claro/escuro.
- Interface responsiva em glassmorphism, navegação lateral/inferior e página pública `/sobre`.

As preferências visuais e os perfis de impressora personalizados são guardados no navegador atual. Fotos são comprimidas no dispositivo antes de serem salvas junto aos dados locais da aplicação.

## Como executar

Pré-requisito: Node.js 20 LTS ou superior.

### Back-end

```powershell
cd backend
npm install
Copy-Item .env.example .env # apenas na primeira execução
$jwtSecret = node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64url'))"
(Get-Content .env) -replace '^JWT_SECRET=.*$', "JWT_SECRET=`"$jwtSecret`"" | Set-Content .env
npm run db:push
npm run dev
```

A API fica em `http://localhost:3000` e o Swagger em `http://localhost:3000/api-docs`.

O comando acima gera e grava um `JWT_SECRET` aleatório exclusivo. A API recusa iniciar fora dos testes se o segredo estiver ausente ou tiver menos de 32 caracteres. Não envie `backend/.env` ao repositório ou ao ZIP de entrega.

### Front-end

Em outro terminal:

```powershell
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`.

## Testes

### API

```powershell
cd backend
npm test
```

Os testes usam um banco separado e cobrem autenticação, modelos, impressões e filamentos.

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
