import type { ToolInstanceType } from "../types/index.js";



//错误上报装饰工具，自己上报, 走originMethod请求，不经过装饰器工具
export const errReportTool = (callback: any): ToolInstanceType => {
  return (config) => { 
    config.registryAfter(callback);
  };
}