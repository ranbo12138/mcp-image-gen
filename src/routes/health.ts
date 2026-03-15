/**
 * 健康检查路由
 */

import { Router, Request, Response } from "express";

/**
 * 创建健康检查路由
 */
export function createHealthRouter(): Router {
  const router = Router();

  router.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      version: "3.1.0",
    });
  });

  return router;
}
