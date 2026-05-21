/*
 * @Author: userName userEmail
 * @Date: 2026-05-18 11:39:04
 * @LastEditors: userName userEmail
 * @LastEditTime: 2026-05-18 17:18:20
 * @FilePath: \徐晨冰_TS_20260518\types\index.d.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import {type AxiosRequestConfig, type AxiosResponse} from "axios";

declare global {
  type PlatformType = "web" | "wx" | "weex" | "uni";
  
  interface CreateBaseNetWorkConfig {
    /** 平台类型: web, wx, weex, uni */
    platform?: platformType;
    /** `baseURL` 将自动加在 `url` 前面，除非 `url` 是一个绝对 URL。 */
    config: DefaultBaseConfig
  }

  

  interface RequestConfig<T = any> {
    method: "POST" | "GET" | "DELETE" | "PUT";
    url: string;
    headers?: Record<string, string>;
    params?: Record<string, string>;
    query?: Record<string, string>;
    data?: T;
  }

  interface DefaultBaseConfig {
    baseUrl: string;
    timeout: number;
  }

  type a = keyof RequestConfig
  type CommonRequestConfig = Omit<RequestConfig & DefaultBaseConfig, "data">;

  interface ReqResponse<T> {
    /** 服务器响应内容 */
    data: T;
    status: number;
    headers: Headers;
  }
  interface ErrorResponse {
    error?: Error;
  }
  type CommonResponse<T = any> = ReqResponse<T> | ErrorResponse;

  type CommonRequest = <T = any, D = any>(
    config: RequestConfig<D>,
  ) => Promise<CommonResponse<T>>;

  type plaformAdaptor = (config: DefaultBaseConfig) => CommonRequest;


  type ReqInterceptor = <T =  any>(config: RequestConfig<T>) => RequestConfig<T>;
  type ResInterceptor = <T = any>(res: CommonResponse<T>) => CommonResponse<T>;
}

export {};
