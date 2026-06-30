---
tags: [aws, rds, aurora, monitoring, observability, prometheus, commitlatency]
status: done
category: "Infrastructure - AWS"
aliases: ["RDS Monitoring Deep Metrics", "RDS 모니터링 심화", "Aurora 장애 지표", "CommitLatency History List Length"]
---

# RDS / Aurora 모니터링 심화

기본 3계층(CloudWatch, Performance Insights, 로그)과 Slow Query 알람은 [[RDS-Monitoring]]에서 다룬다. 여기서는 Aurora 장애를 깊게 파고드는 지표, 인스턴스 이벤트 알림 파이프라인, CloudWatch로 부족한 부분을 메우는 커스텀 관측을 다룬다. 모니터링의 목적은 무슨 일이 일어났는지(로그), 얼마나 심각한지(알림), 어디부터 봐야 하는지(지표, 대시보드)에 답하는 것이다.

## 알림 심각도: Warning과 Critical 분리

모든 알람이 같은 심각도를 가지면 운영자는 금방 피로해지고 알람을 무시하게 된다([[Alert-Fatigue]]).

- **Warning**: DB 엔지니어가 먼저 확인할 수준
- **Critical**: 서비스 장애 가능성이 높아 개발팀과 함께 즉시 대응할 수준

임계치는 정답이 없다. 레이턴시가 중요한 서비스와 정확성이 중요한 서비스의 기준이 다르므로, 초기 표준값을 잡되 장애 경험과 서비스 특성에 맞춰 계속 조정한다.

## RDS Event Subscription → SNS → Lambda → Slack

RDS 재시작, 장애 조치(failover), 인스턴스 생성 같은 **인스턴스 수명주기 이벤트**는 Event Subscription으로 구독한다.

- 흐름: **RDS Event → SNS → Lambda(메시지 파싱) → Slack**
- 로그 기반 알림(CloudWatch Logs → Lambda)과는 별개다. 이쪽은 인스턴스 상태/수명주기 이벤트를 다룬다.
- 온프레미스라면 별도 모니터링 서버, cron, 스크립트가 필요했을 작업을 관리형 서비스 조합으로 줄인다.

## Aurora의 깊은 장애 지표

### CommitLatency

커밋 지연 정도를 보여준다. 커밋은 데이터 변경을 확정하는 과정이라 **스토리지와 밀접**하다.

- 이 값이 튀면 단순 쿼리 문제가 아니라 스토리지 노드 이상, binlog, 엔진 버그 같은 **더 깊은 문제**가 숨어 있을 수 있다.
- 실제 사례: 특정 Aurora 버전의 purge binlog 버그, 스토리지 노드 이상, 외부 복제 구성으로 인한 binlog 경합.
- 외부 복제가 필요하면 Aurora MySQL 2.10+의 binlog I/O cache 개선 효과를 기대할 수 있다.

### Rollback Segment History List Length (HLL)

InnoDB는 읽기 일관성(MVCC)을 위해 과거 버전 데이터를 유지한다. 커밋되지 않았거나 오래 실행되는 트랜잭션이 있으면 오래된 버전을 purge하지 못해 **HLL이 증가**한다.

- 값이 커지면 오래된 버전을 걸러내는 비용이 늘어 성능 저하로 이어진다. **롱 트랜잭션 감지 지표**다.
- 예시 임계(고QPS 환경): Warning 약 3만, Critical 약 7만. 변경 트래픽이 적은 DB에서는 이 값이 크게 오르지 않을 수 있다.

### Slow Query, 로그 증가 추이

- DB 장애의 많은 원인은 느린 쿼리의 급증이다.
- **MySQL**: slow query log가 분리되어 있어 CloudWatch Logs의 `IncomingLogEvents`로 증가 추이를 본다. error log도 같은 방식으로 급증을 감시하면 엔진 문제를 빨리 잡는다.
- **PostgreSQL**: slow query와 일반 로그가 한곳에 섞이는 경우가 많아 `duration` 키워드로 필터링한다. `lock timeout`, `statement timeout`, `vacuum` 실패도 알림 대상으로 삼는다.

## Performance Insights는 장애 전에 켜두는 블랙박스

