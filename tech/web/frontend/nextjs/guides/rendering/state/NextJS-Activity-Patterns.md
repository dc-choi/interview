---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js Activity 상태 보존 패턴"]
---

# Next.js Activity 상태 보존 패턴

## 보존과 초기화의 기준

Cache Components가 켜진 App Router는 최대 3개 경로의 React state와 DOM을 Activity로 숨겨 보존한다. `display: none`인 DOM이 남으므로 form 초안, scroll, details와 video 재생 위치가 유지된다. 오래된 경로의 퇴출과 새로고침은 별도다. 이전에는 shared layout이나 외부 store로 페이지 상태를 끌어올려야 했던 경우를 줄인다.

`<Fragment key={router.bfcacheId}>`는 push/replace와 Link에서 subtree를 초기화하면서 back/forward의 복원을 유지하는 마이그레이션 수단이다. 새 코드는 상태별 의도를 정한다.

| 상태 | 유지할 상황 | 초기화할 상황 |
|---|---|---|
| 펼친 UI | sidebar, FAQ, filters | 순간적인 dropdown/popover |
| dialog | wizard 진행, 입력 중 settings | 매번 열 때 focus 등 초기화가 필요한 경우 |
| form | 초안, 검색 필터, 미저장 설정 | 새 거래, 이전 성공/실패 메시지 |

## 이벤트와 숨김 cleanup

성공적으로 생성한 뒤 `setName('')`을 먼저 호출하고 `router.push('/items/' + encodeURIComponent(item.id))`로 이동하면 보존된 폼에 완료한 입력이 남지 않는다. 실패한 입력까지 지우지 않는다. 일시적인 메뉴는 `Link.onNavigate`에서 바로 닫거나 layout Effect cleanup에서 `setOpen(false)`로 닫는다.

```tsx
'use client'
import { useLayoutEffect, useRef, useState } from 'react'
// sendMessage는 인증과 입력 검증을 수행하는 앱의 Server Function이다.
import { sendMessage } from './actions'
export function ContactForm() {
  const [name, setName] = useState('')
  const [status, setStatus] = useState('idle')
  const shouldReset = useRef(false)
  useLayoutEffect(() => () => {
    if (!shouldReset.current) return
    shouldReset.current = false
    setName('')
    setStatus('idle')
  }, [])
  return <form onSubmit={async e => {
    e.preventDefault()
    await sendMessage({ name })
    setStatus('success')
    shouldReset.current = true
  }}>
    <label>Name<input value={name} onChange={e => setName(e.target.value)} /></label>
    <button>Send</button><output>{status}</output>
  </form>
}
```

이 예제는 숨길 때 완료한 입력만 지우고 제출 전 초안은 유지한다. 실패 메시지와 pending UI는 [[NextJS-Form-Patterns]]처럼 별도로 둔다. useActionState도 reducer에 RESET 동작을 정의하는 방식으로 초기화한다. uncontrolled form 전체를 숨길 때 지우려면 `<form ref={form => () => form?.reset()}>` callback-ref cleanup을 쓸 수 있다. controlled state는 form.reset만으로 초기화되지 않는다.

## URL dialog와 인증 전환

`const isOpen = useSearchParams().get('edit') === 'true'`처럼 URL을 기준으로 삼고, 열 때 `router.push('?edit=true')`, 닫을 때 `router.replace('?', { scroll: false })`를 사용할 수 있다. 실제 앱에서는 기존 query를 보존해 edit만 바꾸는 편이 안전하다. `useEffect(() => { if (isOpen) inputRef.current?.focus() }, [isOpen])`가 열림 전환에 반응한다.

원문은 돌아올 때 param이 지워진다고 설명하지만 back/forward로 `?edit=true`를 복원하면 열린다. URL 기반 상태는 탐색한 URL의 값에 따르며 자동 닫힘 보장이 아니다. 보존된 boolean이 이미 true인 상태에서 다시 true를 설정하는 것으로 focus Effect 재실행을 기대하지 않는다. Activity가 다시 보이는 과정 자체의 Effect setup과도 구분한다.

새 사용자 props를 받는 것만으로 기존 draft가 초기화되지는 않는다. `<Form key={userId ?? 'anonymous'} />`로 사용자 경계를 명확히 하거나 이전 userId ref와 새 값을 비교해 초기화한다. 로그아웃 후 `window.location.href = '/login'`은 전체 탐색으로 메모리 상태를 비운다. 단순 router.push만으로 다른 사용자의 초안을 없앴다고 가정하지 않는다.

## 전역 스타일과 숨겨진 DOM

