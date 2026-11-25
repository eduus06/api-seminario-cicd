const app = require('./app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`[API CI/CD] Servidor rodando com sucesso na porta ${PORT}`);
  console.log(`[API CI/CD] Health Check disponível em: http://localhost:${PORT}/health`);
  console.log(`[API CI/CD] Documentação e Rotas em: http://localhost:${PORT}/api/info`);
});

// Encerramento gracioso: o Node como PID 1 no container ignora SIGTERM por padrão,
// o que fazia o "docker stop" do deploy esperar 10s antes de forçar o SIGKILL.
['SIGTERM', 'SIGINT'].forEach((sinal) => {
  process.on(sinal, () => {
    console.log(`[API CI/CD] ${sinal} recebido, encerrando...`);
    server.close(() => process.exit(0));
  });
});
