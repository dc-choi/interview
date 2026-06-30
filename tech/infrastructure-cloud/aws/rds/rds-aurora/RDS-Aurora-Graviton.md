---
tags: [infrastructure, aws, rds, aurora, graviton, arm, cost-optimization, performance]
status: done
category: "Infrastructure - AWS"
aliases: ["Aurora Graviton", "RDS Graviton", "Graviton2 Aurora 전환", "ARM 인스턴스 전환"]
---

# Aurora Graviton (ARM) 인스턴스 전환

Graviton은 AWS가 설계한 ARM Neoverse 기반 프로세서로, Aurora에서 같은 세대 Intel 인스턴스 대비 비용 효율이 좋다. 다만 성능은 워크로드 특성과 Aurora 엔진 버전에 따라 달라지므로, 합성 벤치마크 수치만 믿고 전환하면 위험하다. 실제 서비스 쿼리 패턴으로 검증한 뒤 옮긴다.

## 세대를 맞춰 비교한다

Graviton과 Intel은 **같은 세대끼리** 비교해야 의미가 있다. 흔한 오류는 Graviton2를 최신 Intel과 직접 견주는 것이다.

| 프로세서 | Aurora 인스턴스 타입 | 같은 세대 Intel 비교 대상 |
|---|---|---|
| Graviton2 | R6g | R5 |
| Graviton3 | R7g | R6i |

- 같은 세대 기준으로 R6g(Graviton2)는 R5(Intel) 대비 약 **90% 수준의 비용**이다. 성능이 90% 이상 나오면 가성비가 우위라고 볼 수 있다.
- Graviton2(R6g)를 최신 Intel **R6i와 직접 비교하면 안 된다.** R6i의 비교 대상은 Graviton3 계열인 **R7g**다.

## 전환은 벤치마크만 믿으면 위험하다

- Sysbench 같은 도구로 SELECT 100%, INSERT 100% 합성 부하를 돌리면 큰 흐름은 볼 수 있다.
- 하지만 실제 서비스는 수백 개의 다양한 쿼리가 섞여 있다. **전체 QPS가 좋아도 특정 쿼리 몇 개가 느려지면** 사용자 화면 체감은 느려진다.
- 따라서 전환 전에는 합성 부하가 아니라 **실제 서비스 쿼리 패턴(또는 트래픽 리플레이)** 으로 검증한다.

## Aurora MySQL 버전 주의

- **Aurora MySQL 2.9**에서는 쓰기 성능 이슈가 관찰될 수 있다. 쓰기 워크로드가 중요하다면 **2.10 이상** 사용이 권장된다.
- 외부 복제로 binlog를 켜야 하는 구성도 2.10+의 binlog I/O cache 개선 효과를 기대할 수 있다(상세: [[RDS-Aurora-Architecture#Redo Log 중심 쓰기]], [[RDS-Monitoring-Deep-Metrics]]).

## 체크포인트

- Graviton 비교를 같은 세대(R6g↔R5, R7g↔R6i)로 했는가
- 합성 벤치마크가 아니라 실서비스 쿼리 패턴으로 검증했는가
- 쓰기 워크로드라면 Aurora MySQL 버전(2.10+)을 확인했는가
- 전환 후 특정 쿼리의 레이턴시 회귀를 모니터링하는가

## 관련 문서

- [[RDS-Aurora-Architecture|Aurora 아키텍처]] — 공유 스토리지, redo log 쓰기
- [[RDS-Aurora-Selection-Exam|Aurora 선택 기준]] — 인스턴스, 클라우드 비교
- [[RDS-Monitoring-Deep-Metrics|RDS 모니터링 심화]] — 전환 후 회귀 감시 지표
- [[EC2-Cost|EC2 비용]] — Graviton 일반 비용 효율
- [[Resource-Right-Sizing|리소스 라이트사이징]] — 인스턴스 타입 최적화

## 출처

- [RDS Aurora Graviton2 성능 이슈와 RDS 모니터링 — YouTube](https://www.youtube.com/watch?v=c6mak2ioTqs&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=16)
