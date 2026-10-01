---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 빌드 결과와 prerender 오류"]
---

# Next.js 빌드 결과와 prerender 오류

## 빌드 단계

next build는 프로덕션 코드를 최적화하고 가능한 라우트를 사전 렌더링한 뒤 .next에 출력한다. 이 절의 표와 오류 예는 cacheComponents: true가 기준이다.
1. .env 로드, next.config 검증, build ID 생성.
2. app/pages 라우트와 root proxy/instrumentation 탐색, TypeScript route 정의 생성.
3. Turbopack 또는 Webpack으로 client/server/edge 코드 변환, tree shaking, CSS/font 최적화, 병렬 타입 검사.
4. 정적 분석으로 렌더 방식 분류, generateStaticParams 수집, blocking prerender 오류 검사.
5. 정적 HTML/PPR 셸과 클라이언트 이동용 RSC payload 생성.
6. .next 출력, standalone의 런타임 파일 또는 export의 정적 사이트 생성, route table 출력.

package script가 next build라면 npm run build, pnpm/yarn build 또는 bun run build로 실행한다.

## 표의 기호와 수명

| 기호 | 의미 | 실제 결과 |
| --- | --- | --- |
| ○ | Static | build-time 전체 사전 렌더링 |
| ◐ | Partial Prerender | 정적 셸과 요청 시점 동적 내용 |
| ● | SSG | generateStaticParams/getStaticProps의 사전 HTML |
| ƒ | Dynamic | 요청 시점 서버 실행 |

Cache Components는 정적부터 부분 렌더까지의 경계를 사용한다. 요청 의존 Route Handler, Proxy, 동적 icon/OG metadata처럼 사전 결과가 없는 항목은 ƒ가 될 수 있다.
Pages Router와 Cache Components를 끈 앱의 ●/ƒ는 별도 렌더 모델로 읽는다.
기호는 prerender 결과를 나타내며 instant 검증 옵션을 나타내지 않는다. ◐ 하나만 보고 유의미한 fallback UI가 있다고 판정하지 않는다.
경로가 많으면 일부 목록과 [+N more paths]만 보여 준다.
캐시를 가진 라우트의 Revalidate/Expire는 포함한 캐시들 중 각각 가장 짧은 값을 표시한다. 어떤 cacheLife 호출의 값인지는 표에 나오지 않는다.
기본 profile의 revalidate 15m, 표시 한도에 따른 Expire 1y를 실제 1년 TTL 계약으로 읽지 않는다. 긴 기본 expire와 명시 cacheLife는 API 정의를 확인한다.

## 오류의 시작점

app/products/[id]/page.tsx가 await props.params로 id를 읽고 uncached fetch로 제품을 읽는 상황을 생각한다.
PageProps<'/products/[id]'>의 params는 비동기 값이다. build pass에서 요청 params/searchParams/cookies/headers와 uncached I/O를 경계 없이 읽으면 blocking-prerender-runtime/dynamic 오류가 난다.
Math.random/new Date도 비결정적 접근 위치에 따라 build를 막을 수 있다.
runtime read는 Suspense 안으로, uncached 데이터는 use cache 또는 Suspense 안으로 이동한다.
connection은 캐시로 고치는 항목이 아니다. 의도한 blocking 경로에는 instant = false 선택도 있지만 렌더 성능은 별도다.

## 진단과 제한 빌드

next dev에서 해당 URL을 열면 원래 컴포넌트와 행을 확인하기 쉽다.
next build --debug-prerender는 minification을 끄고 server sourcemap을 켜며 첫 실패 뒤에도 진행해 여러 오류를 보여 준다.
예제에서는 await props.params 행이 최초 blocked access로 드러난다. 이 디버그 빌드 결과는 프로덕션에 배포하지 않는다.
--debug-build-paths="app/products/[id]/page.tsx"는 해당 파일의 라우트만 compile/prerender한다.
쉼표로 여러 파일, glob, ! 제외 패턴을 지정하고 --debug-prerender와 함께 사용할 수 있다. 전체 앱 검증을 대체하지 않는다.

## 세 가지 해결과 출력 차이

loading.tsx가 Loading... fallback을 반환하면 해당 segment에 Suspense가 생긴다. /products/[id]는 ◐ 셸을 먼저 주고 params/data를 요청 때 스트리밍한다.
generateStaticParams에서 제품 목록을 fetch하고 products.map(product => ({id: product.id}))를 반환하면 /products/1, /2, /3 같은 행이 추가된다.
Cache Components의 이 모델에서는 최소 하나의 param이 필요하다. empty 배열 허용의 기존 ISR 계약과 구분한다.
params를 알아도 실제 uncached I/O가 남으면 각 행은 ◐다. build의 목록 조회 endpoint는 동작해야 한다.
동기 in-memory 값으로 치환하면 각 페이지가 ○가 될 수 있어 실제 async I/O 예제와 결과가 다르다.

getProduct(id) 함수 안에 use cache를 두고 fetch JSON을 반환하면 알려진 params의 데이터까지 prerender되어 ○가 된다.
알려지지 않은 params는 ◐ 셸을 먼저 주고 내용이 스트리밍되며 최초 방문 후 캐시를 구축한다.
cookies/headers/searchParams를 읽는 부분은 요청마다 동적으로 남는다.
instant = false만 설정하면 검증을 허용할 뿐 렌더 방식을 바꾸지 않는다. build가 통과하고 ◐ 행이어도 fallback 없이 lookup 완료까지 사용자가 기다릴 수 있다.

## 이해 확인

- generateStaticParams를 추가해도 ◐가 남는 이유와 use cache를 추가했을 때 ○가 되는 조건은 무엇인가?
- ◐와 instant = false를 보고 즉시 보이는 셸이 있다고 단정할 수 없는 이유는 무엇인가?

## 제품 라우트의 캐시 해결 예제

~~~tsx
// app/products/[id]/page.tsx, cacheComponents:true 전제
export async function generateStaticParams() {
  const response = await fetch('https://api.example.com/products')
  const products = await response.json()
  return products.map((product: { id: string }) => ({ id: product.id }))
}
async function getProduct(id: string) {
  'use cache'
  const response = await fetch('https://api.example.com/products/' + id)
  return response.json()
}
export default async function Page(props: PageProps<'/products/[id]'>) {
  const { id } = await props.params
  const product = await getProduct(id)
  return <div>{product.name}</div>
}
~~~

endpoint는 실제 응답으로 교체하고 빌드 때 최소 한 제품을 반환하도록 준비한다.
use cache를 제거한 uncached 조회를 유지할 경우 아래 loading 파일이 해당 segment의 stream fallback이 된다.

~~~tsx
// app/products/[id]/loading.tsx
export default function Loading() {
  return <div>Loading...</div>
}
~~~

원래 uncached page에 instant = false만 추가하는 선택은 loading 없이 기다리는 block 대안이다. 위 캐시/stream 해결과 동시에 적용할 필수 설정이 아니다.

## 출처

- [Next.js, building](https://nextjs.org/docs/app/guides/building)

## 관련 문서

- [[NextJS-CLI]]
- [[NextJS-Config-Rendering]]
- [[NextJS-CI-Build-Cache]]