어떤 SQL, 호스트, 사용자, 대기 이벤트가 부하를 만드는지 보여준다. 추가 비용과 약간의 오버헤드가 있지만, **장애가 난 뒤 켜면 원인 분석이 어렵다.** 핵심 서비스 DB라면 사전에 성능 영향을 테스트한 뒤 켜둔다(상세: [[RDS-Monitoring#Performance Insights]]).

## CloudWatch로 부족하면 Prometheus + Grafana

- CloudWatch는 기본 1분 단위라 세밀한 분석에 부족할 수 있고, `SHOW ENGINE INNODB STATUS`, `SHOW STATUS` 같은 **엔진 내부 지표는 별도 수집**이 필요하다.
- Prometheus exporter로 수집할 만한 지표: 롱 트랜잭션 수, 실행 계정, 접속 호스트, IP별 커넥션 수, 계정별 커넥션 수, DB 크기.
- **PostgreSQL**: exporter 설정 파일에 쿼리를 추가해 롱 트랜잭션, vacuum, 테이블 단편화, 통계 정보를 수집한다.

### Slow Query 통계 뷰 (개발자도 함께 본다)

개별 slow query 로그만으로는 장애 상황에서 패턴을 파악하기 어렵다. 같은 형태의 쿼리가 얼마나 자주, 얼마나 오래 실행됐는지 집계해야 한다.

- `pt-query-digest`로 slow query를 분석하고 결과를 DB에 저장한 뒤 Grafana로 시각화한다.
- 최근 몇 시간 동안 가장 많이 느려진 쿼리 패턴을 DB 엔지니어뿐 아니라 개발자도 직접 확인할 수 있다.

## 지표 기반 비용 최적화

관리 대상 RDS가 수백~수천 개로 늘면 미사용, 오버스펙 인스턴스를 사람이 찾기 어렵다.

- **미사용 후보**: 14일 동안 커넥션이 0인 리소스
- **다운사이징 후보**: 14일 동안 CPU 사용률이 15% 이하인 인스턴스
- 이 기준을 Prometheus 지표로 주기적으로 조회해 담당자에게 알림을 보내면 right-sizing으로 비용을 줄인다(자동화: [[Database-Operations-Automation]], [[Resource-Right-Sizing]]).
- 수백~수천 개 규모에서 이 지표 기반 정리, 다운사이징을 정례화해 RDS 비용을 **연간 25% 이상 절감**한 사례가 있다. 비용 최적화는 일회성 점검이 아니라 모니터링, 자동화의 상시 영역이다.

## AWS Support Case는 장애 대응의 공식 출발점

장애나 이상 현상이 발생하면 담당자에게 바로 연락하기보다 **Support Case를 먼저 연다.**

- 케이스 번호가 있어야 AWS 내부의 서포트 엔지니어, 솔루션즈 아키텍트, 서비스팀이 같은 사건을 기준으로 협업한다.
- 질문 용도로도 활용한다(예: PostgreSQL vacuum 원리, DocumentDB와 MongoDB 차이, 자동화 스크립트 샘플).

## 관측 도입 순서와 책임 경계

관리형 DB라고 손 놓아도 되는 게 아니라, AWS가 맡는 영역과 운영자가 설계할 영역을 구분하는 것이 핵심이다.

- **AWS가 맡는 것**: 스토리지 내구성, 자동 복구, 백업, 클러스터 내 Reader 확장.
- **운영자가 맡는 것**: AZ별 컴퓨트 배치([[RDS-Aurora-Architecture#컴퓨트 노드 AZ 배치]]), 엔진, 버전 선택, [[RDS-Aurora-Graviton|Graviton 전환 검증]], 알람 임계치, 로그 분석, 비용 관리 자동화.

관측을 새로 깔 때의 실천 순서:

1. CloudWatch 알람과 RDS 이벤트 알림(Event Subscription)을 먼저 만든다.
2. Performance Insights와 slow query 로그를 켠다.
3. CloudWatch로 부족한 엔진 내부 지표를 Prometheus, Grafana로 보강한다.
4. 표준 설정과 반복 작업을 코드화해 자동화한다([[Database-Operations-Automation]]).

## 체크포인트

- Warning과 Critical 2단계로 알람 피로를 줄였는가
- CommitLatency, History List Length 같은 Aurora/InnoDB 깊은 지표를 보는가
- 인스턴스 이벤트(failover 등)를 Event Subscription으로 받는가
- CloudWatch로 부족한 엔진 지표를 커스텀 exporter로 보강했는가
- 핵심 DB에 Performance Insights를 사전에 켜뒀는가

## 관련 문서

- [[RDS-Monitoring|RDS 모니터링]] — 기본 3계층, CloudWatch 지표, 로그 알람
- [[RDS-Aurora-Architecture|Aurora 아키텍처]] — redo log, binlog, 공유 스토리지
- [[RDS-Aurora-Graviton|Aurora Graviton 전환]] — 버전, 쓰기 워크로드
- [[RDS-Operational-Pitfalls|RDS 운영 함정]]
- [[Prometheus|Prometheus]] — exporter, 커스텀 지표
- [[Alert-Fatigue|알람 피로]] — 심각도 분리
- [[RED-USE-Method|RED, USE 방법론]] — 지표 설계 프레임

## 출처

- [RDS Aurora Graviton2 성능 이슈와 RDS 모니터링 — YouTube](https://www.youtube.com/watch?v=c6mak2ioTqs&list=PLgXGHBqgT2TtGi82mCZWuhMu-nQy301ew&index=16)
