const bearer = [{ bearerAuth: [] }];
const ref = (n: string) => ({ $ref: `#/components/schemas/${n}` });
const json = (schema: object) => ({ 'application/json': { schema } });
const body = (n: string) => ({ required: true, content: json(ref(n)) });
const ok = (description: string, schema?: object) => ({ description, ...(schema ? { content: json(schema) } : {}) });
const arr = (n: string) => ({ type: 'array', items: ref(n) });
const error = (description: string) => ({ description, content: json(ref('Error')) });
const id = [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }];
const common = { 401: error('Não autenticado'), 404: error('Não encontrado') };

export const swaggerDocument = {
  openapi: '3.0.3',
  info: { title: 'CONTROL 3D API', version: '1.0.0', description: 'API de gerenciamento de modelos e impressões 3D.' },
  servers: [{ url: '/api' }],
  tags: [{ name: 'Authentication' }, { name: 'Users' }, { name: 'Models' }, { name: 'Prints' }, { name: 'Filaments' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        properties: { error: { type: 'string', example: 'VALIDATION_ERROR' }, message: { type: 'string' } },
      },
      Register: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: { name: { type: 'string', example: 'João' }, email: { type: 'string', example: 'joao@email.com' }, password: { type: 'string', example: '123456' } },
      },
      Login: {
        type: 'object',
        required: ['email', 'password'],
        properties: { email: { type: 'string', example: 'joao@email.com' }, password: { type: 'string', example: '123456' } },
      },
      User: {
        type: 'object',
        properties: { id: { type: 'integer' }, name: { type: 'string' }, email: { type: 'string' }, createdAt: { type: 'string', format: 'date-time' } },
      },
      RegisterResponse: {
        type: 'object',
        properties: { message: { type: 'string' }, user: ref('User') },
      },
      LoginResponse: {
        type: 'object',
        properties: { message: { type: 'string' }, token: { type: 'string' }, user: ref('User') },
      },
      ModelInput: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string', example: 'Suporte para celular' }, description: { type: 'string', example: 'Suporte de mesa para celular' }, category: { type: 'string', example: 'Utilidades' } },
      },
      Model: {
        type: 'object',
        properties: { id: { type: 'integer' }, name: { type: 'string' }, description: { type: 'string', nullable: true }, category: { type: 'string' }, userId: { type: 'integer' }, printsCount: { type: 'integer' }, createdAt: { type: 'string', format: 'date-time' } },
      },
      PrintInput: {
        type: 'object',
        required: ['modelId', 'quantity', 'material', 'color', 'estimatedTime'],
        properties: {
          modelId: { type: 'integer', example: 1 },
          quantity: { type: 'integer', example: 2 },
          material: { type: 'string', example: 'PLA' },
          color: { type: 'string', example: 'Preto' },
          estimatedTime: { type: 'integer', description: 'Minutos', example: 180 },
          status: { type: 'string', enum: ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'] },
          notes: { type: 'string', example: 'Imprimir com suporte' },
        },
      },
      Print: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, modelId: { type: 'integer' }, quantity: { type: 'integer' }, material: { type: 'string' },
          color: { type: 'string' }, estimatedTime: { type: 'integer' }, status: { type: 'string' }, notes: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }, finishedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      FilamentInput: {
        type: 'object',
        required: ['modelId', 'material', 'color', 'spools', 'gramPerSpool'],
        properties: {
          modelId: { type: 'integer', example: 1 },
          material: { type: 'string', example: 'PLA' },
          color: { type: 'string', example: 'Preto' },
          spools: { type: 'integer', minimum: 1, example: 2 },
          gramPerSpool: { type: 'integer', minimum: 1, example: 1000 },
        },
      },
      FilamentUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          spools: { type: 'integer', minimum: 1, example: 3 },
          gramPerSpool: { type: 'integer', minimum: 1, example: 1000 },
        },
      },
      Filament: {
        type: 'object',
        properties: {
          id: { type: 'integer' }, modelId: { type: 'integer' }, material: { type: 'string' }, color: { type: 'string' },
          spools: { type: 'integer' }, gramPerSpool: { type: 'integer' },
          totalGrams: { type: 'integer', description: 'Capacidade total cadastrada em gramas.' },
          usedGrams: { type: 'integer', description: 'Quantidade consumida em gramas.' },
          createdAt: { type: 'string', format: 'date-time' }, updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ModelPrints: { type: 'object', properties: { model: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' } } }, prints: arr('Print') } },
    },
  },
  paths: {
    '/auth/register': { post: { tags: ['Authentication'], summary: 'Cadastrar usuário', requestBody: body('Register'), responses: { 201: ok('Criado', ref('RegisterResponse')), 400: error('Dados inválidos'), 409: error('E-mail já cadastrado') } } },
    '/auth/login': { post: { tags: ['Authentication'], summary: 'Login (retorna JWT)', requestBody: body('Login'), responses: { 200: ok('Token JWT', ref('LoginResponse')), 401: error('Credenciais inválidas') } } },
    '/users/me': { get: { tags: ['Users'], summary: 'Usuário autenticado', security: bearer, responses: { 200: ok('OK', ref('User')), 401: common[401] } } },
    '/models': {
      get: { tags: ['Models'], summary: 'Listar modelos', security: bearer, responses: { 200: ok('OK', arr('Model')), 401: common[401] } },
      post: { tags: ['Models'], summary: 'Criar modelo', security: bearer, requestBody: body('ModelInput'), responses: { 201: ok('Criado', ref('Model')), 400: error('Dados inválidos'), 401: common[401] } },
    },
    '/models/{id}': {
      get: { tags: ['Models'], summary: 'Buscar modelo', security: bearer, parameters: id, responses: { 200: ok('OK', ref('Model')), ...common } },
      put: { tags: ['Models'], summary: 'Atualizar modelo', security: bearer, parameters: id, requestBody: body('ModelInput'), responses: { 200: ok('OK', ref('Model')), ...common } },
      delete: { tags: ['Models'], summary: 'Excluir modelo (e suas impressões)', security: bearer, parameters: id, responses: { 204: ok('Excluído'), ...common } },
    },
    '/models/{id}/prints': { get: { tags: ['Models'], summary: 'Impressões de um modelo', security: bearer, parameters: id, responses: { 200: ok('OK', ref('ModelPrints')), ...common } } },
    '/prints': {
      get: { tags: ['Prints'], summary: 'Listar impressões', security: bearer, parameters: [{ name: 'status', in: 'query', schema: { type: 'string' } }], responses: { 200: ok('OK', arr('Print')), 401: common[401] } },
      post: { tags: ['Prints'], summary: 'Criar impressão', security: bearer, requestBody: body('PrintInput'), responses: { 201: ok('Criado', ref('Print')), 400: error('Dados inválidos'), 401: common[401], 404: common[404] } },
    },
    '/prints/{id}': {
      get: { tags: ['Prints'], summary: 'Buscar impressão', security: bearer, parameters: id, responses: { 200: ok('OK', ref('Print')), ...common } },
      put: { tags: ['Prints'], summary: 'Atualizar impressão / alterar status', security: bearer, parameters: id, requestBody: body('PrintInput'), responses: { 200: ok('OK', ref('Print')), 400: error('Dados inválidos ou transição inválida'), ...common } },
      delete: { tags: ['Prints'], summary: 'Excluir impressão', security: bearer, parameters: id, responses: { 204: ok('Excluído'), ...common } },
    },
    '/models/{modelId}/filaments': {
      get: {
        tags: ['Filaments'], summary: 'Listar estoque de filamentos de um modelo', security: bearer,
        parameters: [{ name: 'modelId', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: ok('OK', arr('Filament')), 401: common[401] },
      },
    },
    '/filaments': {
      post: {
        tags: ['Filaments'], summary: 'Cadastrar filamento no estoque de um modelo', security: bearer,
        requestBody: body('FilamentInput'),
        responses: { 201: ok('Criado', ref('Filament')), 400: error('Dados inválidos'), 401: common[401], 404: error('Modelo não encontrado') },
      },
    },
    '/filaments/{id}': {
      get: { tags: ['Filaments'], summary: 'Consultar filamento', security: bearer, parameters: id, responses: { 200: ok('OK', ref('Filament')), ...common } },
      patch: {
        tags: ['Filaments'], summary: 'Atualizar quantidade de rolos ou peso por rolo', security: bearer,
        parameters: id, requestBody: body('FilamentUpdate'),
        responses: { 200: ok('OK', ref('Filament')), 400: error('Dados inválidos ou estoque menor que o consumo'), ...common },
      },
      delete: { tags: ['Filaments'], summary: 'Excluir filamento', security: bearer, parameters: id, responses: { 204: ok('Excluído'), ...common } },
    },
  },
};
