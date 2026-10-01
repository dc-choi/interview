---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Server Actions와 폼"]
---

# Next.js Server Actions와 폼

## Action의 호출과 응답

Server Action은 React의 form action, formAction 또는 transition을 통해 호출하는 Server Function이다. 서버 구현은 `use server` 경계에 남고 클라이언트 참조가 POST를 보낸다. 서버 코드라고 해서 자동으로 인증된 endpoint가 되지는 않는다.

현재 Next.js 클라이언트 dispatcher는 Action을 한 번에 하나씩 보낸다. 클라이언트에서 여러 Action을 Promise.all로 감싸도 병렬 데이터 조회 수단이 되지 않는다. 독립 작업의 병렬화는 한 Action 내부나 Server Component, 적절한 Route Handler에서 수행한다. 여러 사용자 요청 전체가 하나의 전역 큐에 들어간다는 뜻은 아니다.

| Action에서 호출 | 현재 UI와 캐시에 미치는 효과 |
|---|---|
| `updateTag` | 태그를 즉시 만료시키고 다음 읽기는 새 값을 기다림, read-your-own-writes |
| `revalidatePath` | 지정 경로를 무효화하고 Action 응답의 경로 재렌더와 연결 |
| `refresh` | 현재 RSC를 다시 읽음, 서버 데이터 캐시 자체는 무효화하지 않음 |
| `revalidateTag(tag, 'max')` | stale 표시 후 후속 읽기에서 background 갱신, 즉시 새 UI 보장 아님 |
| 쿠키 set/delete | 쿠키 변경을 반영해 현재 page/layout 재렌더 |
| `redirect` | 제어 흐름을 종료하고 목적지로 이동 |

즉시 갱신하는 Action 응답은 반환값과 새 RSC Payload를 같은 roundtrip에 담을 수 있다. 모든 Action이 자동으로 전체 경로를 다시 렌더하는 것은 아니다. redirect 뒤 코드는 실행되지 않으므로 필요한 invalidation은 앞에서 수행한다.

## 폼 입력과 오류

`<form action={fn}>`의 함수에는 FormData가 전달된다. `useActionState(fn, initialState)`를 거치면 `(previousState, formData)`로 바뀐다. `bind`로 앞 인자를 추가할 수 있지만 대상 식별자도 서버에서 권한을 검사한다. hidden input은 HTML에 노출되고 조작 가능하다.

`Object.fromEntries(formData)`에는 `$ACTION_` 메타 필드가 들어갈 수 있다. 허용 필드만 추출하고 File과 string, 누락 값을 구분한다. client required/type 검사는 사용자 안내용이며 서버 schema와 업무 검증을 대신하지 않는다. 예상 가능한 검증 실패는 serializable 오류 상태로 반환하고 aria-live 등으로 알린다.

`useFormStatus`는 폼 안의 별도 자식 컴포넌트에서 읽는다. `useActionState`의 pending은 해당 Action 상태에 연결된다. 한 폼의 저장/발행 버튼은 각 formAction으로 구분하고 키보드 제출은 `requestSubmit()`으로 브라우저 제출 흐름을 따른다.

## 낙관적 UI와 대기 상태

`useOptimistic`는 Action/transition이 끝날 때 실제 base state로 복귀하는 임시 표현이다. 서버 변경 후 invalidation 또는 refresh로 새 base가 도착하도록 연결한다. 목록 추가/이동은 이전 값으로 고정한 snapshot보다 updater/reducer로 새 base에 다시 적용할 수 있게 작성한다.

