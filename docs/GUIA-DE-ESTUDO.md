# CONTROL 3D — Guia de execução e estudo

Este guia explica como instalar, executar e apresentar o CONTROL 3D, além de descrever sua arquitetura, banco de dados, autenticação, rotas, validações, testes e documentação Swagger.

## 1. O que é o projeto

O CONTROL 3D é um sistema local para organizar modelos de impressão 3D, acompanhar impressões e controlar estoque de filamentos. Ele é composto por:

- **Front-end:** React, TypeScript, Vite e Tailwind CSS.
- **API:** Node.js, Express e TypeScript.
- **Banco de dados:** SQLite.
- **ORM:** Prisma.
- **Validação:** Zod.
- **Autenticação:** JWT, com senha protegida por hash bcrypt.
- **Testes da API:** Vitest e Supertest.
- **Documentação interativa:** Swagger UI.

## 2. O que é necessário para rodar

Instale:

1. **Node.js** em uma versão compatível com as dependências do projeto (Node 20 LTS é uma boa escolha).
2. **npm**, que acompanha o Node.js.
3. Um terminal e um navegador moderno.

Não é necessário instalar SQLite como servidor: o banco usado é um arquivo local. O código-fonte e as dependências ficam nas pastas `backend` e `frontend`.

## 3. Instalação e primeira execução

Abra um terminal na pasta `control-3d`.

### 3.1 Configurar o back-end

```bash
cd backend
npm install
```

Crie o arquivo de ambiente copiando o exemplo:

**Windows PowerShell:**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

O arquivo `backend/.env` contém:

```dotenv
DATABASE_URL="file:./dev.db"
JWT_SECRET="troque-esta-chave-em-producao"
PORT=3000
```

`DATABASE_URL` define o arquivo SQLite. Com esse valor, o Prisma usa `backend/prisma/dev.db`. `JWT_SECRET` assina e valida os tokens; mantenha uma chave privada e forte fora de ambientes de demonstração. `PORT` é a porta HTTP da API.

Prepare o banco e o cliente Prisma:

```bash
npx prisma db push
```

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

O terminal deve informar que a API está em `http://localhost:3000` e o Swagger em `http://localhost:3000/api-docs`.

### 3.2 Configurar o front-end

Deixe o back-end rodando e abra um **segundo terminal**, também na pasta `control-3d`:

```bash
cd frontend
npm install
npm run dev
```

Abra o endereço informado pelo Vite, normalmente `http://localhost:5173`. O Vite encaminha chamadas `/api` para `http://localhost:3000`; por isso, mantenha a API ativa enquanto usa a interface.

### 3.3 Rodar novamente depois da instalação

Abra dois terminais:

```bash
# Terminal 1
cd backend
npm run dev
```

```bash
# Terminal 2
cd frontend
npm run dev
```

## 4. Comandos úteis

Execute os comandos dentro da pasta indicada:

| Local | Comando | Para que serve |
|---|---|---|
| `backend` | `npm run dev` | Inicia a API em modo de desenvolvimento, reiniciando ao detectar alterações. |
| `backend` | `npm run build` | Compila o TypeScript do back-end para `dist`. |
| `backend` | `npm start` | Inicia a versão compilada em `dist/server.js`. Rode `npm run build` antes. |
| `backend` | `npm run db:push` | Sincroniza o schema Prisma com o banco configurado. |
| `backend` | `npm test` | Executa a suíte de testes usando um banco separado. |
| `backend` | `npx prisma studio` | Abre uma interface local para inspecionar o banco configurado. |
| `frontend` | `npm run dev` | Inicia o servidor de desenvolvimento Vite. |
| `frontend` | `npm run build` | Verifica os tipos e gera os arquivos de produção em `dist`. |
| `frontend` | `npm run preview` | Serve localmente o build de produção do front-end. |

Os testes usam `backend/prisma/test.db`, configurado pelo Vitest, e não devem alterar o banco normal `dev.db`.

## 5. Como o sistema está organizado

### Back-end (`backend/src`)

