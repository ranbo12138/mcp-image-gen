# 使用轻量级的 Node.js 镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 lock 文件 (如果有)
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm ci --production

# 复制源代码
COPY src ./src

# 暴露端口 (虽然 Zeabur 会自动识别，但写上是好习惯)
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 启动命令 - 直接使用 node 启动更可靠
CMD ["node", "src/index.js"]
