# API de Demonstração — Esteira CI/CD (Seminário N2)

[![Esteira CI/CD - API Seminario](https://github.com/eduus06/api-seminario-cicd/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/eduus06/api-seminario-cicd/actions/workflows/ci-cd.yml)

> Projeto desenvolvido para a disciplina de Engenharia de Software & DevOps, demonstrando a substituição completa do **Gitea** pelo ecossistema integrado **GitHub + GitHub Actions + GitHub Container Registry (GHCR)** com deploy automatizado e health check.

---

## 1. Visão Geral do Cenário

Esta aplicação é uma **API RESTful desenvolvida em Node.js com Express**, estruturada para servir de carga de trabalho real em uma esteira de Integração Contínua e Entrega Contínua (CI/CD).

A API gerencia tarefas e expõe métricas de integridade (*Health Check*), simulando um microsserviço corporativo que necessita de alta disponibilidade, testes automatizados e deploy confiável sem intervenção manual.

---

## 2. Especificação das Rotas e Endpoints

| Método | Rota | Descrição | Status de Sucesso | Tratamento de Erros |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Verificação de integridade do serviço (*Health Check* para deploy/orquestrador) | `200 OK` | N/A (Sempre 200 se ativo) |
| `GET` | `/api/info` | Metadados da aplicação, versão (1.0.0) e ambiente ativo | `200 OK` | N/A |
| `GET` | `/api/tarefas` | Retorna a listagem de todas as tarefas cadastradas na memória | `200 OK` (Array) | N/A |
| `GET` | `/api/tarefas/:id` | Busca os dados detalhados de uma tarefa específica por ID | `200 OK` | `404` (Não encontrada) |
| `POST` | `/api/tarefas` | Cadastra nova tarefa via JSON `{ "titulo": string }` com sanitização | `201 Created` | `400` (Título ausente/vazio/inválido) |

---

## 3. Como a Solução Atende aos 5 Requisitos do Seminário

A esteira automatizada substitui o Gitea de ponta a ponta sem dependência de ferramentas externas adicionais:

1. **Armazenamento de Código-Fonte (Requisito 1):**
   - Repositório centralizado no GitHub com histórico rastreável, Conventional Commits e governança via `.gitignore` e `.dockerignore`.
   - Política de branches protegidas (`main` protegida com bloqueio de push direto e obrigatoriedade de PR + status checks).
2. **Construção de Imagens Docker (Requisito 2):**
   - Workflow do GitHub Actions (`.github/workflows/ci-cd.yml`) utilizando Docker Buildx e cache de camadas da nuvem (`type=gha`).
   - Imagem otimizada baseada em `node:20-alpine` com usuário não-root `node` e tamanho de ~140 MB.
3. **Execução de Testes Automáticos (Requisito 3):**
   - Suíte de 9 testes automatizados com **Jest** e **Supertest** (`npm test`), validando 100% dos cenários de sucesso e caminhos de erro.
   - Quality Gate: O pipeline interrompe imediatamente se qualquer teste falhar, impedindo o build da imagem.
4. **Armazenamento em Container Registry (Requisito 4):**
   - Publicação automatizada no **GitHub Container Registry (`ghcr.io/eduus06/api-seminario-cicd`)**.
   - Dupla estratégia de tags: `:latest` (para rastreio da versão estável) e `:<short-sha>` (imutável, vinculada ao commit do Git).
   - Autenticação nativa e segura com `GITHUB_TOKEN`, sem necessidade de expor credenciais externas.
5. **Implantação Automatizada com Health Check & Rollback (Requisito 5):**
   - Execução do script orquestrador `scripts/deploy.sh` em ambiente de execução de containers.
   - Sondagem ativa na rota `/health` com até 15 tentativas a cada 2 segundos.
   - Mecanismo de **Rollback Automático**: se o health check falhar, o script restaura imediatamente a versão anterior estável sem indisponibilidade.

---

## 4. Estrutura do Pipeline no GitHub Actions

A esteira está dividida em 3 jobs sequenciais:

```
[ Job 1: Testes (Req 3) ] ➔ [ Job 2: Build Docker (Req 2) & Registry (Req 4) ] ➔ [ Job 3: Deploy Automatizado (Req 5) ]
```

* **Gatilhos:** Disparado em `push` nas branches `main` e `develop`, e em `pull_request` para a `main`.
* **Deploy:** Executado exclusivamente após o merge na branch `main`.

---

## 5. Execução Local

### Pré-requisitos
* Node.js 18+ ou 20+ instalado.
* NPM instalado.

### Passos
```bash
# 1. Instalar dependências
npm install

# 2. Executar suíte de testes automatizados (9 testes)
npm test

# 3. Iniciar o servidor localmente
npm start
```
A API estará acessível em: `http://localhost:3000`

---

## 6. Execução via Docker (Local)

```bash
# 1. Construir a imagem Docker
docker build -t api-seminario-cicd:latest .

# 2. Executar o container na porta 3000
docker run -d -p 3000:3000 --name api-teste api-seminario-cicd:latest

# 3. Validar a rota de health check
curl http://localhost:3000/health
```
