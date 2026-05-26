// Bug 4 + 问题 9 测试：addDecorateTool 参数 + 多实例隔离
import { describe, it, mock } from "node:test";
import assert from "node:assert";

describe("apiRequest — Bug 4: addDecorateTool 参数", () => {
  it("addDecorateTool 应接收 toolName 和 fn 两个参数", async () => {
    const { setupApiAxios } = await import("../apiRequest.js");

    const globalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }))
    ) as any;

    try {
      const api = new setupApiAxios(
        { baseUrl: "https://api.example.com", timeout: 5000 },
        "web"
      );

      let toolExecuted = false;
      const myTool = (cfg: any) => {
        toolExecuted = true;
      };

      api.addDecorateTool("myTool", myTool);

      await api.request({ url: "/test", method: "GET" });

      assert.strictEqual(toolExecuted, true, "通过 addDecorateTool 注册的工具应在请求时执行");
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it("removeDecorateTool 应接收 toolName 参数并正确移除工具", async () => {
    const { setupApiAxios } = await import("../apiRequest.js");

    const globalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }))
    ) as any;

    try {
      const api = new setupApiAxios(
        { baseUrl: "https://api.example.com", timeout: 5000 },
        "web"
      );

      let toolExecuted = false;
      const myTool = (cfg: any) => {
        toolExecuted = true;
      };

      api.addDecorateTool("myTool", myTool);
      api.removeDecorateTool("myTool");

      await api.request({ url: "/test", method: "GET" });

      assert.strictEqual(toolExecuted, false, "移除后的工具不应在请求时执行");
    } finally {
      globalThis.fetch = globalFetch;
    }
  });
});

describe("apiRequest — 问题 9: 多实例隔离", () => {
  it("两个实例的工具管理应互不干扰", async () => {
    const { setupApiAxios } = await import("../apiRequest.js");

    const globalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }))
    ) as any;

    try {
      const apiA = new setupApiAxios(
        { baseUrl: "https://a.example.com", timeout: 5000 },
        "web"
      );
      const apiB = new setupApiAxios(
        { baseUrl: "https://b.example.com", timeout: 5000 },
        "web"
      );

      let toolACalled = false;
      let toolBCalled = false;

      apiA.addDecorateTool("toolA", (cfg: any) => { toolACalled = true; });
      apiB.addDecorateTool("toolB", (cfg: any) => { toolBCalled = true; });

      await apiA.request({ url: "/test", method: "GET" });
      assert.strictEqual(toolACalled, true, "实例 A 的工具应执行");
      assert.strictEqual(toolBCalled, false, "实例 B 的工具不应在 A 的请求中执行");

      await apiB.request({ url: "/test", method: "GET" });
      assert.strictEqual(toolBCalled, true, "实例 B 的工具应执行");
    } finally {
      globalThis.fetch = globalFetch;
    }
  });
});
