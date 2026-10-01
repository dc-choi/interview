---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages에서 App으로 점진 이동하는 경계", "NextJS Pages Migration"]
---

# Pages에서 App으로 점진 이동하는 경계

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 버전 업그레이드와 router 전환은 별개다

Next.js를 업그레이드해도 pages를 유지할 수 있다. Image, Link, Script, Font 같은 shared feature부터 전환하고 route 단위로 App을 도입한다. App과 Pages는 함께 존재할 수 있으나 같은 URL을 중복 정의하지 않는다. 두 router 사이 이동은 hard navigation이므로 한 router 안의 state/prefetch 동작과 구분한다.

## 페이지를 옮기는 최소 흐름

기존 페이지 UI를 use client component로 옮기고 `app/.../page.tsx` Server Component에서 필요한 데이터를 가져와 props를 전달한다. Client Component도 초기 HTML을 미리 렌더링할 수 있으므로 client라는 이름이 CSR-only를 뜻하지 않는다. browser 전용 코드와 server DB/secret의 위치를 별도로 확인한다.

App의 root layout에는 html/body가 필요하다. Pages `_app`/`_document`가 App route에는 적용되지 않으므로 global CSS, provider, font와 초기 script를 다시 배치한다. 모든 migration이 끝날 때까지 Pages 파일을 제거하지 않는다. `getLayout`은 App nested layout으로 옮기며 state 유지 범위를 비교한다.

## 계약 대응표

| Pages | App에서 다시 결정할 것 |
| --- | --- |
| `next/head` | metadata/generateMetadata |
| `next/router` | next/navigation useRouter + usePathname/useSearchParams/useParams |
| `getServerSideProps` | Server Component의 request-time data/access 정책 |
| `getStaticProps`/ISR | 현재 App cache API와 재검증 정책 |
| `getStaticPaths`/fallback | generateStaticParams와 dynamic path 정책 |
| API Routes | 필요하면 Route Handlers로 이전 |
| `_app.getInitialProps` | layout/server data, Client provider 경계 |

App router에는 router.query/router.events가 같은 형태로 존재하지 않는다. props params/searchParams의 현재 async 계약과 cache defaults는 [[NextJS-Migration]] 및 App 데이터 문서에서 확인한다. 이전 migration guide의 fetch cache:force-cache 예시를 Next 16의 모든 default로 일반화하지 않는다.

## 공유 컴포넌트와 단계별 검증

`next/compat/router`는 router가 없을 때 null을 반환한다. Pages/App 공유 UI는 null guard와 query readiness를 처리하고 마지막 Pages 사용이 사라질 때 compat를 제거한다. URL query는 readonly search params 복사본으로 바꾼다.

beforeInteractive script는 Pages Document에서 App root layout으로 옮긴다. worker strategy는 App에서 지원하지 않는다. image props, Link anchor markup와 font module migration은 router 이동 전에도 가능하다.

route를 하나씩 옮겨 직접 방문, client 이동, hydration, dynamic ID, query, auth, SEO, ISR와 production 배포를 확인한다. config 구조와 App 전용 caching을 변경한 경우 Pages sibling route에 영향이 있는지도 본다.

## CRA/Vite 문서의 목적지

현재 Pages sidebar의 CRA/Vite guide도 App Router의 catch-all shell로 기존 SPA를 먼저 이식하는 방식이다. Sidebar 위치가 Pages implementation을 보장하지 않는다. ssr:false인 wrapper로 browser-only 코드를 보존하고 기존 router를 유지한 뒤 점진적으로 Next 기능을 도입한다.

CRA/Vite env prefix, public asset/image import, index.html head, CSS, scripts와 entrypoint의 대응을 각각 검토한다. vite의 import.meta.env와 CRA의 REACT_APP_를 NEXT_PUBLIC_로 단순 문자열 치환할 때 build/runtime 의미도 확인한다. 오래된 cra-to-next codemod가 Pages를 만드는 계약과 현재 수동 guide의 App 목적지는 다르다.

## 학습 확인

- Pages provider가 App에 적용되지 않는 이유를 설명한다.
- 옮긴 route와 남은 Pages 사이 이동에서 state가 reset되는지 확인한다.
- current App cache contract와 과거 migration 예시를 대조한다.

## 출처

- [Next.js, migrating](https://nextjs.org/docs/pages/guides/migrating)
- [Next.js, app-router-migration](https://nextjs.org/docs/pages/guides/migrating/app-router-migration)
- [Next.js, from-create-react-app](https://nextjs.org/docs/pages/guides/migrating/from-create-react-app)
- [Next.js, from-vite](https://nextjs.org/docs/pages/guides/migrating/from-vite)

## 관련 문서

- [[NextJS-Migration]]
- [[NextJS-Pages-Router-API]]
- [[NextJS-Pages-Upgrades]]
