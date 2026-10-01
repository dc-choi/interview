---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 첫 paint와 hydration 보정"]
---

# Next.js 첫 paint와 hydration 보정

## 서버 값과 브라우저 값이 다른 이유

locale, 시간대, theme, localStorage를 서버가 모두 알 수는 없다. 같은 UTC 날짜도 서버 LANG/TZ와 브라우저 설정이 다르면 다른 텍스트가 된다. Client Component도 SSR하므로 첫 render에서 양쪽 `toLocaleDateString()` 결과가 다르면 hydration mismatch가 난다. Server Component만 쓰면 서버의 표시가 남고, Effect에서 고치면 수정 전 값이 잠깐 보일 수 있다.

공식 비교 demo는 `LANG=ja_JP.UTF-8`로 빌드하여 직접 날짜 포맷, inline 보정과 localStorage accordion을 비교한다. 로컬 환경이 같아 문제가 숨지 않게 `TZ=UTC LANG=ja_JP.UTF-8 next dev`와 브라우저 Sensors의 다른 locale을 조합한다. 느린 JavaScript와 서로 다른 시간대도 확인한다.

## HTML parsing 중 날짜 보정

서버 HTML의 time 뒤에 작은 inline script를 두면 HTML parser가 해당 부분을 읽을 때 브라우저 locale로 텍스트를 바꿀 수 있다. hydration 전 DOM을 바꾸므로 해당 요소에 suppressHydrationWarning을 둔다. 이를 일반적인 DOM 수동 변경 패턴으로 확대하지 않는다.

```tsx
'use client'
import { useId } from 'react'
// JSON을 inline script 안에 넣을 때 HTML 종료 토큰을 만들지 않도록 escape한다.
const scriptJSON = (value: object) => JSON.stringify(value)
  .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')

export function InlineScript({ html, nonce }: {
  readonly html: string; readonly nonce?: string
}) {
  return <script nonce={nonce}
    type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
    suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />
}
export function LocalDate({ date, options = {}, nonce }: {
  readonly date: string
  readonly options?: Intl.DateTimeFormatOptions
  readonly nonce?: string
}) {
  const id = useId()
  const args = scriptJSON({ id, date, options })
  const html = `(()=>{const a=${args};const n=document.getElementById(a.id);if(n)n.textContent=new Date(a.date).toLocaleDateString(undefined,a.options)})()`
  return <>
    <time id={id} dateTime={date} suppressHydrationWarning>
      {new Date(date).toLocaleDateString(undefined, options)}
    </time>
    <InlineScript html={html} nonce={nonce} />
  </>
}
```

이 예제의 date는 검증된 ISO timestamp이고 options도 앱이 정하는 값이다. 원문의 문자열 직접 삽입을 그대로 일반화하지 않고 JSON 직렬화와 `<` escape를 적용한다. time/dateTime은 표시 텍스트가 달라도 의미 있는 기계 판독 값을 유지한다. 여러 인스턴스는 useId로 구별한다.

hard navigation에서는 parser가 script를 실행한다. Link soft navigation의 DOM 삽입 script는 실행되지 않으므로 Client Component가 브라우저에서 날짜를 직접 render한다. 서버에서는 text/javascript, 클라이언트에서는 text/plain으로 두는 helper는 개발 script 경고와 불필요한 실행 의도를 구분한다. type 차이도 제한적으로 suppress한다. 호출은 `<LocalDate date={event.date} options={{ year: 'numeric', month: 'long', day: 'numeric' }} />`처럼 쓴다.

## suppressHydrationWarning의 범위

텍스트가 맞지 않으면 React가 경계 안을 클라이언트에서 재구성할 수 있다. 이때 다른 inline script가 보정했던 DOM도 사라지고 삽입 script는 재실행되지 않을 수 있다. suppressHydrationWarning은 해당 요소의 피할 수 없는 불일치에 쓰는 한 단계 escape hatch이며, React가 그 텍스트를 자동으로 교정한다고 기대하지 않는다. RSC라도 HTML DOM과 payload의 차이를 고려해야 한다.

모든 하위 오류를 숨기거나 상태 동기화를 대신하지 않는다. 다음 정상 render와 soft navigation까지 일치하는지는 별도로 확인한다. strict CSP에서는 이 script를 허용하는 nonce 또는 적절한 hash 정책이 필요하다. nonce를 얻기 위한 요청별 렌더와 정적 shell의 제약은 [[NextJS-Content-Security-Policy]]를 따른다.

## theme와 저장소

root layout의 html 기본값을 `data-theme="light"`로 두고 head의 작은 script에서 저장 값을 읽는다. 허용값 light/dark만 반영하고 storage 실패는 기본값으로 처리한다.

