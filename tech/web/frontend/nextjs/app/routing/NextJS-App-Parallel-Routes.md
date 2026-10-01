---
tags: [nextjs, app-router, routing]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Parallel Routes, default fallback과 interception"]
---

# Parallel Routes, default fallback과 interception

## slot은 독립 UI 경계다

`@analytics`, `@team`은 부모 layout의 analytics/team prop으로 들어오는 named slot이다. URL에 @name이 붙지 않는다. children도 implicit slot이다. slot마다 loading/error/자체 layout과 tab navigation을 둘 수 있다.

```tsx
export default function Layout(props: LayoutProps<'/dashboard'>) {
  return <main>{props.children}{props.team}{props.analytics}</main>
}
```

일반 모델에서 같은 segment 수준의 slot 하나가 동적이면 다른 slot을 별도 정적 route로 취급할 수 없다. Cache Components의 부분 shell 동작은 [[NextJS-App-Cache-Components]]를 함께 확인한다.

## soft navigation과 hard navigation

soft navigation은 매칭되는 slot의 subpage를 변경하고 다른 slot의 이전 active state를 유지한다. hard reload는 이전 active slot 상태를 복원할 수 없어 현재 URL에 매칭되지 않는 slot의 default.tsx가 필요하다. children에도 fallback이 필요한 경우가 있다.

```tsx
// app/@auth/default.tsx
export default function Default() { return null }
```

default의 params는 root부터 slot subpage까지 Promise이고 await/use로 읽는다.

**공식 설명의 차이:** 확인일의 default reference는 named slot의 default 누락을 오류로 설명하고, parallel-routes 페이지는 여전히 404로 설명한다. named slot에는 default를 명시해 두고, 404를 원하면 default 안에서 notFound를 호출한다. children fallback 누락의 404와 named slot 오류를 같은 것으로 단정하지 않는다.

## 조건부 표시와 권한

layout이 `role === 'admin' ? admin : user`를 반환해도 두 slot은 서버에서 실행된다. 숨긴 admin slot도 query를 수행하고 출력이 browser response에 들어갈 수 있다. 선택 렌더링은 authorization 경계가 아니다. 각 slot page 또는 DAL에서 인증/권한을 검증하고 허용된 최소 데이터만 반환한다.

## Intercepting Routes

interception은 soft navigation에서 다른 route의 UI를 현재 context 안에 보여준다. `/photo/123`을 feed 위 modal로 띄워도 URL은 공유할 수 있고, 직접 URL 방문이나 reload에서는 전체 photo page가 렌더링된다.

| 폴더 패턴 | 대상 |
| --- | --- |
| `(.)photo` | 같은 segment 수준 |
| `(..)photo` | 한 수준 상위 |
| `(..)(..)photo` | 두 수준 상위 |
| `(...)photo` | app root 기준 |

@slot과 route group은 URL segment 수준으로 세지 않는다. filesystem의 `../` 횟수를 그대로 대응시키지 않는다.

## URL로 공유되는 modal 구성

1. app/login/page는 직접 방문용 전체 Login을 렌더링한다.
2. app/@auth/default는 null을 반환한다.
3. app/@auth/(.)login/page는 Client Modal 안에 Server Login을 children으로 넣는다.
4. root layout은 auth slot과 children을 함께 배치하고 Link로 /login을 연다.
5. 닫기는 router.back으로 history를 되돌리거나 null을 반환하는 slot route로 이동한다.

```tsx
// app/@auth/page.tsx, app/@auth/[...catchAll]/page.tsx
export default function EmptyModal() { return null }
```

닫는 Link가 다른 URL로 이동했는데 slot을 매칭하는 null page가 없으면 soft navigation의 active-state 보존 때문에 modal이 남을 수 있다. default는 reload fallback이지 모든 soft-navigation close 처리가 아니다. 뒤로 닫기/앞으로 다시 열기, 직접 방문/reload도 함께 확인한다.

useSelectedLayoutSegment(s)에 `parallelRouteKey: 'auth'`를 전달하면 해당 slot의 active subpage를 읽는다.

## slot 기본값과 tab의 구체적 예

`app/@analytics/views`는 `/views`로 접근한다. 일반 page는 implicit `@children` slot에 해당한다. team만 settings page가 있으면 soft `/settings`에서 analytics의 직전 page를 유지하고 hard reload에서는 analytics default를 쓴다. notFound fallback을 원하면 default에서 `notFound()`를 호출한다.

```tsx
export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <><nav><Link href="/page-views">조회</Link>
    <Link href="/visitors">방문자</Link></nav>{children}</>
}
```

위 slot layout은 analytics tab 사이에서 공유된다. slot 별 loading/error는 서로 독립적으로 stream한다. auth slot에서 `useSelectedLayoutSegment('auth')`는 `/login`일 때 login을 반환한다.

```tsx
// app/[artist]/[album]/@sidebar/default.tsx
export default async function Default({ params }: {
  params: Promise<{ artist: string; album: string }>
}) {
  const { artist, album } = await params
  return <p>{artist} / {album}</p>
}
```

single artist/zack은 artist 한 값, artist/album zack/next는 두 값을 얻는다. default params도 v14 synchronous에서 v15 Promise로 전환됐다. 같은 `.js` filename에 TS type annotation이 있는 원문 예제는 여기서 `.tsx`로 표기한다.

photo gallery의 `feed/@modal/(..)photo`는 slot을 세지 않으므로 photo가 한 route 수준 위다. login modal, photo detail modal, cart side modal 모두 URL 공유/직접방문/refresh/back/forward 계약을 같은 방식으로 구성한다. modal wrapper와 server children content를 분리하면 form content를 Server Component로 유지할 수 있다.

## 이해 확인

1. 다른 URL로 Link 이동했는데 modal이 남는 원인과 필요한 null route는?
2. admin slot을 layout에서 선택하지 않으면 권한 없는 사용자의 서버 query를 막을 수 있는가?
3. @modal 아래 interception에서 filesystem과 route 수준을 다르게 세는 이유는?

## 출처

- [Next.js, default](https://nextjs.org/docs/app/api-reference/file-conventions/default)
- [Next.js, intercepting-routes](https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes)
- [Next.js, parallel-routes](https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes)

## 관련 문서

- [[NextJS-App-Layouts]]
- [[NextJS-App-Client-Navigation]]
- [[React-Server-Boundaries]]
