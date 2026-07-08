# ---- service-auth : Node.js 20 (Express) ----
FROM node:20-alpine

WORKDIR /app

# Installa prima le dipendenze per sfruttare la cache dei layer.
COPY package*.json ./
RUN npm install --omit=dev

# Copia il codice sorgente.
COPY src ./src

ENV PORT=3001
EXPOSE 3001

# Utente non-root per sicurezza.
USER node

CMD ["node", "src/index.js"]
