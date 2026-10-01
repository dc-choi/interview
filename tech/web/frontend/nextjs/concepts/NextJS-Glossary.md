---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 공식 용어 전체 대응"]
---

# Next.js 공식 용어 전체 대응

## 공식 용어의 전체 목록

영문 용어를 유지하되 적용 조건과 혼동하기 쉬운 경계를 함께 적었다. 원문의 알파벳 구분 제목은 탐색용이므로 이 표에 통합했다.

| 용어 | 의미와 적용 조건 |
| --- | --- |
| `App Router` | v13에 도입된 RSC 기반 파일 라우터다. layout, 중첩 route, loading과 error 경계를 구성한다. |
| `App Shell` | URL 데이터와 독립된 route별 prerender다. cached content는 stale이 5분 이상일 때 포함된다. cookies/headers를 읽는 session shell은 client 세션별로 다룬다. 기본 prefetch, 미준비 per-link fallback과 Cache Components ISR fallback에 쓰인다. |
| `Build time` | production 코드 변환, 정적 페이지와 배포 자산을 준비하는 next build 단계다. |
| `Cache Components` | use cache로 함수/UI를 캐시하고 static/cached/dynamic을 합친다. cacheLife로 수명, cacheTag로 식별, updateTag 등으로 무효화한다. |
| `Catch-all Segments` | [...folder]/page.js가 남은 여러 URL 부분을 배열로 받는다. 문서 계층과 파일 탐색에 쓴다. |
| `Client Bundles` | 브라우저에 보내는 JavaScript다. module graph와 route에 따라 분할되며 큰 import의 비용은 남는다. |
| `Client Component` | 브라우저 state/effect/event/API를 사용할 수 있고 초기 HTML을 위한 서버 렌더에도 참여한다. |
| `Client-side navigation` | 전체 document reload 없이 Link 등의 탐색으로 내용을 갱신한다. 공유 layout의 상호작용과 브라우저 상태를 유지한다. |
| `Client Cache` | 방문/prefetch한 RSC를 브라우저 메모리에 둔다. layout/loading 재사용과 page back/forward 복원, 갱신 조건을 구분한다. |
| `Code Splitting` | route 등에 따라 JS chunk를 나눠 처음부터 전체 코드를 받지 않게 한다. |
| `Dynamic rendering` | 요청 시 렌더하는 것. cookies/headers 같은 요청 입력 읽기가 관련되며 dynamic segment와 동의어가 아니다. |
| `Dynamic route segments` | [slug]처럼 데이터로 URL 부분을 결정한다. generateStaticParams로 미리 생성할 수도 있어 요청 시 렌더로 한정하지 않는다. |
| `Environment Variables` | 빌드/서버 실행의 구성 값. NEXT_PUBLIC_는 브라우저에 노출되며 일반적으로 build 때 치환된다. 서버 값도 props에 직접 넘기면 노출될 수 있다. |
| `Error Boundary` | 하위 render 오류에 fallback을 보여 준다. error.js가 segment 경계를 구성하며 모든 이벤트/비동기 오류를 자동 포착하지는 않는다. |
| `Font Optimization` | next/font가 Google/local font를 self-host하고 metric/fallback 조정으로 layout shift를 줄인다. 모든 CLS 제거를 보장하지 않는다. |
| `File-system caching` | Turbopack compiler artifact를 디스크에 보존해 후속 dev/build 작업을 줄이는 캐시다. |
| `Hydration` | 서버 HTML과 client React 트리를 조정하고 handler를 연결하여 상호작용을 활성화한다. |
| `Import Aliases` | 자주 쓰는 경로를 짧은 이름으로 연결한다. tsconfig/jsconfig의 paths 등으로 상대 경로 복잡도를 줄인다. |
| `Incremental Static Regeneration (ISR)` | 사이트 전체 재빌드 없이 정적 결과를 시간/요청 기반으로 재검증한다. Cache Components 사용 여부에 따라 구체 계약이 다르다. |
| `Intercepting Routes` | 현재 layout 문맥에서 다른 route를 보여 주면서 공유 가능한 URL을 유지한다. modal의 soft/hard 탐색 차이가 대표적이다. |
| `Image Optimization` | Image가 조건에 따라 on-demand 이미지 변환, WebP 등 포맷, responsive size와 lazy loading을 지원한다. loader와 배포 제약을 확인한다. |
| `Layout` | layout.js의 공유 UI. 공유 segment 탐색에서 재사용하며 state를 보존한다. 내부 Client Component가 state에 따라 다시 render하지 않는다는 뜻은 아니다. |
| `Loading UI` | loading.js가 page 이하 Suspense를 구성해 대기 중 fallback을 제공한다. |
| `Module Graph` | 파일이 node, import/export 관계가 edge인 의존 그래프다. server/client 경계와 bundling 분석의 기준이다. |
| `Metadata` | title, description, OG image 같은 브라우저/검색/공유 정보. page/layout의 metadata 또는 generateMetadata로 정의한다. |
| `Memoization` | 같은 render 작업의 중복 호출을 줄인다. 적합한 같은 URL/options fetch GET은 component/layout/page/metadata/static params에서 공유되고 Route Handler는 React tree 밖이다. 비-fetch는 React cache를 검토한다. |
| `Middleware` | 이전 명칭이며 현재 문서의 Proxy로 연결된다. 버전별 runtime 차이는 마이그레이션 계약을 확인한다. |
| `Not Found` | 없는 route 또는 notFound()에 대응하는 not-found.js UI다. 이미 시작한 streaming의 HTTP status 조건은 별도다. |
| `Private Folders` | _components처럼 underscore로 시작하는 폴더를 라우팅에서 제외한다. 코드와 utility 정리용이며 보안 경계가 아니다. |
| `Page` | app의 page.js가 특정 route의 고유 UI를 정의한다. |
| `Parallel Routes` | @slot으로 같은 layout 안에 여러 page를 동시/조건부 표시한다. dashboard/modal과 복합 화면에 쓰인다. |
| `Partial Prefetching` | Cache Components에서 partialPrefetching: true로 활성화하며 Link는 기본적으로 URL 전체 대신 route App Shell을 미리 받는다. |
| `Partial Prerendering (PPR)` | 한 route에서 정적 shell을 먼저 보내고 dynamic 내용을 준비되는 대로 스트리밍한다. |
| `Prefetching` | 사용자가 이동하기 전 백그라운드로 route를 준비한다. production의 Link viewport 진입과 설정/정적성에 따라 범위가 달라진다. |
| `Prerendering` | 빌드 또는 revalidation 중 HTML/RSC를 미리 계산해 재사용한다. CDN 전달은 배포 계약에 따른다. |
| `Proxy` | proxy.js에서 요청 완료 전에 logging, redirect와 rewrite 등의 서버 처리를 수행한다. |
| `Redirect` | 브라우저 URL을 목적지로 바꾼다. config redirects, Proxy 또는 redirect() 등 실행 위치별 수단을 선택한다. |
| `Request-time APIs` | cookies(), headers(), page searchParams와 draftMode()처럼 요청 정보를 읽는 API다. 읽는 위치와 Suspense/cache 조건을 확인한다. |
| `Runtime rendering` | 이 용어집에서는 Dynamic rendering과 같은 의미로 연결한다. |
| `Revalidation` | 시간 또는 명시적 요청으로 캐시를 갱신하는 과정이다. cacheLife, cacheTag와 updateTag 등의 계약을 조합한다. |
| `Rewrite` | 브라우저 URL을 유지하면서 요청 처리 목적지를 매핑한다. config/Proxy에서 외부 서비스나 기존 경로로 보낼 수 있다. |
| `Route Groups` | (marketing)처럼 URL에는 드러나지 않는 조직 단위다. 그룹별 layout을 구성할 수 있다. |
| `Route Handler` | route.js가 Web Request/Response 기반 GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS를 처리한다. |
| `Route Segment` | URL slash 사이 부분에 대응하는 routing 계층이다. group/private/slot은 일반 폴더와 URL 대응이 다르다. |
| `RSC Payload` | Server Component 결과, Client Component 참조/placeholder와 props의 전송 표현이다. HTML 또는 client bundle 자체가 아니다. |
| `Server Component` | App Router의 기본 모델로 서버에서 데이터에 직접 접근한다. 자체 코드가 client bundle에 포함되지 않고 browser state/API를 사용할 수 없다. |
| `Server Action` | Action 문맥의 Server Function으로 form 제출과 mutation에 주로 쓰인다. 단지 prop 이름만 Action으로 바꾸는 것으로 생성되지 않는다. |
| `Server Function` | use server로 표시한 서버 async 함수. client에서 원격 호출할 수 있으므로 인자 검증과 인가가 필요하다. |
| `Static Export` | output: export로 HTML/CSS/JS 파일을 생성해 Node 서버 없이 배포한다. 서버 runtime 기능은 제한된다. |
| `Static rendering` | 이 용어집에서는 Prerendering으로 연결한다. |
| `Static Assets` | public의 이미지/font/video 같은 파일을 경로로 제공한다. 변환 서비스와 별개이며 파일별 cache 정책을 확인한다. |
| `Static Shell` | PPR에서 미리 만든 HTML의 정적 내용과 동적 부분의 Suspense fallback이다. |
| `Streaming` | 전체 완료를 기다리지 않고 준비된 페이지 조각을 순차 전송한다. loading.js 또는 수동 Suspense 경계가 관련된다. |
| `Suspense boundary` | 대기하는 자식 대신 fallback을 표시하고 static shell과 후속 streaming의 경계를 구성한다. |
| `Turbopack` | Rust 기반 Next bundler. 현재 Next 16 문서의 dev/build 기본이며 성능 개선 정도는 앱에서 측정한다. |
| `Tree Shaking` | 빌드 때 사용하지 않는 코드를 제거하는 최적화다. side effect와 모듈 구조에 따라 결과가 달라진다. |
| `URL data` | params, searchParams와 usePathname/useSearchParams 등이 읽는 URL별 값이다. session 공유 App Shell에 그대로 포함할 수 없다. |
| `"use cache" Directive` | 파일 또는 함수/컴포넌트 scope를 캐시 대상으로 표시한다. export 및 직렬화 제약은 API 계약을 따른다. |
| `"use client" Directive` | import보다 앞에 두는 client graph 진입 지시어다. 해당 모듈과 의존 모듈을 client bundle 대상으로 삼는다. |
| `"use server" Directive` | 파일 export 또는 개별 async 함수를 서버 호출 대상으로 표시한다. 일반 동기 export를 임의 허용하는 설정은 아니다. |
| `Version skew` | 배포 후 기존 client가 이전 JS/CSS/data/Action을 참조하는 불일치다. deploymentId 감지와 이전 자산 보존, 배포 정책을 함께 다룬다. |

