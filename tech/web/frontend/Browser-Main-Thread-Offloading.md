---
tags: [web, frontend, performance, browser, compositor, web-worker]
status: done
verified_at: 2026-09-30
category: "웹&네트워크(Web&Network)"
aliases: ["Browser Main Thread Offloading", "메인 스레드 밖으로 보내기", "FLIP", "Layout Thrashing", "레이아웃 스래싱"]
---

# 메인 스레드 밖으로 보내기와 일 없애기

[[Browser-Main-Thread|브라우저 메인 스레드]]를 아껴 쓰는 [[Browser-Main-Thread-Scheduling|스케줄링]]으로 해결되지 않는 일은 메인 스레드에서 하지 않거나 아예 하지 않는다. 다만 메인 스레드 밖의 스레드를 마음대로 쓸 수는 없어서, 밖에서도 할 수 있는 형태의 일만 골라 보낸다.

## 브라우저의 스레드 분담

| 스레드 | 하는 일 | 개발자가 쓸 수 있는 방법 |
|---|---|---|
| 메인 스레드 | JavaScript 실행, DOM, 스타일 계산, 레이아웃, 페인트 명령 생성, 이벤트 처리 | 직접 사용 |
| 컴포지터 스레드 | 이미 그려진 레이어를 합성하고, 스크롤과 일부 애니메이션을 처리 | 직접 명령할 수 없다. 합성만으로 표현되는 속성을 골라 간접적으로 맡긴다 |
| 래스터 스레드 | 페인트 명령을 픽셀로 변환 | 직접 명령할 수 없다 |
| 워커 스레드 | 명시적으로 만든 별도 JavaScript 실행 공간 | 직접 만들지만 DOM에 접근할 수 없다 |

메인 스레드를 막아도 CSS `transform` 애니메이션이 계속 도는 이유가 이 분담이다.

## 컴포지터에 올리기

