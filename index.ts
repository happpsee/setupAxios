/*
 * @Author: userName userEmail
 * @Date: 2026-05-18 11:30:00
 * @LastEditors: userName userEmail
 * @LastEditTime: 2026-05-23 19:52:46
 * @FilePath: \徐晨冰_TS_20260518\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { getPlatformRequest } from "./platform/index.js";
import type { PlatformType, DftBaseCfg, AdaptorReq, ReqInterceptorConfig, ReqInterceptor, ResInterceptorConfig, ResInterceptor, jsonCfgType  } from "./types/index.js";
import { DecorateManage } from "./decorateManage.js";
import { CombinateManage } from "./combinateManage.js";

// 1. 显示适配器方案，防止打入无效包
// 2. 自定义打包器轻松，用户可以轻松自定义底层请求API, 本库默认支持5个适配器
// 解构不大，在工程上是可以接受的, 但是如果我们强行分chunk, 用户需要动态导入一个适配器，使用成本高，所以选择内置

//setupAxios是库的基本请求单元，没有任何附加功能
export const setupAxios = (config: DftBaseCfg, platform: PlatformType = "web") => {
  const platformReq = getPlatformRequest(platform, config);
  

  //拦截器是上层解构, config要和实际请求上的不一样
  let reqInterceptor = [] as ReqInterceptor[];

  let resInterceptor = [] as  ResInterceptor[]; 

  const temporySet = new WeakSet();

  //在这里呢，需要
  const commonRequest = async <T = any, D = any>(requestConfig: AdaptorReq<D>) => {
    //可以说是 请求拦截声明周期实例
    const reqInterceptorInstance: ReqInterceptorConfig<D> = {
      config: requestConfig
    };

    const config = reqInterceptor.reduce((a, c) => c(a), reqInterceptorInstance);

    //清除局部请求拦截器
    reqInterceptor = reqInterceptor.filter((item) => {
      if (!temporySet.has(item)) return true;
      temporySet.delete(item);
      return false;
    });

    const ans = await platformReq<D, T>(config.config);

    const resInterceptorInstance: ResInterceptorConfig<T> = {
      data: ans
    };

    const result = resInterceptor.reduce((a, c) => c(a), resInterceptorInstance);
    //响应拦截

    //清除局部响应拦截器
    resInterceptor = resInterceptor.filter((item) => {
      if (!temporySet.has(item)) return true;
      temporySet.delete(item);
      return false;
    });

    return result;
  };
  
  const addReqInterceptor = (fn: ReqInterceptor, isTempory = false) => {
    if (!isTempory) {
      temporySet.add(fn);
    }
    reqInterceptor.push(fn);
  };

  const addResInterceptor = (fn: ResInterceptor, isTempory = false) => {
    if (!isTempory) {
      temporySet.add(fn);
    }
    resInterceptor.push(fn);
  };

  return { commonRequest, addReqInterceptor, addResInterceptor }; 

};


export type SetupAxiosReturn = ReturnType<typeof setupAxios>; 

// 局部拦截器是底层能力，是上层建筑的基础设施
// 我们的装饰工具是基于请求全局控制功能的工具，而拦截器是一个只在部分生命周期存在的工具

export class setupApiAxios {
  private commonRequest;
  private addReqInterceptor;
  private addResInterceptor;

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


export interface JsonAxiosConfig {
  jsonAxios: Record<string, any>
  config: DftBaseCfg,
  platform: PlatformType
}

export const setupJsonAxios = ({
  jsonAxios,
  config,
  platform
}: JsonAxiosConfig) => {
  //我们定义装饰器工具和拦截器是两种层面上的东西，拦截器只有局限生命周期，而装饰器需要全局的生命力, 所以不通过拦截器去实现装饰器工具
  const { commonRequest, addReqInterceptor, addResInterceptor } = setupAxios(config, platform);

  const jsonAxiosConfig = new Map() as Map<string, {target: jsonCfgType , metadata: Record<string, any>}>;

  for (const [key, val] of Object.entries(jsonAxios)) {
    jsonAxiosConfig.set(key, {target: val, metadata: Object.create(null)});//纯净的数据载荷
  }

  const useApi = async <Res, Req>(name: string, data: any) => {
    const cfg = jsonAxiosConfig.get(name);

    if (!cfg) {
      throw Error("没有配置当前表");
    }

    const reqCfg = {...cfg.target};

    return CombinateManage(commonRequest(reqCfg));
  };

  return {
    useApi,
    addReqInterceptor,
    addResInterceptor
  };
};
