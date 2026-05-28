/*
 * @Author: userName userEmail
 * @Date: 2026-05-18 11:37:07
 * @LastEditors: userName userEmail
 * @LastEditTime: 2026-05-23 13:46:09
 * @FilePath: \徐晨冰_TS_20260518\platform\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import webAdaptor from "./web.js"; 
import type { PlatformAdaptor, PlatformType, DftBaseCfg} from "../types/index.js";

const adaptors = {
  "web": webAdaptor
} as Record<string, PlatformAdaptor>;


//同时允许用户自己扩展一下类型
export const registerAdaptor = (adaptorName: string,  adaptor: PlatformAdaptor) => {
  adaptors[adaptorName] = adaptor;
};


export const getPlatformRequest = (platform: PlatformType, config: DftBaseCfg) => {
  const adaptor = adaptors[platform];
  if (adaptor) {
    return adaptor(config);
  }

  console.warn(`Platform "${platform}" is not registered, falling back to web adaptor.`);
  return webAdaptor(config);
};