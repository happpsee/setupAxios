/*
 * @Author: userName userEmail
 * @Date: 2026-05-18 11:39:04
 * @LastEditors: userName userEmail
 * @LastEditTime: 2026-05-23 18:56:42
 * @FilePath: \徐晨冰_TS_20260518\types\index.d.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */


export type ApiMethodType = "GET" | "POST" | "PUT" | "DELETE"

export interface PlatformTypeMap {
  "web": "",
  "wx": "",
  "weex": "",
  "uni": ""
}

export type PlatformType = keyof PlatformTypeMap;
  
export interface CreateBaseNetWorkConfig {
    /** 平台类型: web, wx, weex, uni */   
    platform?: platformType;
    /** `baseURL` 将自动加在 `url` 前面，除非 `url` 是一个绝对 URL。 */
    config: DefaultBaseConfig
}

export interface DefaultBaseConfig {
    baseUrl: string;
    timeout: number;
}

export type CommonRequest = <Req, Res>(cfg: AdaptorReq<Req>) => Promise<Res>;
export type PlatformAdaptor = (cfg: DftBaseCfg) => CommonRequest;

export interface DftBaseCfg {
    baseUrl: string;
    timeout: number; //把这个作为上层功能
}

export interface AdaptorReq<T = any> {
    url: string;
    baseUrl?: string;
    method: ApiMethodType,
    data?: T,
    params?: Record<string, string | number>,
    headers?: Record<string, string>,
    query?: Record<string, string | number>
};


export type ReqInterceptorConfig<T = any> = {
  config: AdaptorReq<T>
};

export type  ResInterceptorConfig<T = any> = {
  data: T
};

export type ReqInterceptor = <T =  any>(config: ReqInterceptorConfig<T>) => ReqInterceptorConfig<T>;

export type ResInterceptor = <T = any>(res: ResInterceptorConfig<T>) => ResInterceptorConfig<T>;


export interface jsonCfgType {
  url: string;
  method: ApiMethodType;
  [key: string]: any;
};