---
tags: [nextjs, react, frontend]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Link와 Form의 탐색 계약", "NextJS Link and Form"]
---

# Link와 Form의 탐색 계약

Next.js 16.3.8 공식 문서 기준이다. App Router 예시는 Pages Router의 실행 계약과 구분한다.

## 앵커 탐색과 GET 검색 폼

Link는 anchor를 확장한 client navigation, Form의 string action은 GET 검색 폼을 확장한 client navigation이다. 같은 router 경로로 이동해 shared UI/state를 유지할 수 있다. 새 탭, 다운로드, 외부 URL 등 네이티브 의미도 구분한다.

~~~tsx
import Link from 'next/link'
import Form from 'next/form'
export default function Search() {
  return <>
    <Link href="/dashboard">대시보드</Link>
    <Form action="/search">
      <input name="query" aria-label="검색어" />
      <button type="submit">검색</button>
    </Form>
  </>
}
~~~

string Form은 입력을 search params로 encode해 /search?query=...로 이동한다. action 빈 문자열은 현재 경로의 query 갱신이다. App Page의 searchParams는 Promise이므로 await하고 string/string[]/undefined를 정규화한 뒤 검색한다. 파일 input은 파일 본문이 아닌 filename을 GET으로 보낸다.

## Link 속성과 prefetch

href는 문자열 또는 pathname/query 객체 필수다. anchor className/target/download 속성은 underlying anchor에 전달된다. replace 기본false는 history push, true는 현재 항목 교체다. 동적 segment는 검증한 slug를 URL에 삽입하며 query는 객체 형태로 encoding을 맡길 수 있다.

| prefetch | 일반 App Router 동작 |
| --- | --- |
| auto/null(기본) | static 전체, dynamic은 가까운 loading boundary까지 |
| true | static/dynamic 전체 경로, 기능 설정에 따른 cached 부분 포함 |
| false | viewport와 hover 모두 prefetch 안 함 |

production에서만 prefetch한다. prefetched data가 만료되면 hover에서 다시 시도할 수 있다. partialPrefetching:true는 기본 auto가 per-route App Shell을 prefetch하도록 바꾸므로 일반 동작을 모든 설정에 적용하지 않는다. Pages Link false는 hover prefetch가 남는 계약이며 별도 문서를 따른다.

scroll 기본true가 모든 이동에서 맨 위로 강제한다는 뜻은 아니다. 새 Page가 보이면 위치를 유지하고 보이지 않으면 첫 Page 요소로 이동한다. fixed/sticky/비가시/non-scrollable DOM은 건너뛴다. false는 이 관리를 끈다. history backward/forward는 위치 복원과 함께 점검한다.

`href="/dashboard#settings"`는 anchor fragment다. sticky header 때문에 가려지면 scroll container의 scroll-padding-top 또는 target의 scroll-margin-top을 사용한다.

## 탐색 이벤트와 제한

onClick은 modifier click도 실행한다. onNavigate(event)는 same-origin SPA 탐색만 실행하며 preventDefault로 해당 탐색을 취소한다. Cmd/Ctrl 새 탭, 외부 URL, download에는 실행되지 않는다. callback이 있는 wrapper는 Client Component다.

~~~tsx
'use client'
import Link from 'next/link'
export default function GuardedLink({ dirty }: { dirty: boolean }) {
  return <Link href="/items" onNavigate={event => {
    if (dirty && !window.confirm('저장하지 않고 이동할까요?'))
      event.preventDefault()
  }}>목록</Link>
}
~~~

여러 링크는 Context로 dirty state를 공유할 수 있다. 이 패턴이 browser reload/back, 임의 router.push, 모든 외부 이동을 일괄 차단하는 것은 아니다. props를 나중에 spread해 onNavigate guard가 덮어써지지 않게 wrapper 계약을 정한다.

transitionTypes는16.2부터 string[]를 React.addTransitionType에 전달해 ViewTransition animation 분기를 돕는다. 실제 animation은 React ViewTransition 설정과 환경 지원이 필요하다.

rewrite 경로에서는 href로 prefetch할 실제 목적지, as로 표시 URL을 나눌 수 있다. `<Link as="/dashboard" href="/auth/dashboard">`처럼 사용한다. 클라이언트 로그인 추정은 접근 권한 검증을 대신하지 않는다. Proxy 예시에는 Request가 아닌 NextRequest와 cookies.get을 사용한다.

## Form 속성과 Server Action

string action은 viewport에서 shared layout/loading UI를 prefetch한다. replace 기본false, scroll 기본true, prefetch 기본true다. 입력별 결과 데이터 전체를 미리 조회하는 기능은 아니다. loading.tsx는 결과 요청 중 fallback, form 자식 Client Component의 useFormStatus는 pending 제출 피드백에 쓴다.

function action은 React form의 Server Action 실행이다. destination이 실행 전 확정되지 않아 shared UI 자동 prefetch가 없고 replace/scroll도 무시된다. mutation 뒤 redirect는 Action이 정한다. 입력 검증/권한/재검증은 별도 mutation 계약을 따른다.

Form의 onSubmit에서 preventDefault하면 자동 이동을 덮어쓴다. method/encType/target이 필요하면 native form을 쓴다. formMethod/formEncType/formTarget override는 native behavior로 fallback한다. string action의 key로 재렌더/mutation을 유도하는 방식은 지원하지 않는다.

button/input formAction은 action을 override하고 client navigation을 지원하지만 prefetch하지 않는다. basePath가 있으면 formAction에 포함한다. function action의 file은 Server Action 업로드 계약을 별도로 확인한다.

## 학습 확인

- App/Pages Link false의 hover 동작을 비교한다.
- 검색 Form과 mutation Form의 prefetch/URL/action 차이를 설명한다.
- onNavigate guard가 처리하지 않는 이동 경로를 찾아 보완 범위를 정한다.

## 출처

- [Next.js, link](https://nextjs.org/docs/app/api-reference/components/link)
- [Next.js, form](https://nextjs.org/docs/app/api-reference/components/form)

## 관련 문서

- [[NextJS-Actions-and-Forms]]
- [[NextJS-Pages-Navigation]]
- [[NextJS-Pages-Router-API]]
