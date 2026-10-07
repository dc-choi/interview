---
tags: [aws, memorydb, multi-region, crdt, consistency]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["MemoryDB Multi-Region", "MemoryDB 멀티 리전 충돌 해결"]
---

# MemoryDB Multi-Region의 복제와 충돌 해결

MemoryDB Multi-Region은 여러 리전의 클러스터에서 읽기와 쓰기를 받는 active-active 구성이다. 리전 간 복제는 비동기이므로 로컬 쓰기 성공과 다른 리전에서 같은 값을 읽는 시점은 구분한다.

## 리전 내 내구성과 리전 간 복제

각 리전은 쓰기를 여러 AZ에 걸친 트랜잭션 로그에 내구성 있게 저장한다. 다른 리전으로의 전파는 별도 과정이다. 리전이 고립됐다가 다시 연결되면 미전파 쓰기와 다른 리전의 변경을 전달하고 충돌을 조정한다.

따라서 리전 내 로그 기록 성공을 리전 간 동기 복제나 전역 RPO 0의 증거로 사용하지 않는다. 장애 시 애플리케이션이 정상 리전의 엔드포인트로 연결되도록 트래픽 전환도 설계해야 한다. 데이터베이스의 active-active 구성만으로 전체 서비스 복구 절차가 사라지지 않는다.

## 충돌 해결 단위

MemoryDB는 CRDT와 Last Writer Wins(LWW) 규칙으로 동시 변경을 수렴시킨다. 모든 자료구조가 키 전체를 같은 방식으로 덮어쓰는 것은 아니다.

| 자료형 또는 연산 | 리전 간 충돌에서 확인할 점 |
|---|---|
| String | 키 단위 LWW |
| Hash, Set, Sorted Set | 필드 또는 원소 단위 LWW. 다른 원소의 동시 추가는 함께 남을 수 있음 |
| 카운터 증가 | 전체 값 복제와 LWW를 사용하므로 여러 리전의 증가량이 합산된다고 가정하면 안 됨 |

예를 들어 두 리전이 같은 Hash의 서로 다른 필드를 갱신하면 두 변경이 남을 수 있다. 반면 여러 리전이 같은 카운터를 동시에 증가시키는 작업은 전역 합산 카운터의 계약으로 사용할 수 없다. 한 리전에서 명령이 원자적이라는 사실과 리전 간 동시 변경의 의미는 별개다.

## 적용 판단

다음은 복제 규칙에서 도출한 설계 체크포인트다.

- 덮어쓰기와 최종 일관성을 허용하는지 데이터 종류별로 정한다.
- 잔액, 재고 차감이나 한 번만 성공해야 하는 예약에는 충돌 수렴만으로 업무 불변조건이 유지된다고 가정하지 않는다.
- 같은 키의 동시 쓰기, 서로 다른 Hash 필드 갱신, 동시 증가와 리전 재연결을 구분해 시험한다.
- 읽기 지연, 복제 지연과 애플리케이션 전환 시간을 각각 측정한다.

## 출처

- [Amazon MemoryDB, MemoryDB Multi-Region](https://docs.aws.amazon.com/memorydb/latest/devguide/multi-region.html)
- [Amazon MemoryDB, How it works](https://docs.aws.amazon.com/memorydb/latest/devguide/multi-region.how.html)

## 관련 문서

- [[ElastiCache|관리형 캐시의 구성과 사용 사례]]
- [[RDS-Aurora|Aurora와 글로벌 데이터베이스]]
- [[DR-Strategy|RPO, RTO와 재해 복구]]
