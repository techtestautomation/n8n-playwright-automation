FROM mcr.microsoft.com/playwright:v1.63.0-noble
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=3001 HOST=0.0.0.0
EXPOSE 3001
CMD ["node", "dist/src/server.js"]
