# CONTROL 3D

Central local para gerenciar modelos, impressões 3D e estoque de filamentos. O projeto é composto por uma API RESTful e uma aplicação React, sem depender de serviços em nuvem.

## Tecnologias

- Back-end: Node.js, Express, TypeScript, Prisma, SQLite, Zod, JWT, bcrypt e Swagger UI.
- Front-end: React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, TanStack Query, Sonner e Radix UI Dialog.
- Testes: Vitest + Supertest (API) e Playwright (front-end).

O `Dialog` do Radix UI é o componente externo de interface usado nos formulários e confirmações. Ele fornece foco preso no modal, fechamento por `Esc` e atributos de acessibilidade.

## Recursos

- Cadastro, login e rotas protegidas por JWT.
- CRUD de modelos e impressões, com vínculo em `GET /api/models/:id/prints`.
- Fluxo validado de impressão: pendente, em andamento, concluída ou cancelada.
- Controle de filamento e desconto de estoque ao concluir uma impressão.
- Painel com indicadores, gráfico de horas, tema claro/escuro e modo de desempenho.
- Interface responsiva em glassmorphism, navegação lateral/inferior e página pública `/sobre`.

## Como executar

Pré-requisito: Node.js 20 LTS ou superior.

### Back-end

```powershell
cd backend
npm install
Copy-Item .env.example .env # apenas na primeira execução
npm run db:push
npm run dev
```

A API fica em `http://localhost:3000` e o Swagger em `http://localhost:3000/api-docs`.

Defina um `JWT_SECRET` longo e exclusivo no arquivo `backend/.env`; não envie esse arquivo ao repositório ou ao ZIP de entrega.

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
