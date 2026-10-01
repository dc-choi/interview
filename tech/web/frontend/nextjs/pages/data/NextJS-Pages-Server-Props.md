---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["getServerSideProps의 요청별 HTML", "NextJS Pages Server Props"]
---

# getServerSideProps의 요청별 HTML

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 요청마다 서버 데이터로 렌더링한다

페이지에서 독립 export한 `getServerSideProps(context)`는 요청 시 서버에서 실행한다. 첫 방문에는 HTML을 만들고 Link/router 이동에도 서버 데이터 요청을 보내 함수를 실행한다. 브라우저에서 함수 본문을 실행하지 않는다. 함수 전용 DB import는 client bundle에서 제거된다.

개인화 cookie, authorization header, 요청 위치처럼 request-time 정보가 필요할 때 선택한다. 공개 데이터이며 갱신 지연을 허용한다면 SSG/ISR과 비교한다. 내부 API Routes를 다시 HTTP 호출할 필요 없이 서버 helper를 직접 호출한다.

```tsx
import type { GetServerSideProps } from 'next'

export const getServerSideProps = (async ({ req }) => {
  const session = await findSession(req.cookies.session)
  if (!session) {
    return { redirect: { destination: '/login', permanent: false } }
  }
  const profile = await findPublicProfile(session.userId)
  if (!profile) return { notFound: true }
  return { props: { profile } }
}) satisfies GetServerSideProps
```

`findSession`과 `findPublicProfile`은 애플리케이션 helper 자리다. 브라우저에 전달할 공개 필드만 props로 만든다. session 객체나 원본 DB row 전체를 직렬화하지 않는다.

## context와 반환값

| context | 계약 |
| --- | --- |
| `params` | dynamic segment |
| `query` | query string과 dynamic params |
| `req` | Node IncomingMessage + `cookies` 객체 |
| `res` | Node ServerResponse |
| `resolvedUrl` | client 이동의 `_next/data` prefix를 제거하고 원 query를 포함 |
| `draftMode` | Draft Mode |
| `preview`, `previewData` | legacy Preview Mode |
| `locale`, `locales`, `defaultLocale` | i18n |

반환은 JSON 직렬화 가능한 `props`, `notFound: true`, `{ destination, permanent }` 형태의 `redirect` 중 하나다. 사용자 정의 `statusCode`는 `permanent`와 함께 쓰지 않는다. `GetServerSideProps`와 `InferGetServerSidePropsType`로 페이지 props 타입을 연결할 수 있다.

## HTTP cache를 켜는 경우

SSR이라도 공개 응답에 HTTP cache header를 설정할 수 있다.

```tsx
export async function getServerSideProps({ res }) {
  res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=59')
  return { props: { data: await findPublicData() } }
}
```

이 예시는 **공개 결과**에 한정한다. 사용자별 데이터에 공유 cache를 적용하면 다른 사용자에게 노출될 수 있다. `s-maxage`는 공유 cache freshness, `stale-while-revalidate`는 오래된 응답을 제공하며 background 갱신할 수 있는 추가 기간이다. 서버 데이터가 달라지는 시점과 사용자에게 새 내용이 보이는 시점은 다르다.

Draft/Preview Mode에서는 이 header로 만든 cache를 bypass하지 못하므로 함께 사용하지 않는다. 정적 공개 데이터는 SSR cache보다 ISR이 맞는지 먼저 판단한다.

## 실패와 배포 경계

함수에서 throw한 오류는 production에서 `pages/500`으로 처리하고 development에서는 overlay가 나온다. 오류 상세와 secret을 사용자 props에 넣지 않는다. SSR은 서버 runtime이 필요하며 static export에는 사용할 수 없다.

## 응답 타입 추론과 버전 경계

```tsx
import type { GetServerSideProps, InferGetServerSidePropsType } from 'next'

export const getServerSideProps = (async () => {
  const response = await fetch('https://api.github.com/repos/vercel/next.js')
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const repo: { name: string; stargazers_count: number } = await response.json()
  return { props: { repo } }
}) satisfies GetServerSideProps

export default function Page({ repo }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <p>{repo.stargazers_count}</p>
}
```

TypeScript 타입 추론과 runtime 응답 검증은 역할이 다르다. 이 예제는 trusted API의 예상 형태를 타입으로 연결하고 HTTP 실패를 걸러낸다. untrusted 외부 응답은 필드 형식도 검사한다. `getServerSideProps`는 page 파일에서만 export하고 서버 전용 top-level import의 bundle 제거는 실제 client 결과나 next-code-elimination으로 확인한다.

v9.3에 함수가 도입됐고 v10에 locale/locales/defaultLocale 및 notFound가 추가됐다. v13.4는 App Router stable 이력이며 Pages SSR 함수가 App에서 그대로 동작한다는 뜻이 아니다.

## 학습 확인

- 첫 진입과 client 이동에서 두 번 모두 서버 함수가 실행되는지 확인한다.
- public cache header가 붙어도 되는 데이터를 필드별로 구분한다.
- `resolvedUrl`과 브라우저 URL, 내부 데이터 URL의 차이를 설명한다.

## 출처

- [Next.js, get-server-side-props](https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props)
- [Next.js, get-server-side-props](https://nextjs.org/docs/pages/api-reference/functions/get-server-side-props)

## 관련 문서

- [[NextJS-Pages-Rendering]]
- [[NextJS-Pages-Errors]]
- [[NextJS-Pages-Preview-Draft]]