페이지가 숨겨져도 전역 CSS 변수, class와 z-index 규칙은 남을 수 있다. 먼저 지역 scope를 사용하고 필요한 style은 숨길 때 끈다.

```tsx
<style ref={style => {
  if (style) style.media = ''
  return () => { if (style) style.media = 'not all' }
}}>{`:root { --page-accent: blue; }`}</style>
```

여러 style을 관리한다면 ref와 useLayoutEffect setup에서 media를 복원하고 cleanup에서 `not all`로 바꾼다. `:root:has(...)`는 React의 데이터 흐름 밖에서 숨겨진 DOM까지 전역 상태와 결합시킬 수 있다. 전역 modal 상태는 React가 소유한 `html[data-modal-open='true'] { overflow: hidden }`처럼 명시하고 `:has`는 `.card:has(img)` 같은 지역 스타일에 제한한다. 넓은 selector의 재평가 비용도 고려한다.

## 숨겨진 콘텐츠를 검사하기

DOM 존재 검사와 보이는 UI 검사는 다르다. Playwright의 기본 getByRole은 hidden 접근성 항목을 제외하지만 label/placeholder locator 자체가 가시성 필터인 것은 아니다. 원문에 이 둘도 자동 필터한다고 적힌 부분은 Playwright 계약에 맞게 구분한다. action의 visibility 대기는 중복 selector를 해결하지 않는다.

```ts
await page.getByRole('button', { name: 'Submit' }).click()
await page.getByLabel('Email').filter({ visible: true }).fill('a@example.com')
await expect(page.getByTestId('timer').filter({ visible: true })).toBeVisible()
// Cypress에서는 대상 범위를 좁힌 뒤 .should('be.visible')로 확인한다.
```

숨은 첫 요소를 `.first()`로 선택하면 timeout 또는 잘못된 assertion이 생길 수 있다. 실제 숨김, 복귀, 퇴출 후의 입력과 cleanup을 함께 확인한다.

## 컴포넌트 안의 Activity와 Promise

route 외에도 tab이나 expandable panel에 Activity를 직접 쓸 수 있다. 서버가 `const promise = getComments()`로 먼저 시작하고 Client Component에 넘기면 숨은 내용도 낮은 우선순위로 render할 수 있다.

```tsx
'use client'
import { Activity, Suspense, use, useState } from 'react'
interface Comment { readonly id: string; readonly text: string }
export function CommentsPanel({ promise }: { readonly promise: Promise<Comment[]> }) {
  const [expanded, setExpanded] = useState(false)
  return <>
    <button onClick={() => setExpanded(v => !v)}>Toggle comments</button>
    <Activity mode={expanded ? 'visible' : 'hidden'}>
      <Suspense fallback={<p>Loading comments...</p>}><Comments promise={promise} /></Suspense>
    </Activity>
  </>
}
function Comments({ promise }: { readonly promise: Promise<Comment[]> }) {
  return <ul>{use(promise).map(c => <li key={c.id}>{c.text}</li>)}</ul>
}
```

열기 전에 데이터가 준비되면 즉시 보여 줄 수 있지만 준비되지 않았다면 fallback이 필요하다. 숨겼다는 이유만으로 fetch가 완료되거나 취소된다고 가정하지 않는다.

## Effect와 미디어 수명

숨겨질 때 cleanup, 다시 보일 때 setup이 실행된다. timer는 `useEffect(() => { const id = setInterval(tick, 1000); return () => clearInterval(id) }, [])`처럼 종료해야 한다. 구독도 해제한다. display none은 audio/video 재생을 멈추지 않으므로 `useLayoutEffect(() => { const video = ref.current; return () => video?.pause() }, [])`로 명시한다. DOM이 유지되어 재생 위치는 남지만 자동 재개 여부는 앱이 결정한다.

최초 표시만 구분하려면 ref를 false로 시작하고 Effect에서 true로 바꾼다. ref는 hide/show 동안 유지되어 다음 setup을 구분하지만 개발 Strict Mode의 추가 setup도 고려해야 한다. 공식 demo는 Data의 정렬/선택/리뷰 사전 준비, Forms의 입력 보존/제출 후 초기화, Side Effects의 timer/video를 비교한다.

## 출처

- [Next.js, preserving-ui-state](https://nextjs.org/docs/app/guides/preserving-ui-state)

- [Playwright, Locators](https://playwright.dev/docs/locators)

## 관련 문서

- [[NextJS-State-and-Hydration]]
- [[NextJS-Cache-Migration]]
- [[NextJS-Form-Patterns]]
