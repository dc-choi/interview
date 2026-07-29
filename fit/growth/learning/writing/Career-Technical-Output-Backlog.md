---
tags: [growth, learning, writing, blog, output]
status: todo
category: "Growth - 학습"
aliases: ["커리어 기술 아웃풋 백로그", "Career Technical Output Backlog"]
---

# 커리어 기술 아웃풋 백로그

말하기, 쓰기와 구현으로 설명 가능한 지식을 만들기 위한 원고 대기열이다. 이 문서는 새 학습 로드맵이 아니다. 전체 실행 순서는 [[Current-Goals-and-Roadmap|통합 로드맵]]을, Node.js 학습의 통과 조건은 [[Node-Core-Output-Roadmap|Node.js 코어 아웃풋 로드맵]]을 따른다.

## 운영 규칙

- 한 번에 초안 하나만 활성화한다.
- 현재 회사 업무나 선택한 개인 정규 트랙과 연결된 글만 꺼낸다. 나머지는 기한 없는 백로그로 둔다.
- 공식 문서, API reference와 현재 소스를 먼저 확인하고 비공식 글은 질문과 구성의 보조 자료로만 사용한다.
- 요약문만 발행하지 않는다. 재현 코드, 측정, 도식, 소스 추적이나 실제 의사결정 중 하나를 포함한다.
- 체크박스는 글이나 구현 기록의 발행 상태다. 읽었거나 vault 문서가 있다는 사실만으로 완료하지 않는다.

## A. Node.js 코어 트랙

[[Node-Core-Output-Roadmap|Node.js 코어 트랙]]을 선택한 기간에 위에서부터 한 편씩 꺼낸다. 로드맵의 1차 성공선은 아키텍처 글 한 편과 비동기 처리 글 한 편이며, 아래 전체 시리즈 완주를 요구하지 않는다.

| 순서 | 아웃풋 | 필요한 증거 | 상태 |
|---|---|---|---|
| A1 | JS 엔진 동작 시리즈 | 실행 컨텍스트, V8 동작이나 최적화를 보여 주는 소스와 재현 실험 | [ ] |
| A2 | Node.js 아키텍처 시리즈 | JavaScript, V8, Node.js bindings, libuv와 OS 경계 도식 및 실행 실험 | [ ] |
| A3 | 병렬 서브루틴에서 스레드와 코루틴으로 개념 확장 | 동시성, 병렬성과 실행 단위의 차이를 보여 주는 예제 | [ ] |
| A4 | callback의 필요성, callback hell과 scope 문제 | 동일 사례의 중첩과 오류 전파를 재현한 코드 | [ ] |
| A5 | Promise와 `then` 체이닝, 중첩되는 Promise hell과 scope 문제 | A4와 같은 사례의 변환 및 실패 경로 비교 | [ ] |
| A6 | `async`, `await` 구조, Promise 관계와 병렬 처리 | 순차 실행과 동시 시작의 실행 순서 및 시간 비교 | [ ] |
| A7 | `Promise.all()`과 `Promise.allSettled()` | 실패와 부분 성공에서 반환값 및 후속 처리 비교 | [ ] |
| A8 | Node.js의 race condition 재현과 해결 | 실패 재현, 동시성 제어, 회귀 테스트와 한계 | [ ] |

JS 엔진과 Node.js 아키텍처의 세부 글 제목은 실험을 끝낸 뒤 정한다. 먼저 시리즈 편수를 확정해 새로운 진도 압박을 만들지 않는다.

## B. 회사 기술에서 근거가 생기면 쓰는 글

현재 역할 기술의 1순위는 검색이고 GraphQL, Redis와 Git은 자주 쓰이는 공통 기반이다. 실제 업무나 공개 가능한 재현 실험에서 구체적인 문제, 선택과 결과가 생긴 글 하나만 활성화한다.

| 아웃풋 | 활성화 조건 | 상태 |
|---|---|---|
| 검색 | 현재 검색 Task의 문제를 공개 데이터로 재현하고 품질, 지연 시간 또는 운영 판단을 검증할 수 있음 | [ ] |
| GraphQL | 실제 schema, resolver, federation 또는 운영 결정 하나를 공개 가능한 예제로 재현할 수 있음 | [ ] |
| Redis | 자료구조, 캐시, 동시성 또는 운영 결정 하나를 공개 가능한 예제로 재현할 수 있음 | [ ] |
| Git | divergence, conflict, history rewrite 또는 복구 판단 하나를 안전한 로컬 저장소에서 재현하고 전후 graph와 보존 절차를 설명할 수 있음 | [ ] |
| NestJS에서 데코레이터가 동작하는 방법 | metadata, reflection과 NestJS request pipeline을 실행 코드로 추적 | [ ] |
| 모니터링과 로깅 시스템 구축 후기 | 구축 전 문제, 구조, 운영 결과와 남은 한계를 공개 가능한 범위로 정리 | [ ] |
| gRPC | REST와의 선택 근거, 계약과 운영 결과가 생김 | [ ] |
| Kafka | partition, consumer, 순서나 전달 보장에 관한 검증 결과가 생김 | [ ] |
| k6와 wrk2 | 같은 부하 시나리오의 실행 조건, 측정값과 해석을 남길 수 있음 | [ ] |

