# Build context is the monorepo root (../..) — this app shares one root
# package.json/node_modules with the other apps, not a per-app install.
FROM node:20-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx nest build user-management

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/dist/apps/user-management ./dist
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main.js"]
