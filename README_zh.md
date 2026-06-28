# MiniLLM 统一网关 (MiniLLM Unified Gateway)

这是一个用于路由 LLM 请求的轻量级 API 网关，使用 React、Vite 和 Express 构建。它将请求代理到 Google Vertex AI。

## 在 Linux 上部署

该应用程序可以在任何 Linux 服务器上构建和部署。它为前端和后端 API 使用单个端口。

### 先决条件

- [Node.js](https://nodejs.org/) (推荐 v18 或更高版本)
- `npm` (随 Node.js 一起提供)

### 构建说明

1. 将项目文件克隆或复制到 Linux 服务器。
2. 安装所需的依赖项：
   ```bash
   npm install
   ```
3. 构建用于生产环境的应用程序：
   ```bash
   npm run build
   ```
   这会将前端打包到 `dist/` 目录中，并将后端服务器编译为 `dist/server.cjs`。

### 运行服务器

#### 开发环境

要在开发模式下启动服务器 (通过 `tsx` 执行 TypeScript，并为前端提供 Vite 中间件)，请运行：

```bash
npm run dev
```

#### 生产环境

要在生产模式下启动已编译的服务器 (在运行 `npm run build` 之后)，您只需运行：

```bash
npm start
```

默认情况下，服务器在端口 **3000** 上运行。

#### 指定自定义端口

如果您想在其他端口 (例如端口 8080) 上运行服务器，可以使用 `SERVER_PORT` 环境变量：

```bash
SERVER_PORT=8080 npm start
```

或者，您可以使用 `nohup` 在后台运行服务器：
```bash
SERVER_PORT=8080 nohup npm start > server.log 2>&1 &
```

或者使用像 **PM2** 这样的进程管理器：
```bash
npm install -g pm2
SERVER_PORT=8080 pm2 start dist/server.cjs --name "minillm-gateway"
```

### 环境变量

确保服务器具备所需的环境变量。您可以创建一个 `.env` 文件，或者直接在您的 shell 中导出它们：

```bash
export GOOGLE_CLOUD_PROJECT="your-google-cloud-project-id"
export SERVER_PORT=8080
npm start
```

**注意：** 还应在 Linux 机器上配置 Google Vertex AI 凭据 (ADC) (例如，通过 `gcloud auth application-default login` 或通过设置 `GOOGLE_APPLICATION_CREDENTIALS` 环境变量)，以便代理能够成功地向 Vertex AI 发起身份验证。