## Client Cache의 갱신 범위

새로고침하면 메모리 캐시가 비워진다. layouts/loading의 재사용과 page의 기본 캐시 및 back/forward 복원은 동일하지 않다. 원문에 열거된 revalidateTag, revalidatePath, updateTag, router.refresh, cookies.set/delete는 호출 문맥과 대상이 다르므로 즉시 모든 브라우저 캐시를 지우는 공통 명령으로 취급하지 않는다. staleTimes 전역 설정과 cacheLife의 stale을 통한 경로 수명 조정을 구분한다. 실제 조건은 [[NextJS-Cache-Operations]], [[NextJS-Partial-Prefetch-Adoption]]과 해당 API를 따른다.

## 원문의 단순화에 대한 보완

동적 route segment는 요청 시점 생성으로만 정의하지 않는다. 글꼴의 layout shift 제거와 bundler 속도 우위도 앱 전체에 대한 무조건적 보장은 아니다. 용어집의 Turbopack build 지원 표현은 Next 16 CLI의 기본 bundler 계약과 함께 읽는다. RSC payload를 binary라고 부르는 용어집의 요약은 실제 응답 Content-Type/인코딩 전체를 규정하는 wire-format 명세가 아니다.

## 출처

- [Next.js, glossary](https://nextjs.org/docs/app/glossary)

## 관련 문서

- [[NextJS-Concepts]]
- [[NextJS-RSC-Boundary]]
- [[NextJS-Cache-Operations]]
