import type { PlatformType, DftBaseCfg,  ReqInterceptor,  ResInterceptor, JsonCfgType, CombinateInstanceType, ToolInstanceType } from "./types/index.js";
import { setupAxios } from "./commonRequest.js";
import { toolManageFactory } from "./tools/index.js";

// 1. 显示适配器方案，防止打入无效包
// 2. 自定义打包器轻松，用户可以轻松自定义底层请求API, 本库默认支持5个适配器
// 解构不大，在工程上是可以接受的, 但是如果我们强行分chunk, 用户需要动态导入一个适配器，使用成本高，所以选择内置

// 全局装饰器工具注册中心，供 addCombinateTool/removeCombinateTool 使用
const globalCombineToolFactory = toolManageFactory();
globalCombineToolFactory.removeTool("log"); // Log 由各 setupJsonAxios 的 shared toolMap 提供

export const addCombinateTool = (toolName: string, tool: ToolInstanceType) => {
  globalCombineToolFactory.addTool(toolName, tool);
};

export const removeCombinateTool = (toolName: string) => {
  globalCombineToolFactory.removeTool(toolName);
};

export const CombinateManage = <T extends (...args: any) => Promise<any>>(
  originMethod: T,
  localToolMap: Map<string, ToolInstanceType>,
): (...args: Parameters<T>) => Promise<ReturnType<T>> => {

  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {

    const combinateInstance: CombinateInstanceType<ReturnType<T>, Parameters<T>> = {
      originMethod: originMethod,
      after: [] as Array<(...args: unknown[]) => unknown>,
      registryAfter: (fn: (cfg: CombinateInstanceType) => void) => {
        combinateInstance.after.push(fn);
      },
      arguments: args,
      cancel: false
    };

    // 合并全局工具和 shared 工具：shared 在前，全局在后（全局覆盖同名）
    const mergedTools = new Map([...localToolMap, ...globalCombineToolFactory.toolMap]);

    for (const item of mergedTools.values()) {
      await Promise.resolve(item(combinateInstance));
    }

    if (!combinateInstance.cancel) {
      const result = await originMethod(...args);
      combinateInstance.result = result;
    }

    for (const item of combinateInstance.after) {
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

  // 共享 toolMap，所有 useApi 调用复用此实例（解决 P3-14）
  const sharedToolFactory = toolManageFactory();

  const useApi = async <Res, Req>(name: string, data: Req): Promise<Res> => {
    const cfg = jsonAxiosConfig.get(name);

    if (!cfg) {
      throw Error("没有配置当前表");
    }

    const reqCfg = {...cfg.target, data};

    // 复用 sharedToolMap，不再每次创建新 factory
    return CombinateManage(commonRequest, sharedToolFactory.toolMap)(reqCfg) as Promise<Res>;
  };

  return {
    useApi,
    addReqInterceptor,
    addResInterceptor
  };
};
