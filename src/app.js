const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Dados em memória para simulação rápida
let tarefas = [
  { id: 1, titulo: "Pesquisar alternativas ao Gitea", concluida: true },
  { id: 2, titulo: "Configurar pipeline de CI/CD", concluida: false },
  { id: 3, titulo: "Fazer deploy do container Docker", concluida: false }
];

// 1. Rota de Health Check (Crucial para monitoramento e validação de deploy)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    servico: 'api-seminario-cicd'
  });
});

// 2. Rota de Informações da API (Metadados do Seminário)
app.get('/api/info', (req, res) => {
  res.status(200).json({
    projeto: 'N2 - Seminário CI/CD',
    descricao: 'API para demonstração de esteira automatizada em substituição ao Gitea',
    ambiente: process.env.NODE_ENV || 'development',
    versao: '1.0.0'
  });
});

// 3. Listar tarefas
app.get('/api/tarefas', (req, res) => {
  res.status(200).json(tarefas);
});

// 4. Buscar tarefa por ID
app.get('/api/tarefas/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const tarefa = tarefas.find(t => t.id === id);
  if (!tarefa) {
    return res.status(404).json({ mensagem: 'Tarefa não encontrada' });
  }
  res.status(200).json(tarefa);
});

// 5. Criar nova tarefa
app.post('/api/tarefas', (req, res) => {
  const { titulo } = req.body;
  if (!titulo || typeof titulo !== 'string' || titulo.trim() === '') {
    return res.status(400).json({ erro: 'O campo titulo é obrigatório.' });
  }

  const novaTarefa = {
    id: tarefas.length > 0 ? Math.max(...tarefas.map(t => t.id)) + 1 : 1,
    titulo: titulo.trim(),
    concluida: false
  };

  tarefas.push(novaTarefa);
  res.status(201).json(novaTarefa);
});

module.exports = app;