```js
(() => {
  try {
    const theme = localStorage.getItem('theme')
    if (theme === 'light' || theme === 'dark')
      document.documentElement.dataset.theme = theme
  } catch { /* storage 차단 시 서버 기본값 유지 */ }
})()
```

```css
[data-theme='light'] { --background: #fff; --foreground: #000; }
[data-theme='dark'] { --background: #0a0a0a; --foreground: #ededed; }
```

이 정적 script를 layout head에 배치하고 html의 제한된 attribute 불일치를 처리한다. DOM 표시와 React state가 서로 다른 진실을 갖지 않게 한다. cookie를 저장소로 선택하면 inline script에서 `document.cookie.match(/(?:^|; )theme=([^;]*)/)`와 decodeURIComponent로 읽고 같은 허용값을 검사한다. JS로 읽는 테마 cookie에만 해당하며 HttpOnly 세션 cookie와 다르다.

```js
const theme = 'dark'
document.documentElement.dataset.theme = theme
document.cookie = `theme=${encodeURIComponent(theme)}; path=/; max-age=31536000; SameSite=Lax`
```

서버 root layout에서 cookies를 읽으면 요청 의존성이 생긴다. Cache Components의 정적 shell을 유지하려면 적절한 Suspense 경계나 브라우저 보정을 선택한다. 모든 요청 cookie 접근이 어떤 배치에서도 전체 앱을 무조건 같은 방식으로 막는다는 뜻은 아니다.

## persisted accordion과 React state

inline script가 `open`을 바꾸면 React lazy initializer도 같은 저장소, 기본값과 검증 규칙을 써야 한다. 다음 함수는 shared module에 두고 Client Component와 직렬화할 초기 보정 로직이 동일한 규칙을 따르게 한다.

```tsx
const ids = ['setup', 'usage', 'deploy'] as const
const readOpen = () => {
  try {
    const value = localStorage.getItem('open-section')
    return ids.find(id => id === value) ?? ids[0]
  } catch { return ids[0] }
}
// Client Component 안에서 사용한다.
const [openId, setOpenId] = useState(() =>
  typeof window === 'undefined' ? ids[0] : readOpen())
```

각 details는 `name="accordion"`, `id={'section-' + id}`, `open={openId === id}`로 묶고 summary와 본문을 둔다. onToggle에서 새 상태가 open일 때 setOpenId와 localStorage.setItem을 수행하되 저장 실패를 처리한다. 뒤의 InlineScript는 동일한 저장값을 읽고 각 `section-*` 요소의 open attribute를 설정하거나 제거한다. 사용자 입력을 script 문자열에 직접 붙이지 않는다.

HTML 보정과 initializer 사이에 다른 탭이 저장소를 바꾸거나 storage가 차단되면 원문의 항상 일치한다는 가정은 성립하지 않을 수 있다. 단일 값 검증과 실패 기본값을 공유하고, 앱에 필요한 경우 storage 이벤트로 동기화한다.

## 개발 재실행과 다른 접근

개발 Strict Mode에서 root 요소가 재설정되면 script가 붙인 attribute가 JSX 기본값으로 돌아갈 수 있다. theme를 소유한 Client Component의 useLayoutEffect에서 저장 값을 다시 검증해 dataset에 적용한다. toggle에서도 현재 저장값을 읽어 light/dark를 반전하고 DOM과 저장소를 함께 갱신한다. storage 접근은 실패할 수 있다.

| 조건 | 선택 |
|---|---|
| 날짜가 cookie/header의 요청 정보에 의존 | 요청 값을 읽고 서버에서 포맷 |
| countdown이나 시계 | Client Component와 Effect로 시간 업데이트, 초기 값 일치 처리 |
| 이미 fully dynamic인 페이지 | Accept-Language로 서버 locale 선택 가능 |
| 콘텐츠 자체의 번역 | locale별 정적 빌드 또는 동적 국제화 |

useEffect는 hydration과 paint 뒤에 수정할 수 있어 첫 HTML flash를 없애지 못한다. useLayoutEffect는 hydration 이후 paint 전 작업이지만 JavaScript를 받기 전 이미 표시된 HTML까지 되돌리지는 못한다. parser script는 그 이전 시점을 다룬다. 네트워크 분할과 CSP를 포함한 실제 첫 화면은 측정해야 한다.

Accept-Language에는 시간대가 없다. Cache Components에서는 날짜만 Suspense 아래에서 요청 정보를 읽어 나머지 shell을 정적으로 유지할 수 있지만 그 영역은 fallback을 거친다. 관련 cookie/header API, 국제화와 일반 hydration 오류 해결은 각각의 문서를 따른다.

## 출처

- [Next.js, preventing-flash-before-hydration](https://nextjs.org/docs/app/guides/preventing-flash-before-hydration)

## 관련 문서

- [[NextJS-State-and-Hydration]]
- [[NextJS-Content-Security-Policy]]
- [[NextJS-RSC-Boundary]]
