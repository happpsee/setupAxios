import type { ToolInstanceType } from "../types/index.js";


//超时取消装饰工具
export const timeoutTool= (timer: string): ToolInstanceType  => {
  return (config) => {
    setTimeout(() => {
      if ("result" in config && !config.cancel) return ;

      config.result = Promise.reject(Error("请求超时!"));
      config.result.catch(() => {}); // Suppress unhandled rejection; consumer handles via config.result
      config.cancel = true;
    }, +timer);
  };
}