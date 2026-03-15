/**
 * 统计计数器模块
 * 集中管理服务器请求和工具调用统计
 */

import type { Stats, ToolCallStats } from "../types/index.js";

// ============================================================================
// 统计数据单例
// ============================================================================

/** 服务器统计信息 */
export const stats: Stats = {
  startTime: Date.now(),
  totalRequests: 0,
  toolCalls: {
    generate_image: 0,
    edit_image: 0,
    generate_video: 0,
  },
};

// ============================================================================
// 统计辅助函数
// ============================================================================

/**
 * 记录工具注册（用于初始化统计）
 * @param toolName 工具名称
 */
export function recordToolRegistration(toolName: keyof ToolCallStats): void {
  stats.toolCalls[toolName]++;
}

/**
 * 记录总请求数
 */
export function recordRequest(): void {
  stats.totalRequests++;
}

/**
 * 获取运行时间（秒）
 */
export function getUptimeSeconds(): number {
  return Math.floor((Date.now() - stats.startTime) / 1000);
}

/**
 * 格式化运行时间为人类可读格式
 */
export function formatUptime(): string {
  const uptime = getUptimeSeconds();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = uptime % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

/**
 * 获取工具调用总数
 */
export function getTotalToolCalls(): number {
  return (
    stats.toolCalls.generate_image +
    stats.toolCalls.edit_image +
    stats.toolCalls.generate_video
  );
}
