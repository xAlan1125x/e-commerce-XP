FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx tsc --noEmit

EXPOSE 3000

CMD ["sh", "-c", "npm run db:deploy && npm run db:seed && npm start"]
