---
tags: [nextjs, app-router, data]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["서버 데이터 조회와 fetch 캐시"]
---

# 서버 데이터 조회와 fetch 캐시

## 조회 위치와 대기의 범위

Server Component는 async 함수로 fetch, ORM, 파일 저장소를 직접 호출할 수 있다. 데이터의 비밀이나 database 연결이 client bundle로 넘어가지 않는다. 조회 뒤 반환하는 UI에 필요한 정보만 Client Component props로 전달한다. 서버에서도 endpoint 자신을 HTTP로 다시 호출하기보다 같은 service 함수를 부르는 편이 경로와 인증을 단순하게 만든다.

fetch는 서버에서 persistent Data Cache를 설정하는 확장 API다. browser fetch의 cache 옵션은 browser HTTP cache를 제어한다. 이름이 같아도 저장소가 다르다. 동일 URL과 옵션의 GET fetch는 React 렌더링 중 중복 호출을 memoize한다. Route Handler는 React component tree 밖이므로 이 memoization을 전제로 해서는 안 된다. AbortSignal을 주면 fetch memoization을 피할 수 있다.

ORM처럼 fetch가 아닌 조회는 React `cache`로 같은 렌더링 요청의 중복을 줄인다. 이는 요청 사이에 결과를 유지하는 `use cache`, `unstable_cache`와 다른 수명이다. 함수 선언을 호출마다 새로 만들면 같은 cache instance를 공유하지 못한다.

## fetch 옵션 계약

| 옵션 | 서버의 의미 |
| --- | --- |
| 생략 | auto no cache. 개발에서는 매 요청 조회한다. Cache Components를 끈 기존 prerender에서는 Request API를 쓰지 않으면 build에서 한 번 조회할 수 있다 |
| `cache: 'no-store'` | 요청마다 원본을 조회한다 |
| `cache: 'force-cache'` | Data Cache에 일치 항목이 있으면 반환하고 없거나 stale이면 원본 조회 뒤 저장한다 |
| `next.revalidate: false` | 무기한 cache에 해당한다 |
| `next.revalidate: 0` | cache하지 않는다 |
| `next.revalidate: n` | 초 단위 revalidation 간격을 정한다 |
| `next.tags` | 나중에 invalidation할 tag를 붙인다. 최대128개, 각256자 |

cache key에는 URL, method, headers, body 등이 반영된다. Authorization이나 Cookie header를 명시했다고 cache가 자동으로 안전한 사용자 분리 저장소가 되는 것은 아니다. 공유 가능한 결과인지, 개인 값이 key에 포함되는지 먼저 판단한다. GET 외 요청도 명시적 cache 설정으로 저장할 수 있지만 성공 응답(200)의 저장 계약을 확인한다. Draft Mode에서는 cache를 우회한다.

같은 route에서 같은 URL에 서로 다른 revalidate 값을 주면 짧은 값이 적용된다. 기존 route prerender의 revalidate보다 작은 fetch revalidate가 있으면 route 간격도 내려갈 수 있다. `no-store`와 양수 revalidate처럼 충돌하는 설정은 둘 다 무시되고 개발 경고가 난다. Cache Components를 켜도 기존 fetch cache는 별도 계층으로 남으므로 `cacheLife`가 이 옵션을 자동으로 대신한다고 생각하지 않는다.

```ts
async function getCatalog() {
  const response = await fetch('https://example.com/catalog', {
    cache: 'force-cache',
    next: { revalidate: 3600, tags: ['catalog'] },
  })
  if (!response.ok) throw new Error('Catalog lookup failed')
  return response.json()
}
```

HTTP404/500은 fetch Promise rejection과 다르다. 응답의 ok/status를 확인하고 데이터 schema도 검증한다. JSON parse 성공만으로 domain data가 유효하다고 볼 수 없다.

## 병렬 조회와 streaming

```ts
export default async function Page() {
  const productsPromise = getProducts()
  const categoriesPromise = getCategories()
  const [products, categories] = await Promise.all([
    productsPromise, categoriesPromise,
  ])
  return <Catalog products={products} categories={categories} />
}
```

독립 조회를 먼저 시작하면 waterfall을 줄인다. A의 반환값으로 B를 조회해야 하면 의존성은 여전히 순차적이다. Promise.all은 하나가 reject하면 전체를 실패시키므로 부분 결과를 허용하는 UI는 allSettled나 독립 Suspense/Error Boundary를 선택한다. preload 함수는 `void getData(id)`로 작업을 미리 시작하고 뒤에서 같은 memoized 함수를 await한다. 미리 시작만 했다고 rejection이 사라지지 않으므로 실패 경계를 설계한다.

