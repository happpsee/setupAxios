/*
 * @Author: userName userEmail
 * @Date: 2026-05-18 11:42:27
 * @LastEditors: userName userEmail
 * @LastEditTime: 2026-05-24 14:36:45
 * @FilePath: \徐晨冰_TS_20260518\platform\web.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { urlParamsParse } from "../utils/urlParse.js";
import { writeBodyData } from "../utils/writeBodyData.js";
import type { PlatformAdaptor, AdaptorReq, DftBaseCfg, AllReqConfig } from "../types/index.js";

//TODO:
// 适配器的要求，是一个工厂函数， 并且返回一个函数，这个函数要求允许我们传入config配置调用的时候可以自动的发出请求
// 这个实际请求函数返回一个Promise,这个Promise解决的时候决议值必须是我们实际返回的请求
// 拒绝的时候，同样将错误的响应返回

const platformRequest:PlatformAdaptor = (config: DftBaseCfg) => {
  //config是基础配置

  const request = async <Req = any, Res = any>(reqCfg: AdaptorReq<Req>): Promise<Res> => {
    //cfg是本次配置，请求级配置优先于基础配置
    const cfg = ({...config, ...reqCfg}) as AllReqConfig<Req>;

    const url = urlParamsParse(cfg);

    const reqInit = {} as Record<string, any>;

    if (cfg.method !== "GET" && cfg.data) {
      writeBodyData(reqInit, cfg);
    }

    return fetch(url, reqInit)
    .then((ans) => {
      const contentType = ans.headers.get("Content-Type");
      if (contentType?.includes("application/json")) {
        return ans.json();
      }
      return ans;
    });
  }
  return request;
};

export default platformRequest;
