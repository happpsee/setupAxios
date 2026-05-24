import type { PlatformType, DftBaseCfg,  ReqInterceptor,  ResInterceptor, JsonCfgType, CombinateInstanceType } from "./types/index.js";
import { setupAxios } from "./commonRequest.js";
import { toolManageFactory } from "./tools/index.js";

// 1. 显示适配器方案，防止打入无效包
// 2. 自定义打包器轻松，用户可以轻松自定义底层请求API, 本库默认支持5个适配器
// 解构不大，在工程上是可以接受的, 但是如果我们强行分chunk, 用户需要动态导入一个适配器，使用成本高，所以选择内置
let addTool: any = null;
let removeTool: any = null;

export const addCombinateTool = (fn:any) => {
  addTool && addTool(fn);  
};

export const removeCombinateTool = (fn: any) => {
  removeTool && removeTool(fn);
}

export const CombinateManage = <T extends (...args: any) => Promise<any>>(originMethod: T): (...args: Parameters<T>) => Promise<ReturnType<T>> => {

  const { toolMap, addTool: add, removeTool: remove } = toolManageFactory();

  addTool = add;
  removeTool = remove;

  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {

    const combinateInstance: CombinateInstanceType<ReturnType<T>, Parameters<T>> = {
      originMethod: originMethod,
      after: [] as Array<(...args: any) => any>,
      registryAfter: (fn: any) => {
        combinateInstance.after.push(fn);
      },
      arguments: args,
      cancel:false 
    };

    for (const item of toolMap.values()) {
      await Promise.resolve((item as any)(combinateInstance));
    }

    if (!combinateInstance.cancel) {
      const result = await originMethod(...args);
      combinateInstance.result = result;
    }


    for (const item of Object.values(combinateInstance.after)) {
      await Promise.resolve(item(combinateInstance));
    }

    return combinateInstance.result!;
  };
};




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

  const jsonAxiosConfig = new Map() as Map<string, {target: JsonCfgType , metadata: Record<string, any>}>;

  for (const [key, val] of Object.entries(jsonAxios)) {
    jsonAxiosConfig.set(key, {target: val, metadata: Object.create(null)});//纯净的数据载荷
  }

  const useApi = async <Res, Req>(name: string, data: Req): Promise<Res> => {
    const cfg = jsonAxiosConfig.get(name);

    if (!cfg) {
      throw Error("没有配置当前表");
    }

    const reqCfg = {...cfg.target, data};

    return CombinateManage(commonRequest)(reqCfg) as Promise<Res>;
  };

  return {
    useApi,
    addReqInterceptor,
    addResInterceptor
  };
};