- `app.ts`: configura Express, JSON, CORS, Swagger, rotas e tratamento final de erros.
- `server.ts`: inicia o servidor HTTP.
- `routes/`: associa caminhos HTTP a middlewares e controllers.
- `controllers/`: converte requisições em respostas HTTP e chama os serviços.
- `services/`: implementa regras de negócio e acessa o banco com Prisma.
- `schemas/`: valida e normaliza os corpos das requisições com Zod.
- `middlewares/`: autentica JWT, valida entradas e padroniza erros.
- `lib/`: configuração, cliente Prisma, erros e utilitários compartilhados.
- `docs/swagger.ts`: especificação OpenAPI apresentada no Swagger UI.
- `tests/`: testes de autenticação/usuários, modelos, impressões e filamentos.

### Front-end (`frontend/src`)

- `App.tsx`: rotas da interface e proteção das páginas privadas.
- `contexts/AuthContext.tsx`: login, logout, token salvo e recuperação da sessão.
- `contexts/ThemeContext.tsx`: preferência de tema claro/escuro.
- `services/api.ts`: chamadas HTTP para a API e envio automático do JWT salvo.
- `pages/`: dashboard, login, cadastro, modelos, detalhes e impressões.
- `components/`: formulários, layout, cartões e componentes reutilizados.
- `types.ts`: tipos TypeScript usados na interface.

Rotas da interface: `/login` e `/register` são públicas; `/` abre o dashboard; `/models` lista modelos; `/models/:id` mostra detalhes e impressões do modelo; `/prints` lista e filtra impressões; `/prints/:id` abre os detalhes de uma impressão. As páginas após login são protegidas pelo `PrivateRoute`.

## 6. Banco e relacionamentos

O schema está em `backend/prisma/schema.prisma`.

```text
User 1 ─── N Model 1 ─── N Print
                  └──── N FilamentStock
FilamentStock 1 ─── N Print (filament opcional)
```

- Um usuário pode cadastrar vários modelos; cada modelo pertence a um usuário.
- Um modelo pode ter várias impressões e vários registros de estoque de filamento.
- Uma impressão pode referenciar um filamento do estoque do mesmo modelo.
- Excluir usuário/modelo propaga exclusões de acordo com `onDelete: Cascade`.
- Se um filamento referenciado por uma impressão for excluído, a relação opcional da impressão fica nula (`SetNull`).
- `totalGrams` guarda a capacidade total cadastrada; `usedGrams` guarda o consumo. O disponível é `totalGrams - usedGrams`.
- `estimatedTime` é armazenado em minutos.

O schema também declara `PrintConsumption`, mas os fluxos atuais de consumo atualizam `FilamentStock.usedGrams`; não existe rota que consulte ou gerencie `PrintConsumption`.

## 7. Fluxo de autenticação

1. O cliente envia nome, e-mail e senha a `POST /api/auth/register`.
2. A API valida os dados, normaliza o e-mail e salva a senha com hash bcrypt. A resposta não expõe a senha.
3. O cliente envia e-mail e senha a `POST /api/auth/login`.
4. Se as credenciais forem válidas, a API devolve um JWT assinado com `JWT_SECRET`, com validade de um dia.
5. Nas rotas privadas, o cliente envia o cabeçalho `Authorization: Bearer <token>`.
6. O middleware `authenticate` verifica assinatura e validade do JWT e disponibiliza o ID do usuário às rotas.
7. Os serviços filtram os dados pelo usuário autenticado. Um usuário não deve acessar modelos e registros pertencentes a outro.

No front-end, o token fica no `localStorage`. Respostas `401` fazem a interface encerrar a sessão.

## 8. Rotas da API

Todas as rotas, exceto cadastro e login, exigem JWT. A base é `http://localhost:3000/api`.

### Autenticação e usuário

| Método e caminho | Token | O que faz |
|---|---:|---|
| `POST /auth/register` | Não | Cadastra usuário. Corpo: `{ "name": "Ana", "email": "ana@example.com", "password": "123456" }`. Retorna `201` e `{ message, user }`. |
| `POST /auth/login` | Não | Valida credenciais. Corpo: `{ "email": "ana@example.com", "password": "123456" }`. Retorna token e usuário. |
| `GET /users/me` | Sim | Retorna os dados do usuário associado ao token. |

Regras de cadastro: nome não vazio, e-mail válido e senha com pelo menos seis caracteres. E-mail duplicado retorna `409`.

### Modelos

