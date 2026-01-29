FROM node:22-slim

# Install procps (provides 'ps' command needed by cli-testing-library)
RUN apt-get update && apt-get install -y --no-install-recommends procps && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies (--legacy-peer-deps for cli-testing-library/vitest conflict)
RUN npm ci --legacy-peer-deps

# Copy source and test files
COPY . .

# Build the project
RUN npm run build

# Default command runs all tests
CMD ["bash", "scripts/docker-test.sh"]
