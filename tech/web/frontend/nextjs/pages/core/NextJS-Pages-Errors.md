---
tags: [nextjs, react, pages-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Pages Router의 오류 응답과 컴포넌트 복구", "NextJS Pages Errors"]
---

# Pages Router의 오류 응답과 컴포넌트 복구

Next.js 16.3.8 공식 문서 기준이다. 이 문서는 Pages Router의 계약을 설명한다.

## 서버 오류 페이지와 클라이언트 boundary

개발 runtime 오류는 overlay로 표시된다. production에는 stack trace overlay가 없으며 기본 404/500은 static이다. `pages/404.tsx`와 `pages/500.tsx`로 교체하면 build에서 생성한다. 두 파일은 build-time 데이터를 위해 `getStaticProps`를 사용할 수 있다.

기본 오류 페이지는 OS `prefers-color-scheme`을 따르며 앱 theme를 읽지 않는다. 사용자 정의 404/500은 Custom App 안에서 렌더링하므로 global 스타일과 theme를 적용할 수 있다.

```tsx
export default function NotFound() {
  return <h1>페이지를 찾을 수 없습니다.</h1>
}
```

## legacy _error와 next/error

`pages/_error`는 production에서 서버/클라이언트 오류 표시를 사용자 정의한다. `Error.getInitialProps({ res, err })`로 상태를 읽을 수 있으나 `getStaticProps`/`getServerSideProps`는 지원하지 않는다. `/_error` 직접 방문은 404다.

`import Error from 'next/error'`의 기본 컴포넌트는 `statusCode`와 선택적 `title`로 표시한다. **컴포넌트를 렌더링하는 것과 HTTP response status를 바꾸는 것은 별도**다. 404 처리는 데이터 함수의 `notFound`, 서버 status 설정 등 실제 HTTP 계약으로 확인한다.

SSR 데이터 함수에서 throw하면 production 500 페이지로 처리한다. 사용자에게는 안전한 안내, 운영에는 실제 오류 정보를 남긴다. client 데이터 fetch의 실패는 페이지 렌더 오류와 구분해 로딩/실패 상태로 처리한다.

## catchError의 컴포넌트 복구

16.3의 `catchError`는 custom React class boundary 대신 wrapper를 만든다.

```tsx
import { catchError, type ErrorInfo } from 'next/error'

const WidgetBoundary = catchError(
  (props: { title: string }, { reset }: ErrorInfo) => (
    <section>
      <h2>{props.title}</h2>
      <button onClick={reset}>다시 시도</button>
    </section>
  ),
)

export default function Page() {
  return <WidgetBoundary title="위젯을 표시하지 못했습니다.">
    <Widget />
  </WidgetBoundary>
}
```

`catchError(fallback)`의 fallback은 첫 인자로 children을 제외한 wrapper props, 둘째 인자로 `{ error, reset }`을 받는다. 반환 컴포넌트는 같은 props와 children을 받고 child error 때 fallback을 렌더링한다. `reset()`은 오류 상태를 제거하고 children을 다시 렌더링한다. 다른 경로로 client navigation하면 오류 상태가 자동 제거된다.

`unstable_catchError`는 v16.2 이력이고 `catchError`는 v16.3 stable이다. boundary reset이 실패한 원인이나 외부 데이터까지 자동 수정하지는 않는다.

## 기존 class boundary

`getDerivedStateFromError`로 fallback 상태를 만들고 `componentDidCatch(error, info)`로 보고한다. `_app`의 `Component`를 감싸 앱 수준 boundary로 쓸 수 있다. 더 작은 위젯만 감싸면 다른 UI는 계속 사용할 수 있다. 렌더링 boundary는 이벤트/비동기 오류 처리와 역할이 다르므로 fetch와 event handler에는 별도 error handling을 둔다.

## class boundary의 상태, 재시도와 보고

다음 컴포넌트를 `_app`에서 `<ErrorBoundary><Component {...pageProps} /></ErrorBoundary>`로 감싼다. `catchError`를 쓰기 어려운 기존 React boundary의 전체 흐름이다.

```tsx
import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error({ error, info })
  }
  render() {
    if (this.state.hasError) return <section>
      <h2>화면을 표시하지 못했습니다.</h2>
      <button onClick={() => this.setState({ hasError: false })}>재시도</button>
    </section>
    return this.props.children
  }
}
```

`componentDidCatch`를 Sentry, Bugsnag, Datadog 같은 보고 서비스에 연결할 수 있다. 오류의 실제 원인과 stack은 보고하되 사용자 화면에는 안전한 안내를 둔다. 이 class 예제는 경로 변경만으로 상태를 자동 제거하지 않는다. `catchError`의 경로 전환 복구와 구별한다.

기존 `_error.getInitialProps`의 상태 결정 순서는 `res ? res.statusCode : err ? err.statusCode : 404`다. `next/error`는 프레임워크 기본 컴포넌트이므로 사용자 정의 Error UI를 재사용하려면 해당 로컬 컴포넌트를 import한다. 서버 fetch 결과의 `errorCode`를 props로 전달해 `<Error statusCode={errorCode} />`를 표시할 수 있지만 fetch 실패를 읽기 전에 `response.ok`를 확인하고 실제 응답 status도 따로 관리한다.

## 학습 확인

- development overlay와 production 500을 같은 실패로 비교한다.
- 위젯 오류 후 reset과 다른 경로 이동에서 복구되는지 확인한다.
- 오류 UI만 표시했을 때 HTTP status가 무엇인지 확인한다.

## 출처

- [Next.js, custom-error](https://nextjs.org/docs/pages/building-your-application/routing/custom-error)
- [Next.js, error-handling](https://nextjs.org/docs/pages/building-your-application/configuring/error-handling)
- [Next.js, catchError](https://nextjs.org/docs/pages/api-reference/functions/catchError)

## 관련 문서

- [[NextJS-Pages-API-Routes]]
- [[NextJS-Pages-Server-Props]]
- [[NextJS-Pages-Layouts]]
