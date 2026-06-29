FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# Persist the JSON database outside the image
ENV DATA_DIR=/data
VOLUME /data

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
