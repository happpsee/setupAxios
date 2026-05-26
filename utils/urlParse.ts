/*
 * @Author: userName userEmail
 * @Date: 2026-05-18 15:28:21
 * @LastEditors: userName userEmail
 * @LastEditTime: 2026-05-24 14:37:04
 * @FilePath: \网络请求库1-2\utils\urlParse.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type { AllReqConfig } from "../types/index.js";

export const urlParamsParse = (config: AllReqConfig): URL => {
  
  const url = new URL(config.url, config.baseUrl);
  const searchParam = url.searchParams;
  
  config?.params && (Object.entries(config.params).forEach((item) => {
        searchParam.append(item[0], String(item[1]));
  }));

  return url;
};