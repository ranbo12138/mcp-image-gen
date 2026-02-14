# AGENTS.md

## 项目概述

这是一个基于 **Model Context Protocol（MCP）** 的图像生成服务器项目。项目作为中间件，将 MCP 协议请求转换为标准的 OpenAI 兼容格式（`/v1/images/generations`）调用上游图像生成 API。专为云端部署场景设计，通过 **Streamable HTTP** 提供服务，支持 Claude Desktop、RikkaHub 等 MCP 客户端远程连接。

## 技术栈

- **运行时环境**：Node.js >= 18.0.0
- **语言**：TypeScript 5.4+
- **Web 框架**：Express.js 4.18.2
- **MCP 协议 SDK**：`@modelcontextprotocol/sdk` ^1.0.0
- **参数验证**：Zod ^3.23.8
- **环境配置**：dotenv ^16.4.5
- **跨域支持**：cors ^2.8.5
- **模块格式**：ES Module（`"type": "module"`）

## 核心文件结构

```
mcp-image-gen/
├── src/
│   ├── index.ts        # Express 服务器入口，Streamable HTTP 传输层实现
│   └── config.ts       # 配置管理，环境变量定义和类型
├── dist/               # TypeScript 编译输出（由 npm run build 生成）
│   ├── index.js
│   └── config.js
├── .env.example        # 环境变量配置模板
├── Dockerfile          # Docker 镜像构建文件
├── package.json        # 项目依赖声明和 npm 脚本
├── tsconfig.json       # TypeScript 编译配置
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

# 构建 TypeScript
npm run build

# 启动服务（前台运行）
npm start

# 开发模式（监听文件变化自动重启）
npm run dev

# 使用 MCP Inspector 测试
npm run inspect
```

### Docker 部署

```bash
# 构建 Docker 镜像
docker build -t mcp-image-gen .

# 运行容器
docker run -d -p 3000:3000 -e API_KEY=your_api_key mcp-image-gen

# 使用 GitHub Container Registry 镜像
docker run -d -p 3000:3000 -e API_KEY=your_api_key ghcr.io/ranbo12138/mcp-image-gen:latest
```

### 服务端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/mcp` | POST | MCP 协议主端点，处理客户端请求和初始化 |
| `/mcp` | GET | SSE 通知端点，服务器向客户端推送消息 |
| `/mcp` | DELETE | 会话终止端点 |
| `/health` | GET | 健康检查端点，返回服务状态和活跃会话数 |

## 开发约定

### 代码风格规范

- 使用 TypeScript，启用严格模式（`strict: true`）
- 模块导入导出采用 ES Module 形式
- 变量和函数命名使用 camelCase 风格
- 常量命名使用大写字母加下划线
- 所有配置和类型在 `config.ts` 中集中定义

### MCP 服务器架构

项目采用 MCP SDK 推荐的高级 API 模式：

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

// 创建服务器实例
const server = new McpServer({
  name: "cloud-image-generator",
  version: "3.0.0",
});

// 使用 Zod 定义参数 Schema
server.registerTool("generate_image", {
  title: "Generate Image",
  description: "...",
  inputSchema: {
    prompt: z.string().describe("..."),
    size: z.enum(["16:9", "9:16", "1:1", "2:3", "3:2"]).default("2:3"),
  },
}, async (params) => {
  // 工具实现
  return { content: [{ type: "text", text: "..." }] };
});
```

### generate_image 工具

**参数定义：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| prompt | string | 是 | - | 图像描述提示词，建议使用英文以获得最佳效果 |
| n | integer | 否 | 1 | 生成图片数量，范围 1-4 |
| size | string | 否 | 2:3 | 图像宽高比，支持 16:9、9:16、1:1、2:3、3:2 |

**宽高比说明：**

| 值 | 方向 | 典型用途 |
|----|------|----------|
| `16:9` | 横屏 | 视频封面、横幅广告 |
| `9:16` | 竖屏 | 手机壁纸、社交媒体竖版内容 |
| `1:1` | 正方形 | 社交媒体头像、Instagram 帖子 |
| `2:3` | 竖向 | 人像摄影、海报（默认） |
| `3:2` | 横向 | 风景摄影、产品展示 |

**注意：** 工具固定返回图片 URL 链接。

### 配置管理

所有配置集中在 `src/config.ts`，通过环境变量覆盖默认值：

| 环境变量 | 必填 | 默认值 | 说明 |
|----------|------|--------|------|
| PORT | 否 | 3000 | 服务监听端口 |
| API_KEY | 是 | - | 上游图像生成 API 密钥 |
| API_BASE_URL | 否 | https://new-api.zonde306.site/v1 | 上游 API 地址 |
| IMAGE_MODEL | 否 | grok-imagine-1.0 | 图像生成模型名称 |

### 日志输出规范

控制台日志使用 Emoji 前缀区分不同类型信息：

- `🔌` - MCP 连接相关事件
- `✨` - 服务启动和会话创建
- `✅` - 连接成功确认
- `❌` - 连接断开和异常错误
- `🎨` - 图像生成请求
- `⚠️` - 警告信息
- `🔧` - 环境变量加载状态

## 部署说明

### 支持的部署平台

- **Android Termux**：通过 pm2 进程管理器后台运行
- **ClawCloud / Zeabur**：使用 Docker 部署
- **VPS / 云服务器**：Docker 或直接运行
- **Windows 云电脑**：Node.js 环境直接运行

### 云端部署关键配置

1. **监听地址**：强制绑定 `0.0.0.0` 而非 `localhost`，确保外部可访问
2. **CORS 跨域**：配置 `exposedHeaders: ['Mcp-Session-Id']`，支持浏览器客户端
3. **会话管理**：使用 StreamableHTTPServerTransport 的内置会话管理
4. **Docker 健康检查**：使用 Node.js 内置 fetch 进行健康检查

### Docker 环境变量

部署时需要通过环境变量传入 API 密钥：

```bash
docker run -d -p 3000:3000 \
  -e API_KEY=sk-xxxx \
  -e API_BASE_URL=https://your-api-endpoint/v1 \
  ghcr.io/ranbo12138/mcp-image-gen:latest
```

### CI/CD 自动构建

项目通过 GitHub Actions 实现自动构建和发布 Docker 镜像：

- **触发条件**：推送到 `main` 分支
- **镜像仓库**：GitHub Container Registry (`ghcr.io`)
- **标签策略**：`latest` + Git SHA
- **构建环境**：actions/checkout@v4、docker/build-push-action@v5

## 架构演进

### v3.0.0（当前版本）

- 迁移到 TypeScript
- 使用 McpServer 高级 API + registerTool
- 采用 StreamableHTTPServerTransport（推荐的新传输层）
- 使用 Zod 进行参数验证
- 单文件架构（index.ts 包含所有工具定义）

### v2.x（旧版本）

- JavaScript ES Module
- 低级 Server API + setRequestHandler
- SSEServerTransport
- JSON Schema 参数验证
- 多文件架构（mcp-server.js 单独定义工具）

## 版本历史

- **v3.0.0** - 完全重构：TypeScript + McpServer 高级 API + StreamableHTTP
- **v2.0.1** - 修复 SSE 连接响应头冲突和健康检查启动时间
- **v2.0.0** - 重构图像尺寸参数为宽高比模式
