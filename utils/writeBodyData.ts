/*
 * @Author: userName userEmail
 * @Date: 2026-05-22 20:15:22
 * @LastEditors: userName userEmail
 * @LastEditTime: 2026-05-24 14:37:20
 * @FilePath: \setupAxios\utils\writeBodyData.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import type { AllReqConfig } from "../types/index.js";

export const writeBodyData = (requestInit: any, cfg: AllReqConfig) => {
  if (cfg.headers?.["Content-Type"] === "application/json") {
    requestInit["body"] = JSON.stringify(cfg.data);
  } else if (cfg.data !== undefined && cfg.data !== null) {
    console.warn(
      `[writeBodyData] data is present but Content-Type is "${cfg.headers?.["Content-Type"] ?? "not set"}". ` +
      `Only "application/json" Content-Type is automatically serialized. The body will not be set.`
    );
  }
  //其它的就不自动处理了
};