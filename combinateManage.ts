/*
 * @Author: userName userEmail
 * @Date: 2026-05-23 18:59:55
 * @LastEditors: userName userEmail
 * @LastEditTime: 2026-05-23 20:09:13
 * @FilePath: \setupAxios\combaniateManage.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { toolManageFactory } from "./tools/index.js";


let addTool: any = null;
let removeTool: any = null;

export const addCombinateTool = (fn:any) => {
  addTool && addTool(fn);  
};

export const removeCombinateTool = (fn: any) => {
  removeTool && removeTool(fn);
}



export const CombinateManage = (originMethod: any): any => {

  const { toolMap, addTool: add, removeTool: remove } = toolManageFactory();

  addTool = add;
  removeTool = remove;

  return async (...args: any[]) => {
    const combinateInstance = {
      originMethod: originMethod,
      after: [] as any[],
      registryAfter: (fn: any) => {
        combinateInstance.after.push(fn);
      },
      result: null
    };

    for (const item of toolMap.values()) {
      await Promise.resolve((item as any)(combinateInstance));
    }

    const result = await originMethod(...args);

    combinateInstance.result = result;

    for (const item of Object.values(combinateInstance.after)) {
      await Promise.resolve((item as any)(combinateInstance));
    }

    return combinateInstance.result as any;
  };
};