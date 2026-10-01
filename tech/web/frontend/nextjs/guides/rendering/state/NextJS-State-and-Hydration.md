---
tags: [nextjs, app-router]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Next.js 상태 보존과 Hydration"]
---

# Next.js 상태 보존과 Hydration

## Activity와 route 수명

Cache Components를 켠 App Router는 이동한 route를 즉시 unmount하는 대신 React Activity로 숨겨 state와 DOM을 보존할 수 있다. 현재 문서는 최대 3개 route 보존과 오래된 항목의 퇴출을 설명한다. 이 수치는 영구 저장 보장이 아니며 새로고침/퇴출 뒤 초안을 복구할 저장소와는 다르다.

초안, 필터, 펼친 패널은 보존이 유용하다. 임시 메뉴, 완료한 폼의 성공 메시지와 새 거래 입력은 reset이 필요할 수 있다. 사용자 행동/성공한 제출에서 먼저 reset하고, 숨겨짐에도 정리가 필요하면 layout Effect cleanup을 사용한다. 인증 사용자가 바뀔 때 key를 사용자 ID에 묶거나 전체 navigation으로 client state를 비워 다른 사람의 초안이 남지 않게 한다.

`router.bfcacheId`를 React key에 사용하면 push/replace에서 subtree를 reset하고 back/forward에서 복원하는 전환 도구가 될 수 있다. 새 코드에서는 상태별 보존 의도를 우선 정의한다.

## Effect와 DOM의 차이

Activity가 숨기면 Effect cleanup이 실행되고 다시 보일 때 setup이 재실행된다. state/refs와 DOM은 남는다. 따라서 Effect를 최초 mount에만 실행된다고 간주하면 안 된다. ref로 최초 표시를 구분할 수 있지만 Strict Mode의 개발 재실행도 고려한다.

`display: none`만으로 video/audio가 멈추지 않는다. media.pause, timer 해제, 구독 종료를 cleanup에 명시한다. URL로 dialog 열림을 표현할 수 있지만 back/forward가 `?edit=true`를 복원하면 다시 열린다. URL을 사용한다고 자동으로 닫히는 것은 아니다.

숨긴 페이지의 전역 CSS는 다른 페이지에도 영향을 줄 수 있다. 지역 scope를 우선 사용하고 필요한 style element는 숨김 시 media='not all' 등으로 비활성화한다. `:root:has(...)` 같은 넓은 선택자는 숨긴 DOM도 의도치 않게 감지할 수 있으므로 지역 부모/자식 스타일과 구분한다.

E2E selector는 hidden route의 같은 요소까지 찾을 수 있다. role과 이름, 현재 화면의 가시성을 확인하고 `.first()`로 우연한 일치를 숨기지 않는다. label/placeholder query가 언제나 hidden 항목을 제외한다고 가정하지 않는다.

## 서버 기본값과 브라우저 값의 차이

locale, timezone, theme와 localStorage는 서버 렌더와 브라우저 첫 렌더에서 다를 수 있다. Client Component도 SSR하므로 `new Date().toLocaleDateString()`을 양쪽에서 그대로 호출하면 mismatch가 생길 수 있다. Effect로 수정하면 HTML을 받은 뒤 hydration까지 기본값이 보일 수 있다.

선택지는 서버가 알고 있는 명시적 locale/timezone으로 일치시키기, 같은 placeholder로 hydrate 후 수정하기, 또는 짧은 inline script로 첫 HTML parsing 중 DOM을 보정하기다. Accept-Language만으로 timezone까지 알 수는 없다.

## 첫 화면 보정 스크립트

theme처럼 첫 paint에 필요한 값은 head의 작은 script에서 허용된 저장 값만 읽어 html 속성을 설정할 수 있다. storage 접근 실패를 처리하고, React state도 같은 검증 규칙으로 초기화한다. 날짜는 semantic time/dateTime을 유지하고 useId 등으로 요소를 구분한다.

inline script는 hard navigation의 HTML parser가 실행한다. client navigation에서 React가 삽입한 일반 script는 실행되지 않으므로 Client Component의 정상 browser render가 그 경로를 담당해야 한다. script 문자열에 외부 데이터를 직접 끼워 넣지 않고 안전한 직렬화와 script 종료 문자 escape를 적용한다.

`suppressHydrationWarning`은 해당 요소의 제한된 불일치 경고를 다루는 escape hatch다. 모든 하위 tree의 오류를 숨기거나 다음 렌더의 상태 일치를 보장하지 않는다. 보정한 DOM, RSC와 client state가 이후 갱신에서도 일치하는지 확인한다. strict CSP는 nonce/hash 정책과 충돌할 수 있으므로 shell 정적성까지 함께 판단한다.

개발 Strict Mode와 생산, 서로 다른 LANG/TZ, 느린 JavaScript, storage 차단, hard/soft navigation을 각각 확인한다. useLayoutEffect는 hydration 이후의 paint를 다루므로 HTML이 먼저 보인 시간까지 없애지는 않는다.

## 출처

- [Next.js, preserving-ui-state](https://nextjs.org/docs/app/guides/preserving-ui-state)
- [Next.js, preventing-flash-before-hydration](https://nextjs.org/docs/app/guides/preventing-flash-before-hydration)

## 관련 문서

- [[NextJS-Cache-Migration]]
- [[NextJS-Content-Security-Policy]]
- [[NextJS-Activity-Patterns]]
- [[NextJS-Hydration-Flash]]