| Método e caminho | O que faz |
|---|---|
| `GET /models` | Lista os modelos do usuário autenticado e a contagem de impressões. |
| `POST /models` | Cria modelo. Corpo: `{ "name": "Suporte", "description": "Suporte de mesa", "category": "Utilidades" }`. `category` pode ser omitida e assume `Geral`. |
| `GET /models/:id` | Busca um modelo próprio. |
| `PUT /models/:id` | Atualiza os campos enviados, por exemplo `{ "name": "Suporte v2" }`. |
| `DELETE /models/:id` | Exclui modelo e dados relacionados em cascata. Retorna `204`. |
| `GET /models/:id/prints` | Retorna o modelo e a lista de suas impressões. Demonstra o relacionamento entre recursos. |
| `GET /models/:id/filaments` | Lista o estoque de filamentos vinculado ao modelo. |

### Impressões

| Método e caminho | O que faz |
|---|---|
| `GET /prints` | Lista impressões do usuário. Aceita `?status=PENDENTE` para filtrar. |
| `POST /prints` | Cria impressão associada a um modelo próprio. |
| `GET /prints/:id` | Consulta impressão própria, incluindo dados resumidos do modelo e filamento. |
| `PUT /prints/:id` | Atualiza campos ou muda status, respeitando as transições permitidas. |
| `DELETE /prints/:id` | Exclui impressão própria. Retorna `204`. |

Exemplo de criação:

```json
{
  "modelId": 1,
  "quantity": 2,
  "material": "PLA",
  "color": "Preto",
  "estimatedTime": 180,
  "notes": "Usar suporte",
  "filamentId": 1,
  "filamentUsedGrams": 80
}
```

Quantidade e tempo estimado devem ser inteiros positivos. `filamentId` é opcional e, quando usado, deve pertencer ao mesmo modelo. O consumo é registrado ao concluir a impressão.

Transições implementadas:

```text
PENDENTE ──> EM_ANDAMENTO ──> CONCLUIDA
    │               │
    └──> CANCELADA  └──> CANCELADA
```

`CONCLUIDA` e `CANCELADA` são estados finais. Ao concluir, a API registra `finishedAt` e atualiza o consumo do filamento. Uma transição inválida retorna `400`.

### Estoque de filamentos

| Método e caminho | O que faz |
|---|---|
| `GET /models/:modelId/filaments` | Lista filamentos de um modelo. |
| `POST /filaments` | Cadastra filamento para um modelo próprio. |
| `GET /filaments/:id` | Consulta estoque próprio. |
| `PATCH /filaments/:id` | Atualiza `spools` e/ou `gramPerSpool`; exige pelo menos um campo. |
| `DELETE /filaments/:id` | Exclui o registro de estoque. Impressões relacionadas mantêm a impressão e perdem apenas o vínculo. |

Exemplo de cadastro:

```json
{
  "modelId": 1,
  "material": "PLA",
  "color": "Preto",
  "spools": 2,
  "gramPerSpool": 1000
}
```

Exemplo de atualização:

```json
{ "spools": 3 }
```

Rolos e gramas por rolo devem ser inteiros positivos. A API não permite configurar capacidade total abaixo dos gramas já consumidos.

## 9. Como usar o Swagger corretamente

1. Inicie o back-end (`cd backend`, `npm run dev`).
2. Abra `http://localhost:3000/api-docs`.
3. Expanda `POST /auth/register`, clique em **Try it out**, informe JSON válido e clique em **Execute**. Cadastro não precisa de token.
4. Expanda `POST /auth/login`, faça login com o usuário criado e copie o valor de `token` da resposta.
5. Clique em **Authorize** no topo da página.
6. Cole **somente o token** no campo `bearerAuth` e confirme em **Authorize** e depois **Close**. O Swagger já adiciona o prefixo `Bearer` ao cabeçalho; não digite `Bearer ` junto com o token nesse campo.
7. Agora execute as operações privadas. Comece por `GET /users/me` para confirmar a autenticação.
8. Crie um modelo em `POST /models`; use o `id` retornado em `POST /prints` e `POST /filaments`.
9. Para testar o relacionamento, consulte `GET /models/{id}/prints` e `GET /models/{modelId}/filaments`.
10. Para testar o consumo de estoque, crie impressão associada a `filamentId`, altere o status primeiro para `EM_ANDAMENTO` e depois para `CONCLUIDA`.

