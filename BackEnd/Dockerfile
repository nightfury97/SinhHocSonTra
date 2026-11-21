FROM node:22-slim AS build
WORKDIR /app
# Dummy value so `prisma generate` (postinstall) can validate the datasource
# URL scheme without needing a real DB connection at build time.
ENV DATABASE_URL="mysql://user:pass@localhost:3306/db"
# Needed so `prisma generate` detects the right query-engine target.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json


FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL="mysql://user:pass@localhost:3306/db"
# Prisma's query engine binary needs libssl at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl netcat-traditional && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 4010
ENTRYPOINT ["./entrypoint.sh"]
