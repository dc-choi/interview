---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Hosting worker runtime와 Node 호환성"]
---

# EAS Hosting worker runtime와 Node 호환성

Hosting은 Cloudflare Workers의 V8 isolate를 사용한다. request마다 full Node process를 실행하지 않으며 browser/service worker와 가까운 Web API runtime이다. import가 성공하는 shim이라도 Node와 같은 기능을 보장하지 않는다.

## Built-in modules의 범위

assert/async_hooks/buffer/constants/events/path/querystring/stream(string/web/consumers)/string_decoder/test/timers/url/util(util/types)/zlib는 제공한다. crypto/diagnostics_channel은 일부 deprecated 기능이 없다. dns는 Resolver가 없고 Cloudflare에 요청한다. fs는 in-memory file system이다. http/https/tls는 server 기능이 없고 http2는 부분 지원이다. net은 Server/BlockList가 없고 client socket도 부분 지원이다. module은 SourceMap이 없고 부분 지원이다.

os/process는 Linux와 비슷한 mock/stub, console/tty는 JS shim, trace_events는 동작하지 않는 stub다. punycode/readline/worker_threads는 미지원이며 stdin/threading을 전제하지 않는다. 원문에 없는 module은 지원을 기대하지 않는다. persistent file, native addon, process spawn, Node server listening이 필요한 dependency는 다른 runtime을 선택하거나 Web API 경로로 바꾼다.

## Globals와 environment

origin은 incoming Origin, process.env는 Hosting environment variables, stdout/stderr는 console.log/error로 연결된다. setImmediate/clearImmediate, Buffer, EventEmitter, global=globalThis, WeakRef/FinalizationRegistry를 제공한다.

require는 배포한 JS file과 built-ins만 제한적으로 지원하며 Node module resolution과 require.cache는 지원하지 않는다. 환경변수의 존재가 client bundle secret 보호를 자동 보장하지는 않는다. source의 runtime 표는 2025-10-22 기준이므로 이후 Cloudflare 지원 추가를 Hosting의 확정 지원으로 추정하지 않는다.

## 출처

- [Expo Documentation, EAS Hosting worker runtime](https://docs.expo.dev/eas/hosting/reference/worker-runtime)

## 관련 문서

- [[Expo-EAS-Hosting]]
- [[Expo-SDK-Server]]
