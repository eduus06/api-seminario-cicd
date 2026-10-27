#!/usr/bin/env bash

set -euo pipefail

IMAGE_NAME="${IMAGE_NAME:-ghcr.io/eduus06/api-seminario-cicd}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
FULL_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
ROLLBACK_IMAGE="${IMAGE_NAME}:rollback"
CONTAINER_NAME="${CONTAINER_NAME:-api-seminario-cicd}"
HOST_PORT="${HOST_PORT:-3000}"
CONTAINER_PORT="${CONTAINER_PORT:-3000}"
NODE_ENV="${NODE_ENV:-production}"
SKIP_PULL="${SKIP_PULL:-false}"

HEALTH_URL="${HEALTH_URL:-http://localhost:${HOST_PORT}/health}"
MAX_RETRIES="${MAX_RETRIES:-15}"
SLEEP_SECONDS="${SLEEP_SECONDS:-2}"

echo "======================================================================"
echo "[DEPLOY] Iniciando implantação automatizada (Requisito 5)"
echo "[DEPLOY] Imagem alvo    : ${FULL_IMAGE}"
echo "[DEPLOY] Container      : ${CONTAINER_NAME}"
echo "[DEPLOY] Porta Mapeada  : ${HOST_PORT}:${CONTAINER_PORT}"
echo "[DEPLOY] Health Check   : ${HEALTH_URL}"
echo "======================================================================"

if [ "${SKIP_PULL}" != "true" ]; then
  echo "[DEPLOY] 1/5 Baixando imagem atualizada do Registry (${FULL_IMAGE})..."
  docker pull "${FULL_IMAGE}"
else
  echo "[DEPLOY] 1/5 SKIP_PULL=true — utilizando imagem Docker já presente localmente."
fi

HAS_ROLLBACK="false"
if docker ps -a --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"; then
  CURRENT_IMAGE_ID="$(docker inspect --format='{{.Image}}' "${CONTAINER_NAME}" 2>/dev/null || true)"
  if [ -n "${CURRENT_IMAGE_ID}" ]; then
    echo "[DEPLOY] 2/5 Salvando imagem anterior (${CURRENT_IMAGE_ID:0:19}) como '${ROLLBACK_IMAGE}'..."
    docker tag "${CURRENT_IMAGE_ID}" "${ROLLBACK_IMAGE}" && HAS_ROLLBACK="true"
  fi

  echo "[DEPLOY] 3/5 Parando e removendo container anterior (${CONTAINER_NAME})..."
  docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
else
  echo "[DEPLOY] 2/5 Nenhum container anterior encontrado. Primeiro deploy neste ambiente."
  echo "[DEPLOY] 3/5 Nenhuma limpeza de container necessária."
fi

echo "[DEPLOY] 4/5 Iniciando novo container '${CONTAINER_NAME}'..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  --restart unless-stopped \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  -e NODE_ENV="${NODE_ENV}" \
  -e PORT="${CONTAINER_PORT}" \
  "${FULL_IMAGE}"

echo "[DEPLOY] 5/5 Aguardando disponibilidade do serviço em ${HEALTH_URL}..."
ATTEMPT=1
DEPLOY_SUCCESS="false"

while [ "${ATTEMPT}" -le "${MAX_RETRIES}" ]; do
  if ! docker ps --format '{{.Names}}' | grep -Eq "^${CONTAINER_NAME}\$"; then
    echo "[ERRO] O container '${CONTAINER_NAME}' encerrou inesperadamente durante a inicialização!"
    break
  fi

  RESPONSE="$(curl -fsS --max-time 5 "${HEALTH_URL}" 2>/dev/null || true)"
  if echo "${RESPONSE}" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"OK"'; then
    echo "[SUCESSO] Health Check aprovado na tentativa ${ATTEMPT}/${MAX_RETRIES}!"
    echo "[SUCESSO] Resposta da API: ${RESPONSE}"
    DEPLOY_SUCCESS="true"
    break
  fi

  echo "  -> Tentativa ${ATTEMPT}/${MAX_RETRIES}: aguardando inicialização (${SLEEP_SECONDS}s)..."
  sleep "${SLEEP_SECONDS}"
  ATTEMPT=$((ATTEMPT + 1))
done

if [ "${DEPLOY_SUCCESS}" = "true" ]; then
  echo "----------------------------------------------------------------------"
  echo "[DEPLOY] Limpando imagens órfãs (dangling images)..."
  docker image prune -f >/dev/null 2>&1 || true
  echo "[DEPLOY] Implantação concluída com sucesso! Serviço ativo e saudável."
  echo "======================================================================"
  exit 0
fi

echo "======================================================================"
echo "[FALHA CRÍTICA] O serviço não respondeu ao Health Check após ${MAX_RETRIES} tentativas."
echo "[DIAGNÓSTICO] Últimas linhas de log do container '${CONTAINER_NAME}':"
docker logs --tail 50 "${CONTAINER_NAME}" || true
echo "----------------------------------------------------------------------"

echo "[ROLLBACK] Removendo container defeituoso..."
docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

if [ "${HAS_ROLLBACK}" = "true" ]; then
  echo "[ROLLBACK] Restaurando versão estável anterior (${ROLLBACK_IMAGE})..."
  docker run -d \
    --name "${CONTAINER_NAME}" \
    --restart unless-stopped \
    -p "${HOST_PORT}:${CONTAINER_PORT}" \
    -e NODE_ENV="${NODE_ENV}" \
    -e PORT="${CONTAINER_PORT}" \
    "${ROLLBACK_IMAGE}"
  echo "[ROLLBACK] Versão anterior restaurada."
fi

exit 1
