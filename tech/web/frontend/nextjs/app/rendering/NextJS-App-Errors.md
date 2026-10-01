---
tags: [nextjs, app-router, rendering]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["오류 결과, route error와 catchError 복구"]
---

# 오류 결과, route error와 catchError 복구

## 기대한 실패와 예외 구분

입력 검증/업무 실패는 정상적으로 생길 수 있는 결과이므로 serializable return state로 모델링한다. useActionState의 state/pending으로 메시지를 표시하고 aria-live로 알린다. 버그/환경 예외는 throw하여 error boundary로 보낸다. fetch는 non-2xx를 자동 throw하지 않으므로 res.ok/status를 먼저 판단한다.

Server Action이 반환한 validation state와 렌더링 오류 fallback은 책임이 다르다. mutation에서 예상한 오류까지 모두 throw하면 사용자가 수정할 정보를 route 전체 오류 화면으로 밀어낼 수 있다.

## error.tsx와 global-error

error.tsx는 use client로 선언하고 `{error, retry, reset}`을 받는다. page/loading/not-found/child layout을 감싸지만 자기 segment의 layout/template은 감싸지 않는다. error fallback에서 다시 throw하면 부모 boundary로 전파한다.

```tsx
'use client'
export default function ErrorPage({ error, retry }: {
  error: Error & { digest?: string }; retry: () => void
}) {
  return <section><h2>다시 시도해 주세요</h2>
    <p>참조: {error.digest}</p><button onClick={retry}>재시도</button>
  </section>
}
```

개발은 원본 message를 쉽게 확인하지만 production Server Component error는 민감 정보가 새지 않도록 generic message/digest로 전달된다. client에서 온 Error는 원래 message일 수 있다. digest를 server 로그와 연결한다.

retry는 재조회와 rerender로 복구하고 16.3에서 stable이다. reset은 error state만 비우고 재조회하지 않아 Server Component 오류 복구에 충분하지 않을 수 있다. 일반 경우 retry가 우선이다.

global-error는 root layout/template을 대신하므로 html/body, style/font/theme 의존성을 직접 제공한다. use client라 metadata/generateMetadata export는 불가하며 React title을 대안으로 쓴다. OS theme와 app theme는 자동으로 같지 않다.

## catchError 컴포넌트 경계

16.3의 next/error catchError는 route에 묶이지 않은 프로그램적 boundary다.

```tsx
'use client'
import { catchError, type ErrorInfo } from 'next/error'
function Fallback(props: { title: string }, info: ErrorInfo) {
  return <section><h2>{props.title}</h2>
    <button onClick={info.retry}>재시도</button></section>
}
export default catchError(Fallback)
```

첫 fallback 인자는 wrapper의 children을 제외한 props, 둘째는 error/retry/reset이다. 반환 wrapper는 props와 children을 받아 children 렌더링 오류에 fallback을 보여 준다. fallback은 client module에 정의한다. error.tsx는 이미 boundary라 catchError로 다시 감쌀 필요가 없다.

retry는 Transition 안에서 page를 다시 읽고 boundary 밖 Client state를 보존한다. 다른 route로 client navigation하면 error state가 자동 clear된다. redirect/notFound 같은 framework control exception은 일반 앱 오류로 삼키지 않도록 처리한다.

Server rendered fallback을 ReactNode prop으로 전달할 수 있지만 **오류가 없어도 매 render에 fallback query가 실행**된다. 복잡한 데이터 fallback이 꼭 필요할 때만 쓴다. 기존 HTML을 capture하는 custom class boundary는 마지막 UI를 남길 수 있지만 오래된 markup 재사용과 보안/상태 연결 비용을 따져야 한다.

## 잡히지 않는 오류와 framework exception

일반 event handler/렌더링 이후 async callback은 boundary가 자동 처리하지 않으므로 직접 catch/state로 표시한다. useTransition의 startTransition 안에서 unhandled error는 가장 가까운 boundary로 전달된다.

redirect/notFound는 throw 기반 control flow다. 앱 예외와 함께 catch해야 하면 `unstable_rethrow(error)`를 catch 처음에 호출하고 나머지만 처리한다. rethrow는 unstable이며 호출을 try 바깥으로 옮기는 구조가 가능한지 먼저 본다. resource cleanup은 rethrow 전에 하거나 finally에 둔다. Request-time API의 prerender interruption도 framework 예외일 수 있다.

## 오류 UI의 실제 구성과 버전

