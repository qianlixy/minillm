# MiniLLM Unified Gateway

This is a lightweight API gateway for routing LLM requests, built with React, Vite, and Express. It proxies requests to Google Vertex AI.

## Deployment on Linux

This application can be built and deployed on any Linux server. It uses a single port for both the frontend and the backend API.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm` (comes with Node.js)

### Build Instructions

1. Clone or copy your project files to the Linux server.
2. Install the required dependencies:
   ```bash
   npm install
   ```
3. Build the application for production:
   ```bash
   npm run build
   ```
   This will bundle the frontend into the `dist/` directory and compile the backend server to `dist/server.cjs`.

### Running the Server

#### Development Environment

To start the server in development mode (with TypeScript execution via `tsx` and Vite middleware for the frontend), run:

```bash
npm run dev
```

#### Production Environment

To start the compiled server in production mode (after running `npm run build`), you can simply run:

```bash
npm start
```

By default, the server runs on port **3000**. 

#### Specifying a Custom Port

If you want to run the server on a different port (e.g., port 8080), you can use the `SERVER_PORT` environment variable:

```bash
SERVER_PORT=8080 npm start
```

Alternatively, you can run the server in the background using `nohup`:
```bash
SERVER_PORT=8080 nohup npm start > server.log 2>&1 &
```

Or use a process manager like **PM2**:
```bash
npm install -g pm2
SERVER_PORT=8080 pm2 start dist/server.cjs --name "minillm-gateway"
```

### Environment Variables

Ensure you have the required environment variables available for the server. You can create a `.env` file or export them directly in your shell:

```bash
export GOOGLE_CLOUD_PROJECT="your-google-cloud-project-id"
export SERVER_PORT=8080
npm start
```

**Note:** Google Vertex AI credentials (ADC) should also be configured on the Linux machine (e.g., via `gcloud auth application-default login` or by setting the `GOOGLE_APPLICATION_CREDENTIALS` environment variable) for the proxy to successfully authenticate with Vertex AI.
