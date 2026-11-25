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
5. **Implantação Automatizada em VM (AWS EC2) com Health Check & Rollback (Requisito 5):**
   - O GitHub Actions acessa uma **VM Linux com Docker** via SSH e executa o script `scripts/deploy.sh`.
   - O script faz `docker pull` da imagem recém-publicada no GHCR (tag imutável `:<short-sha>`), substitui o container e mantém a API acessível publicamente em `http://<IP-da-VM>:3000`.
   - Sondagem ativa na rota `/health` com até 15 tentativas a cada 2 segundos.
   - Mecanismo de **Rollback Automático**: se o health check falhar, o script restaura imediatamente a versão anterior estável.
   - Teste de fumaça externo: o pipeline acessa a API pelo IP público e confere se `/api/info` retorna o commit que acabou de ser implantado.

---

## 4. Estrutura do Pipeline no GitHub Actions

A esteira está dividida em 3 jobs sequenciais. Se um job falhar, os seguintes não são executados:

```
git push ➔ [ Job 1: Testes (Req 3) ] ➔ [ Job 2: Build Docker (Req 2) + Push GHCR (Req 4) ] ➔ [ Job 3: Deploy na VM via SSH (Req 5) ]
```

| Ferramenta | Responsabilidade |
| :--- | :--- |
| **GitHub** | Repositório Git do código, do `Dockerfile` e do workflow (Req 1) |
| **GitHub Actions** | Orquestra a esteira: executa testes, build, push e deploy a cada `push` |
| **Jest + Supertest** | Testes automatizados da API; uma falha interrompe a esteira (Req 3) |
| **Docker / Buildx** | Constrói a imagem da aplicação a partir do `Dockerfile` (Req 2) |
| **GHCR (`ghcr.io`)** | Registro que armazena as imagens com tags `:latest` e `:<short-sha>` (Req 4) |
| **AWS EC2 (Ubuntu + Docker)** | Ambiente de execução onde o container fica rodando e acessível (Req 5) |
| **`scripts/deploy.sh`** | Executado na VM: `docker pull`, troca do container, health check e rollback |

* **Gatilhos:** `push` nas branches `main` e `develop`, e `pull_request` para a `main`.
* **Push no registro:** apenas em `push` (pull requests só testam e constroem a imagem).
* **Deploy:** apenas em `push` na branch `main`.
* **Rastreabilidade:** a imagem recebe o commit via `--build-arg GIT_SHA`, exposto no campo `commit` de `/api/info`. Assim é possível conferir qual versão está no ar.

---

## 5. Configuração do Ambiente de Deploy (VM)

### 5.1 Preparar a VM (uma única vez)

O ambiente de execução usado pela equipe é uma instância **AWS EC2** (plano gratuito), mas qualquer VM Linux com IP público e Docker funciona.

1. Gerar a chave SSH de deploy (seção 5.2) e importar a chave **pública** em **EC2 > Key Pairs > Actions > Import key pair**.
2. Em **EC2 > Launch instance**:
   - AMI: **Ubuntu Server 24.04 LTS, 64-bit (x86)** (a imagem Docker é `amd64`);
   - Tipo: **t3.micro** (*Free tier eligible*);
   - Key pair: a chave importada no passo 1;
   - Security group com duas regras de entrada: **SSH (22)** e **Custom TCP 3000**, ambas com origem `0.0.0.0/0` (os runners do GitHub Actions não têm IP fixo; o SSH aceita apenas a chave cadastrada).
3. Instalar o Docker na instância (usuário padrão `ubuntu`):

```bash
sudo apt-get update && sudo apt-get install -y docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu   # permite usar o Docker sem sudo (vale a partir da próxima conexão)
```

> Na AWS, parar e iniciar a instância muda o IP público. Para manter o endereço fixo, associe um **Elastic IP** à instância ou atualize o secret `DEPLOY_HOST`.

### 5.2 Criar a chave SSH de deploy

Em qualquer máquina:

```bash
ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-actions-deploy"
```

Cadastre o conteúdo de `deploy_key.pub` na VM (na AWS, pelo *Import key pair*; em outras VMs, no arquivo `~/.ssh/authorized_keys` do usuário de deploy).

### 5.3 Cadastrar secrets no GitHub

Em **Settings > Secrets and variables > Actions**:

| Nome | Tipo | Valor |
| :--- | :--- | :--- |
| `DEPLOY_HOST` | Secret | IP público ou DNS público da VM (ex.: `ec2-x-x-x-x.us-east-2.compute.amazonaws.com`) |
| `DEPLOY_USER` | Secret | Usuário SSH da VM (`ubuntu` na AWS EC2 com Ubuntu) |
| `DEPLOY_SSH_KEY` | Secret | Conteúdo completo da chave **privada** `deploy_key` |
| `DEPLOY_SSH_PORT` | Secret (opcional) | Porta SSH, padrão `22` |
| `APP_PORT` | Variable (opcional) | Porta pública da API na VM, padrão `3000` |

A imagem no GHCR é pública, então a VM faz `docker pull` sem precisar de login.

### 5.4 Proteção da branch `main`

Em **Settings > Branches > Add rule** para `main`: marcar *Require a pull request before merging* e *Require status checks to pass* (selecionando o job "1. Testes Automatizados").

---

## 6. Roteiro de Demonstração

1. Alterar o código, por exemplo o campo `versao` em `src/app.js` (e o teste correspondente).
2. Fazer commit e `git push` (ou abrir e mesclar um PR para a `main`).
3. Em **Actions**, acompanhar: Job 1 (testes) ➔ Job 2 (build e push) ➔ Job 3 (deploy).
4. Em **Packages**, mostrar a nova tag `:<short-sha>` publicada no GHCR.
5. Acessar `http://<IP-da-VM>:3000/api/info` e mostrar a nova versão e o campo `commit`.
6. (Opcional) Quebrar um teste de propósito e mostrar que a esteira para no Job 1, sem gerar imagem nem deploy.

---

## 7. Execução Local

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

## 8. Execução via Docker (Local)

```bash
# 1. Construir a imagem Docker
docker build -t api-seminario-cicd:latest .

# 2. Executar o container na porta 3000
docker run -d -p 3000:3000 --name api-teste api-seminario-cicd:latest

# 3. Validar a rota de health check
curl http://localhost:3000/health
```
