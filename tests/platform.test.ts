// Bug 6 + 问题 8 测试：method 字段 + 配置合并优先级
import { describe, it, mock } from "node:test";
import assert from "node:assert";

describe("platform/web — Bug 6: method 字段", () => {
  it("POST 请求应正确携带 method: POST", async () => {
    const { setupAxios } = await import("../commonRequest.js");

    let capturedRequest!: Request;
    const globalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn((input: Request | URL | string, init?: RequestInit) => {
      capturedRequest = input instanceof Request ? input : new Request(input, init);
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }));
    }) as any;

    try {
      const { commonRequest } = setupAxios(
        { baseUrl: "https://api.example.com", timeout: 5000 },
        "web"
      );

      await commonRequest({ url: "/test", method: "POST", data: { name: "test" } });

      assert.ok(capturedRequest, "应发出请求");
      assert.strictEqual(capturedRequest.method, "POST",
        "POST 请求的 method 应为 POST，非 GET");
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it("PUT 请求应正确携带 method: PUT", async () => {
    const { setupAxios } = await import("../commonRequest.js");

    let capturedMethod: string | null = null;
    const globalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn((input: Request | URL | string, init?: RequestInit) => {
      capturedMethod = input instanceof Request ? input.method : (init?.method || "GET");
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }));
    }) as any;

    try {
      const { commonRequest } = setupAxios(
        { baseUrl: "https://api.example.com", timeout: 5000 },
        "web"
      );

      await commonRequest({ url: "/test", method: "PUT", data: { name: "test" } });

      assert.strictEqual(capturedMethod, "PUT");
    } finally {
      globalThis.fetch = globalFetch;
    }
  });

  it("DELETE 请求应正确携带 method: DELETE", async () => {
    const { setupAxios } = await import("../commonRequest.js");

    let capturedMethod: string | null = null;
    const globalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn((input: Request | URL | string, init?: RequestInit) => {
      capturedMethod = input instanceof Request ? input.method : (init?.method || "GET");
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }));
    }) as any;

    try {
      const { commonRequest } = setupAxios(
        { baseUrl: "https://api.example.com", timeout: 5000 },
        "web"
      );

      await commonRequest({ url: "/test", method: "DELETE" });

      assert.strictEqual(capturedMethod, "DELETE");
    } finally {
      globalThis.fetch = globalFetch;
    }
  });
});

describe("platform/web — 问题 8: 配置合并优先级", () => {
  it("局部配置应优先于全局配置", async () => {
    const { setupAxios } = await import("../commonRequest.js");

    let capturedUrl!: URL;
    const globalFetch = globalThis.fetch;
    globalThis.fetch = mock.fn((input: Request | URL | string) => {
      capturedUrl = new URL(input instanceof Request ? input.url : input.toString());
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      }));
    }) as any;

    try {
      const { commonRequest } = setupAxios(
        { baseUrl: "https://global.example.com", timeout: 5000 },
        "web"
      );

      // 局部请求指定了不同的 baseUrl
      await commonRequest({
        url: "/test",
        method: "GET",
        baseUrl: "https://local.example.com",
      });

      assert.strictEqual(capturedUrl.origin, "https://local.example.com",
        "局部 baseUrl 应优先于全局 baseUrl");
    } finally {
      globalThis.fetch = globalFetch;
    }
  });
});
