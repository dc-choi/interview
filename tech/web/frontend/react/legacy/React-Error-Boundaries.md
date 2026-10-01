---
tags: [web, frontend, react, reference]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Error Boundary와 복구 경계

## Error Boundary 계약

Error Boundary는 descendant render 실패를 fallback UI로 격리한다. React 내장 `<ErrorBoundary>` component가 있는 것은 아니다. class의 `static getDerivedStateFromError`와 선택적 `componentDidCatch`로 구현하거나 기존 library를 사용한다. 현재 function component만으로 직접 대응 lifecycle을 구현하는 API는 없다.

| method | 입력 | 반환/책임 |
|---|---|---|
| static getDerivedStateFromError(error) | descendant가 던진 임의 값 | 오류 UI를 위한 state object 반환, 순수 계산 |
| componentDidCatch(error, info) | thrown value, componentStack가 있는 info | 반환 없음, logging 등 side effect |

JavaScript는 Error뿐 아니라 string/null도 throw할 수 있으므로 error.message를 무조건 읽지 않는다. getDerivedStateFromError에는 log/network를 넣지 않고 didCatch에서 수행한다. didCatch에서 setState로 fallback을 결정하던 옛 패턴보다 static method를 사용한다.

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) {
    const ownerStack = process.env.NODE_ENV !== 'production'
      ? React.captureOwnerStack() : null;
    reportError({ error, componentStack: info.componentStack, ownerStack });
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
```

React namespace import와 실제 reportError integration이 필요하다. production의 minified component stack은 sourcemap으로 연결한다. Owner Stack은 개발 생성 책임의 보조 증거이고 production export를 무조건 호출하지 않는다.

## 무엇을 잡고 무엇을 별도로 처리하는가

- descendant render 실패와 use(promise)의 rejection은 가까운 boundary에 전달된다.
- 일반 event handler, setTimeout/requestAnimationFrame 같은 async callback 오류는 일반 error 처리로 다룬다.
- boundary 자신의 render 오류는 자신이 잡지 못하고 상위 boundary가 필요하다.
- server rendering 오류는 client Error Boundary와 별도 계약이며 streaming SSR의 Suspense fallback과 server error callback을 확인한다.
- `useTransition`이 반환한 startTransition action의 오류는 boundary와 연결된다. import한 standalone startTransition은 component scope가 없어 reportError로 보고하는 계약과 구분한다.

개발에서 didCatch가 잡은 오류도 window error handler로 bubble할 수 있고 production은 잡힌 오류를 같은 방식으로 bubble하지 않는다. global error handler log와 boundary log의 중복 여부를 환경별로 확인한다.

## 경계와 retry

화면 전체에 하나만 두면 작은 실패가 전체 기능을 가리고, 모든 avatar에 두면 fallback 조각이 과해질 수 있다. 대화 목록, 메시지, 편집 패널처럼 사용자가 부분 실패를 이해하고 계속 사용할 수 있는 단위로 둔다. Suspense는 준비 대기이고 Error Boundary는 실패 격리이므로 함께 배치할 수 있다.

```jsx
<ErrorBoundary fallback={<p>내용을 불러오지 못했습니다.</p>}>
  <Suspense fallback={<p>불러오는 중</p>}>
    <Content contentPromise={contentPromise} />
  </Suspense>
</ErrorBoundary>
```

이 최소 class는 한 번 실패하면 hasError가 유지된다. retry를 제품 흐름에 넣을 때는 boundary state reset/remount와 실패 resource의 재조회/cache invalidation을 함께 설계한다. 같은 rejected Promise만 다시 렌더링하면 같은 실패가 반복된다. entity identity가 바뀌어 remount해야 하면 key를 사용하고, 같은 화면 내 retry는 설치된 library의 reset 계약이나 명시적 reset을 선택한다.

## 이해 확인

1. descendant render, click handler, timeout, boundary 자체에서 throw하여 catch 범위를 예측한다.
2. Suspense fallback과 error fallback이 나타나는 Promise 상태를 설명한다.
3. boundary만 reset하고 cache된 rejected Promise는 유지했을 때 retry 실패를 설명한다.
4. production에서 owner stack을 무조건 호출하는 오류를 conditional namespace 접근으로 수정한다.

## 출처

- [React, Component](https://react.dev/reference/react/Component)
- [React, captureOwnerStack](https://react.dev/reference/react/captureOwnerStack)
- [React, startTransition](https://react.dev/reference/react/startTransition)

## 관련 문서

- [[React-Resources-and-Use]]
- [[React-Suspense-and-Lazy]]
- [[React-Development-Checks]]
