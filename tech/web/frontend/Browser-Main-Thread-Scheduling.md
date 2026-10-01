---
tags: [web, frontend, performance, browser, scheduling]
status: done
verified_at: 2026-09-30
category: "웹&네트워크(Web&Network)"
aliases: ["Browser Main Thread Scheduling", "메인 스레드 스케줄링", "Yielding", "Time Slicing", "양보와 타임 슬라이싱"]
---

# 메인 스레드 스케줄링: 쪼개기, 모으기, 우선순위, 미루기

[[Browser-Main-Thread|브라우저 메인 스레드]]를 계속 쓰면서 시간을 나눠 쓰는 네 가지 방법이다. 쪼개기와 모으기는 태스크의 크기를 다듬고, 우선순위와 미루기는 실행 시기를 정한다. 태스크 사이에 경계가 있어야 그 사이에 무엇을 먼저 넣고 무엇을 뒤로 보낼지도 정할 수 있으므로 쪼개기가 나머지의 기반이다. 일을 메인 스레드 밖으로 보내는 방법은 [[Browser-Main-Thread-Offloading]]에 둔다.

## 쪼개기와 양보

한 번에 도착한 데이터 수백 건을 한 태스크 안에서 모두 DOM으로 그리면 건마다 DOM 생성, 스타일 계산, 레이아웃, 페인트가 따라붙어 그동안 입력과 애니메이션이 멈춘다. 데이터를 받는 콜백도 같은 큐에 줄을 서므로 데이터 표시 자체도 함께 밀린다. 작업을 조각으로 나누고 조각 사이에 제어권을 돌려주면 밀려 있던 입력 처리와 프레임 생산이 그 틈에 차례를 얻는다.

- 양보는 일을 빠르게 만들지 않는다. 총 작업량은 그대로이고 재예약 오버헤드만큼 완료는 오히려 늦어진다. 그래도 렌더링 파이프라인은 태스크 중간에 끼어들 수 없고 태스크 사이에서만 돌기 때문에, 사이를 만들어 주는 것만으로 입력과 화면이 살아난다.
- 이미 스트리밍 중인 입력은 개수로 자르면 충분하다. 애니메이션이나 스크롤이 도는 중이면 개수보다 시간으로 잘라 한 프레임의 남은 예산을 삼키지 않게 한다.

```ts
/**
 * 프레임이 시작된 뒤 budgetMs까지만 처리하고 다음 프레임으로 넘긴다.
 * @param items 처리할 항목
 * @param work 항목 하나를 처리하는 함수
 * @param budgetMs 프레임당 사용할 시간(ms)
 */
const processInFrames = async <T>(items: readonly T[], work: (item: T) => void, budgetMs = 5): Promise<void> => {
  let index = 0;
  let frameStart = performance.now();
  while (index < items.length) {
    while (index < items.length && performance.now() - frameStart < budgetMs) {
      work(items[index]);
      index += 1;
    }
    // 다음 프레임 직전에 재개하며, 같은 프레임의 rAF 콜백이 공유하는 기준 시각을 받는다
    frameStart = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
  }
};
```

- 예산의 기준점을 프레임 기준 시각으로 잡으면 그냥 5ms를 쓰는 것이 아니라 프레임이 시작된 뒤 5ms까지만 쓰게 되어, 같은 프레임에서 먼저 돈 애니메이션 콜백의 몫을 자동으로 뺀다. 5ms는 실제 가용 예산 약 10ms의 절반을 배경 작업에 주고 나머지를 애니메이션과 스타일, 레이아웃, 페인트에 남기는 휴리스틱이다. 애니메이션이 무거우면 더 줄인다.
- 너무 잘게 자르면 양보와 재개 비용이 작업보다 커진다.

### 양보 도구별 재개 시점

