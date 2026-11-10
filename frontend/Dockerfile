# AlgoLearn frontend image: the Vite production build served by nginx, which also proxies /api to the backend.
# Build from the repository root (npm workspaces share the root lockfile):
#   docker build -f frontend/Dockerfile -t algolearn-frontend .
FROM node:22-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY e2e/package.json e2e/
RUN --mount=type=cache,target=/root/.npm npm ci -w frontend --include-workspace-root=false --no-audit --no-fund
COPY frontend/ frontend/
# Same-origin API calls (/api/...): nginx forwards them, so VITE_API_URL stays empty here.
RUN npm run build -w frontend

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/frontend/dist /usr/share/nginx/html
EXPOSE 80
