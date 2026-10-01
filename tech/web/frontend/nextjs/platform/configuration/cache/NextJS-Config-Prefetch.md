---
tags: [Next.js, Frontend, Configuration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js prefetch 설정과 요청 비용", "NextJS-Config-Prefetch"]
---

# Next.js prefetch 설정과 요청 비용

기준: 2026-10-01에 확인한 Next.js 16.3.x 공식 문서. 실험 옵션은 정식 기능과 구분해 적용한다.

## partialPrefetching

16.3의 top-level boolean 기본 false다. true면 route별 reusable App Shell의 static parts를 prefetch하고 params/searchParams/full URL에 의존하는 부분은 navigation 때 기본 해결한다. `cacheComponents`가 필요하며 없으면 dev/build config validation에서 실패한다.

```js
export default { cacheComponents: true, partialPrefetching: true }
```

기존 N link URL마다 prefetch 대신 같은 route template의 shell을 공유한다. cookies/headers를 읽으면 session data가 포함될 수 있어 Next.js가 session별 client shell cache를 처리한다. framework cache 격리를 CDN public caching의 근거로 확대하지 않는다.

`<Link prefetch={true}>`는 URL-specific data와 그 뒤의 cache content까지 더 가져오도록 요청한다. partial prefetch에 opt-in하지 않은 route에 사용하면 dev warning이 app-level partialPrefetching 또는 segment `prefetch = 'partial'`를 제안할 수 있다. segment가 explicit prefetch를 export하면 app default를 override한다.

## prefetchInlining

실험 `experimental.prefetchInlining`은 App Router의 작은 segment response 묶음을 조절한다. 동작 자체는 router의 일부이며 config만 실험 상태다. 기본 true는 request 수를 줄이지만 shared segment bytes가 route마다 일부 중복될 수 있다. false면 segment를 개별 prefetch한다.

object의 `maxSize` 기본 2048 bytes는 단일 segment eligibility, `maxBundleSize` 기본 10240 bytes는 경로별 bundle 총 상한이다. 둘 다 gzip-compressed segment bytes를 기준으로 한다. 일부 field만 지정하면 나머지는 기본을 유지한다. 16.2 도입, 16.3 기본 활성화다.

```js
export default {
  experimental: { prefetchInlining: { maxSize: 2048, maxBundleSize: 10240 } },
}
```

## 선택과 측정

partialPrefetching은 어떤 route data를 미리 가져오는지, inlining은 작은 segment 응답을 어떤 request로 묶는지 바꾼다. 같은 옵션의 별명으로 취급하지 않는다. visible links가 많은 목록에서 Network의 request count, transferred bytes, navigation latency와 cache reuse를 함께 비교한다. 요청 수 감소만 보고 총 비용 개선을 결론 내리지 않는다.

## 출처

- [Next.js, app/api-reference/config/next-config-js/partialPrefetching](https://nextjs.org/docs/app/api-reference/config/next-config-js/partialPrefetching)
- [Next.js, app/api-reference/config/next-config-js/prefetchInlining](https://nextjs.org/docs/app/api-reference/config/next-config-js/prefetchInlining)

## 관련 문서

- [[NextJS-Config-Cache-Policy]]
- [[NextJS-Config-Rendering]]