| 도구 | 재개 시점 | 주의 |
|---|---|---|
| `setTimeout(fn, 0)` | 새 태스크로 큐 끝에 붙는다 | 5단계를 넘게 중첩되면 HTML 명세상 최소 4ms 지연이 강제된다([[Event-Loop-Microtask#타이머 API 차이\|타이머 API 차이]]) |
| `MessageChannel` | 새 태스크로 곧바로 예약된다 | 타이머 최소 지연이 없어 React 스케줄러가 이 방식으로 양보한다. 직접 우선순위 큐를 만들 때도 쓴다 |
| `scheduler.yield()` | 같은 우선순위의 다른 태스크보다 먼저 재개된다 | 2026-09 MDN 기준 Chrome, Edge 129 이상만 지원하고 Firefox와 Safari는 미지원이라 기능 감지와 대체 경로가 필요하다 |
| `requestAnimationFrame` | 다음 프레임을 그리기 직전 | 화면 갱신 주기에 맞춰야 하는 작업에 맞다 |

`isInputPending()`으로 입력이 있을 때만 양보하는 방식은 거짓 음성과 입력 외 작업을 보지 못하는 한계 때문에 현재 권장되지 않는다.

### 쪼갤 수 없는 작업

수 MB 응답에 대한 `JSON.parse`처럼 하나의 원자적 동기 호출은 중간에 양보할 수 없다. 이런 작업은 아껴 쓰기의 한계이고, 워커로 보내 메인 스레드에서 하지 않는 방향으로 바꾼다. [[Browser-Main-Thread-Offloading#워커로 보내기|워커로 보내기]]

## 모으기

쪼개기는 반응성을 살리지만 처리량은 오히려 줄인다. 유입이 처리량보다 빠르면 밀린 일이 쌓이고 화면에 보이는 데이터는 점점 과거가 되는 [[Backpressure|배압]] 상태가 된다. 처리량을 올리려면 낱개로 처리할 때 횟수만큼 반복되는 고정 비용을 한 번으로 접는다. 너무 긴 태스크는 쪼개고 너무 잦은 태스크는 모아서 적정한 크기로 다듬는 것이 핵심이다.

- 이벤트 모으기: scroll, resize, input처럼 짧은 간격으로 쏟아지는 이벤트는 debounce나 throttle로 실행 횟수를 줄인다. 키 입력마다 약 2,000줄 문서 전체를 파싱해 미리보기 DOM을 다시 만들면 입력이 밀리지만, 입력이 300ms 멈춘 뒤 한 번만 렌더하면 매끄러워진다. 구현은 [[Browser-Main-Thread#debounce와 throttle|debounce와 throttle]]에 있다.
- 프레임 단위로 모으기: 화면은 프레임당 한 번만 그려지므로 갱신 요청이 아무리 많아도 그리기는 프레임당 한 번이면 된다. 데이터는 전부 쌓고 그리기만 합친다. 메시지마다 차트 라이브러리의 `update()`를 부르는 것이 흔한 실수다.

```ts
let scheduled = false;

socket.on('tick', (tick: Tick) => {
  ticks.push(tick); // 데이터는 버리지 않고 쌓는다
  if (scheduled) return; // 이번 프레임의 그리기는 이미 예약됐다
  scheduled = true;
  requestAnimationFrame(() => {
    renderBoard(ticks);
    scheduled = false;
  });
});
```

- DOM 쓰기 모으기: 노드를 하나씩 붙이는 대신 모아서 한 번에 붙이고, 스타일 속성을 하나씩 고치는 대신 클래스 하나를 토글한다. 문자열을 조립해 `innerHTML`에 한 번 할당하는 오래된 기법도 같은 원리지만 신뢰할 수 없는 문자열을 넣으면 XSS 경로가 된다.
- 프레임워크의 배치: 가상 DOM은 여러 번의 상태 변경을 가상 트리에서 비교한 뒤 실제 DOM에는 달라진 부분만 한 번에 반영한다. 한 이벤트 핸들러 안의 상태 갱신 여러 건을 리렌더 한 번으로 합치는 자동 배치, 분석 이벤트를 모아 한 번에 전송하는 것도 같은 원리다.

## 우선순위

도중에 끼어들 수 없는 메인 스레드에서는 실행 순서가 곧 사용자가 느끼는 반응성이다. 방금 누른 버튼에 반응하는 일은 먼저, 화면 밖 통계 계산은 나중에 한다. 작업 큐를 두고 급한 작업을 큐 앞으로 당기는 구조가 기본형이다.

```ts
type Job = (() => void) & { readonly key?: string };

const queue: Job[] = [];
const channel = new MessageChannel();

// 메시지 하나가 태스크 하나다. 작업 하나를 처리하고 다음 작업을 예약한다.
channel.port1.onmessage = () => {
  const job = queue.shift();
  if (!job) return;
  job();
  if (queue.length > 0) channel.port2.postMessage(null);
};

const postJob = (job: Job, urgent = false): void => {
  if (urgent) queue.unshift(job);
  else queue.push(job);
  if (queue.length === 1) channel.port2.postMessage(null);
};

/** 아직 처리되지 않은 작업을 큐 맨 앞으로 당긴다. */
const promote = (key: string): void => {
  const index = queue.findIndex((job) => job.key === key);
  if (index > 0) queue.unshift(...queue.splice(index, 1));
};
```

- 우선순위는 고정값이 아니다. 첨부한 사진 수십 장의 미리보기를 차례로 만드는 일은 한가한 배경 작업이지만, 사용자가 아직 준비되지 않은 사진을 누르는 순간 그 사진의 미리보기만큼은 가장 급한 일이 된다. 한가할 때 미리 해 두다가 필요해지는 순간 급히 처리하는 방식을 idle-until-urgent라 부른다. 처리 총량은 같고 순서만 바뀌었는데 체감이 달라진다.
- React의 `startTransition`과 `useDeferredValue`는 `MessageChannel`로 양보하고 자체 우선순위 큐로 순서를 정하는 스케줄러 위에서 돈다. 표준으로는 `scheduler.postTask()`와 `TaskController`가 있지만 지원 범위가 고르지 않아 폴리필이나 직접 만든 큐를 함께 쓴다.

## 미루기

지금 꼭 하지 않아도 되는 일은 지금 하지 않는다.

- 초기 로딩: 코드 스플리팅으로 현재 화면에 필요한 코드만 먼저 실행하고 나머지는 필요할 때 불러온다.
- 화면 밖 렌더링: 수백 개가 쌓인 피드에서 다른 탭에 다녀오면, DOM을 살려 두었더라도 다시 보이는 순간 보이지 않는 게시물까지 스타일과 레이아웃을 다시 계산하느라 화면이 얼어붙는다. 화면 밖 항목은 높이만 차지하는 자리로 두고, IntersectionObserver가 뷰포트 근처에 들어왔다고 알려줄 때 내용을 채우고 멀어지면 비운다. 화면 밖 항목의 DOM 생성과 유지 비용, 무거운 위젯 초기화도 함께 미뤄진다. 대가는 빠른 스크롤에서 잠깐 비어 보이는 자리다.

```ts
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) fill(entry.target); // 가까워지면 채운다
      else empty(entry.target); // 멀어지면 자리만 남긴다
    }
  },
  { rootMargin: '400px' }, // 스크롤이 닿기 전에 미리 채울 여유
);
for (const item of feed.querySelectorAll('.feed-item')) observer.observe(item);
```

- `content-visibility: auto`는 화면 밖 요소의 렌더링 작업을 CSS 한 줄로 건너뛰게 하며 2024년 9월부터 Baseline이다. 건너뛴 영역에도 크기가 필요하므로 `contain-intrinsic-size`를 함께 준다. 엔진별 구현 차이로 특정 브라우저에서 복귀가 오히려 느려진 사례가 보고되므로, 대상 브라우저에서 측정한 뒤 쓴다.
- 캐러셀, 움직이는 배너, 실시간 차트처럼 계속 도는 작업은 화면 밖에서는 순수한 낭비다. 보일 때만 돌리고 벗어나면 멈춘다.

## 체크포인트

- 양보가 총 시간을 늘리는데도 체감 성능을 높이는 이유, 렌더링이 태스크 사이에서만 도는 구조
- 개수로 자를 때와 시간으로 자를 때, 시간 예산의 기준점을 프레임 시작으로 잡는 이유
- `setTimeout`, `MessageChannel`, `scheduler.yield()`, `requestAnimationFrame`의 재개 시점 차이
- 쪼개기가 처리량을 줄이는 이유와 모으기로 고정 비용을 접는 방법, 프레임당 한 번 그리기
- 우선순위가 사용자 행동에 따라 바뀌는 idle-until-urgent 구조

## 출처

- [브라우저의 메인 스레드는 비싸다 — kciter.so, kciter](https://kciter.so/posts/the-expensive-main-thread/)
- [Optimize long tasks — web.dev](https://web.dev/articles/optimize-long-tasks)
- [MDN, Scheduler: yield() method](https://developer.mozilla.org/en-US/docs/Web/API/Scheduler/yield)
- [MDN, content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility)
- [Idle Until Urgent — philipwalton.com](https://philipwalton.com/articles/idle-until-urgent/)

## 관련 문서

- [[Browser-Main-Thread|브라우저 메인 스레드]]
- [[Browser-Main-Thread-Offloading|메인 스레드 밖으로 보내기]]
- [[Backpressure|배압]]
- [[Event-Loop-Microtask|마이크로태스크와 타이머]]
- [[React-Core-Mental-Model|React 핵심 멘탈 모델]]
