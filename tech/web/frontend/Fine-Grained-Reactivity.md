---
tags: [web, frontend, reactivity, signals, solidjs, async, server-functions, diagnostics]
status: done
verified_at: 2026-11-18
category: "웹&네트워크(Web&Network)"
aliases: ["Fine-Grained Reactivity", "세밀한 반응성", "Signals", "시그널", "Solid 2.0", "SolidJS 2.0", "반응형 그래프"]
---

# 세밀한 반응성: 시그널 그래프와 비동기

세밀한 반응성(fine-grained reactivity)은 어떤 식이 어떤 값을 읽었는지 기록해 두고, 값이 바뀌면 그 값을 읽은 식만 다시 실행하는 갱신 방식이다. 컴포넌트 전체를 다시 실행해 결과를 비교하는 방식과 갱신 단위가 다르다. Solid가 대표 구현이며, 2026-11-17 GitHub 릴리스로 안정 버전이 나온 Solid 2.0(2026-11-18 릴리스 API의 게시 시각 확인)은 서버 데이터 읽기, 변경과 서버 호출까지 같은 그래프에 넣었다. 이 문서는 2026-11-18 Solid 공식 문서를 대조해 개념과 2.0의 동작을 정리한다.

## 갱신 단위가 다르다

| 축 | 컴포넌트 재실행 모델(React) | 세밀한 반응성(Solid) |
|---|---|---|
| 갱신 단위 | state가 바뀐 component 함수를 다시 호출해 다음 모습을 계산한다([[React-Core-Mental-Model#일상적인 UI 갱신 흐름|React mental model]]) | 컴포넌트는 한 번만 실행되고, 바뀐 값을 읽은 식만 다시 실행된다 |
| 의존성 파악 | Hook 의존성 배열을 적고 lint로 검사한다 | 추적 범위 안에서 값을 읽는 순간 자동으로 기록된다 |
| 흔한 실수 | 오래된 closure, 불필요한 재렌더 | 추적 범위 밖에서 값을 읽어 갱신이 멈춘다 |

- **시그널**: 값 하나를 들고 누가 읽는지 안다. `createSignal`은 getter와 setter를 돌려주고 getter는 `count()`처럼 함수로 호출한다.
- **추적 범위**: JSX 식, memo와 effect의 compute 함수다. 컴포넌트 본문은 추적 범위가 아니라서 본문에서 읽은 값은 한 번 찍은 스냅샷이 된다. props를 본문에서 구조 분해하면 반응성을 잃는 이유다.
- **memo**: `createMemo`는 결과를 캐시하고, 다시 계산한 값이 이전과 같으면 읽는 쪽에 알리지 않아 파생 계산 사이의 경계가 된다.
- **effect**: 2.0의 `createEffect`는 의존성을 추적하는 compute 함수와, 추적하지 않고 DOM 반영 뒤에 부작용을 실행하는 effect 함수로 나뉜다. 의존성이 compute 쪽에 모두 보인다.
- **일괄 반영**: 쓰기는 모아 두었다가 다음 microtask에 반영한다. setter 직후에 읽으면 마지막으로 반영된 값이 나오므로 테스트처럼 즉시 관찰해야 하는 곳에서는 `flush()`를 부른다. 1.x의 `batch`는 없어졌다.

## 비동기 값을 그래프 안에 둔다

2.0에서는 memo가 Promise를 반환해도 된다. 읽는 쪽은 `Promise<Product>`가 아니라 `Product`를 받으므로, 데이터 원천이 비동기로 바뀌어도 컴포넌트 구조와 JSX를 대부분 그대로 둔다.

```tsx
const ProductPanel = (props: { id: string }) => {
  // Promise를 반환하는 memo도 읽는 쪽에는 Product 값으로 보인다
  const product = createMemo(() => fetchProduct(props.id));
  return (
    <Loading fallback={<p>불러오는 중</p>}>
      <section class={{ stale: isPending(() => product()) }}>
        <h2>{product().name}</h2>
      </section>
    </Loading>
  );
};
```

- **보류(hold)**: 첫 값이 나온 뒤 입력이 바뀌면 다음 값을 불러오는 동안 현재 값을 계속 보여 주고, 같은 갱신의 다른 쓰기도 기다렸다가 함께 나타난다. 비동기 값을 읽는 식만 기다린다.
- **`Loading`과 `isPending`**: `Loading`은 첫 값 전의 fallback만 맡고 오류는 잡지 않는다(오류는 `Errored`). 이후의 보류 중에는 `isPending`이 참이 되므로 오래된 내용임을 표시한다. 표시하지 않으면 사용자는 낡은 화면을 단서 없이 보게 된다.
- **경쟁 상태**: 새 실행이 이전 실행을 대체하고 이전 결과는 버려진다. 다만 이전 실행이 시작한 요청은 취소하지 않으면 계속 돌므로, 첫 `await` 전에 `onCleanup`과 `AbortController`를 등록한다.
- **읽기 순서**: 반응형 입력은 모두 첫 `await` 전에 읽는다. `await` 뒤의 읽기는 추적되지 않아 값이 바뀌어도 다시 실행되지 않는다. 개발 빌드는 이 늦은 읽기를 오류로 드러내고 프로덕션 빌드는 검사하지 않는다.
- **워터폴**: 요청은 컴포넌트 중첩이 아니라 데이터 의존을 따른다. props만 읽는 자식의 요청은 부모와 병렬로 시작되고, 한 요청이 다른 요청의 응답을 필요로 할 때만 직렬이 된다.

## 변경과 낙관적 갱신

- `action(function* ...)`은 generator를 하나의 트랜잭션으로 실행한다. `yield promise`는 기다린 뒤 트랜잭션으로 돌아오지만 일반 `await`는 트랜잭션을 끊어, 그 뒤의 쓰기는 낙관적 오버레이에 붙지 못하고 버려진다.
- `createOptimisticStore`의 쓰기는 즉시 보이지만 잠정적이다. 액션이 성공하든 실패하든 끝나면 오버레이를 버리므로 되돌리기 코드를 쓰지 않는다. 일반 `createStore`의 쓰기는 액션 안에서도 되돌려지지 않는다.
- 서버를 진실의 원천으로 두려면 `yield` 뒤에 `refresh(대상)`으로 파생 값을 다시 계산해 서버 값과 맞춘다. 빠뜨리면 오버레이가 사라질 때 이전 값으로 돌아간다.
- 액션이 잡지 않은 오류는 호출이 반환한 Promise를 거부하고 `Errored`가 잡지 않는다. 화면을 벗어나도 액션은 취소되지 않으므로 필요하면 `AbortSignal`을 요청에 넘긴다.

## 서버 함수

- 함수 본문 첫 문장에 `"use server"`를 두면 서버 함수가 된다. 모듈 맨 위에 두면 모든 export가 서버 함수다. `@solidjs/vite-plugin`의 `serverFunctions` 옵션으로 변환을 켠다.
- 브라우저의 호출은 기본적으로 `/_server/data/<id>`로 가는 HTTP `POST`이고 본문은 인자 배열이다. SSR 중에는 네트워크 없이 같은 프로세스에서 실행된다.
- 공식 문서는 누구나 서버 함수에 요청을 보낼 수 있으므로 본문 안에서 검증하고 권한을 확인하라고 적는다. 코드에서 함수 호출처럼 보여도 공개 HTTP endpoint와 같은 보안 경계다.
- `GET()`으로 선언한 읽기는 캐시할 수 있지만 인자가 URL에 실려 로그와 캐시 키에 남고, `POST`를 보호하는 same-origin 검사를 거치지 않는다. 안전하고 멱등인 읽기에만 쓰고 비밀 값을 인자로 넘기지 않는다.
- async generator를 반환하면 값이 만들어지는 대로 열린 응답으로 보내고, 브라우저가 반복을 끝내면 요청이 중단돼 서버의 `request.signal`이 울린다. 연결이 끊기면 반복은 오류로 끝나고 다시 열리지 않는다.
- `live()`는 값 모양의 읽기다. yield 하나하나가 현재 답이고, 연결에 한 번 성공한 뒤의 실패는 지수 백오프로 다시 연결하며 4xx는 소스를 닫는다(408, 425, 429와 `Retry-After` 응답은 재시도). 호출 하나가 연결 하나이므로 자원마다 memo 하나를 두고 값을 내려 준다. 전송 형식(SSE 여부 등)은 문서에 명시되어 있지 않다.

## 개발 진단

개발 빌드는 반응성 실수를 `[STRICT_READ_UNTRACKED]`처럼 대괄호로 감싼 코드와 수정 방법을 담은 문장으로 알리고, 소유자 사슬(`in`)과 `file:line:col`(`at`)을 함께 찍는다. 문서는 코드가 릴리스 사이에 안정적이라고 밝힌다.

| 분류 | 예 |
|---|---|
| 잘못된 위치의 읽기와 쓰기 | `STRICT_READ_UNTRACKED`, `REACTIVE_WRITE_IN_OWNED_SCOPE`, `FLUSH_IN_ACTION` |
| 소유자 없는 정리 누락 | `NO_OWNER_EFFECT`, `NO_OWNER_CLEANUP` |
| 비동기 배치 | `ASYNC_OUTSIDE_LOADING_BOUNDARY`, `ASYNC_WATERFALL` |
| 그래프 크기 | `HUGE_FAN_OUT`, `HUGE_FAN_IN` |
| 비용과 반응성 | `HOT_SCOPE_RERUNS`, `EFFECT_WRITES_OWN_SOURCE`, `SILENT_HOLD`, `LONG_HOLD` |

프로덕션 빌드는 진단을 빼지만 `HUGE_FAN_OUT`과 `HUGE_FAN_IN`은 항상 켜져 있다. `@solidjs/diagnostics`는 Vitest matcher(`toHaveNoDiagnostics`, `toStayWithinRerunBudget` 등)와 개발 서버의 `/__solid/diagnostics` 녹화 경로를 제공해, 스크립트나 에이전트가 실행 중인 앱에서 시나리오를 기록할 수 있다. 안정된 코드와 위치는 진단을 사람의 해석 없이 수정 입력으로 쓰게 한다는 점에서 [[Design-System-Lint#진단이 수정 입력이 되는 구조|디자인 시스템 lint의 진단 루프]]와 같은 구조다.

## 1.x에서 바뀐 것

| 1.x | 2.0 |
|---|---|
| `createResource` | Promise를 반환하는 `createMemo`와 `Loading`, `isPending`, `Errored` |
| `Suspense`, `ErrorBoundary` | `Loading`, `Errored` |
| `batch`, `startTransition` | microtask 단위 기본 일괄 반영과 `flush()`, `isPending`과 낙관적 원시 함수 |
| `produce`, `createMutable` | `createStore` setter가 받는 draft를 직접 수정 |
| `solid-js/web`, `solid-js/store` | `@solidjs/web`, store는 `solid-js`에서 export |
| `onMount` | `onSettled` |

1.x는 `1.x` 브랜치와 npm의 `solid-js@v1-latest`로 유지된다. 공개 API가 크게 바뀌었으므로 업그레이드는 하위 시스템 하나씩 옮기라고 공식 가이드가 권한다.

## 트레이드오프

- 불필요한 재실행이 구조적으로 적은 대신, 정확성이 추적 범위 안에서 읽는 습관에 달려 있다. 실수는 오류 없이 갱신이 멈추는 형태로 나타나므로 개발 진단과 테스트 matcher를 함께 쓴다.
- 보류 모델은 화면 깜빡임을 줄이지만 낡은 내용을 계속 보여 준다. `isPending` 표시와 `latest`로 사용자가 방금 바꾼 입력을 즉시 보여 줄지를 설계한다.
- 서버 함수는 네트워크 경계를 코드에서 감추지만 없애지는 않는다. 인증, 입력 검증, 캐시와 연결 수를 API 서버와 같은 기준으로 본다.
- 2.0은 2026-11에 안정판이 됐으므로 라우터, 메타프레임워크와 주변 라이브러리의 2.0 대응 여부를 도입 시점에 확인한다.

## 체크포인트

- 컴포넌트 본문에서 props를 구조 분해하면 왜 갱신이 멈추는가?
- 비동기 memo에서 `await` 뒤에 읽은 시그널이 바뀌면 무슨 일이 생기는가?
- `Loading`과 `isPending`이 각각 맡는 시점은 언제인가?
- 낙관적 오버레이 뒤에 `refresh`를 빠뜨리면 화면이 어떻게 보이는가?
- `GET()` 서버 함수의 인자에 사용자 토큰을 넣으면 안 되는 이유는 무엇인가?

## 출처

- [v2.0.0 - The Long Hold — GitHub, solidjs/solid](https://github.com/solidjs/solid/releases/tag/solid-js%402.0.0) — 페이지의 11-17 표기, 안정 버전 선언, 제거 API와 1.x 유지 경로 확인
- [Solid Docs, Reactivity](https://docs.solidjs.com/concepts/reactivity)
- [Solid Docs, Async reactivity](https://docs.solidjs.com/concepts/async-reactivity)
- [Solid Docs, Mutations](https://docs.solidjs.com/concepts/mutations)
- [Solid Docs, Server functions](https://docs.solidjs.com/building-apps/server-functions)
- [Solid Docs, Reads, streams, and live data](https://docs.solidjs.com/building-apps/server-functions/reads-and-live-data)
- [Solid Docs, Metadata and transport](https://docs.solidjs.com/building-apps/server-functions/metadata-and-transport)
- [Solid Docs, Debugging reactivity](https://docs.solidjs.com/guides/debugging-reactivity)
- [Solid Docs, Migrating from Solid 1.x](https://docs.solidjs.com/migration/from-solid-1)
- [Solid 2.0 - 비동기를 반응형 그래프에 통합한 안정 버전 출시 — GeekNews](https://news.hada.io/topic?id=37376) — 2026-11-18 소개 글, 원문 식별에 사용. 요약의 SSE 연결 지원은 공식 문서에서 확인하지 못했다

## 관련 문서

- [[React-Core-Mental-Model|React 핵심 mental model]] — 컴포넌트 재실행 모델
- [[Frontend-Rendering-Models|프런트엔드 렌더링과 상호작용 모델]]
- [[Design-System-Lint|디자인 시스템 lint]] — 진단을 수정 입력으로 쓰는 루프
- [[Server-Sent-Events|Server-Sent Events]]
