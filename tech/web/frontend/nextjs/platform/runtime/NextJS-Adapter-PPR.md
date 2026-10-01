---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js adapter의 PPR shell과 resume", "NextJS-Adapter-PPR"]
---

# Next.js adapter의 PPR shell과 resume

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## PPR build seed

PPR adapter는 outputs.prerenders의 fallback.filePath와 postponedState를 저장한다. shell HTML, initial headers/status, revalidate/expiration도 함께 보존한다. 이 state는 HTML과 분리된 임의 문자열이 아니라 해당 build/route render의 deferred work를 재개하는 정보다.

## response stream

request 때 cache shell을 먼저 보내고 Next.js handler의 resumed stream을 같은 HTTP response에 이어 붙인다. shell과 dynamic content를 두 문서 response로 보내면 hydration/stream protocol이 깨진다. cached shell이 없는 경우의 blocking/full render도 제공해야 한다.

```text
Client -> Adapter -> cache shell + postponedState
                 -> shell stream -> Client
                 -> Next handler resume
                 -> resumed stream -> 같은 Client response
```

## resume 호출 방식

직접 Node handler invocation은 requestMeta.postponed로 cached state를 전달할 수 있다. internal HTTP resume protocol에서는 pprChain.headers의 next-resume: 1을 붙이고 POST body에 postponedState를 보낸다. handler는 deferred Suspense work를 render/stream한다. cached shell을 먼저 제공하는 CDN/origin 구조에서 유용하며 일반 next start는 shell과 dynamic render를 자동 통합한다.

두 호출 방식을 무조건 동시에 적용하는 것은 아니다. 직접 handler context와 internal HTTP protocol 중 platform integration에 맞는 경로를 선택하고 정상 Node render를 보존한다.

## onCacheEntryV2

lookup/generation 때 callback으로 APP_PAGE의 html/postponed/headers/status/cacheControl을 shared store에 반영한다. html은 render result object일 수 있어 toUnchunkedString 같은 지원 접근을 확인한다. legacy onCacheEntry는 deprecated다.

```ts
await handler(req, res, {
  waitUntil,
  requestMeta: {
    postponed: cachedEntry?.postponedState,
    onCacheEntryV2: async (entry, meta) => {
      await persistCompleteEntry(entry, meta)
      return false
    },
  },
})
```

false는 normal Next response flow를 계속한다. true는 adapter가 이미 response를 작성했다는 뜻이므로 실제 처리하지 않았는데 true를 반환하면 response가 없어질 수 있다. persistCompleteEntry는 platform-specific serialization/storage 함수이며 stream/headers/source ownership을 보존해야 한다.

## lifetime와 다중 인스턴스

waitUntil로 response 이후 cache write/revalidation이 종료되도록 연결한다. callback은 요청 instance에서만 호출하므로 다른 instance가 update를 보려면 shared store/tag coordination이 필요하다. shell/state를 deployment/route 소유자에 맞게 namespace하고 partial/incomplete stream을 완성 cache로 취급하지 않는다.

## 확인

cache miss/hit, shell 첫 byte 시점, deferred stream 완성, abort/storage failure, invalidation 이후 regenerated shell과 rolling deployment의 old/new state를 확인한다. bot/metadata와 response headers도 유지한다. 전체 CDN/origin 구성은 [[NextJS-CDN-and-PPR]]에 연결한다.

## build seed와 callback 저장의 구체적 조건

seed는 fallback?.filePath와 postponedState가 모두 있을 때만 readFile UTF-8로 shell을 읽고 pathname key에 저장한다. fallback.initialHeaders/initialStatus/initialRevalidate/initialExpiration도 함께 기록한다. callback은 cacheEntry.value?.kind===APP_PAGE를 검사하고 html.toUnchunkedString이 함수면 문자열을 만들며 아니면 null을 저장하는 원문 예시다. meta.url || req.url || /를 key로 쓰고 value.postponed/headers/status와 cacheEntry.cacheControl을 저장한다. 내부 onCacheCallback abstraction이 있다면 onCacheEntryV2에 연결한다. callback은 lookup뿐 아니라 generation 때도 호출되며 모든 cache 작업 관찰에 쓰일 수 있다.

## 출처

- [Next.js, app/api-reference/adapters/implementing-ppr-in-an-adapter](https://nextjs.org/docs/app/api-reference/adapters/implementing-ppr-in-an-adapter)

## 관련 문서

- [[NextJS-Adapter-Outputs]]
- [[NextJS-Config-Cache-Handlers]]
- [[NextJS-CDN-and-PPR]]
