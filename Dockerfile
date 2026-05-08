FROM node:22

WORKDIR /app

# Install pnpm once — stays in PATH for all subsequent RUN instructions
RUN npm install -g pnpm@10.28.2

# Copy full repo (node_modules and dist excluded via .dockerignore)
COPY . .

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma client + compile NestJS API
RUN pnpm --filter api build

EXPOSE 10000

# prisma migrate deploy runs automatically inside start:prod
CMD ["pnpm", "--filter", "api", "start:prod"]
