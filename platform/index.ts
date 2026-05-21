/*
 * @Author: userName userEmail
 * @Date: 2026-05-18 11:37:07
 * @LastEditors: userName userEmail
 * @LastEditTime: 2026-05-18 16:51:21
 * @FilePath: \徐晨冰_TS_20260518\platform\index.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */


export const getPlatformRequest = async (platform: PlatformType, config: DefaultBaseConfig) => {

  let platformAdaptor;
  switch (platform) {
    case "web":
      platformAdaptor = await import("./web.js").then((ans) => ans.default);
      break;
    default:
      platformAdaptor = await import("./web.js").then((ans) => ans.default);
      break;
  }

  return platformAdaptor(config);
};