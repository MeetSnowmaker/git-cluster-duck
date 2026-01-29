FROM node:22-slim

# Install nyc globally for coverage merging
RUN npm install -g nyc

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source and test files
COPY . .

# Build the project
RUN npm run build

# Default command runs all tests
CMD ["bash", "scripts/docker-test.sh"]
