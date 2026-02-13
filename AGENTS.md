# AGENTS.md

## 项目概述

这是一个基于 **Model Context Protocol（MCP）** 的图像生成服务器项目。项目作为中间件，将 MCP 协议请求转换为标准的 OpenAI 兼容格式（`/v1/images/generations`）调用上游图像生成 API。专为云端部署场景设计，通过 **SSE（Server-Sent Events）** 提供服务，支持 Claude Desktop、RikkaHub 等 MCP 客户端远程连接。

## 技术栈

- **运行时环境**：Node.js >= 18.0.0
- **Web 框架**：Express.js 4.18.2
- **MCP 协议 SDK**：`@modelcontextprotocol/sdk` ^0.6.0
- **环境配置**：dotenv ^16.4.5
- **跨域支持**：cors ^2.8.5
- **模块格式**：ES Module（`"type": "module"`）

## 核心文件结构

```
mcp-image-gen/
├── src/
│   ├── index.js        # Express 服务器入口，处理 SSE 连接、消息路由和健康检查
│   ├── mcp-server.js  # MCP 服务器实现，定义工具列表和处理工具调用逻辑
│   └── config.js      # 配置管理，统一定义和读取环境变量
├── .env.example        # 环境变量配置模板
├── Dockerfile          # Docker 镜像构建文件
├── package.json        # 项目依赖声明和 npm 脚本
├── .github/workflows/
│   └── docker-publish.yml   # GitHub Actions 自动构建 Docker 镜像工作流
└── README.md           # 项目使用文档
```

## 构建和运行

### 本地开发

```bash
# 安装项目依赖
npm install

# 复制环境变量模板并配置
cp .env.example .env
# 编辑 .env 文件，填入 API_KEY 等必要配置

# 启动服务（前台运行）
npm start

# 开发模式（监听文件变化自动重启）
npm run dev
```

### Docker 部署

```bash
# 构建 Docker 镜像
docker build -t mcp-image-gen .

# 运行容器
docker run -d -p 3000:3000 -e API_KEY=your_api_key mcp-image-gen
```

### 服务端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/sse` | GET | SSE 长连接端点，客户端通过此连接接收 MCP 协议消息 |
| `/messages` | POST | 接收客户端发起的 MCP 协议消息 |
| `/health` | GET | 健康检查端点，返回服务状态和活跃会话数 |

## 开发约定

### 代码风格规范

- 使用 ES6+ 语法，模块导入导出采用 `import` / `export` 形式
- 变量和函数命名使用 camelCase 风格
- 常量命名使用大写字母加下划线
- 配置文件集中管理，所有环境变量在 `config.js` 中定义

### MCP 工具定义模式

在 `mcp-server.js` 中通过 `ListToolsRequestSchema` 注册工具，工具参数使用 JSON Schema 定义。当前提供的工具：

**generate_image**：调用云端 AI 模型生成图像

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| prompt | string | 是 | - | 图像描述提示词，建议使用英文 |
| n | integer | 否 | 1 | 生成图片数量，范围 1-4 |
| size | string | 否 | 1024x1024 | 图像尺寸，支持 16:9、9:16、3:2 等比例 |
| response_format | string | 否 | b64_json | 返回格式，b64_json 返回 Base64 编码图片，url 返回图片链接 |

### 配置管理

所有配置集中在 `src/config.js`，通过环境变量覆盖默认值：

| 环境变量 | 必填 | 默认值 | 说明 |
|----------|------|--------|------|
| PORT | 否 | 3000 | 服务监听端口 |
| API_KEY | 是 | - | 上游图像生成 API 密钥 |
| API_BASE_URL | 否 | https://new-api.zonde306.site/v1 | 上游 API 地址 |
| IMAGE_MODEL | 否 | grok-imagine-1.0 | 图像生成模型名称 |

### 日志输出规范

控制台日志使用 Emoji 前缀区分不同类型信息：

- `🔌` - SSE 连接相关事件
- `✨` - 服务启动和会话创建
- `❌` - 连接断开和异常错误
- `🎨` - 图像生成请求
- `💥` - 严重错误或未捕获异常
- `⚠️` - 警告信息

## 部署说明

### 支持的部署平台

- **Android Termux**：通过 pm2 进程管理器后台运行
- **ClawCloud / Zeabur**：使用 Docker 部署
- **VPS / 云服务器**：Docker 或直接运行
- **Windows 云电脑**：Node.js 环境直接运行

### 云端部署关键配置

1. **监听地址**：强制绑定 `0.0.0.0` 而非 `localhost`，确保外部可访问
2. **SSE 心跳**：每 15 秒发送注释帧（`: keepalive\n\n`），防止连接因空闲被中间设备断开
3. **Nginx 缓冲**：设置 `X-Accel-Buffering: no` 响应头，避免 Zeabur 等基于 Nginx 的平台滞留 SSE 消息
4. **CORS 跨域**：允许任何来源的跨域请求，支持 RikkaHub 等 Web 客户端直接连接

### Docker 环境变量

部署时需要通过环境变量传入 API 密钥：

```bash
docker run -d -p 3000:3000 \
  -e API_KEY=sk-xxxx \
  -e API_BASE_URL=https://your-api-endpoint/v1 \
  mcp-image-gen
```
