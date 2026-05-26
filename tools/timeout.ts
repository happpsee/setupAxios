import type { ToolInstanceType } from "../types/index.js";

export const timeoutTool = (timer: string | number): ToolInstanceType => {
  return (config) => {
    const controller = new AbortController();
    const reqArgs = config.arguments as any[];
    if (reqArgs?.[0] && typeof reqArgs[0] === 'object') {
      reqArgs[0].signal = controller.signal;
    }
    const timerId = setTimeout(() => controller.abort(), +timer);
    config.registryAfter(() => clearTimeout(timerId));
  };
};
