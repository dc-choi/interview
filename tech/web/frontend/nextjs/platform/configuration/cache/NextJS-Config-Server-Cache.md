---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js server cacheHandler 계약", "NextJS-Config-Server-Cache"]
---

# Next.js server cacheHandler 계약

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## cacheHandler

설정 key는 singular `cacheHandler`, 공식 URL은 레거시 이름 incrementalCacheHandlerPath다. ISR, prerendered page, Route Handler response와 opt-in optimized image의 server cache를 외부 저장소로 연결한다. `use cache`는 plural `cacheHandlers`가 담당한다.

14.1에서 cacheHandler로 개명되어 안정화됐고 16.2에서 optimized image 지원을 추가했다. Node.js server/Docker에서 사용하며 static export에서는 적용되지 않고 adapter 지원은 플랫폼별이다.

```js
export default {
  cacheHandler: require.resolve('./server-cache.js'),
  cacheMaxMemorySize: 0,
  images: { customCacheHandler: true },
}
```

## get과 set

`get(key: string, ctx)`는 cached value 또는 null을 반환한다. ctx.kind는 APP_PAGE, APP_ROUTE, PAGES, FETCH, IMAGE 등을 구분한다. `set(key, data, ctx)`는 Promise<void>이며 data 또는 null과 tags 정보를 받는다. IMAGE에는 buffer, etag, extension, revalidate가 있다. kind별 데이터를 손실 없이 serialize해야 한다.

key는 opaque identifier다. pathname으로 파싱하거나 일부 prefix를 버리면 route 간 격리가 무너진다. response key는 response kind와 source route SHA-256 hash를 포함한다. Pages source는 canonical pathname, App source는 route groups/parallel slots를 포함한 전체 page module identity다. 예를 들어 `/route-cache/PAGES/<route-hash>/$/blog/post`는 `/blog/post` 자체와 다른 key다. fetch key는 이 namespace 변경과 별개다.

## route ownership과 build seed

adapter 없이 build seed는 historical server/pages, server/app에 남고 metadata가 scoped key, source owner와 fallback 상태를 식별한다. built-in cache는 metadata를 검사한 뒤 server/route-cache로 promote하며 원본과 age를 보존한다. adapter가 있으면 build artifact부터 scoped server/route-cache로 기록한다. static export의 public 파일은 정상 경로를 유지한다.

runtime은 scoped key를 사용하며 custom handler에 historical pathname을 질의하지 않는다. prerender manifest의 source-route metadata를 packaging에서 보존해야 allowed parameters와 selected route rendering mode를 확인할 수 있다. handler 전 CDN response를 읽는 플랫폼도 namespace와 owner를 보존해야 한다.

## revalidateTag와 resetRequestCache

`revalidateTag(tag: string | string[])`는 tags를 무효화하고 Promise<void>를 반환한다. `resetRequestCache()`는 다음 request 전에 request-local temporary cache를 지우며 void를 반환한다. `revalidatePath()`는 tag 계층 위에 있으므로 path 무효화도 handler의 tag 처리로 이어진다.

## optimized image opt in

`images.customCacheHandler: true`를 켜면 optimized image를 같은 handler로 저장한다. IMAGE kind를 지원하는지 먼저 확인한다. page JSON만 저장하던 구현에 flag만 켜면 buffer/content metadata가 깨질 수 있다. image cache key/etag/revalidate를 유지하고 client/CDN와 backend cache를 구분한다.

## 운영 점검

다중 인스턴스에서 A가 invalidation한 후 B의 읽기가 갱신되는지, process restart 후 entry가 유지되는지, 저장소 장애에서 cache miss와 application failure 정책이 의도대로인지 검사한다. cacheMaxMemorySize 0을 개발에서 확인한 결과만으로 production 동작을 증명하지 않는다. key 보존과 source ownership은 shared cache의 correctness/security 계약이다.

## namespace digest와 버전 이전

route hash는 UTF-8 source route 문자열의 64자리 hexadecimal SHA-256이다. disk depth를 제한하고 Unicode source 이름 확장을 피하며 hash에서 원본 route를 복원할 수는 없다. 12.2 experimental 도입, 13.4 revalidateTag/standalone 지원, 14.1 stable 개명, 16.2 image opt-in 순서다. 현재 images.customCacheHandler:true는 opt-in이며 다음 major 기본 전환 계획을 현재 기본값처럼 쓰지 않는다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/incrementalCacheHandlerPath](https://nextjs.org/docs/app/api-reference/config/next-config-js/incrementalCacheHandlerPath)

## 관련 문서

- [[NextJS-Config-Cache-Handlers]]
- [[NextJS-Adapter-Outputs]]
