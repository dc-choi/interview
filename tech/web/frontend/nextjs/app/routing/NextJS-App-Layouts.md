---
tags: [nextjs, app-router, routing]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["페이지, 레이아웃과 템플릿의 생명주기"]
---

# 페이지, 레이아웃과 템플릿의 생명주기

## page와 layout 계약

page는 URL별 고유 UI를 default export한다. 확장자는 js/jsx/tsx이고 Server Component가 기본이다. layout은 필수 children을 받아 child page/layout과 loading/error 같은 결과를 배치한다. 중첩 layout은 부모의 children으로 연결된다.

```tsx
// app/blog/[slug]/page.tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  const query = await props.searchParams
  return <h1>{slug}: {String(query.sort ?? 'asc')}</h1>
}
```

`params`는 root부터 해당 page/layout까지의 path 값을 담는 Promise다. page의 `searchParams`도 Promise이며 값은 `string | string[] | undefined`다. 반복 쿼리 `?a=1&a=2`는 배열이고 URLSearchParams 인스턴스가 아니다. Client page는 async 대신 React `use(props.params)`/`use(props.searchParams)`로 읽는다. 15의 동기 호환 설명을 현재 코드 패턴으로 복사하지 않는다.

`PageProps<'/route'>`와 `LayoutProps<'/route'>`는 route literal로 params/slot을 추론한다. static route params는 `{}`다. 타입은 dev/build/typegen에서 생성되며 전역이다.

## root layout

최상위 layout은 html/body를 제공하고 Metadata API로 head를 관리한다. 상위 layout이 없는 각 layout은 root가 될 수 있어 app/layout 파일만이 유일한 배치는 아니다. 서로 다른 root layout 이동은 전체 문서 재로드다. root가 `[lang]` 아래 있으면 앞의 lang은 root parameter다.

## 공유 layout에서 최신 URL 읽기

공유 layout은 client navigation 중 재사용되어 state가 유지되고 다시 렌더링되지 않는다. raw request, 하위 segment, searchParams/pathname을 최신 값처럼 읽게 하지 않는 이유다. 요청 header/cookie는 서버 API로 읽되 client 이동마다 새로 실행된다고 기대하지 않는다.

최신 query/pathname/active child는 layout 속 Client Component에서 `useSearchParams`, `usePathname`, `useSelectedLayoutSegment(s)`를 사용한다. Server page 데이터 필터에는 searchParams prop을 쓴다. event handler에서만 query를 읽을 때는 window.location.search를 URLSearchParams로 파싱하는 선택도 있다.

layout은 children에 임의 데이터를 주입할 수 없다. 필요한 layout/page 각자가 같은 데이터 함수를 호출하고 GET fetch memoization 또는 React.cache로 한 요청 안의 중복을 줄인다.

## template과 remount

```tsx
// app/blog/template.tsx
export default function Template({ children }: { children: React.ReactNode }) {
  return <section>{children}</section>
}
```

template은 layout 아래/error 위에 있으며 framework가 segment에 따른 key를 부여한다. key가 바뀌면 DOM과 child Client Component state가 새로 만들어지고 Effect가 다시 동기화된다. Suspense fallback을 이동 때 다시 보여야 하는 UI에도 적합하다.

| 이동 | 관찰할 생명주기 |
| --- | --- |
| `/` → `/about` | 첫 segment 변경으로 root template remount |
| `/blog` → `/blog/first` | root template 유지, blog template remount |
| `/blog/first` → `/blog/second` | blog template key 변경 |
| query만 변경 | template remount를 자동 유발하지 않음 |

깊은 child segment 변경이 더 위 모든 template을 remount하는 것은 아니다. 폼 입력 reset이 필요한 수준에 template을 둔다. Cache Components의 Activity/state 보존은 [[NextJS-App-Client-Navigation]]도 함께 확인한다.

## 대기 경계와 실패 진단

loading은 layout 아래라서 layout의 uncached fetch/cookies를 감싸지 못한다. Cache Components가 없으면 이동이 막히고, 있으면 별도 Suspense가 필요하다는 validation이 발생한다. 해결은 layout의 데이터 component를 별도 Suspense로 감싸거나 page로 read를 이동하는 것이다.

## 경로 값과 작은 UI 예제

| 경로와 URL | 해당 page/layout params |
| --- | --- |
| `dashboard/[team]`, `/dashboard/1` | `{team: '1'}` |
| `shop/[category]/[item]`, `/shop/1/2` | `{category: '1', item: '2'}` |
| `blog/[...slug]`, `/blog/1/2` | `{slug: ['1', '2']}` |

각 결과는 Promise로 전달된다. layout까지만 전달하므로 위쪽 layout이 더 깊은 page params를 모두 아는 것은 아니다. page는 UI convention의 가장 안쪽 leaf이며 loading/error/template/layout이 감싼다.

```tsx
// app/blog/layout.tsx
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <section>{children}</section>
}
// app/shop/page.tsx
export default async function Page(props: PageProps<'/shop'>) {
  const { page = '1', sort = 'asc', query = '' } = await props.searchParams
  return <p>{String(query)} / {String(page)} / {String(sort)}</p>
}
```

query를 database 조회에 쓰면 page의 searchParams를, 이미 props로 받은 목록의 client 필터에만 쓰면 useSearchParams를 선택한다. Cache Components는 searchParams를 읽는 위치에 따라 prerender shell 범위가 달라진다.

layout에 breadcrumb client를 배치해 `pathname.split('/')`로 segment를 표시하고, nav client에서 `pathname === href` 또는 selected segment와 slug를 비교해 active class를 정한다. 같은 user를 layout과 page가 각자 조회할 때 동일 memoized getUser를 공유한다. layout navigation 영역이 request data를 읽으면 `<Suspense fallback={<NavSkeleton />}><DashboardNav /></Suspense>`를 layout 안에 명시한다.

## 도입과 Promise 전환

page/layout/template은 v13.0.0에 도입됐다. v15.0.0-RC에서 page의 params/searchParams와 layout params가 Promise로 바뀌었으며 migration codemod가 있다. v14 이하 synchronous contract와 v15 임시 호환은 현재 async/use 예제와 구분한다. template의 illustrative key 문자열은 public key 값 계약이 아니다.

## 이해 확인

1. header의 query 표시를 layout 자체에 추가하면 값이 낡는 이유는?
2. 검색어만 바꿨는데 template 안 폼이 reset되지 않는 것은 정상인가?
3. root layout마다 html/body가 필요한 이유와 root 사이 이동의 비용을 설명한다.

## 출처

- [Next.js, layouts-and-pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages)
- [Next.js, layout](https://nextjs.org/docs/app/api-reference/file-conventions/layout)
- [Next.js, page](https://nextjs.org/docs/app/api-reference/file-conventions/page)
- [Next.js, template](https://nextjs.org/docs/app/api-reference/file-conventions/template)

## 관련 문서

- [[React-Server-Components]]
- [[React-State-Structure]]
- [[NextJS-App-Structure]]
