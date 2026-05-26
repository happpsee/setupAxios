import { getPlatformRequest } from "./platform/index.js";
import type { PlatformType, DftBaseCfg, AdaptorReq, ReqInterceptorConfig, ReqInterceptor, ResInterceptorConfig, ResInterceptor } from "./types/index.js";


//setupAxios是库的基本请求单元，没有任何附加功能
export const setupAxios = (config: DftBaseCfg, platform: PlatformType = "web") => {
  const platformReq = getPlatformRequest(platform, config);

  let reqInterceptor = [] as ReqInterceptor[];

  let resInterceptor = [] as  ResInterceptor[]; 

  const temporarySet = new WeakSet();

  //在这里呢，需要
  const commonRequest = async <T = any, D = any>(requestConfig: AdaptorReq<D>) => {
    //可以说是 请求拦截声明周期实例
    const reqInterceptorInstance: ReqInterceptorConfig<D> = {
      config: requestConfig
    };

    const interceptedConfig = reqInterceptor.reduce((a, c) => c(a), reqInterceptorInstance);

    //清除局部请求拦截器
    reqInterceptor = reqInterceptor.filter((item) => {
      if (!temporarySet.has(item)) return true;
      temporarySet.delete(item);
      return false;
    });

    const ans = await platformReq<D, T>(interceptedConfig.config);

    const resInterceptorInstance: ResInterceptorConfig<T> = {
      data: ans
    };

    const result = resInterceptor.reduce((a, c) => c(a), resInterceptorInstance);
    //响应拦截

    //清除局部响应拦截器
    resInterceptor = resInterceptor.filter((item) => {
      if (!temporarySet.has(item)) return true;
      temporarySet.delete(item);
      return false;
    });

    return result;
  };
  
  const addReqInterceptor = (fn: ReqInterceptor, isTemporary = false) => {
    if (isTemporary) {
      temporarySet.add(fn);
    }
    reqInterceptor.push(fn);
  };

  const addResInterceptor = (fn: ResInterceptor, isTemporary = false) => {
    if (isTemporary) {
      temporarySet.add(fn);
    }
    resInterceptor.push(fn);
  };

  return { commonRequest, addReqInterceptor, addResInterceptor }; 
};


export type SetupAxiosReturn = ReturnType<typeof setupAxios>; 