기술 소개만 쓸 수 있는 상태라면 발행하지 않고 기존 vault 문서를 보강한다. 업무 내용을 사용할 때는 회사 정보, 내부 수치와 비공개 구조를 제거한다.

## C. 장기 보관, Java 백엔드 내부 구현

아래 구현은 Node.js 코어 트랙이 아니라 CS/OOP/아키텍처 트랙의 선택 실습이다. 현재는 시작하지 않으며 해당 트랙에서 필요한 개념 하나를 검증할 때 저장소 하나만 고른다.

- [ ] [Tomcat 형태의 WAS 직접 구현](https://github.com/wbluke/jwp-was)
- [ ] [Web MVC 직접 구현](https://github.com/wbluke/jwp-mvc)
- [ ] [JDBC 접근 계층 직접 구현](https://github.com/wbluke/jwp-jdbc)
- [ ] [DI 컨테이너 직접 구현](https://github.com/wbluke/jwp-di)
- [ ] [AOP와 트랜잭션 처리 직접 구현](https://github.com/wbluke/jwp-aop)

완료는 저장소를 따라 친 사실이 아니라 직접 빌드와 테스트를 실행하고, 프레임워크가 감춘 책임과 설계 선택을 설명하는 구현 기록을 남긴 상태다. 다섯 개 완주를 하나의 목표로 열지 않는다.

## Node.js 아키텍처 참고 자료

### 정본

- [Introduction to Node.js - Node.js Learn](https://nodejs.org/en/learn/getting-started/introduction-to-nodejs)

나머지 공식 Learn 문서, API reference와 소스 링크는 [[Node-Core-Output-Roadmap#공식 자료|Node.js 코어 로드맵의 공식 자료]]에서 관리한다.

### 보조 자료

- [Node.js Under The Hood Series - DEV Community](https://dev.to/_staticvoid/series/2008)
- [Deep dive into Node.js Architecture - DEV Community](https://dev.to/altamashali/deep-dive-into-nodejs-architecture-5190)
- [How Node.js Works Under the Hood: A Deep Dive - Medium](https://medium.com/@AbbasPlusPlus/how-node-js-works-under-the-hood-a-deep-dive-77da13adfa52)
- [Deep Dive into the Event Loop: Understanding Node.js Internals - Medium](https://smit90.medium.com/deep-dive-into-the-event-loop-understanding-node-js-internals-f9263ef91233)
- [How Node.js Works Under the Hood and Its Advantages - Medium](https://medium.com/@pushpendrapal_/how-node-js-works-under-the-hood-and-its-advantages-57d77f34bd87)
- [Deep Dive into Node.js with James Snell - This Dot Labs](https://www.thisdot.co/blog/deep-dive-into-node-js-with-james-snell)
- [비동기 처리를 조금 더 효율적으로 해보자](https://0xffffffff.tistory.com/95)
- [동시성과 이벤트 처리 문제 0, GIL과 Proactor/Reactor](https://0xffffffff.tistory.com/98)
- [동시성과 이벤트 처리 문제 1, Node.js 구조와 Event Loop](https://0xffffffff.tistory.com/99)

보조 자료의 실행 순서와 내부 구조 설명은 현재 Node.js 버전의 공식 문서와 소스로 다시 검증한다.

## 관련 문서

- [[V8|V8 지식 지도]]
- [[Async-Programming|Node.js 비동기 프로그래밍]]
- [[Async-Internals|Node.js 비동기 내부 구조]]
- [[Race-Condition-Patterns|Race condition 패턴]]
- [[NestJS-Custom-Decorator|NestJS Custom Decorator]]
- [[Application-Performance-Monitoring|APM]]
- [[Centralized-Logging-with-OpenSearch|중앙 집중식 로깅]]
- [[GraphQL|GraphQL 지식 지도]]
- [[gRPC|gRPC]]
- [[Redis-Architecture|Redis 아키텍처]]
- [[git|Git 실무 학습 순서]]
- [[MQ-Kafka|Kafka]]
- [[Load-Test-K6|k6 부하 테스트]]
