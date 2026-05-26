// Bug 1 测试：验证 isTemporary 拦截器逻辑修复 + 变量遮蔽 + 拼写修正
import { describe, it, mock } from "node:test";
import assert from "node:assert";

describe("commonRequest — Bug 1: isTemporary 拦截器逻辑", () => {
  it("全局拦截器 (isTemporary=false) 应在多次请求后持续保留", { skip: false }, async () => {
    const globalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }))
    ) as any;

    try {
      const { setupAxios } = await import("../commonRequest.js");

      let callCount = 0;
      const interceptor = (cfg: any) => {
        callCount++;
        return cfg;
      };

      const { commonRequest, addReqInterceptor } = setupAxios(
        { baseUrl: "https://api.example.com", timeout: 5000 },
        "web"
      );

      addReqInterceptor(interceptor);

      await commonRequest({ url: "/test1", method: "GET" });
      await commonRequest({ url: "/test2", method: "GET" });

      assert.strictEqual(callCount, 2, "全局拦截器应在每次请求都执行");
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it("局部拦截器 (isTemporary=true) 应在单次请求后自动清除", async () => {
    const globalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }))
    ) as any;

    try {
      const { setupAxios } = await import("../commonRequest.js");

      let callCount = 0;
      const interceptor = (cfg: any) => {
        callCount++;
        return cfg;
      };

      const { commonRequest, addReqInterceptor } = setupAxios(
        { baseUrl: "https://api.example.com", timeout: 5000 },
        "web"
      );

      addReqInterceptor(interceptor, true);

      await commonRequest({ url: "/test1", method: "GET" });
      assert.strictEqual(callCount, 1, "局部拦截器应在第一次请求时执行");

      await commonRequest({ url: "/test2", method: "GET" });
      assert.strictEqual(callCount, 1, "局部拦截器应在第一次请求后被清除");
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it("全局和局部拦截器混合使用时行为正确", async () => {
    const globalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }))
    ) as any;

    try {
      const { setupAxios } = await import("../commonRequest.js");

      const executionLog: string[] = [];
      const globalInterceptor = (cfg: any) => { executionLog.push("global"); return cfg; };
      const tempInterceptor = (cfg: any) => { executionLog.push("temp"); return cfg; };

      const { commonRequest, addReqInterceptor } = setupAxios(
        { baseUrl: "https://api.example.com", timeout: 5000 },
        "web"
      );

      addReqInterceptor(globalInterceptor);
      addReqInterceptor(tempInterceptor, true);

      await commonRequest({ url: "/test1", method: "GET" });
      assert.deepStrictEqual(executionLog, ["global", "temp"], "第一次请求两个拦截器都应执行");

      executionLog.length = 0;

      await commonRequest({ url: "/test2", method: "GET" });
      assert.deepStrictEqual(executionLog, ["global"], "第二次请求只有全局拦截器应执行");
    } finally {
      globalThis.fetch = globalFetch;
    }
  });
});