폼의 기대한 실패는 `createPost(prevState, formData)`가 `{message}`를 반환하고, `useActionState(createPost, {message: ''})`의 `[state, formAction, pending]`을 `<form action={formAction}>`에 연결한다. title input과 content textarea의 required 검증, `aria-live="polite"` 메시지, pending 동안 disabled 버튼을 함께 둔다. JSON API로 보낼 때 body는 `JSON.stringify({title, content})`로 직렬화하고 Content-Type을 지정해야 한다. 원문의 객체 body 예제는 표준 fetch BodyInit과 맞지 않아 그대로 사용하지 않는다.

Server Component는 응답을 조회한 뒤 `!res.ok`이면 실패 UI를 반환하거나 redirect한다. `[slug]`의 Promise params를 await하여 게시글을 읽고 없으면 notFound(), 같은 segment의 not-found.tsx가 404 UI를 맡는다. 예상하지 못한 throw는 가장 가까운 route boundary까지 올라간다. React DevTools에서 해당 boundary의 오류 상태를 전환해 fallback을 확인할 수도 있다. error.tsx의 useEffect에서 `[error]`를 의존성으로 두고 console.error 또는 오류 수집 서비스로 기록한다.

`ErrorInfo`의 error는 Error 인스턴스, retry/reset은 `() => void`다. digest는 서버가 생성하는 오류 hash라 server 로그의 원본 오류와 대응시키는 값이다. retry 성공 시 fallback 대신 복구된 children을 보여 준다. 컴포넌트 wrapper 예는 `<ErrorBoundary title="Dashboard Error">{children}</ErrorBoundary>`이며 fallback에서는 title/error.message와 retry/reset 버튼을 조합한다. server fallback을 쓰려면 async 컴포넌트에서 데이터를 읽어 `<ErrorBoundary fallback={<ServerFallback />}>`처럼 ReactNode를 넘긴다. fallback 함수의 첫 props에서 해당 node를 꺼내 반환한다.

이벤트 실패는 `try/catch`에서 reason을 useState 또는 useReducer에 저장해 UI로 보여 준다. 반면 `startTransition(() => { throw new Error(...) })`의 미처리 예외는 boundary로 올라간다.

기존 화면을 남기는 class boundary 예는 children과 optional onError를 받고, getDerivedStateFromError로 hasError를 설정하고 componentDidCatch에서 callback을 실행한다. 정상 렌더 때 div ref의 innerHTML을 저장해 둔 뒤 실패 시 dangerouslySetInnerHTML과 suppressHydrationWarning으로 마지막 HTML 및 오류 공지를 렌더한다. 이 HTML은 다시 hydrate되지 않으므로 이벤트 연결과 최신 상태가 복원되는 재시도와는 다르다. capture 가능한 시점과 신뢰할 수 있는 markup인지 확인해야 한다.

| 버전 | 변경 |
| --- | --- |
| 13.0 | error.js 도입 |
| 13.1 | global-error.js 도입 |
| 15.2 | 개발 환경에서도 global-error 표시 |
| 16.2 | unstable_retry와 unstable_catchError 도입 |
| 16.3 | retry와 catchError 안정화 |

## 내부 예외를 다시 던지는 조건

`unstable_rethrow`는 production 권장 API가 아니다. `notFound`, `redirect`, `permanentRedirect`가 만든 내부 예외와 일반 앱 오류를 같은 catch에서 구분할 때 사용하며 Promise의 catch 안에서도 호출할 수 있다. static 렌더 중 cookies/headers/searchParams, `fetch(...,{cache:'no-store'})`, `revalidate: 0` 사용으로 생기는 prerender 중단 역시 내부 흐름이다. 예를 들어 fetch 응답이 404라 notFound()를 부른 catch에서는 먼저 unstable_rethrow(reason)를 호출하고 나머지 오류만 기록한다. 가능하면 framework API 호출을 catch 밖 또는 caller로 옮긴다. cleanup은 rethrow 전에 하거나 finally에서 실행한다.

## 이해 확인

1. reset만으로 서버 오류가 회복되지 않는 이유는?
2. production generic error에서 원인을 찾을 때 사용할 식별자는?
3. 오류가 없는데 fallback의 DB query가 실행되는 catchError composition은 어떤 패턴인가?

## 출처

- [Next.js, error-handling](https://nextjs.org/docs/app/getting-started/error-handling)
- [Next.js, error](https://nextjs.org/docs/app/api-reference/file-conventions/error)
- [Next.js, catchError](https://nextjs.org/docs/app/api-reference/functions/catchError)
- [Next.js, unstable_rethrow](https://nextjs.org/docs/app/api-reference/functions/unstable_rethrow)

## 관련 문서

- [[React-Error-Boundaries]]
- [[React-Action-State]]
- [[NextJS-App-HTTP-Interrupts]]
