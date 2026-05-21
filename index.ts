/*
 * @Author: userName userEmail
 * @Date: 2026-05-18 11:30:00
 * @LastEditors: userName userEmail
 * @LastEditTime: 2026-05-18 17:20:40
 * @FilePath: \徐晨冰_TS_20260518\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { getPlatformRequest } from "./platform/index.js";


export const createSetupAxios = async (config: DefaultBaseConfig, platform: PlatformType = "web") => {
  const platformReq = await getPlatformRequest(platform, config);//这是一个请求器
  
  const reqInterceptor = [] as ReqInterceptor[];

  const resInterceptor = [] as  ResInterceptor[];


  const commonRequest = async <T = any, D = any>(requestConfig: RequestConfig<D>) => {
    //请求拦截
    const config = reqInterceptor.reduce((a, c) => c(a), requestConfig);

    const ans = await platformReq<T>(config);

    //响应拦截
    return resInterceptor.reduce((a, c) => c(a), ans);
  };

  
  const addReqInterceptor = (fn: ReqInterceptor) => {
    reqInterceptor.push(fn);
  };
  const addResInterceptor = (fn: ResInterceptor) => {
    resInterceptor.push(fn);
  };

  return { commonRequest, addReqInterceptor, addResInterceptor }; 
};


