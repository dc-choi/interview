---
tags: [infrastructure, aws, rds, aurora, autoscaling, connection-pool, cache-warming, operations]
status: done
category: "Infrastructure - AWS"
aliases: ["Aurora Auto Scaling", "Aurora 오토스케일링", "Aurora Flapping", "Aurora Cache Warming"]
---

# Aurora Auto Scaling 운영 — 지표, 정책, 커넥션, 캐시

> 상위 문서: [[RDS-Aurora|RDS / Aurora 관리형 DB]], Endpoint 거동은 [[RDS-Aurora-Endpoints|Aurora Endpoint 운영]]

Aurora Auto Scaling은 부하에 따라 **Reader 인스턴스 수를 자동으로 조절**하는 기능이다. 트래픽이 늘면 Reader를 추가해 읽기를 분산하고, 줄면 Reader를 줄여 비용을 아낀다. 다만 노드를 늘린다고 부하가 즉시 고르게 분산되는 것도, 줄인다고 안전한 것도 아니다 — 지표, 정책, 커넥션 풀, 캐시 워밍업까지 한 묶음으로 설계해야 한다.

## 자동 생성 인스턴스의 거동

- 생성되는 인스턴스는 **Reader 역할**, 기본적으로 Writer와 같은 스펙
- **Failover 우선순위는 낮게** 설정 — Auto Scaling으로 생긴 Reader가 Writer로 승격될 가능성은 낮음
- **Scale-in 대상은 Auto Scaling이 만든 인스턴스뿐** — 사람이 수동으로 만든 Reader는 자동 축소되지 않음

## 지표 함정 — 기본 평균 CPU를 그대로 쓰지 마라

콘솔 기본 지표는 "Reader 평균 CPU"인데, 이 평균에 **모든 Reader가 포함**된다. 배치용 Reader처럼 원래 CPU가 높은 인스턴스가 섞이면 스케일 판단이 왜곡된다(배치 때문에 평균이 높아 불필요하게 Scale-out).

해법은 **Custom Metric**을 만들어 온라인 트래픽을 처리하는 OLTP Reader만 대상으로 CPU를 계산하는 것. Writer와 배치 Reader를 제외하고, 실제 서비스 부하를 받는 Reader만 기준으로 삼는다. (배치 Reader 격리는 [[RDS-Aurora-Endpoints|Custom Endpoint]].)

## Target Tracking vs Step Scaling

**Target Tracking** — 목표치(예: CPU 60%)만 정하면 AWS가 Scale-out/in 알람을 자동 관리. 설정은 쉽지만 **Flapping** 위험이 있다.

Flapping 예: Reader 3대 평균 61%라 1대 추가 → 4대가 되며 평균이 45%로 떨어짐 → "부하 낮아졌으니 줄여도 되나?" → Scale-in → 다시 61% → Scale-out … 추가와 축소가 반복된다. Flapping은 비용보다 **서비스 안정성 저하**가 더 큰 문제(매번 콜드 캐시 노드가 투입/제거됨).

**Step Scaling** — Scale-out/in 조건을 운영자가 명시(예: CPU 70%↑ 1대, 85%↑ 2대 추가). 수동 관리가 많지만 **Scale-in 기준을 충분히 보수적으로** 둬 Flapping을 줄이기 좋다. 단점은 out/in 임계 간격이 너무 넓으면 줄일 수 있는 서버를 오래 유지해 비용이 늘 수 있다는 점.

## Cooldown — 과잉 반응 방지

Cooldown은 한 번 조정한 뒤 다음 조정까지 기다리는 시간이다(예: 600초 = 10분간 추가 조정 제한). 너무 짧으면 작은 부하 변화에도 과민 반응하고, 너무 길면 진짜 트래픽 증가에 늦게 대응한다. 운영에서는 서비스 안정성을 우선해 다소 보수적으로 잡는 경우가 많다. 비용 관점의 스케일 튜닝은 [[Autoscaling-Cost|오토스케일링 비용]] 참고.

## Scale-out 직후 — 부하가 바로 분산되지 않는다

