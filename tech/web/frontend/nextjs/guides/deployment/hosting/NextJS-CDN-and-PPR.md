---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js CDN 캐시와 PPR 배포"]
---

# Next.js CDN 캐시와 PPR 배포

## HTTP 캐시와 무효화 계층

Next.js 응답은 표준 Cache-Control을 사용한다. CDN이 같은 헤더를 존중해도 서버 캐시와 CDN 저장소는 별개다.
| 응답 | 공유 캐시 정책 |
| --- | --- |
| revalidate 없는 정적 페이지 | s-maxage=31536000 |
| 시간 기반 ISR | s-maxage=<revalidate>, stale-while-revalidate=<expire - revalidate> |
| 캐시하지 않는 동적 페이지 | private, no-cache, no-store, max-age=0, must-revalidate |
| 해시 있는 /_next/static 자산 | public, max-age=31536000, immutable |

ISR의 expire 기본 1년이라는 설명은 기존 렌더/expire 설정 모델을 전제로 한다. Cache Components의 cacheLife profile은 별도로 읽는다.
JavaScript/CSS/image/font 중 해시 자산에 적용하는 정책이며 public의 변경 가능한 파일 전체를 1년 immutable로 만들지 않는다.
assetPrefix로 자산을 다른 domain/CDN origin에서 제공할 수 있다.
revalidateTag/revalidatePath는 Next 캐시를 무효화하지만 독립 CDN의 복사본은 TTL까지 남을 수 있다.
즉시 반영할 때 서버 invalidation과 CDN purge API를 연결하고 HTML과 RSC variant의 관련 키를 함께 purge한다.
사용자별 응답/Set-Cookie와 공유 cache의 경계도 확인한다.

## 현재 RSC 헤더와 키

| 입력 | 의미 |
| --- | --- |
| rsc | HTML 대신 RSC payload 요청 |
| next-router-state-tree | 현재 client tree에 맞춘 부분 갱신 |
| next-router-prefetch | prefetch 요청 여부 |
| next-router-segment-prefetch | 특정 segment 요청 |
| next-url | interception을 사용하는 경로의 원래 URL |

Vary가 이를 알리지만 CDN의 지원에는 별도 설정이 필요할 수 있다. 현재 _rsc query는 관련 헤더값의 hash를 cache key로 구분한다.
rsc 헤더를 원본 서버로 전달해야 한다. 이를 지우면 router가 RSC를 기대하는데 HTML이 와서 client 이동을 깨뜨리고 browser navigation이 발생할 수 있다.
prefetch 헤더가 있는 흐름은 그 헤더와 _rsc를 함께 보존한다. query를 캐시 키에서 제외하지 않는다.
잘못된 _rsc 값은 기본 검증에서 올바른 hash URL로 307 redirect될 수 있다. CDN은 redirect를 처리해야 한다.
experimental.validateRSCRequestHeaders: false는 이 동작을 끄는 옵션이다. upstream이 hash를 정확히 계산해 rewrite하면 왕복을 줄일 수 있으나 protocol을 일치시켜야 한다.

Proxy는 auth/redirect/rewrite 결정을 cache hit보다 먼저 적용해야 한다.
CDN 뒤에 Proxy를 둘 경우 그 결정에 의존하는 경로는 cache bypass 등으로 Proxy가 실제 실행되게 한다.

## 생략 가능한 입력의 비용

non-prefetch RSC에서 state-tree를 빼면 좁은 segment 갱신 대신 전체 payload가 올 수 있다.
prefetch에서 segment-prefetch를 빼면 특정 segment 대신 넓은 prefetch가 된다.
next-url을 빼면 서버가 interception의 원래 경로를 모르므로 target 페이지로 일반 이동한다.
parse 가능한 응답이라는 의미일 뿐 같은 화면/용량/캐시 hit를 보장하지 않는다.
현재 hash에는 static prefetch에서도 next-url이 들어갈 수 있으므로 이를 임의로 지우면 cache miss나 보정 왕복이 생긴다.

## 정적 prefetch와 pathname 방향

PPR static prefetch는 같은 사전 내용이며 state-tree를 해석하지 않는다. _rsc를 key에 포함하고 응답 Cache-Control을 존중하면 CDN에 저장할 수 있다.
PPR이 없는 prefetch는 state-tree에 따라 segment가 달라져 Vary 경우가 늘어난다.
Cache Components의 segment prefetch는 /page.segments/_tree.segment.rsc 같은 pathname route를 이미 사용한다.
정적 export와 일부 segment 경로의 방식이 전체 pathname cache key 설계의 출발점이다.
설계 예는 전체 RSC /my/page.rsc, segment /my/page.segments/path/to/segment.segment.rsc다.
이 방향은 pathname만으로 타입/variant를 구분하고 표준 HTTP 캐시를 쓰며 custom Vary와 _rsc 의존을 없애려는 active design이다.
현재 모든 RSC 요청에서 query를 제거해도 된다는 배포 계약은 아니다.
예상 interception variability는 별도 search param으로 남는다. 보존하면 interception, 제외하면 일반 target으로 저하되어 client 이동은 유지하는 방향이다.
현재 사용 방식과 아직 설계 중인 통합 방식은 구분한다.

