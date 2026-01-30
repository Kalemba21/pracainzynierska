FROM node:20-slim

WORKDIR /app

COPY package*.json ./

# Install all dependencies but skip postinstall scripts
# This prevents Playwright from downloading browsers (~3GB) while keeping vite
RUN npm install --ignore-scripts

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]