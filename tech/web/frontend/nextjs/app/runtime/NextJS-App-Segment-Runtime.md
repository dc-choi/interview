---
tags: [nextjs, app-router, runtime]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["segment 실행 설정과 플랫폼 계약"]
---

# segment 실행 설정과 플랫폼 계약

## 실행 환경과 함수 계열

App Router의 함수 API는 server rendering, request/response, navigation, metadata, cache 등 서로 다른 경계에서 동작한다. next/cache, next/server, next/headers, next/navigation import가 어느 실행 위치를 지원하는지 개별 API 계약을 따른다. 이름에 server가 없어도 client에서 호출 가능한 것은 아니며 client hook을 Server Component에서 쓰지 않는다.

route segment config는 page/layout/route 파일의 statically analyzable export로 설정한다. layout은 해당 subtree의 실행에 영향을 주므로 가까운 page와 parent의 관계를 확인한다. 이 기능을 arbitrary config object나 동적 runtime 계산처럼 취급하지 않는다.

## Cache Components와 제거된 설정

Cache Components를 켜면 이전 모델의 dynamic, revalidate, fetchCache, dynamicParams exports는 더 이상 같은 계약으로 쓰지 못하고 오류가 난다. experimental_ppr도 제거되었다. 정적/동적 의도는 use cache, request API, io/connection, Suspense로 표현하고 instant/prefetch 설정은 별도 계약으로 사용한다. instant=false만으로 synchronous uncached I/O 오류를 없애지는 않는다.

Cache Components를 끈 프로젝트에는 기존 설정이 남아 있을 수 있다. 버전만16이라고 모든 route를 같은 cache 모델로 읽지 않고 next.config의 cacheComponents와 실제 export를 함께 확인한다.

## maxDuration

maxDuration은 page/layout/route에서 초 단위로 export하는 실행 시간 hint다. Next 자체가 이 숫자만으로 모든 함수 실행을 강제 중단하는 계약은 아니다. deployment platform이 이를 읽고 제한을 적용할 수 있다. Server Action의 최대 실행 시간은 호출 page의 config와 host 제한을 함께 확인한다.

```ts
export const maxDuration = 10
export async function POST(request: Request) {
  return Response.json(await processWithinBudget(request))
}
```

after 작업도 platform의 실행 수명/maxDuration에 제한될 수 있다. 제한을 늘리는 것과 작업이 crash 뒤에도 지속되는 durable queue는 다르다. 외부 작업의 timeout과 취소, 재시도도 별도로 설정한다.

## runtime과 preferredRegion

runtime의 기본은 Node.js다. Edge runtime export는 deprecated이며 현재 문서는 해당 export 제거를 권고한다. Proxy에서는 runtime config를 export할 수 없다. 오래된 Edge 예제를 그대로 적용하기 전에 사용 API와 host 지원을 확인한다.

preferredRegion도 deprecated이며 export 제거를 권고한다. 이전 계약에서는 auto/global/home 또는 region string/string array 같은 platform-specific region 설정을 썼다. parent에서 inheritance하고 가까운 export가 override하며 배열이 parent와 자동 합쳐지는 것은 아니다. region 이름과 데이터 residency 효과는 deployment platform의 실제 지원을 확인한다. 소스에 export가 있다는 이유만으로 배포 위치가 확정된 것으로 기록하지 않는다.

## config 타입, 기본값과 이력

| export | 타입, 기본값 |
| --- | --- |
| dynamicParams | boolean, true (Cache Components 미지원) |
| runtime | nodejs, 기본 nodejs, deprecated edge |
| preferredRegion | auto/global/home/string/string[], 기본 auto, deprecated |
| maxDuration | number 초, 기본 platform이 결정 |

preferredRegion `iad1`은 한 region, `['iad1','sfo1']`은 listed region 모두이며 목록 중 하나를 고르는 뜻이 아니다. nearest parent 상속/root auto, child가 parent를 교체하는 기존 계약을 따른다. Vercel의 예전 edge regional auto는 default region, global은 available 전체, home은 home region을 선호하며 unsupported 값은 error다. 현재 deprecated export는 제거 방향을 따른다.

maxDuration은 v13.4.10 도입됐고 `export const maxDuration = 5`처럼 page에 두면 그 page에서 쓰는 모든 Server Action의 default timeout 변경에 host가 활용할 수 있다. v16 Cache Components에서 dynamic/dynamicParams/revalidate/fetchCache와 experimental_ppr가 제거됐고 PPR 제거 codemod가 있다. v15RC experimental-edge runtime 값은 deprecated되어 edge로 바꾸는 codemod가 있었지만 현재 edge 자체의 deprecation과 구분한다.

## 이해 확인

1. maxDuration=10이 self-hosted Node에서 반드시10초 timeout을 발생시키는가?
2. cacheComponents를 켠 뒤 dynamic='force-dynamic'을 유지하는 방식의 문제는?
3. preferredRegion 표기만으로 개인정보의 저장 지역을 증명할 수 있는가?

## 출처

- [Next.js, route-segment-config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config)
- [Next.js, maxDuration](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/maxDuration)
- [Next.js, preferredRegion](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/preferredRegion)
- [Next.js, runtime](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config/runtime)
- [Next.js, functions](https://nextjs.org/docs/app/api-reference/functions)

## 관련 문서

- [[NextJS-App-IO]]
- [[NextJS-App-After]]
- [[NextJS-App-Cache-Components]]
- [[NextJS-App-Instant-Validation]]
- [[NextJS-App-Prefetch-Config]]