- 즉각적인 토글과 URL 필터 표시: optimistic 값으로 입력 피드백을 제공하고 transition으로 실제 탐색/변경을 추적한다.
- 댓글: 서버가 렌더한 확정 목록과 client의 pending 목록을 분리할 수 있다. 실패 시 입력 복구와 오류 표시 정책도 둔다.
- drag-and-drop: 이동 reducer가 서버 base에 재적용되도록 하고 서버에서 순서와 소유권을 검증한다.
- 대화상자 폼: 성공 후 key 변경이나 reset으로 수명을 제어한다. 요청 실패 전에 입력을 없애면 복구할 데이터를 따로 보관한다.
- 자식 삭제 pending을 `data-pending`과 CSS `:has()`로 상위에 표현할 수 있다. 넓은 DOM에 고빈도 상태를 전파하면 style 계산 비용을 측정한다.

`useTransition`이 제공한 startTransition의 Action 오류와 module-level `startTransition` 오류 전파를 동일시하지 않는다. 오류 boundary와 연결되는 호출 경로를 쓰거나 예상된 실패를 직접 처리한다. React의 세부 계약은 관련 Hook 문서를 따른다.

## 안전성과 배포

입력 검증, 현재 세션과 리소스별 인가, 최소 반환 DTO를 Action마다 적용한다. 기본 body size 제한과 allowedOrigins는 프레임워크의 추가 경계이며 업무 권한이 아니다. 클로저 암호화 키와 build별 Action ID가 여러 인스턴스에 맞는지 확인한다. 구버전 화면의 호출 실패는 재시도/새로고침 경로를 제공하되 비멱등 변경의 중복 실행을 고려한다.

실험적 offline 지원은 별도 opt-in이며 네트워크 단절 시 pending과 재연결을 다룬다. 서버의 중복 변경 방지와 장기 durable queue까지 자동 보장하는 것으로 해석하지 않는다.

## 세부 보안 설정과 예제 연결

폼 검증, useActionState/useFormStatus, bind, 여러 버튼, optimistic 목록과 키보드 제출은 [[NextJS-Form-Patterns]]에 있다. event handler나 useEffect에서 Action을 호출할 때는 startTransition 경계를 사용한다.

Next.js 기본 Action 본문 제한은 1MB다. 아래의 2mb는 명시적으로 늘린 예시다.

```js
module.exports = {
  experimental: {
    serverActions: {
      allowedOrigins: ['my-proxy.example', '*.my-proxy.example'],
      bodySizeLimit: '2mb',
    },
  },
}
```

Origin과 Host 또는 X-Forwarded-Host의 CSRF 비교, 사용하지 않는 Action 제거, 참조 ID와 클로저 보호는 업무 인가를 대신하지 않는다. 삭제처럼 민감한 작업은 추가 세션 검사/재인증을 검토하고 실패를 분명히 처리한다. `authInterrupts` 실험 플래그를 켜면 `unauthorized()`/`forbidden()`으로 대응 UI를 렌더할 수 있다.

클라이언트에는 변경 대상 ID와 변경값만 받으며 소유자와 기존 행은 서버에서 다시 읽는다. 올바른 schema의 객체도 다른 사용자의 행일 수 있다. 세션의 userId로 범위를 제한한 update 또는 트랜잭션으로 조회/변경 사이의 소유권 변경도 처리한다.

Action ID는 빌드 산출물에 묶이며 재빌드와 최대 14일 캐시 조건을 세션 만료로 해석하지 않는다. `Failed to find Server Action`은 구버전 화면과 새 배포의 불일치로 발생할 수 있다. rolling 배포, 인스턴스 간 같은 `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, 새로고침/재시도 UI를 연결한다. 동일 키만으로 모든 버전의 Action ID가 호환되는 것은 아니다. 캐시 갱신 함수들은 redirect처럼 throw하지 않아 호출 뒤 값을 반환할 수 있다.

## 출처

- [Next.js, forms](https://nextjs.org/docs/app/guides/forms)
- [Next.js, server-actions](https://nextjs.org/docs/app/guides/server-actions)
- [Next.js, interactive-apps](https://nextjs.org/docs/app/guides/interactive-apps)

## 관련 문서

- [[NextJS-Authentication]]
- [[NextJS-Data-Security]]
