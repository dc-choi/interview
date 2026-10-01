---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["next/router와 URL 조회 훅", "NextJS Pages Router API"]
---

# next/router와 URL 조회 훅

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 경로 파일, 표시 URL과 query

`useRouter`는 `next/router`에서 가져오고 `NextRouter`를 반환한다. App Router의 `next/navigation` useRouter와 다른 API다. class는 `withRouter`로 동일 router prop을 받거나 function wrapper를 사용한다.

| 필드 | 의미 |
| --- | --- |
| `pathname` | `/pages` 이후 route 파일 경로, basePath/locale/trailingSlash 제외 |
| `asPath` | browser 표시 경로 + query, trailingSlash 반영, basePath/locale 제외 |
| `query` | search query + dynamic params, prerender 중 비어 있을 수 있음 |
| `isReady` | client router 값 준비 여부, Effect에서 확인 |
| `isFallback`, `isPreview` | fallback/legacy preview 상태 |
| `basePath`, `locale`, `locales`, `defaultLocale`, `domainLocales` | 경로, i18n 구성 |

준비 전 asPath를 서버 HTML에 사용하면 mismatch가 날 수 있다. `isReady`를 서버 conditional 렌더 조건으로 삼지 않는다.

## 이동 API

`push(url, as?, options?)`, `replace(url, as?, options?)`는 URL string/object를 받는다. options는 `scroll`, `shallow`, `locale`이다. `replace`는 history를 추가하지 않는다. `push`, `replace`, `prefetch`는 Promise를 반환하므로 필요한 경우 await하거나 의도적으로 `void` 처리한다.

`prefetch(url, as?, { locale? })`는 production에서만 실행한다. Link 없는 login 후 dashboard 이동 등을 미리 준비할 때 사용한다. 외부 URL 이동은 `window.location`으로 처리한다. `back()`은 history back, `reload()`는 document reload다.

URL object에서 pathname을 생략하면 현재 route template 대신 browser `asPath`에 query를 적용해 rewrite 표시 URL을 보존한다. 수동 `as` masking에서는 다른 페이지로 해석될 수 있어 pathname을 명시한다.

같은 `[slug]` 컴포넌트 사이에서 이동하면 React가 unmount하지 않아 상태가 남는다. 필요하면 `useEffect(..., [router.query.slug])`로 특정 상태를 reset하거나 App의 page `key`를 바꿔 전체 remount한다. remount는 유지할 상태까지 없애는 tradeoff가 있다.

## popstate와 router events

`beforePopState(cb)`의 cb는 `{ url, as, options }`를 받는다. false를 반환하면 Next router가 popstate를 처리하지 않으며 직접 처리할 책임이 생긴다.

지원 이벤트는 `routeChangeStart`, `routeChangeComplete`, `routeChangeError`, `beforeHistoryChange`, `hashChangeStart`, `hashChangeComplete`다. URL과 `{ shallow }`를 받으며 error 이벤트에는 앞에 err가 있다. 이벤트 URL은 basePath를 포함한다. 연속 click으로 취소된 이동은 `err.cancelled === true`일 수 있다.

```tsx
useEffect(() => {
  const onStart = (url, { shallow }) => logNavigation({ url, shallow })
  router.events.on('routeChangeStart', onStart)
  return () => router.events.off('routeChangeStart', onStart)
}, [router])
```

unmount되지 않는 `_app`에 구독하면 전체 이동을 관측하기 쉽다. 어디서 구독하든 cleanup에 같은 callback을 전달한다.

## 공유 URL 훅과 compat router

`next/navigation`의 `useParams()`는 dynamic params만, `useSearchParams()`는 읽기 전용 URLSearchParams를 반환한다. 둘 다 인자가 없고 Pages 정적 prerender 첫 시점에 null일 수 있어 guard한다. SSR `getServerSideProps` 페이지는 request 값을 제공한다. query와 dynamic params를 함께 주는 router.query와 다르다.

`get('a')`는 첫 값, 빈 값은 `''`, 없는 값은 null이다. 반복값은 `getAll`로 읽는다. 변경은 `new URLSearchParams(current.toString())` 복사본에 set하고 router로 이동한다. readonly 값을 직접 mutate하지 않는다.

`next/compat/router`의 useRouter는 `NextRouter | null`을 반환하며 Pages context가 없는 App에서도 throw하지 않는다. null을 곧바로 destructure하지 않는다. Pages에서는 isReady를 기다리고 App에서는 search params를 바로 사용할 수 있다. App으로 옮긴 공유 컴포넌트는 정적 렌더의 Suspense 요구도 별도로 확인한다.

## 학습 확인

- `/posts/1?q=x`의 pathname, asPath, query를 비교한다.
- 빠른 연속 이동의 cancel을 실제 실패와 구별한다.
- Pages/App 양쪽에서 재사용할 훅의 null 반환을 처리한다.

## 출처

- [Next.js, use-params](https://nextjs.org/docs/pages/api-reference/functions/use-params)
- [Next.js, use-router](https://nextjs.org/docs/pages/api-reference/functions/use-router)
- [Next.js, use-search-params](https://nextjs.org/docs/pages/api-reference/functions/use-search-params)

## 관련 문서

- [[NextJS-Pages-Navigation]]
- [[NextJS-Pages-Rendering]]
- [[NextJS-Pages-Migration]]
