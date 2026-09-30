# CONTROL 3D — Sistema de gerenciamento de impressões 3D

Aplicação web com **API RESTful** (Node + Express + Prisma + SQLite) e **front-end** em React.
Roda 100% local e gratuito.

## Como rodar (VS Code)

Abra a pasta do repositório (`Control3D`) no VS Code (`File > Open Folder`) e use dois terminais (`Ctrl + '`). Os comandos abaixo partem da raiz do repositório.

**Terminal 1 — back-end**
```powershell
cd backend
npm install
Copy-Item .env.example .env  # execute apenas na primeira configuração
npm run db:push              # cria o banco SQLite e gera o Prisma Client
npm run dev                  # http://localhost:3000 | Swagger: http://localhost:3000/api-docs
```

**Terminal 2 — front-end**
```powershell
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

**Testes** (dentro de `backend`): `npm test` — usa um banco separado (`prisma/test.db`), não afeta o de desenvolvimento.

Extensões úteis do VS Code: *Prisma*, *Tailwind CSS IntelliSense*, *ESLint*, *Thunder Client* (testar a API).

## O que cada parte contém

### backend/
| Pasta / arquivo | Responsabilidade |
|---|---|
| `prisma/schema.prisma` | Modelagem do banco: User 1:N Model 1:N Print (com `onDelete: Cascade`). |
| `src/server.ts` | Apenas sobe o servidor na porta configurada. |
| `src/app.ts` | Monta o Express: CORS, JSON, Swagger, rotas `/api/*`, 404 e middleware de erros. |
| `src/routes/` | Só define URL + método + middlewares (auth, validação) e aponta para o controller. |
| `src/controllers/` | Camada HTTP: lê `req`, chama o service, devolve `res` com o status correto. Sem regra de negócio. |
| `src/services/` | Regras de negócio e acesso ao banco via Prisma (hash da senha, JWT, posse dos dados, transições de status). |
| `src/schemas/` | Validação com Zod (nome, e-mail, senha mínima, quantidade > 0, status permitido). |
| `src/middlewares/` | `auth` (valida JWT), `validate` (aplica Zod), `error` (formato único de erro + 404). |
| `src/lib/` | Utilitários: cliente Prisma, `AppError`, `asyncHandler`, config (.env), leitura de parâmetros. |
| `src/docs/swagger.ts` | Documentação OpenAPI exibida em `/api-docs`. |
| `tests/` | Vitest + Supertest: autenticação, modelos, impressões e estoque de filamentos. |
| `.env` | `DATABASE_URL`, `JWT_SECRET`, `PORT`. |

### frontend/
| Pasta / arquivo | Responsabilidade |
|---|---|
| `src/services/api.ts` | Único ponto de comunicação com a API (adiciona o token, trata erros). |
| `src/contexts/AuthContext.tsx` | Estado de login (token + usuário), `login`, `logout`, restauração da sessão. |
| `src/App.tsx` | Rotas públicas (login/cadastro) e privadas (protegidas por token). |
| `src/pages/` | Telas: Login, Register, Dashboard, Models, ModelDetails, Prints e PrintDetails. |
| `src/components/` | Peças reutilizáveis: Layout, Modal, StatusBadge, estoque de filamentos e formulários/cartões de modelos e impressões. |
| `src/contexts/ThemeContext.tsx` | Gerencia o tema claro/escuro escolhido pelo usuário. |
| `src/lib/utils.ts` | Formatação de tempo/data, rótulos de status, mensagens de erro. |
| `vite.config.ts` | Plugins React + Tailwind e **proxy** `/api → localhost:3000`. |

## Regras implementadas além do básico
- Cada usuário só enxerga **seus** modelos e impressões (outro usuário recebe 404).
- Fluxo de status validado no back-end: `PENDENTE → EM_ANDAMENTO → CONCLUIDA`; `PENDENTE/EM_ANDAMENTO → CANCELADA`. Ao concluir, `finishedAt` é preenchido.
- `GET /api/prints?status=PENDENTE` filtra por status.
- Excluir um modelo exclui suas impressões (cascade).
- `estimatedTime` é guardado em **minutos** (a tela converte de/para horas e minutos).

## Roteiro de apresentação
1. Cadastro → 2. Login → 3. Dashboard → 4. Criar modelo → 5. Criar impressão →
6. Abrir o modelo (mostra `GET /api/models/:id/prints`) → 7. Trocar status →
8. Testar a API no Swagger (`/api-docs`, botão *Authorize* com o JWT) → 9. Executar `npm test`.

## Ordem sugerida de desenvolvimento
Prisma schema → lib → schemas → services → controllers → routes → app/server → testes → Swagger → front (api.ts, AuthContext, Login/Register, Layout, Models, Prints, Dashboard).
