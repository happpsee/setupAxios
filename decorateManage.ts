/*
 * @Author: userName userEmail
 * @Date: 2026-05-23 13:38:27
 * @LastEditors: userName userEmail
 * @LastEditTime: 2026-05-23 20:11:38
 * @FilePath: \setupAxios\decorateManage.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { toolManageFactory } from "./tools/index.js";


let addTool: any = null;
let removeTool: any = null;

export const addDecorateTool = (fn:any) => {
  addTool && addTool(fn);  
};

export const removeDecorateTool = (fn: any) => {
  removeTool && removeTool(fn);
}
//利用特性
export const DecorateManage = function () {
  return function (
    originalMethod: Function,
    context: ClassMethodDecoratorContext,
  ) {
    
   const { toolMap, addTool: add, removeTool: remove } = toolManageFactory();

   addTool = add;
   removeTool = remove;

    return async function (this: any, ...args: any[]): Promise<any> {
      const decoratorInstance = {
        this: this,
        arguments: args,
        originalMethod: originalMethod,
        after: [] as any[],
        registryAfter: (fn: any) => {
          decoratorInstance.after.push(fn); // 加切面
        },
        result: null
      };


      for (const item of toolMap.values()) {
        await Promise.resolve((item as any)(decoratorInstance));
      }

      const result = await decoratorInstance.originalMethod.apply(
        decoratorInstance["this"],
        decoratorInstance["arguments"],
      );

      decoratorInstance.result = result;
      for (const item of Object.values(decoratorInstance.after)) {
        await Promise.resolve((item as any)(decoratorInstance));
      }
      
      return decoratorInstance.result;
    };
  };
};
