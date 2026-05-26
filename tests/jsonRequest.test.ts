// Bug 5 测试：CombinateManage 实例持久性
import { describe, it, mock } from "node:test";
import assert from "node:assert";

describe("jsonRequest — Bug 5: CombinateManage 实例持久性", () => {
  it("多次 useApi 调用应共享同一 toolMap，用户添加的工具不丢失", async () => {
    const { setupJsonAxios } = await import("../jsonRequest.js");

    const globalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }))
    ) as any;

    try {
      let toolCallCount = 0;

      const instance = setupJsonAxios({
        jsonAxios: {
          "getUser": { url: "/users/1", method: "GET" },
          "getPosts": { url: "/posts", method: "GET" },
        },
        config: { baseUrl: "https://api.example.com", timeout: 5000 },
        platform: "web",
      });

      // 注册自定义工具
      instance.addCombinateTool("counter", (cfg: any) => {
        toolCallCount++;
      });

      // 多次调用 useApi
      await instance.useApi("getUser", {});
      await instance.useApi("getPosts", {});

      assert.strictEqual(toolCallCount, 2,
        "每次 useApi 调用都应执行已注册的工具，工具不应丢失");
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it("removeCombinateTool 应能正确移除工具", async () => {
    const { setupJsonAxios } = await import("../jsonRequest.js");

    const globalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }))
    ) as any;

    try {
      let toolCallCount = 0;
      const myTool = (cfg: any) => { toolCallCount++; };

      const instance = setupJsonAxios({
        jsonAxios: { "getUser": { url: "/users/1", method: "GET" } },
        config: { baseUrl: "https://api.example.com", timeout: 5000 },
        platform: "web",
      });

      instance.addCombinateTool("myTool", myTool);
      await instance.useApi("getUser", {});
      assert.strictEqual(toolCallCount, 1);

      instance.removeCombinateTool("myTool");
      await instance.useApi("getUser", {});
      assert.strictEqual(toolCallCount, 1, "移除后工具不应再执行");
    } finally {
      globalThis.fetch = globalFetch;
    }
  });
});
