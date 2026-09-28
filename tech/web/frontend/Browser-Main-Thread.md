---
tags: [web, frontend, performance, browser]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["Browser Main Thread", "브라우저 메인 스레드", "Long Task"]
---

# 브라우저 메인 스레드

## 정의

브라우저의 메인 스레드는 한 페이지의 JavaScript 실행, 이벤트 처리, 스타일 계산, 레이아웃, 페인트, 다음 프레임 커밋을 모두 순차로 처리하는 단일 스레드다. 이 스레드가 한 작업에 오래 붙잡히면 그동안 들어온 입력 반응과 화면 갱신이 함께 멈춘다.

## 동작 원리 (mental model)

- 화면은 주기적으로(60Hz면 약 16.6ms마다) 한 프레임을 그린다. 그 예산 안에 JavaScript, 스타일과 레이아웃, 페인트가 끝나야 프레임을 놓치지 않는데, 브라우저 내부 처리가 시간을 먹으므로 코드에 실제로 쓸 수 있는 시간은 그보다 짧다.
- 메인 스레드는 태스크 큐를 하나씩 실행하는 이벤트 루프로 돈다. 하나의 태스크가 길면(long task, 관례상 50ms 이상) 그 사이 들어온 클릭, 스크롤, 애니메이션 프레임이 뒤로 밀려 버벅임(jank)으로 나타난다.
- 문제의 본질은 코드가 느린 것 자체가 아니라 긴 작업이 메인 스레드를 오래 독점하는 것이다. 같은 총량이라도 잘게 쪼개 사이사이 제어권을 넘기면 반응성은 유지된다.

## 렌더링 차단과 변경 비용

`<head>`에서 parser가 만난 스타일시트는 HTML parser를 멈추지 않고 첫 렌더링을 막는다. CSS는 뒤의 규칙이 앞의 규칙을 덮어쓸 수 있어 CSSOM이 완성될 때까지 그리지 않는다. `media`가 현재 환경과 맞지 않는 스타일시트는 렌더링도 script도 막지 않는다. 다만 script는 계산된 스타일을 읽을 수 있으므로, parser가 만든 스타일시트가 로드되는 동안 뒤따르는 inline classic script와 `async`, `defer` 없는 external classic script는 실행을 기다리고 그 사이 parser도 멈춘다. 느린 CSS가 script를 거쳐 DOM 생성까지 늦추는 경로다. inline classic script에는 `async`, `defer`가 효과가 없고, `defer`를 붙인 external classic script는 parser를 멈추지 않지만 실행 전에는 로드 중인 스타일시트를 기다린다.

렌더 트리에는 `<head>`, `display: none` 요소와 그 자손이 빠지고, `visibility: hidden` 요소는 그려지지 않지만 공간을 차지하므로 포함된다. 노드의 크기와 위치를 처음 계산하는 것을 layout, 이후의 재계산을 reflow로 나눠 부르기도 하고 두 말을 같은 뜻으로 쓰기도 한다. 스타일 변경의 비용은 다시 실행되는 단계로 갈린다.

- `left`, `margin-left`, `border-width`, `font-size`처럼 기하나 위치를 바꾸는 속성: style 재계산, layout, paint
- `color`처럼 기하에 영향이 없는 속성: layout 없이 style 재계산과 paint
- 자체 layer로 그려지는 요소의 `transform`, `opacity`: paint 없이 style 재계산과 composite

`display: none` 전환은 박스를 만들거나 없애 주변 배치를 다시 계산하게 하고, `visibility: hidden` 전환은 공간을 유지하므로 배치를 바꾸지 않는다.

## 반응성을 지키는 패턴

