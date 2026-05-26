// 局部拦截器是底层能力，是上层建筑的基础设施
// 我们的装饰工具是基于请求全局控制功能的工具，而拦截器是一个只在部分生命周期存在的工具
import type { PlatformType, DftBaseCfg, AdaptorReq, ResInterceptorConfig, DecorateInstanceType } from "./types/index.js";

import { toolManageFactory } from "./tools/index.js";
import { setupAxios } from "./commonRequest.js";

export class setupApiAxios {
  private commonRequest;
  private toolMap: Map<string, any>;
  private addTool: (toolName: string, tool: any) => void;
  private removeTool: (toolName: string) => void;
  addReqInterceptor;
  addResInterceptor;

  constructor(config: DftBaseCfg, platform: PlatformType = "web") {
    const { commonRequest, addReqInterceptor, addResInterceptor } = setupAxios(config, platform);
    this.commonRequest = commonRequest;
    this.addReqInterceptor = addReqInterceptor;
    this.addResInterceptor = addResInterceptor;

    const { toolMap, addTool, removeTool } = toolManageFactory();
    this.toolMap = toolMap;
    this.addTool = addTool;
    this.removeTool = removeTool;
  }

  addDecorateTool = (toolName: string, fn: any) => {
    this.addTool(toolName, fn);
  };

  removeDecorateTool = (toolName: string) => {
    this.removeTool(toolName);
  };

  async request<T = any, D = any>(this: setupApiAxios, reqCfg: AdaptorReq<D>): Promise<ResInterceptorConfig<T>> {
    const decoratorInstance: DecorateInstanceType = {
      this: this,
      arguments: [reqCfg],
      originMethod: this.commonRequest,
      after: [] as any[],
      registryAfter: (fn: any) => {
        decoratorInstance.after.push(fn);
      },
      cancel: false
    };

    for (const item of this.toolMap.values()) {
      await Promise.resolve((item as any)(decoratorInstance));
    }

    if (!decoratorInstance.cancel) {
      const result = await decoratorInstance.originMethod.apply(
        decoratorInstance["this"],
        decoratorInstance["arguments"],
      );
      decoratorInstance.result = result;
    }

    for (const item of Object.values(decoratorInstance.after)) {
      await Promise.resolve((item as any)(decoratorInstance));
    }

    return decoratorInstance.result;
  }

  async get<T = any, D = any>(url: string, query?: D) {
    if (query) {
      return this.request<T, D>({ url, query, method: "GET" });
    }
    return this.request<T>({ url, method: "GET" });
  }

  async post<T = any, D = any>(url: string, data?: D) {
    if (data) {
      return this.request<T, D>({ url, data, method: "POST" });
    }
    return this.request<T>({ url, method: "POST" });
  }

  async delete<T = any, D = any>(url: string, data?: D) {
    if (data) {
      return this.request<T, D>({ url, data, method: "DELETE" });
    }
    return this.request<T>({ url, method: "DELETE" });
  }

  async put<T = any, D = any>(url: string, data?: D) {
    if (data) {
      return this.request<T, D>({ url, data, method: "PUT" });
    }
    return this.request<T>({ url, method: "PUT" });
  }
}
