const request = require('supertest');
const app = require('../src/app');

describe('Suíte de Testes Automatizados - Validação do Pipeline CI/CD (Requisito 3)', () => {
  describe('GET /health - Monitoramento e Health Check', () => {
    it('deve retornar status 200 e indicadores de integridade do serviço', async () => {
      const res = await request(app).get('/health');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'OK');
      expect(res.body).toHaveProperty('servico', 'api-seminario-cicd');
      expect(res.body).toHaveProperty('timestamp');
      expect(typeof res.body.uptime).toBe('number');
    });
  });

  describe('GET /api/info - Metadados da Aplicação', () => {
    it('deve retornar status 200 com informações do projeto e versão', async () => {
      const res = await request(app).get('/api/info');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('projeto', 'N2 - Seminário CI/CD');
      expect(res.body).toHaveProperty('descricao');
      expect(res.body).toHaveProperty('ambiente');
      expect(res.body).toHaveProperty('versao', '1.0.0');
    });
  });

  describe('GET /api/tarefas - Listagem e Consulta de Tarefas', () => {
    it('deve retornar status 200 e lista de tarefas cadastradas', async () => {
      const res = await request(app).get('/api/tarefas');

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);
      expect(res.body[0]).toHaveProperty('id');
      expect(res.body[0]).toHaveProperty('titulo');
      expect(res.body[0]).toHaveProperty('concluida');
    });

    it('GET /api/tarefas/:id deve retornar 200 e os dados de uma tarefa existente', async () => {
      const res = await request(app).get('/api/tarefas/1');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual({
        id: 1,
        titulo: 'Pesquisar alternativas ao Gitea',
        concluida: true
      });
    });

    it('GET /api/tarefas/:id deve retornar 404 para ID inexistente', async () => {
      const res = await request(app).get('/api/tarefas/9999');

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('mensagem', 'Tarefa não encontrada');
    });
  });

  describe('POST /api/tarefas - Criação e Validação de Tarefas', () => {
    it('deve criar uma nova tarefa com status 201 e remover espaços extras do título', async () => {
      const res = await request(app)
        .post('/api/tarefas')
        .send({ titulo: '  Validar execução de testes na esteira  ' });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.titulo).toEqual('Validar execução de testes na esteira');
      expect(res.body.concluida).toBe(false);

      const busca = await request(app).get(`/api/tarefas/${res.body.id}`);
      expect(busca.statusCode).toEqual(200);
      expect(busca.body.titulo).toEqual('Validar execução de testes na esteira');
    });

    it('deve falhar com status 400 se o título estiver vazio ou apenas com espaços', async () => {
      const res = await request(app)
        .post('/api/tarefas')
        .send({ titulo: '   ' });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('erro', 'O campo titulo é obrigatório.');
    });

    it('deve falhar com status 400 se o campo titulo não for enviado', async () => {
      const res = await request(app)
        .post('/api/tarefas')
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('erro', 'O campo titulo é obrigatório.');
    });

    it('deve falhar com status 400 se o campo titulo não for uma string', async () => {
      const res = await request(app)
        .post('/api/tarefas')
        .send({ titulo: 12345 });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('erro', 'O campo titulo é obrigatório.');
    });
  });
});