1. 분할과 양보(chunking, yielding): 큰 루프를 조각내고 사이에 제어권을 넘겨 입력과 렌더가 끼어들게 한다. `setTimeout(0)`, `MessageChannel`, 또는 `scheduler.yield`, `scheduler.postTask` 같은 스케줄링 API를 쓰되 지원 범위는 대상 브라우저에서 확인한다. 조각을 마친 뒤 다음 `setTimeout(fn, 0)`을 거는 연쇄는 몇 번 재예약한 뒤부터 조각 사이에 최소 4ms가 끼어든다. 작업 전에 다음 타이머를 먼저 걸면 이 대기가 작업 시간과 겹친다([[Event-Loop-Microtask#타이머 API 차이|타이머 API 차이]]).
2. 배치(batching): 자주 발생하는 입력, 스크롤, resize는 debounce나 throttle로 묶고, DOM 변경과 상태 업데이트를 모아 한 번에 적용한다.
3. 우선순위(prioritizing): 사용자와 직접 관련된 작업을 배경 작업보다 먼저 처리하고, 현재 상호작용에 맞춰 작업 큐를 재정렬한다.
4. 지연(deferring): 당장 필요 없는 실행, 렌더, 초기화를 미룬다. 코드 스플리팅과 IntersectionObserver로 뷰포트에 들어올 때만 렌더한다.
5. 컴포지터로 넘기기(compositor offloading): 애니메이션을 layout이나 paint를 유발하는 top, left, width 대신 transform, opacity로 표현하면 요소가 자체 layer로 합성될 때 paint 없이 컴포지터에서 처리돼 메인 스레드 부담이 준다. layer 승격은 보장되지 않으므로 성능 패널로 확인한다.
6. Web Workers로 이동: 데이터 파싱, 이미지 처리 같은 CPU 무거운 계산을 별도 워커 스레드로 옮겨 메인 스레드를 비운다. 워커는 DOM에 접근하지 못하고 메시지 전달 비용이 있어, 잦은 소량 작업보다 크고 순수한 계산 덩어리에 유리하다.
7. 불필요한 일 제거: 오래된 데이터를 폐기하고 중간 업데이트를 병합하며 계산을 메모이제이션해 총 작업량 자체를 줄인다.

### debounce와 throttle

입력, scroll, resize처럼 짧은 간격으로 이어지는 호출을 매번 처리하지 않고 실행 횟수를 줄이는 두 방식이다.

- **debounce**: 호출이 일정 시간 멈출 때까지 기다렸다가 한 번만 실행한다. 호출이 이어지는 동안 실행도 계속 밀린다. 입력이 멈춘 뒤 검색하는 것처럼 마지막 값만 의미 있는 작업에 맞다.
- **throttle**: 호출이 계속돼도 정해진 간격마다 최대 한 번 실행한다. scroll 위치에 맞춰 다른 요소를 옮기는 것처럼 진행 중에도 주기적으로 반영해야 하는 작업에 맞다.
- 한 묶음의 첫 호출 시점을 leading edge, 대기 시간이 끝나는 시점을 trailing edge라고 한다. debounce는 보통 trailing edge, throttle은 보통 leading edge에서 실행하고, 용도에 따라 반대쪽이나 양쪽에서 실행하기도 한다.

```ts
/**
 * 마지막 호출 뒤 waitMs 동안 추가 호출이 없으면 마지막 인자로 한 번 실행한다(trailing edge).
 * @param fn 묶어서 실행할 함수
 * @param waitMs 마지막 호출 뒤 기다릴 시간(ms)
 * @returns 호출마다 대기 타이머를 다시 거는 함수
 */
const debounce = <A extends unknown[]>(fn: (...args: A) => void, waitMs: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A): void => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
};

/**
 * 첫 호출을 바로 실행하고 intervalMs 동안 들어온 호출은 버린다(leading edge).
 * @param fn 실행 빈도를 제한할 함수
 * @param intervalMs 실행 사이의 최소 간격(ms)
 * @returns 간격 안의 호출을 무시하는 함수
 */
const throttle = <A extends unknown[]>(fn: (...args: A) => void, intervalMs: number) => {
  let blocked = false;
  return (...args: A): void => {
    if (blocked) return;
    blocked = true;
    // fn이 예외를 던져도 간격이 끝나면 다시 실행되도록 타이머를 먼저 건다.
    setTimeout(() => {
      blocked = false;
    }, intervalMs);
    fn(...args);
  };
};
```

- 위 throttle은 간격 안에 들어온 마지막 호출을 버린다. 최종 상태까지 반영해야 하면 trailing edge 실행을 추가한다.
- trailing edge에서 실행하는 debounce의 대기 중인 마지막 호출은 페이지 종료로 사라질 수 있다. 반면 같은 문서 안에서 화면이나 component를 해제하는 것만으로는 타이머가 취소되지 않아 해제 뒤에 실행될 수 있다. 해제 시점에 타이머를 취소할지 남은 호출을 바로 실행할지 정한다. 위 debounce는 timer를 노출하지 않으므로, 해제 처리가 필요하면 `clearTimeout`으로 취소하는 `cancel`과 대기 중인 마지막 인자로 바로 실행하는 `flush`를 함께 반환하도록 확장한다.
- 두 방식 모두 한 실행 환경 안의 호출 빈도만 줄인다. 여러 클라이언트의 요청 총량은 서버의 [[Rate-Limiting|rate limit]]으로 제한한다.

## 트레이드오프

- 분할과 양보는 반응성을 얻는 대신 전체 완료 시간이 조금 늘고 코드가 복잡해진다.
- Web Worker는 메인 스레드를 비우지만 직렬화와 메시지 비용, DOM 미접근 제약이 있어 크고 순수 계산인 작업에 유리하다.
- 컴포지터 오프로딩은 transform, opacity로 표현 가능한 애니메이션에 한정된다.

## 체크포인트

- 버벅임의 원인은 대개 특정 long task다. 성능 패널이나 Long Tasks API로 50ms를 넘는 태스크를 먼저 찾는다.
- INP(Interaction to Next Paint) 같은 반응성 지표는 결국 입력 후 메인 스레드가 얼마나 빨리 다음 프레임을 그리는지를 본다.
- 브라우저 이벤트 루프는 렌더링 프레임을 끼워 도는 점에서 Node.js 이벤트 루프의 I/O 단계 구조와 목적이 다르다.

## 출처

- [브라우저의 메인 스레드는 비싸다 — kciter.so](https://kciter.so/posts/the-expensive-main-thread/)
- [MDN, Populating the page: how browsers work](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/How_browsers_work)
- [MDN, Critical rendering path](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Critical_rendering_path)
- [MDN, Animation performance and frame rate](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate)
- [HTML Standard, Interactions of styling and scripting](https://html.spec.whatwg.org/multipage/semantics.html#interactions-of-styling-and-scripting), [HTML Standard, Link type "stylesheet"](https://html.spec.whatwg.org/multipage/links.html#link-type-stylesheet), [HTML Standard, Render-blocking mechanism](https://html.spec.whatwg.org/multipage/dom.html#render-blocking-mechanism), [HTML Standard, Prepare the script element](https://html.spec.whatwg.org/multipage/scripting.html#prepare-the-script-element), [HTML Standard, The end](https://html.spec.whatwg.org/multipage/parsing.html#the-end), [HTML Standard, Timer initialization steps](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timer-initialisation-steps)
- [W3C, CSS 2.2 Visual effects](https://www.w3.org/TR/CSS22/visufx.html)
- [MDN, Debounce](https://developer.mozilla.org/en-US/docs/Glossary/Debounce), [MDN, Throttle](https://developer.mozilla.org/en-US/docs/Glossary/Throttle)
- [모던 자바스크립트 딥다이브 스터디 #8-1 (CH 38 브라우저의 렌더링 과정) — FE재남](https://www.youtube.com/watch?v=lO6gsAQWfjM)
- [모던 자바스크립트 딥다이브 스터디 #10-2 (CH 41 , 43) — FE재남](https://www.youtube.com/watch?v=8_2kse0fgMk)

## 관련 문서

- [[In-Browser-Build|브라우저 내 빌드 런타임]]
- [[Browser-CSS-Animation-and-Compatibility|브라우저 CSS 애니메이션과 호환성]]
- [[Thread-vs-Event-Loop|스레드와 이벤트 루프]]
- [[Event-Loop|이벤트 루프]]
- [[Browser-URL-Flow|브라우저 주소창에 URL을 입력하면]]
