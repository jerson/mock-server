FROM oven/bun:latest

WORKDIR /app

COPY package.json bun.lock ./

RUN apt-get update && apt-get install -y wget curl && apt-get clean && rm -rf /var/lib/apt/lists/*
RUN bun install

COPY . .

EXPOSE 3000

CMD ["bun", "start"]
