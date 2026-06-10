---
tags: [database, concurrency, race-condition, patterns]
status: done
category: "Data & Storage - RDB"
aliases: ["Race Condition 도구 선택", "동시성 도구 플로차트"]
---

# Race Condition 도구 선택과 체크포인트

층위 구분 없이 동시성 문제를 만났을 때 도구를 고르는 기준. 핵심 원칙: **락이 마지막 수단. 먼저 원자 연산, 낙관적 제어, 이벤트 큐를 검토**.

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
- **DB 락 TTL 없음** → 커넥션 풀 고갈 위험
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