`transform`과 `opacity`는 요소의 기하를 바꾸지 않고 이미 그려진 레이어를 옮기거나 투명도만 바꾸므로, 요소가 자체 레이어로 합성되면 레이아웃과 페인트 없이 컴포지터에서 처리된다. 반면 `top`, `left`, `width`, `height`로 움직이면 매 프레임 레이아웃이 다시 돌아 메인 스레드가 바쁠 때 함께 버벅인다. 위치 이동은 `transform: translate`, 크기 변화는 `transform: scale`로 표현한다. 속성별 비용은 [[Browser-Main-Thread#렌더링 차단과 변경 비용|렌더링 차단과 변경 비용]]에 있다.

### FLIP

목록에서 항목이 삭제되거나 순위가 바뀌어 다른 항목이 실제로 자리를 옮기는 애니메이션은 장식이 아니라 레이아웃 변경이다. `top`을 애니메이션하면 매 프레임이 레이아웃이 된다. FLIP은 레이아웃 변경을 한 번만 일으키고 움직이는 과정은 `transform`에 맡긴다.

1. First: 변경 전 위치를 잰다.
2. Last: 레이아웃을 실제로 바꾸고 새 위치를 잰다. 레이아웃은 여기서 한 번 일어난다.
3. Invert: 새 위치의 요소에 `transform`을 걸어 이전 위치에 있는 것처럼 되돌린다.
4. Play: 그 `transform`을 풀어내는 애니메이션을 돌린다. 이 구간은 컴포지터의 몫이다.

```ts
/**
 * 요소를 목록 맨 앞으로 옮기고 이전 위치에서 미끄러져 오는 것처럼 보이게 한다.
 * @param list 요소를 담은 목록
 * @param element 옮길 요소
 */
const moveToFrontWithFlip = (list: HTMLElement, element: HTMLElement): void => {
  const first = element.getBoundingClientRect(); // First
  list.prepend(element); // 레이아웃 변경은 한 번
  const last = element.getBoundingClientRect(); // Last
  const dx = first.left - last.left;
  const dy = first.top - last.top;
  element.animate(
    [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], // Invert, Play
    { duration: 300, easing: 'ease-in-out' },
  );
};
```

사용자에게는 옛 자리에서 새 자리로 이동하는 것처럼 보이지만, 요소는 이미 새 자리에 있고 `transform`으로 잠시 되돌아갔다 풀려나는 것이다. 애니메이션 동안 매 프레임 일어나는 일은 `transform` 보간뿐이라 메인 스레드 부하와 무관하게 부드럽다. 목록 재정렬 애니메이션의 일반적인 구현 방식이며, Vue `TransitionGroup`과 Framer Motion의 layout 애니메이션도 이 원리를 쓴다.

### will-change

`will-change: transform`은 곧 변할 요소를 미리 레이어로 준비하라는 힌트라 애니메이션 시작을 매끄럽게 만들 수 있다. 그러나 이미 있는 성능 문제에 대한 마지막 수단이다. 많은 요소에 걸면 메모리를 과하게 쓰고 렌더링이 복잡해져 오히려 느려진다. 스타일시트에 상시로 두기보다 변경 직전에 스크립트로 켜고 끝나면 `auto`로 되돌린다.

### 레이아웃 스래싱

스타일을 바꾼 직후 `offsetWidth`, `getBoundingClientRect()` 같은 레이아웃 값을 읽으면, 브라우저는 최신 값을 주기 위해 그 자리에서 레이아웃을 계산한다. 이를 강제 동기 레이아웃이라 하고, 반복문 안에서 읽기와 쓰기가 번갈아 일어나 이것이 연달아 반복되는 상황을 레이아웃 스래싱이라 한다. 읽기를 먼저 모두 끝내고(이전 프레임의 레이아웃 값을 그대로 쓸 수 있다) 쓰기를 모아서 한다.

```ts
// 나쁜 예: 반복마다 쓰기 뒤 읽기가 레이아웃을 강제한다
for (const element of elements) {
  element.style.width = `${element.offsetWidth + 10}px`;
}

// 좋은 예: 읽기를 모은 뒤 쓰기를 모은다
const widths = elements.map((element) => element.offsetWidth);
for (const [index, element] of elements.entries()) {
  element.style.width = `${widths[index] + 10}px`;
}
```

## 워커로 보내기

대용량 파싱, 이미지 처리, 복잡한 계산처럼 DOM과 무관한 순수 계산은 Web Worker로 보낸다. 워커는 메인 스레드와 분리된 스레드에서 JavaScript를 실행하므로 그동안 메인 스레드는 입력 반응과 화면 갱신에만 쓰인다. 사진의 폭을 줄이며 중요한 피사체를 지키는 seam carving처럼 수억 번의 연산이 드는 이미지 처리도, 메인 스레드에서 돌리면 계산이 끝날 때까지 화면 전체가 얼지만 워커에서 돌리면 화면이 반응하는 동안 중간 결과를 계속 보여줄 수 있다.

- 워커는 DOM에 접근할 수 없어 계산만 하고 결과를 메인 스레드로 돌려보낸다.
- `postMessage`는 기본적으로 데이터를 구조화 복제로 복사하므로 크기에 비례한 비용이 든다. 짧고 가벼운 작업을 보내면 통신 비용이 계산 비용보다 커져 손해다. 통신 비용을 상쇄할 만큼 무겁고 DOM과 무관한 작업이 대상이다.
- `ArrayBuffer` 같은 transferable 객체는 전송 목록에 넣으면 복사 대신 소유권이 옮겨진다. 보낸 쪽 버퍼는 분리(detached)되어 `byteLength`가 0이 되고 이후 읽기와 쓰기는 예외를 던진다. typed array 자체는 transferable이 아니고 그 밑의 `ArrayBuffer`를 넘긴다.

```ts
// 픽셀 버퍼를 복사 없이 넘긴다. 넘긴 뒤에는 이쪽에서 쓸 수 없다.
worker.postMessage({ buffer: pixels.buffer, width, height }, [pixels.buffer]);
```

바이너리 데이터와 워커의 언어 수준 동작은 [[JavaScript-Binary-Data-and-Workers]], Node.js의 대응 개념은 [[Worker-Threads-Core]]에 있다.

## 일 자체를 없애기

유입이 최대 처리량을 넘으면 아무리 모아도 밀린 일은 쌓이고, 브라우저가 서버에 천천히 보내라고 요청할 수단도 마땅치 않다. 받은 일을 전부 하겠다는 전제를 버린다.

- **버리기**: 실시간 로그처럼 흘러가면 그만인 데이터는 처리가 밀리기 시작하면 오래된 것부터 버린다. 최신을 따라가는 것이 전부를 보여주는 것보다 중요하다.
- **합치기**: 순위나 시세처럼 최신값만 의미 있는 데이터는 밀린 업데이트를 병합해 마지막 값만 반영한다. 유입이 빨라져도 일의 양은 화면이 소화할 수 있는 만큼으로 고정된다.
- **생략하기**: 같은 입력에 같은 결과가 나오는 계산은 결과를 기억해 두고 재사용하는 메모이제이션으로 두 번째부터 생략한다.

디바운스는 입력 중의 실행을, 화면 밖 렌더링 지연은 보이지 않는 항목의 렌더링을 생략한 것이므로 이 역시 일을 없애는 방법이다. 작업을 더 빠르게 만들기 전에 그 일이 지금, 여기서, 꼭 일어나야 하는지를 먼저 묻는다.

## 체크포인트

- 메인 스레드를 막아도 `transform` 애니메이션이 도는 이유와 `left` 애니메이션과의 차이
- FLIP이 레이아웃 변경을 한 번으로 줄이는 방법
- `will-change`를 상시로 두면 안 되는 이유
- 강제 동기 레이아웃과 레이아웃 스래싱, 읽기와 쓰기를 모으는 해법
- 워커가 유리한 작업과 손해인 작업, 구조화 복제와 transferable 전송의 차이
- 배압 상황에서 버리기, 합치기, 생략하기를 고르는 기준

## 출처

- [브라우저의 메인 스레드는 비싸다 — kciter.so, kciter](https://kciter.so/posts/the-expensive-main-thread/)
- [Avoid large, complex layouts and layout thrashing — web.dev](https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing)
- [MDN, Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
- [MDN, will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change)
- [FLIP Your Animations — aerotwist.com, Paul Lewis](https://aerotwist.com/blog/flip-your-animations/)

## 관련 문서

- [[Browser-Main-Thread|브라우저 메인 스레드]]
- [[Browser-Main-Thread-Scheduling|메인 스레드 스케줄링]]
- [[Browser-CSS-Animation-and-Compatibility|브라우저 CSS 애니메이션과 호환성]]
- [[JavaScript-Binary-Data-and-Workers|JavaScript 바이너리 데이터와 워커]]
- [[Backpressure|배압]]
