
// 局部拦截器是底层能力，是上层建筑的基础设施
// 我们的装饰工具是基于请求全局控制功能的工具，而拦截器是一个只在部分生命周期存在的工具
import type { PlatformType, DftBaseCfg, AdaptorReq,  ReqInterceptor, ResInterceptorConfig, ResInterceptor, DecorateInstanceType } from "./types/index.js";


import { toolManageFactory } from "./tools/index.js";
import { setupAxios } from "./commonRequest.js";

let addTool: any = null;
let removeTool: any = null;


export const addDecorateTool = (fn:any) => {
  addTool && addTool(fn);  
};

export const removeDecorateTool = (fn: any) => {
  removeTool && removeTool(fn);
}
//利用特性
export const DecorateManage = function () {
  return function (
    originalMethod: any,
    context: ClassMethodDecoratorContext,
  ) {
    
   const { toolMap, addTool: add, removeTool: remove } = toolManageFactory();

   addTool = add;
   removeTool = remove;

    return async function (this: any, ...args: any[]): Promise<any> {
      const decoratorInstance: DecorateInstanceType = {
        this: this,
        arguments: args,
        originMethod: originalMethod,
        after: [] as any[],
        registryAfter: (fn: any) => {
          decoratorInstance.after.push(fn); // 加切面
        },
        cancel: false
      };


      for (const item of toolMap.values()) {
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
    };
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
