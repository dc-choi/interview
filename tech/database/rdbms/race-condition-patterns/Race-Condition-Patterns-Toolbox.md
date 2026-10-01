---
tags: [database, concurrency, race-condition, patterns]
status: done
category: "Data & Storage - RDB"
aliases: ["Race Condition 도구 선택", "동시성 도구 플로차트"]
---

# Race Condition 도구 선택과 체크포인트

층위 구분 없이 동시성 문제를 만났을 때 도구를 고르는 기준. 먼저 원자적 조건부 변경과 제약을 검토한다. 읽은 상태로 계산해야 하면 충돌률, 수정 확률과 잠금 보유 시간을 기준으로 낙관적/비관적 제어를 비교한다.

## 도구 선택 플로차트

```
동시성 문제 발견
  ↓
이 작업이 DB UPDATE 한 줄로 원자화 가능?
  ├─ YES → UPDATE ... WHERE condition 활용 (끝)
  └─ NO
      ↓
    한 프로세스 안의 async?
      ├─ YES → async-mutex 또는 큐
      └─ NO (여러 서버)
          ↓
        같은 DB에서 처리?
          ├─ YES → DB 락 (Pessimistic, Optimistic, Unique Index)
          └─ NO (여러 리소스)
              ↓
            분산 락 + Saga + 상태 키 조합
```

## 흔한 실수

- **모든 문제에 분산 락** → 불필요한 성능 저하, 복잡도
- **낙관적 락만 쓰고 경쟁 심한 리소스** → 재시도 폭증
- **긴 transaction과 잠금 대기** → 커넥션 풀 고갈 위험. transaction 종료, lock wait timeout과 실패 후 rollback 경계를 관리한다
- **Redlock TTL 만료 감지 안 함** → 이중 작업 수행
- **단일 스레드 Node.js니까 race 없다고 착각** → 이벤트 루프 interleaving으로 충분히 발생

## 면접 체크포인트

- 3가지 층위(프로세스, DB, 분산)의 구분과 적합한 도구
- 원자적 DB 연산이 왜 첫 번째 선택지인가
- Pessimistic vs Optimistic Lock 트레이드오프
- Redlock의 한계 (TTL, fencing token)
- Transactional Outbox가 해결하는 race condition
- async-mutex `runExclusive` vs `acquire/release` 선택 기준
- Semaphore(N)가 Mutex와 다른 쓰임새 (동시 허용 개수 제어)

## 관련 문서
- [[Race-Condition-Patterns|Race Condition 패턴 (인덱스)]]
- [[Race-Condition-Patterns-Process|층위 1: 프로세스 내부]]
- [[Race-Condition-Patterns-DB-Distributed|층위 2와 3: DB 락, 분산 락]]
- [[Race-Condition-Patterns-OS-Sync|OS 수준 동기화 기초]]

## 중복 요청과 자원 경쟁

멱등성은 같은 요청의 재실행을 한 효과로 만들고 동시성 제어는 서로 다른 요청이 같은 자원을 변경할 때 불변식을 지킨다. 요청 key의 UNIQUE만으로 재고 초과가 막히지는 않고 재고 lock만으로 같은 결제 요청의 중복 효과가 막히지도 않는다. 두 조건을 각각 설계한다.

경쟁 재현은 공통 시작 barrier 뒤에 여러 요청을 실행하고 종료를 기다린 다음 성공 건수와 잔여 재고 등 최종 불변식을 확인한다. 임의 sleep과 예외가 없었다는 결과만으로 경쟁 안전성을 증명하지 않는다.

## 출처
- [인프런, 2PC 란 무엇인가?](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=324544)
- [인프런, Lock 을 활용하여 주문로직이 1번만 수행되도록 변경하기](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=323878)
- [인프런, Orchestration - 실패상황 테스트](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=337627)
- [인프런, Orchestration - 현재구조의 문제점과 해결방법](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=337628)
- [인프런, TCC 구현하기(2) - 동시성문제 해결하기](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=325074)
- [인프런, 동일한 주문인지 알 수 있도록 주문로직 수정하기](https://www.inflearn.com/courses/lecture?courseId=337778&unitId=323829)
