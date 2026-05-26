// Bug 2 测试：验证 new URL() 参数顺序修复
import { describe, it } from "node:test";
import assert from "node:assert";

describe("urlParamsParse — Bug 2: new URL() 参数顺序", () => {
  it("baseUrl + 相对路径应正确拼接为完整 URL", async () => {
    const { urlParamsParse } = await import("../utils/urlParse.js");

    const result = urlParamsParse({
      baseUrl: "https://api.example.com",
      url: "/users/1",
      method: "GET",
    } as any);

    assert.strictEqual(result.href, "https://api.example.com/users/1",
      "baseUrl 拼接相对路径应得到完整 URL");
    assert.strictEqual(result.pathname, "/users/1",
      "pathname 应为 /users/1");
  });

  it("baseUrl 带子路径 + 相对路径应正确拼接", async () => {
    const { urlParamsParse } = await import("../utils/urlParse.js");

    const result = urlParamsParse({
      baseUrl: "https://api.example.com/v1/",
      url: "users",
      method: "GET",
    } as any);

    assert.strictEqual(result.href, "https://api.example.com/v1/users");
  });

  it("url 为绝对路径时不应被 baseUrl 覆盖", async () => {
    const { urlParamsParse } = await import("../utils/urlParse.js");

    const result = urlParamsParse({
      baseUrl: "https://api.example.com",
      url: "https://other.example.com/data",
      method: "GET",
    } as any);

    assert.strictEqual(result.href, "https://other.example.com/data",
      "绝对路径 url 应保持独立，不受 baseUrl 影响");
  });

  it("query 参数应正确附加到 URL", async () => {
    const { urlParamsParse } = await import("../utils/urlParse.js");

    const result = urlParamsParse({
      baseUrl: "https://api.example.com",
      url: "/search",
      method: "GET",
      params: { q: "hello", page: "1" },
    } as any);

    assert.strictEqual(result.searchParams.get("q"), "hello");
    assert.strictEqual(result.searchParams.get("page"), "1");
  });
});
