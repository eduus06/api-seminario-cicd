const request = require('supertest');
const app = require('../src/app');

describe('Suíte de Testes Automatizados - Validação do Pipeline CI/CD', () => {
  it('GET /health deve retornar status 200 e serviço saudável', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'OK');
    expect(res.body).toHaveProperty('servico', 'api-seminario-cicd');
  });

  it('GET /api/info deve retornar os metadados do projeto', async () => {
    const res = await request(app).get('/api/info');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('projeto', 'N2 - Seminário CI/CD');
    expect(res.body).toHaveProperty('versao', '1.0.0');
  });

  it('GET /api/tarefas deve retornar lista com pelo menos 1 item', async () => {
    const res = await request(app).get('/api/tarefas');
    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/tarefas deve criar uma nova tarefa com sucesso', async () => {
    const res = await request(app)
      .post('/api/tarefas')
      .send({ titulo: 'Validar execução de testes na esteira' });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.titulo).toEqual('Validar execução de testes na esteira');
    expect(res.body.concluida).toBe(false);
  });

  it('POST /api/tarefas deve falhar com 400 se o título estiver vazio', async () => {
    const res = await request(app)
      .post('/api/tarefas')
      .send({ titulo: '   ' });

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('erro');
  });

  it('GET /api/tarefas/:id deve retornar 404 para ID inexistente', async () => {
    const res = await request(app).get('/api/tarefas/9999');
    expect(res.statusCode).toEqual(404);
    expect(res.body).toHaveProperty('mensagem', 'Tarefa não encontrada');
  });
});
