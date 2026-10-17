const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[API CI/CD] Servidor rodando com sucesso na porta ${PORT}`);
  console.log(`[API CI/CD] Health Check disponível em: http://localhost:${PORT}/health`);
  console.log(`[API CI/CD] Documentação e Rotas em: http://localhost:${PORT}/api/info`);
});
