# ---- gateway : Node.js 20 (Express reverse proxy) ----
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src ./src
ENV PORT=8000
EXPOSE 8000
USER node
CMD ["node", "src/index.js"]
