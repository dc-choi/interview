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

## 반응성을 지키는 패턴

1. 분할과 양보(chunking, yielding): 큰 루프를 조각내고 사이에 제어권을 넘겨 입력과 렌더가 끼어들게 한다. `setTimeout(0)`, `MessageChannel`, 또는 `scheduler.yield`, `scheduler.postTask` 같은 스케줄링 API를 쓰되 지원 범위는 대상 브라우저에서 확인한다.
2. 배치(batching): 자주 발생하는 입력, 스크롤, resize는 debounce나 throttle로 묶고, DOM 변경과 상태 업데이트를 모아 한 번에 적용한다.
3. 우선순위(prioritizing): 사용자와 직접 관련된 작업을 배경 작업보다 먼저 처리하고, 현재 상호작용에 맞춰 작업 큐를 재정렬한다.
4. 지연(deferring): 당장 필요 없는 실행, 렌더, 초기화를 미룬다. 코드 스플리팅과 IntersectionObserver로 뷰포트에 들어올 때만 렌더한다.
5. 컴포지터로 넘기기(compositor offloading): 애니메이션을 layout이나 paint를 유발하는 top, left, width 대신 transform, opacity로 표현하면 별도 컴포지터 스레드에서 처리돼 메인 스레드를 막지 않는다.
6. Web Workers로 이동: 데이터 파싱, 이미지 처리 같은 CPU 무거운 계산을 별도 워커 스레드로 옮겨 메인 스레드를 비운다. 워커는 DOM에 접근하지 못하고 메시지 전달 비용이 있어, 잦은 소량 작업보다 크고 순수한 계산 덩어리에 유리하다.
7. 불필요한 일 제거: 오래된 데이터를 폐기하고 중간 업데이트를 병합하며 계산을 메모이제이션해 총 작업량 자체를 줄인다.

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

## 관련 문서

- [[In-Browser-Build|브라우저 내 빌드 런타임]]
- [[Browser-CSS-Animation-and-Compatibility|브라우저 CSS 애니메이션과 호환성]]
- [[Thread-vs-Event-Loop|스레드와 이벤트 루프]]
- [[Event-Loop|이벤트 루프]]
