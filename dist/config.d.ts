/**
 * 配置管理模块
 * 统一管理环境变量和配置项
 */
import "dotenv/config";
export interface ServerConfig {
    port: number;
    apiBaseUrl: string;
    apiKey: string | undefined;
    imageModel: string;
    editModel: string;
    videoModel: string;
}
export declare const config: ServerConfig;
//# sourceMappingURL=config.d.ts.map