Reader를 추가해도 트래픽이 즉시 그쪽으로 가지 않는다. 애플리케이션 커넥션 풀이 **기존 연결을 계속 사용**하기 때문이다. 새 Reader로 가려면 새 커넥션이 생기고 라우팅 정보가 반영되어야 한다. ProxySQL 같은 프록시 계층은 새 인스턴스를 빠르게 감지해 라우팅을 돕지만, DB 엔진/프록시 기능 지원 여부에 따라 적용 가능성이 달라 사전 검토가 필요하다.

## Scale-in 후 — 삭제된 인스턴스로의 커넥션

Scale-in으로 Reader가 제거돼도 커넥션 풀은 그 사실을 즉시 모른다. 결국 삭제된 인스턴스로 쿼리를 보내고 나서야 오류를 받는다. 이를 줄이려면 **커넥션 생명주기를 짧게** 조정한다 — 예: HikariCP `maxLifetime` 기본 30분을 3분 수준으로 낮추면 오래된 커넥션이 빠르게 교체된다. 일반적으로 DB 세션은 오래 유지하는 게 좋다고 하지만, **Auto Scaling 환경에서는 짧은 커넥션 수명이 더 안정적**일 수 있다. 풀 사이징 일반론은 [[Connection-Pool|Connection Pool 사이징]].

## Cache Warming — 서비스 투입 전 예열

새 Reader는 버퍼 풀이 비어 있어(콜드 캐시) 바로 트래픽을 받으면 디스크 접근이 늘고 응답이 느리다. Cache Warming은 실전 투입 전에 자주 쓰는 데이터를 미리 메모리에 올리는 작업이다. 운영 흐름:

1. 새 Reader가 생성되면 우선 **Custom Endpoint의 제외 멤버**로 넣어 서비스 트래픽을 막는다
2. 생성이 끝나면 자주 쓰는 테이블/인덱스를 대상으로 미리 준비한 SELECT 쿼리를 병렬 실행해 버퍼 풀을 채운다
3. 워밍업이 끝나거나 일정 시간이 지나면 Endpoint에 포함시켜 실제 트래픽을 받게 한다

이는 Scale-out 직후의 느린 응답을 줄인다. (스냅샷 복구 시의 S3 lazy loading 워밍업은 별개 — [[RDS-Operational-Pitfalls|RDS 운영 함정]] 7번.)

## 운영 권장 순서

워크로드를 OLTP/배치로 분리 → Auto Scaling 지표에서 배치 인스턴스 제외(Custom Metric) → Target Tracking으로 충분한지, Step Scaling이 필요한지 검토 → Scale-out/in 시 커넥션 오류와 캐시 미스까지 함께 부하 테스트. 기본 기능을 켜는 것이 아니라 **기본 기능이 실제 서비스에서 만드는 부작용까지 설계**하는 것이 핵심이다.

## 면접 체크포인트

- Auto Scaling이 만든 Reader만 Scale-in 대상이고 Failover 우선순위가 낮은 이유
- 기본 평균 CPU 지표의 왜곡과 Custom Metric으로 배치 Reader를 제외하는 이유
- Flapping이 생기는 메커니즘(평균 CPU 급락)과 Target Tracking vs Step Scaling 트레이드오프
- Cooldown이 너무 짧을 때/길 때의 부작용
- Scale-out 직후 부하가 바로 분산되지 않는 이유(커넥션 풀)와 Scale-in 후 maxLifetime 단축
- 콜드 캐시 문제와 Cache Warming(Endpoint 제외 → SELECT 예열 → 편입) 절차

## 출처
- [Aurora Endpoint와 Auto Scaling 운영 (YouTube)](https://www.youtube.com/watch?v=qzjx24vJ350&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=2)

## 관련 문서
- [[RDS-Aurora-Endpoints|Aurora Endpoint 운영]] — Custom Endpoint, Reader 함정, Failover
- [[RDS-Aurora-Architecture|Aurora 아키텍처]] — 공유 스토리지, Auto Scaling 기초
- [[RDS-Operational-Pitfalls|RDS 운영 함정]] — 커넥션 고갈, 스냅샷 워밍업
- [[Connection-Pool|Connection Pool 사이징]] — 풀 크기, maxLifetime
- [[Autoscaling-Cost|오토스케일링 비용]] — 스케일 정책의 비용 측면
- [[Database-Operations-Automation|DB 운영 자동화]] — 스케일/엔드포인트 자동화
- [[Feedback-Delay|피드백 지연]] — Flapping/Cooldown의 일반 원리(지연 무시 → 과잉 보정)
