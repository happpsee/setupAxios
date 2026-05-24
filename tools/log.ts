import type {ToolInstanceType} from "../types/index.js";
import {getTime} from "../utils/getTime.js";

export const Log = (): ToolInstanceType => {
  return function (cfg) {
    console.log(
      `[Request Start Time: ${getTime("HH:mm:ss ms")}] ===>>>`,
      cfg.arguments,
    );

    cfg.registryAfter(() => {
      console.log(
        `[Request End Time: ${getTime("HH:mm:ss ms")}] ===>>>`,
        cfg.result,
      );
    });
  };
};
