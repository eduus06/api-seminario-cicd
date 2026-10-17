# ====================================================================
# Dockerfile Otimizado para API em Node.js (Ambiente CI/CD)
# Baseado em imagem oficial Alpine Linux (leve e segura)
# ====================================================================

FROM node:20-alpine

# Define diretório de trabalho na imagem
WORKDIR /usr/src/app

# Copia arquivos de definição de pacotes primeiro (aproveitamento do cache de camadas)
COPY package*.json ./

# Instala apenas dependências de produção (reduz drasticamente o tamanho final)
RUN npm ci --omit=dev

# Copia código-fonte da aplicação
COPY src/ ./src/

# Boa prática de segurança: executar sem privilégios de root
USER node

# Porta padrão exposta pelo container
EXPOSE 3000

# Variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=3000

# Comando de inicialização
CMD ["node", "src/server.js"]
