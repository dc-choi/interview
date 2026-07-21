---
tags: [infrastructure, aws, rds, aurora, graviton, arm, cost-optimization, performance]
status: done
category: "Infrastructure - AWS"
aliases: ["Aurora Graviton", "RDS Graviton", "Graviton2 Aurora 전환", "ARM 인스턴스 전환"]
verified_at: 2026-07-21
---

# Aurora Graviton (ARM) 인스턴스 전환

Graviton은 AWS가 설계한 ARM Neoverse 기반 프로세서로, Aurora에서 같은 세대 Intel 인스턴스 대비 비용 효율이 좋다. 다만 성능은 워크로드 특성과 Aurora 엔진 버전에 따라 달라지므로, 합성 벤치마크 수치만 믿고 전환하면 위험하다. 실제 서비스 쿼리 패턴으로 검증한 뒤 옮긴다.

## 세대를 맞춰 비교한다

Graviton과 x86 인스턴스는 출시 세대, 메모리, 네트워크, 엔진 버전과 가격 조건을 맞춰 비교해야 한다. 오래된 사례의 세대 대응을 최신 세대의 고정 규칙으로 재사용하지 않는다.

| 과거 비교 사례 | Aurora 인스턴스 타입 | 당시 비교한 x86 대상 |
|---|---|---|
| Graviton2 | R6g | R5 |
| Graviton3 | R7g | R6i |

- R6g와 R5, R7g와 R6i는 세대별 비교 사례다. 현재 비용 우위는 리전, 엔진, 구매 옵션과 실제 처리량을 AWS Pricing Calculator와 부하 시험으로 다시 계산한다.

## 전환은 벤치마크만 믿으면 위험하다

- Sysbench 같은 도구로 SELECT 100%, INSERT 100% 합성 부하를 돌리면 큰 흐름은 볼 수 있다.
- 하지만 실제 서비스는 수백 개의 다양한 쿼리가 섞여 있다. **전체 QPS가 좋아도 특정 쿼리 몇 개가 느려지면** 사용자 화면 체감은 느려진다.
- 따라서 전환 전에는 합성 부하가 아니라 **실제 서비스 쿼리 패턴(또는 트래픽 리플레이)** 으로 검증한다.

## Aurora MySQL 버전 주의

- Aurora MySQL v2.9 쓰기 성능과 v2.10의 binlog I/O cache 개선은 과거 사례와 기능 도입 이력이다. Aurora MySQL v2는 표준 지원이 끝났으므로 이를 현행 목표 버전으로 권장하면 안 된다.
- 외부 복제로 binlog를 켜야 한다면 현재 지원되는 Aurora MySQL v3 이상 또는 조건에 맞는 Extended Support release에서 호환성, binlog 설정과 성능을 검증한다(상세: [[RDS-Aurora-Architecture#Redo Log 중심 쓰기]], [[RDS-Monitoring-Deep-Metrics]]).

## 체크포인트

- Graviton 비교를 같은 세대(R6g↔R5, R7g↔R6i)로 했는가
- 합성 벤치마크가 아니라 실서비스 쿼리 패턴으로 검증했는가
- 쓰기 워크로드라면 현재 지원되는 Aurora MySQL release와 binlog 요구를 확인했는가
- 전환 후 특정 쿼리의 레이턴시 회귀를 모니터링하는가

## 관련 문서

- [[RDS-Aurora-Architecture|Aurora 아키텍처]] — 공유 스토리지, redo log 쓰기
- [[RDS-Aurora-Selection-Exam|Aurora 선택 기준]] — 인스턴스, 클라우드 비교
- [[RDS-Monitoring-Deep-Metrics|RDS 모니터링 심화]] — 전환 후 회귀 감시 지표
- [[EC2-Cost|EC2 비용]] — Graviton 일반 비용 효율
- [[Resource-Right-Sizing|리소스 라이트사이징]] — 인스턴스 타입 최적화

## 출처

- [RDS Aurora Graviton2 성능 이슈와 RDS 모니터링 — YouTube](https://www.youtube.com/watch?v=c6mak2ioTqs&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=16)
- [Aurora MySQL v2 지원 종료](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.MySQL57.EOL.html)
- [Aurora MySQL binlog I/O cache](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/binlog-optimization.html)
- [Aurora DB instance classes](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.DBInstanceClass.html)
