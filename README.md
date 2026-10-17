# 🚀 API de Demonstração — Esteira CI/CD (Seminário N2)

> Projeto desenvolvido para a disciplina de Engenharia de Software / DevOps, demonstrando a substituição completa do **Gitea** por uma plataforma integrada de CI/CD (ex: **GitLab** ou **GitHub**).

---

## 📌 1. Visão Geral do Cenário

Esta aplicação é uma **API RESTful desenvolvida em Node.js com Express**, estruturada para servir de carga de trabalho real em uma esteira de Integração Contínua e Entrega Contínua (CI/CD).

A API gerencia tarefas e expõe métricas de integridade (*Health Check*), simulando um microsserviço corporativo que necessita de alta disponibilidade, testes automatizados e deploy confiável sem intervenção manual.

---

## 🛠️ 2. Especificação das Rotas e Endpoints

| Método | Rota | Descrição | Status de Sucesso |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Verificação de integridade do serviço (*Health Check* para deploy/orquestrador) | `200 OK` |
| `GET` | `/api/info` | Metadados da aplicação, versão e ambiente ativo | `200 OK` |
| `GET` | `/api/tarefas` | Retorna a listagem de todas as tarefas cadastradas | `200 OK` |
| `GET` | `/api/tarefas/:id` | Busca os dados de uma tarefa específica por ID | `200 OK` (ou `404`) |
| `POST` | `/api/tarefas` | Cadastra uma nova tarefa (`{ "titulo": string }`) | `201 Created` (ou `400`) |

---

## 🔄 3. Como a API se Conecta aos 5 Requisitos do Seminário

Esta base de código foi projetada para alimentar diretamente os 5 pilares exigidos pelo professor:

1. **Armazenamento de Código-Fonte (Requisito 1):**
   - Repositório centralizado com histórico de commits, `.gitignore` adequado e política de branches (`main` protegida e `develop`).
2. **Construção de Imagens Docker (Requisito 2):**
   - Possui `Dockerfile` multi-stage/enxuto baseado em `node:20-alpine`, com usuário não-root e aproveitamento de cache de camadas.
3. **Execução de Testes Automáticos (Requisito 3):**
   - Contém suíte de testes com **Jest** e **Supertest** (`npm test`), validando contratos de rotas e health check antes de qualquer build.
4. **Armazenamento em Container Registry (Requisito 4):**
   - Imagem construída pelo pipeline é tagueada (ex: `:latest` e `:commit-hash`) e enviada ao Registry integrado da ferramenta.
5. **Implantação Automatizada (Requisito 5):**
   - O container é publicado e atualizado em um ambiente de execução (servidor/Docker Host), com o orquestrador validando a rota `/health` para confirmar o sucesso do deploy.

---

## 💻 4. Execução Local

### Pré-requisitos
* Node.js 18+ ou 20+ instalado.
* NPM instalado.

### Passos
```bash
# 1. Instalar dependências (incluindo dependências de desenvolvimento para testes)
npm install

# 2. Executar suíte de testes automatizados
npm test

# 3. Iniciar o servidor localmente
npm start
```
A API estará acessível em: `http://localhost:3000`

---

## 🐳 5. Execução via Docker (Local)

Para testar o empacotamento antes de rodar na esteira:

```bash
# 1. Construir a imagem Docker localmente
docker build -t api-seminario-cicd:latest .

# 2. Executar o container mapeando a porta 3000
docker run -d -p 3000:3000 --name api-teste api-seminario-cicd:latest

# 3. Testar a rota de health check
curl http://localhost:3000/health
```

---

## 🌿 6. Estrutura de Branches Recomendada

* `main`: Código estável em produção. Protegida contra commits diretos (exige Pull/Merge Request e aprovação do pipeline de testes).
* `develop` / `feature/*`: Branches de desenvolvimento onde os integrantes enviam novas alterações.
