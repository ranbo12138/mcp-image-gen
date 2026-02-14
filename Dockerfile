# 使用轻量级的 Node.js 镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 lock 文件
COPY package.json package-lock.json* ./

# 安装依赖（包括 devDependencies 用于构建）
RUN npm ci

# 复制 TypeScript 配置和源代码
COPY tsconfig.json ./
COPY src ./src

# 构建 TypeScript
RUN npm run build

# 移除 devDependencies 以减小镜像大小
RUN npm prune --production

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# 启动命令
CMD ["node", "dist/index.js"]