## PPR의 빌드 산출물

PPR은 하나의 route 안에 정적/동적 경계를 둔다. build에서 정적 HTML shell, static RSC와 postponedState 문자열을 생성한다.
shell에는 동적 내용 위치의 Suspense fallback이 있다. 요청 때 shell를 즉시 보내고 postponedState로 동적 렌더를 재개해 deferred boundary를 hydrate한다.
postponedState는 opaque 값이다. parse하거나 수정하면 동적 출력이 맞지 않을 수 있다.
HTML shell과 postponedState를 같은 버전의 쌍으로 저장하고 원자적으로 갱신한다.
시간/요청 기반 revalidation은 두 산출물을 함께 재생성한다. 새 shell와 옛 state의 혼합은 잘못된 결과를 만든다.
adapter의 requestMeta.onCacheEntryV2로 새 cache entry를 관찰해 저장소에 전파한다.

## 배포 구조별 흐름

origin-only next start는 local shell를 보내고 dynamic을 이어서 stream한다. HTTP streaming 외 추가 edge 저장소는 필수가 아니다.
CDN shell+origin compute는 edge가 shell를 즉시 보내며 가능한 병렬로 origin resume를 요청한다.
origin은 dynamic만 렌더링하고 CDN은 shell와 그 stream을 하나의 응답으로 연결한다. stream 결합을 할 수 있는 CDN 구성이 필요하다.
onBuildComplete에서 채운 edge KV shell는 CDN miss 없이 더 낮은 TTFB를 만드는 플랫폼 선택이다. 앱 자체 코드를 바꿀 조건은 아니다.
PPR 기능 지원과 edge TTFB의 최적화 수준은 별개다.

## Resume protocol

CDN에서 origin route로 POST하고 next-resume: 1 헤더와 postponedState 전체를 body에 넣는다.
원본 handler는 shell를 제외하고 deferred Suspense boundary만 렌더링한다. 일반 next start 요청은 이 분리를 자동 처리한다.
Action과 resume가 결합하면 body는 state prefix 다음 action body이고 x-next-resume-state-length가 prefix의 byte length를 전달한다.
순수 resume는 body 전체가 state여서 이 길이 헤더가 필요 없다.
in-process adapter는 req.method POST, 같은 헤더/body로 handler를 호출하거나 세 번째 인자의 requestMeta: {postponed: state}를 전달한다.
응답을 res로 stream하며 별도 HTTP 왕복은 없다. 사용자 요청과 신뢰할 내부 resume 호출의 경계를 검증한다.

## Adapter 구현과 장애

onBuildComplete의 outputs.prerenders에서 renderingMode: 'PARTIALLY_STATIC'을 찾고 fallback.postponedState와 shell를 읽는다.
pprChain.headers는 next-resume: '1'을 포함한다.
빌드 저장, 요청 shell stream, dynamic resume, onCacheEntryV2의 원자적 갱신, 누락/오래된 state의 full-render fallback을 모두 구현한다.
같은 데이터 변경 뒤 HTML과 RSC가 같은 버전을 보여 주는지 확인하고 다중 인스턴스/edge 지역/구배포/stale shell/origin 장애를 포함한다.
버퍼링 CDN은 최종 응답을 성공시켜도 점진적 PPR 경험을 없앨 수 있다.
deploymentId에 따른 hard navigation은 배포 skew 완화이며 데이터 캐시 invalidation을 대체하지 않는다.

## 이해 확인

- 서버의 revalidateTag 성공 후에도 CDN에서 이전 HTML이 보이는 이유와 purge할 variant는 무엇인가?
- shell와 postponedState의 원자적 갱신이 필요한 이유는 무엇인가?

## 출처

- [Next.js, cdn-caching](https://nextjs.org/docs/app/guides/cdn-caching)
- [Next.js, ppr-platform-guide](https://nextjs.org/docs/app/guides/ppr-platform-guide)

## 관련 문서

- [[NextJS-Cache-Operations]]
- [[NextJS-Streaming]]
- [[NextJS-Platform-Deployment]]
- [[NextJS-Adapter-PPR]]
