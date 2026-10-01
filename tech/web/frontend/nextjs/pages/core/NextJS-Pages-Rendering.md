---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 SSG, SSR과 CSR", "NextJS Pages Rendering"]
---

# Pages Router의 SSG, SSR과 CSR

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## HTML 생성 시점과 데이터 갱신을 분리한다

Pages Router의 기본은 페이지 HTML을 미리 만들고 브라우저에서 hydration하는 것이다. 정적으로 만들어도 이벤트와 상태를 사용할 수 있다. SSG/SSR은 HTML 생성 시점이고 CSR은 클라이언트 데이터와 UI를 구성하는 방식이므로 한 페이지에서 함께 사용할 수 있다.

| 요구 | 선택 | 비용과 제약 |
| --- | --- | --- |
| 공개 내용이 빌드 전에 존재 | `getStaticProps` | 빠른 CDN 응답, 빌드 후 갱신 정책 필요 |
| 공개 내용이 계속 추가, 변경 | SSG + ISR/fallback | 첫 생성과 오래된 결과를 허용할 범위 결정 |
| 요청의 cookie/header, 개인별 HTML | `getServerSideProps` | 요청마다 서버 작업, origin 장애와 지연 영향 |
| 검색 노출이 필요 없는 개인 UI | CSR | JS와 추가 요청 이후 표시, 로딩/오류 상태 필요 |

SSG는 데이터 없는 페이지도 가능하고, 데이터가 있으면 `getStaticProps`를 사용한다. 동적 경로를 정적으로 생성할 때는 `getStaticPaths`가 추가된다. 요청마다 필요한 최신성이라도 캐시 가능한 공개 데이터인지 먼저 구분한다.

## 자동 정적 최적화와 hydration

페이지에 `getServerSideProps`와 `getInitialProps`가 없으면 정적 최적화 대상이다. 빌드 결과는 `.next/server/pages/about.html`처럼 HTML이고, SSR 페이지는 `.js` 결과가 된다.

정적 최적화 중에는 요청 query를 알 수 없어 `router.query`가 비어 있을 수 있다. 동적 경로, URL query, rewrite 때문에 hydration 후 query가 채워지며 다시 렌더링된다. `getStaticProps`를 사용하는 동적 페이지의 경로 params는 query에 제공된다.

`router.isReady`는 Effect 안에서 준비 여부를 확인할 때 사용한다. 준비되지 않은 `asPath`를 서버 렌더링에 섞으면 hydration mismatch가 날 수 있다. `_app.getInitialProps`는 `getStaticProps` 없는 페이지의 최적화를 끈다.

## 컴포넌트 단위 클라이언트 조회

SWR/TanStack Query 같은 조회 라이브러리는 cache, 재검증, focus 갱신, 주기 갱신, optimistic update 정책을 제공한다. Next.js 서버의 ISR cache와는 별도다. 단순 Effect 자체가 공유 데이터 cache를 제공한다고 가정하지 않는다.

```tsx
import useSWR from 'swr'

const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

export default function Profile() {
  const { data, error, isLoading } = useSWR('/api/profile', fetcher)
  if (error) return <p>프로필을 불러오지 못했습니다.</p>
  if (isLoading) return <p>불러오는 중...</p>
  return <p>{data.name}</p>
}
```

CSR에서 초기 HTML은 loading UI만 포함할 수 있다. JS를 실행하지 않는 crawler와 느린 장치가 중요한 콘텐츠를 볼 수 있는지 확인한다. 공개 페이지는 SSG/SSR로 기본 내용을 만들고 개인 정보나 빈번히 변하는 UI만 CSR로 추가할 수 있다.

## 기존 getInitialProps의 경계

`Page.getInitialProps(context)`는 legacy API다. 첫 진입에서는 서버, Link/router로 이동할 때는 클라이언트에서도 실행된다. 서버 전용 secret/DB 코드를 클라이언트 실행 경로에 두지 않는다. `_app.getInitialProps`를 사용하고 이동 대상이 `getServerSideProps` 페이지라면 서버에서만 실행되는 예외가 있다.

