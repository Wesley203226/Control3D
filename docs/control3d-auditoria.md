# Auditoria geral do Control3D

## Objetivo

Transformar a aplicação de um painel funcional de demonstração em um ambiente de operação profissional para gestão de impressão 3D FDM, com foco em produtividade, clareza visual e experiência real de trabalho.

## Ramo A — Responsividade e layout

### Problemas verificados
- breakpoints insuficientes para desktop/tablet/mobile;
- uso de uma grade rígida em telas estreitas;
- componentes que dependem de largura fixa em áreas críticas;
- barra lateral e cards com comportamento instável em telas pequenas;
- risco de scroll horizontal por conteúdo em painéis e selects.

### Práticas recomendadas
- definir breakpoints com escala realista: 360, 480, 768, 1024, 1280, 1440, 1920;
- usar `minmax(0, 1fr)` em grids e cards para evitar overflow;
- aplicar `overflow-x: hidden` ao body e testar todas as páginas em modo mobile;
- manter o layout principal estável sem depender de largura fixa em textos e tabelas.

## Ramo B — Sistema de design

### Problemas verificados
- visual inconsistente entre telas;
- espaçamentos, bordas e sombras pouco padronizados;
- ausência de tokens reutilizáveis.

### Práticas recomendadas
- usar espaçamentos em escala: 8, 16, 24, 32, 48, 64;
- definir bordas em 4, 8, 12, 16;
- limitar sombras a 3 intensidades;
- manter um único conjunto de componentes de botão, input e card;
- fixar contraste mínimo para legibilidade.

## Ramo C — Glassmorphism

### Problemas verificados
- excesso de blur em superfícies grandes;
- desgaste de performance em GPUs leves;
- perda de legibilidade em áreas com texto.

### Regra aplicada
- evitar blur em cards, listas, grid de dados e áreas de produção;
- permitir blur somente em camadas discretas como modal, menu e painel de preferências;
- manter modo de desempenho para desativar efeitos pesados.

## Ramo D — UX e acompanhamento do usuário

### Problemas verificados
- ausência de CTA clara em estados vazios;
- dashboard sem narrativa de progresso;
- telas com dados enxutos, mas sem indicação de próximo passo.

### Práticas recomendadas
- em vazio: mostrar mensagem + ação imediata;
- quando a impressão é criada: indicar o próximo passo;
- em conclusão: destacar tempo, material e desempenho;
- usar KPI como guia do fluxo de trabalho e não só contadores genéricos.

## Ramo E — Dashboard

### Métricas indispensáveis
- total de impressões;
- concluídas, em andamento e canceladas;
- horas estimadas acumuladas;
- material consumido;
- taxa de sucesso;
- defeitos ou alertas;
- faturamento ou custo operacional opcional.

### Prática recomendada
- dividir o painel em: desempenho, produção, qualidade e energia operacional;
- usar dados calculados a partir do estado e dos registros reais;
- mostrar uma visão mais próxima de operação real, não só de CRUD.

## Ramo F — Impressoras e perfis de máquina

### Entidade recomendada
- nome;
- marca;
- modelo;
- volume de impressão;
- bico;
- firmware;
- status operacional.

### Exemplos práticos
- Bambu Lab P1S;
- Creality Ender 3 V3;
- Bambu Lab K1 Max;
- Elegoo Neptune 4.

### Recomendação de implementação
- armazenar perfil ativo em `localStorage` ou em API;
- usar seleção de impressora para contextualizar produção, tempo e material;
- permitir trocar o perfil com pouco esforço para a operação do usuário.

## Ramo G — Personalização do espaço de trabalho

### Funcionalidade desejada
- trocar fundo de parede do ambiente de trabalho;
- manter a experiência visual mais confortável para uso prolongado;
- permitir identidade visual sem quebrar o layout.

### Prática recomendada
- editar preferências do workspace em um painel leve;
- persistir escolha em armazenamento local;
- manter 3 a 4 presets e permitir customização futura via URL ou arquivo.

## Ramo H — Boas práticas de projeto

1. separar UI, dados e regras de negócio;
2. manter componentes pequenos e reutilizáveis;
3. persistir preferências do usuário localmente;
4. validar a experiência em desktop e mobile antes de fechar o escopo;
5. criar estados vazios e de erro consistentes;
6. priorizar clareza visual sobre quantidade de efeitos;
7. usar métricas reais do processo para dar vida ao produto;
8. revisar o fluxo completo de criação → execução → conclusão.

## Checklist de evolução

- [x] Responsividade aprimorada para telas largas e estreitas
- [x] Sistema de wallpaper e preferências do espaço de trabalho
- [x] Dashboard com métricas mais úteis para operação
- [x] Perfil de impressora ativo em interface de usuário
- [ ] API de impressoras (próximo passo ideal)
- [ ] cadastro de materiais por perfil de máquina
- [ ] custo e lucro por impressão
- [ ] relatórios por semana/mês
- [ ] integração com dados de impressora local ou externa

## Recomendação de entrega

A prioridade ideal para a próxima etapa é:

1. estabilizar layout e responsividade;
2. padronizar design tokens;
3. concluir preferências de workspace;
4. evoluir dashboard com dados de produção;
5. criar gestão de impressoras e materiais;
6. preparar um módulo de relatórios e custos.

Caso a aplicação siga por esse caminho, ela evolui de um painel de portfólio para uma ferramenta de operação real para impressão 3D FDM.
