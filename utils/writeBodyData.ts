import type { AdaptorReq } from "../types/index.js";

export const writeBodyData = (requestInit: any, cfg:AdaptorReq) => {
  if (cfg.headers?.["Content-Type"] === "application/json") {
    requestInit["body"] = JSON.stringify(cfg.data);
  }
  //其它的就不自动处理了
};