context에는 `pathname`, `query`, `asPath`, 서버에서만 있는 `req`/`res`, 오류 `err`가 있다. 반환값은 `{ props: ... }` wrapper가 아니라 페이지 props 객체다. plain object로 직렬화해야 하며 Date/Map/Set을 그대로 반환하지 않는다. 중첩 컴포넌트에서 사용할 수 없다.

모든 데이터 함수의 props는 브라우저에 전달된다. 서버에서 조회했다고 응답 데이터까지 비밀인 것은 아니다.

## legacy getInitialProps 연결 예제

```tsx
import type { NextPageContext } from 'next'

export default function Page({ stars }: { stars: number }) {
  return <p>{stars}</p>
}
Page.getInitialProps = async (context: NextPageContext) => {
  const response = await fetch('https://api.github.com/repos/vercel/next.js')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const { stargazers_count } = await response.json()
  return { stars: stargazers_count }
}
```

`req`/`res`가 필요한 분기는 존재 여부를 확인하고 client 실행 때 대체 경로를 둔다. 컴포넌트 property로 붙이는 legacy 계약과 페이지 파일에서 독립 export하는 SSG/SSR 함수를 혼용하지 않는다.

## Effect로 조회할 때의 loading과 실패 상태

데이터 없는 정보 페이지는 default 컴포넌트만으로 build-time HTML이 된다. 마케팅, 블로그, 포트폴리오, 공개 상품 목록과 도움말처럼 사용자 요청 전에 알 수 있는 기본 콘텐츠가 대표적이다. 개인별 UI는 추가 CSR, 요청마다 HTML이 달라져야 하면 SSR을 선택한다.

```tsx
import { useEffect, useState } from 'react'
interface Profile { name: string; bio: string }

export default function ProfilePage() {
  const [data, setData] = useState<Profile | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const response = await fetch('/api/profile-data')
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const profile = await response.json()
        if (active) setData(profile)
      } catch {
        if (active) setError(true)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])
  if (loading) return <p>불러오는 중...</p>
  if (error) return <p>조회 실패</p>
  if (!data) return <p>프로필 없음</p>
  return <section><h1>{data.name}</h1><p>{data.bio}</p></section>
}
```

Effect는 mount 때 조회하며 page/component 수명에 따라 재실행될 수 있다. 이 단순 예제는 공유 cache나 focus refetch를 제공하지 않는다. SWR의 data/error/isLoading 또는 TanStack Query를 쓰면 그러한 정책을 중앙에서 구성할 수 있다. 데이터 조회의 HTTP browser cache까지 항상 없다는 뜻은 아니다.

## 학습 확인

- 공개 상품 설명과 로그인 사용자의 즐겨찾기를 각각 어디서 가져올지 정한다.
- 자동 정적 페이지에서 `?q=term` 첫 진입 후 query가 언제 채워지는지 확인한다.
- JS를 끈 상태에서 중요한 내용을 읽을 수 있는지 확인한다.

## 출처

- [Next.js, rendering](https://nextjs.org/docs/pages/building-your-application/rendering)
- [Next.js, server-side-rendering](https://nextjs.org/docs/pages/building-your-application/rendering/server-side-rendering)
- [Next.js, static-site-generation](https://nextjs.org/docs/pages/building-your-application/rendering/static-site-generation)
- [Next.js, automatic-static-optimization](https://nextjs.org/docs/pages/building-your-application/rendering/automatic-static-optimization)
- [Next.js, client-side-rendering](https://nextjs.org/docs/pages/building-your-application/rendering/client-side-rendering)
- [Next.js, data-fetching](https://nextjs.org/docs/pages/building-your-application/data-fetching)
- [Next.js, client-side](https://nextjs.org/docs/pages/building-your-application/data-fetching/client-side)
- [Next.js, get-initial-props](https://nextjs.org/docs/pages/api-reference/functions/get-initial-props)

## 관련 문서

- [[NextJS-Pages-Static-Props]]
- [[NextJS-Pages-Server-Props]]
- [[NextJS-Pages-ISR]]
