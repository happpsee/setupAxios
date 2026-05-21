/*
 * @Author: userName userEmail
 * @Date: 2026-05-18 15:28:21
 * @LastEditors: userName userEmail
 * @LastEditTime: 2026-05-18 17:08:33
 * @FilePath: \网络请求库1-2\utils\urlParse.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
export const urlParamsParse = (config: CommonRequestConfig): URL => {
  const url = new URL(config.baseUrl, config.url);
  const searchParam = url.searchParams;
  //这是对query的处理
  config?.params && (Object.entries(config.params).forEach((item) => {
        searchParam.append(item[0], item[1]);
  }));

  return url;
};