Server Component가 Promise를 Client Component로 넘기고 client가 React `use`로 읽을 수 있다. 상위 Suspense는 그 Promise가 준비될 때까지 fallback을 보여준다. SWR/React Query 같은 client library는 자체 loading/error/cache 정책을 가지며 Next server cache와 자동으로 같은 저장소가 되지 않는다.

## 개발 중 cache가 이상해 보일 때

개발 HMR cache는 `no-store`도 재사용할 수 있어 파일 저장만으로 원본 데이터가 갱신되지 않을 수 있다. navigation이나 full reload로 확인한다. hard refresh가 `cache-control: no-cache`를 보내면 cache, revalidate와 tags 설정이 무시되고 원본을 조회할 수 있다. 개발 로그만 보고 production cache hit/miss를 판정하지 않는다.

## 조회와 preload의 구체적인 구성

async BlogPage는 blog API fetch와 json을 await해 id를 key, title을 li로 렌더한다. ORM 버전은 `db.select().from(posts)`로 같은 목록을 만든다. 직접 DB를 쓰더라도 auth/authorization을 수행한다. 개발 fetch 로깅은 logging 옵션으로 확인한다. 서버 조회는 cache opt-in이며 uncached component의 대기를 Suspense 아래에 둔다. blog/loading은 전체 page, header 밖 BlogListSkeleton 경계는 목록만 기다린다. skeleton/cover/title을 DevTools에서 확인한다.

Promise streaming의 대표 형태는 서버에서 `const posts = getPosts()`를 await 없이 시작하고 `<Suspense><Posts posts={posts}/></Suspense>`로 전달한다. Client Posts는 `posts: Promise<{id:string;title:string}[]>`를 받아 `use(posts)`를 읽는다. 같은 Promise를 여러 client에서 쓰려면 context로 공유할 수 있다. SWR은 `fetch(url).then(r => r.json())` fetcher와 useSWR(url,fetcher)의 data/error/isLoading을 사용해 각각 목록/오류/로딩을 렌더한다.

Artist username으로 getArtist를 await한 뒤 artist.id로 Playlists를 조회하면 두번째는 첫번째에 의존한다. Playlists만 감싸면 artist가 준비될 때까지 title도 막히므로 route loading, 첫 조회 최적화 또는 cache를 적용한다. 독립 getArtist(username)/getAlbums(username)는 두 함수를 먼저 호출하고 Promise.all로 함께 await한다. layout/page segment는 기본 병렬 렌더지만 한 함수 안의 연속 await는 여전히 waterfall이다.

ORM getUser는 module scope의 `cache(async(id:string) => db.query.users.findFirst({where:eq(users.id,id)}))`로 선언한다. Dashboard가 getUser('1')을 await하고 없으면 null, 있으면 name을 표시한다. 같은id는 **같은 요청**에서만 공유된다. preload는 Item 파일 옆에서 `export const preload = (id:string) => { void getItem(id) }`로 선언하고 Page에서 params await 뒤 preload(id), checkIsAvailable(id) await, 조건부 Item 순서로 호출한다. 이미시작한 GET의 동일 호출이 Item에서 재사용된다. ORM은 React.cache, Cache Components는 use cache, request API를 읽으면 private 변형의 production 요청 내 deduplication을 사용한다. preload를 consumer옆에 두면 이동/삭제 시 의존성을 찾기 쉽다.

fetch는 native 모든 옵션을 사용할 수 있다. false revalidate는Infinity와 동등한 수명이지만 저장소 eviction까지 금지하지 않는다. GET memoization은 Server Component/layout/page/generateStaticParams/generateViewport의 단일 render pass에 적용된다. `new AbortController().signal`을 넘기면 opt out한다. 서버 extended fetch 도입은13.0이다.

## 이해 확인

1. 동일 fetch가 page와 generateMetadata에 있으면 render memoization과 persistent cache 중 무엇이 중복을 줄이는가?
2. 서로 독립인 세 조회를 순서대로 await하면 어떤 비용이 생기는가?
3. no-store인데 HMR에서 데이터가 그대로인 현상을 production defect로 바로 판정할 수 있는가?

## 출처

- [Next.js, fetching-data](https://nextjs.org/docs/app/getting-started/fetching-data)
- [Next.js, fetch](https://nextjs.org/docs/app/api-reference/functions/fetch)

## 관련 문서

- [[React-Server-Cache-and-Taint]]
- [[React-Resources-and-Use]]
- [[NextJS-App-Cache-Functions]]
- [[NextJS-App-Route-Handlers]]
