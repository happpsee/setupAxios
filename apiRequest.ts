
// 局部拦截器是底层能力，是上层建筑的基础设施
// 我们的装饰工具是基于请求全局控制功能的工具，而拦截器是一个只在部分生命周期存在的工具
import type { PlatformType, DftBaseCfg, AdaptorReq,  ReqInterceptor, ResInterceptorConfig, ResInterceptor, DecorateInstanceType, ToolInstanceType } from "./types/index.js";


import { toolManageFactory } from "./tools/index.js";
import { setupAxios } from "./commonRequest.js";

// 全局装饰器工具注册中心，供 addDecorateTool/removeDecorateTool 使用
const globalToolFactory = toolManageFactory();
globalToolFactory.removeTool("log"); // Log 由各 @DecorateManage 的 per-method toolMap 提供

export const addDecorateTool = (toolName: string, tool: ToolInstanceType) => {
  globalToolFactory.addTool(toolName, tool);
};

export const removeDecorateTool = (toolName: string) => {
  globalToolFactory.removeTool(toolName);
};

// 利用特性
// 支持 Stage 3 装饰器 (TS 5.0+, experimentalDecorators: false) 和
// legacy 装饰器 (experimentalDecorators: true / esbuild 默认行为)
export const DecorateManage = function () {
  return function (
    targetOrMethod: unknown,
    contextOrKey: unknown,
    legacyDescriptor?: PropertyDescriptor,
  ): unknown {
    // 检测装饰器模式：legacy 模式的第二个参数是字符串（属性名），
    // 且第三个参数是 PropertyDescriptor；Stage 3 只有两个参数
    const isLegacy = typeof contextOrKey === 'string' && legacyDescriptor !== undefined;
    const originalMethod: (...args: unknown[]) => unknown = isLegacy
      ? (legacyDescriptor!.value as (...args: unknown[]) => unknown)
      : (targetOrMethod as (...args: unknown[]) => unknown);

    // 每个 @DecorateManage 创建独立的 per-method toolMap
    const { toolMap } = toolManageFactory();

    const replacement = async function (this: unknown, ...args: unknown[]): Promise<unknown> {
      const decoratorInstance: DecorateInstanceType = {
        this: this,
        arguments: args,
        originMethod: originalMethod,
        after: [],
        registryAfter: (fn: (cfg: DecorateInstanceType) => void) => {
          decoratorInstance.after.push(fn);
        },
        cancel: false
      };

      // 合并全局工具和 per-method 工具：per-method 在前，全局在后（全局覆盖同名）
      const mergedTools = new Map([...toolMap, ...globalToolFactory.toolMap]);

      for (const item of mergedTools.values()) {
        await Promise.resolve(item(decoratorInstance));
      }

      if (!decoratorInstance.cancel) {
        const result = await decoratorInstance.originMethod.apply(
          decoratorInstance["this"],
          decoratorInstance["arguments"],
        );

        decoratorInstance.result = result;
      }

      for (const item of decoratorInstance.after) {
        await Promise.resolve(item(decoratorInstance));
      }

      return decoratorInstance.result;
    };

    if (isLegacy && legacyDescriptor) {
      // Legacy 模式：必须修改 descriptor.value 并返回 descriptor
      legacyDescriptor.value = replacement as (...args: unknown[]) => unknown;
      return legacyDescriptor;
    }

    // Stage 3 模式：直接返回替代函数
    return replacement;
  };
};



export class setupApiAxios {
  private commonRequest;
  addReqInterceptor;
  addResInterceptor;

  constructor(config: DftBaseCfg, platform: PlatformType = "web") {
    const { commonRequest, addReqInterceptor, addResInterceptor } = setupAxios(config, platform);
    this.commonRequest = commonRequest;
    this.addReqInterceptor = addReqInterceptor;
    this.addResInterceptor = addResInterceptor;
  }

  // @ts-expect-error DecorateManage 支持 Stage 3 + Legacy 双模式装饰器，返回类型无法被 TS 静态验证
  @DecorateManage()
  request<T = any, D = any>(reqCfg: AdaptorReq<D>): Promise<ResInterceptorConfig<T>> {
    return this.commonRequest(reqCfg);
  }

  async get<T = any, D = any>(url: string, query?: D) {
    if (query) {
      return this.request<T, D>({url, query, method: "GET"});
    }
    return this.request<T>({url, method: "GET"});
  }

  async post<T = any, D = any>(url: string, data?: D) {
    if (data) {
      return this.request<T, D>({url, data, method: "POST"});
    }
    return this.request<T>({url, method: "POST"});
  }

  async delete<T = any, D = any>(url: string, data?: D) {
    if (data) {
      return this.request<T, D>({url, data, method: "DELETE"});
    }
    return this.request<T>({url, method: "DELETE"});
  }

  async put<T = any, D = any>(url: string, data?: D) {
    if (data) {
      return this.request<T, D>({url, data, method: "PUT"});
    }
    return this.request<T>({url, method: "PUT"});
  }

}
