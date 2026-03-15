/**
 * 状态面板 HTML 模板
 * 纯函数，接收状态数据，返回 HTML 字符串
 */

import type { Stats } from "../types/index.js";
import { formatUptime, getTotalToolCalls } from "../utils/stats.js";

// ============================================================================
// 状态数据接口
// ============================================================================

interface StatusData {
  server: {
    version: string;
    uptime: string;
    uptimeSeconds: number;
  };
  requests: {
    total: number;
  };
  tools: {
    generate_image: number;
    edit_image: number;
    generate_video: number;
    total: number;
  };
  sessions: {
    active: number;
  };
  memory: {
    rss: string;
    heapUsed: string;
    heapTotal: string;
  };
}

// ============================================================================
// 状态数据生成
// ============================================================================

/**
 * 生成状态数据对象
 */
export function createStatusData(
  stats: Stats,
  activeSessions: number
): StatusData {
  const memUsage = process.memoryUsage();

  return {
    server: {
      version: "3.1.0",
      uptime: formatUptime(),
      uptimeSeconds: Math.floor((Date.now() - stats.startTime) / 1000),
    },
    requests: {
      total: stats.totalRequests,
    },
    tools: {
      generate_image: stats.toolCalls.generate_image,
      edit_image: stats.toolCalls.edit_image,
      generate_video: stats.toolCalls.generate_video,
      total: getTotalToolCalls(),
    },
    sessions: {
      active: activeSessions,
    },
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
    },
  };
}

// ============================================================================
// HTML 渲染
// ============================================================================

/**
 * 渲染状态面板 HTML
 */
export function renderStatusHtml(data: StatusData): string {
  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Media Server - Status</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    h1 { 
      color: #fff; 
      text-align: center; 
      margin-bottom: 40px;
      font-size: 2.5em;
    }
    .card {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 20px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .card h2 { 
      color: #4ecdc4; 
      margin-bottom: 20px; 
      font-size: 1.3em;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .stat-item {
      background: rgba(0,0,0,0.3);
      padding: 20px;
      border-radius: 12px;
      text-align: center;
    }
    .stat-value { 
      font-size: 2em; 
      font-weight: bold; 
      color: #fff;
    }
    .stat-label { 
      color: #aaa; 
      margin-top: 5px;
      font-size: 0.9em;
    }
    .tool-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background: rgba(0,0,0,0.2);
      border-radius: 10px;
      margin-bottom: 10px;
    }
    .tool-name { color: #fff; font-weight: 500; }
    .tool-count { 
      background: #4ecdc4; 
      color: #1a1a2e; 
      padding: 5px 15px; 
      border-radius: 20px;
      font-weight: bold;
    }
    .status-ok {
      display: inline-block;
      width: 12px;
      height: 12px;
      background: #4ecdc4;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎛️ MCP Media Server</h1>
    
    <div class="card">
      <h2><span class="status-ok"></span> 服务器状态</h2>
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-value">${data.server.uptime}</div>
          <div class="stat-label">运行时间</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${data.requests.total}</div>
          <div class="stat-label">总请求数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${data.sessions.active}</div>
          <div class="stat-label">活跃会话</div>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2>📊 工具调用统计</h2>
      <div class="tool-item">
        <span class="tool-name">🖼️ generate_image</span>
        <span class="tool-count">${data.tools.generate_image}</span>
      </div>
      <div class="tool-item">
        <span class="tool-name">✏️ edit_image</span>
        <span class="tool-count">${data.tools.edit_image}</span>
      </div>
      <div class="tool-item">
        <span class="tool-name">🎬 generate_video</span>
        <span class="tool-count">${data.tools.generate_video}</span>
      </div>
    </div>
    
    <div class="card">
      <h2>💾 内存使用</h2>
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-value">${data.memory.rss}</div>
          <div class="stat-label">RSS</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${data.memory.heapUsed}</div>
          <div class="stat-label">Heap Used</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${data.memory.heapTotal}</div>
          <div class="stat-label">Heap Total</div>
        </div>
      </div>
    </div>
    
    <div style="text-align: center; color: #666; margin-top: 30px;">
      <small>v${data.server.version} | Auto-refresh in 30s</small>
    </div>
  </div>
  <script>setTimeout(() => location.reload(), 30000);</script>
</body>
</html>`;
}