O campo `servers` da especificação aponta para `/api`, então os caminhos exibidos no Swagger são relativos à base configurada. Se receber `401`, confira se autorizou com um token válido e se o servidor está usando o mesmo `JWT_SECRET` com que o token foi criado.

## 10. Exemplo de fluxo completo via terminal

Com a API ativa, execute estes exemplos em Bash, Git Bash ou WSL. No PowerShell, use a versão PowerShell do `curl.exe` ou teste as mesmas chamadas pela interface Swagger.

Cadastre o usuário:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","email":"ana@example.com","password":"123456"}'
```

Faça login e copie `token` da resposta:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ana@example.com","password":"123456"}'
```

Nos comandos seguintes, substitua `SEU_TOKEN` pelo valor copiado:

```bash
curl http://localhost:3000/api/users/me \
  -H "Authorization: Bearer SEU_TOKEN"
```

Crie um modelo:

```bash
curl -X POST http://localhost:3000/api/models \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Suporte","category":"Utilidades"}'
```

Copie o `id` do modelo retornado e use-o em `modelId` para cadastrar impressões e filamentos.

## 11. Testes e o que eles cobrem

Rode `cd backend` e `npm test`. A configuração Vitest prepara `test.db` separado; cada grupo limpa os dados antes dos cenários.

- `auth.test.ts`: registro, validação, duplicidade de e-mail, login, JWT e rota `/users/me`.
- `models.test.ts`: CRUD, validação, isolamento dos dados por usuário e autenticação.
- `prints.test.ts`: criação, validação, listagem/filtro, consulta, atualização, transições de status, exclusão e relação modelo-impressões.
- `filaments.test.ts`: estoque, validação, autenticação, isolamento entre usuários, CRUD, limite de consumo e integração com conclusão de impressão.

## 12. Tratamento de erros

As respostas de erro usam JSON com `error` e `message`; erros de validação também podem trazer `details`.

| HTTP | Significado comum |
|---|---|
| `400` | JSON inválido, dados que não passam na validação, transição inválida ou regra de negócio violada. |
| `401` | Token ausente, inválido ou expirado; credenciais inválidas no login. |
| `404` | Recurso não encontrado, rota inexistente ou recurso que não pertence ao usuário autenticado. |
| `409` | E-mail já cadastrado. |
| `500` | Erro interno inesperado. |

Exemplo:

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Os dados enviados são inválidos.",
  "details": { "email": ["E-mail inválido."] }
}
```

## 13. Roteiro sugerido para apresentação

1. Explique a divisão entre front-end, API e banco SQLite.
2. Mostre cadastro e login; destaque hash de senha e JWT.
3. Abra o dashboard e cadastre um modelo.
4. Crie impressão e demonstre a relação com o modelo.
5. Cadastre estoque de filamento e associe-o a uma impressão.
6. Mude o status da impressão até concluir e confira consumo.
7. Mostre no Swagger como autorizar com JWT e executar as mesmas rotas.
8. Rode `npm test` no back-end e explique o banco de teste separado.

## 14. Conceitos para estudar

- **REST:** recursos representados por URLs e operações definidas por métodos HTTP (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).
- **Middleware Express:** funções que processam a requisição antes do controller; aqui validam JWT e corpo.
- **Controller e service:** controller trata HTTP; service concentra as regras de negócio e operações Prisma.
- **ORM/Prisma:** schema declarativo que mapeia modelos para tabelas e permite consultar SQLite com TypeScript.
- **Relacionamento 1:N:** um `User` tem vários `Model`; um `Model` tem várias `Print` e `FilamentStock`.
- **JWT:** token assinado enviado em `Authorization`; autentica requisições, mas não substitui a verificação de propriedade dos dados.
- **Hash de senha:** bcrypt armazena um hash não reversível no lugar da senha original.
- **Validação:** Zod rejeita dados inválidos na entrada antes de executar a regra de negócio.
- **OpenAPI/Swagger:** descrição navegável dos caminhos, parâmetros, corpos, respostas e autenticação da API.
- **Testes de integração:** Supertest envia requisições HTTP à aplicação Express; Vitest executa os cenários.
