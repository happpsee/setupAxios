/*
 * @Author: userName userEmail
 * @Date: 2026-05-23 19:53:06
 * @LastEditors: userName userEmail
 * @LastEditTime: 2026-05-23 19:59:52
 * @FilePath: \setupAxios\tools\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Log } from "./log.js";

export const toolManageFactory = () => {
  const toolMap = new Map([["log", Log()]]);

  const addTool = (toolName: string, tool: any) => {
    toolMap.set(toolName, tool);
  }

  const removeTool = (toolName:string) => {
    toolMap.delete(toolName);
  };

  return {
    toolMap,
    addTool,
    removeTool
  }
};