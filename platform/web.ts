/*
 * @Author: userName userEmail
 * @Date: 2026-05-18 11:42:27
 * @LastEditors: userName userEmail
 * @LastEditTime: 2026-05-18 16:45:09
 * @FilePath: \徐晨冰_TS_20260518\platform\web.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { urlParamsParse } from "../utils/urlParse.js";


const platformRequest: plaformAdaptor = (baseCfg: DefaultBaseConfig) => {
  
  const request:CommonRequest = async <T, D>(cfg: RequestConfig<D>): Promise<CommonResponse<T>> => {  
    
    const config = {...baseCfg, ...cfg};
    const url = urlParamsParse(config);
    const timeout = baseCfg.timeout;

    const reqInit = {
      method: config.method.toUpperCase(),
      headers: Object.assign({
        "Content-Type": "application/json"
      }, config?.headers ?? {}),
    } as Record<string, any>;

    if (reqInit.method !== "GET") {
      reqInit.body = config.data;
    }

    const request = new Request(url.toString(), reqInit);
   
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject({
          error: new Error("Timeout"),
      })
      }, timeout);

     fetch(request)
        .then(
          (ans) =>
            resolve({
              data: ans.json() as T,
              status: ans.status,
              headers: ans.headers,
            }),
        )
        .catch((error) => {
          reject({
            error
          })
        })
        .finally(() => {
          clearTimeout(timer);
        })
    });

  }
  return request;
};

export default platformRequest;

