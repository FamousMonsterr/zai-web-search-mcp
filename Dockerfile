FROM node:22-alpine
WORKDIR /app
COPY mcp-server/package.json mcp-server/index.js ./mcp-server/
WORKDIR /app/mcp-server
ENV ZAI_API_KEY=""
CMD ["node", "index.js"]
