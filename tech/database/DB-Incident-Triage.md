---
tags: [database, incident, triage, performance, diagnosis, aas, mongodb]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["DB Incident Triage", "DB 장애 분류", "DB 장애 분석 방법론", "시점 비교 분석", "AAS"]
---

# DB 장애 분석 방법론 (시점 비교, 장애 분류)

DB 성능 장애 분석에서는 **평소와 비교해 무엇이 달라졌는지**와 현재 부하, 대기 및 차단 관계를 함께 본다. Top SQL 순위는 부하 기여도를 찾는 출발점이며, baseline 비교는 그 기여가 왜 달라졌는지 좁히는 도구다. 어느 하나만으로 원인을 확정하지 않는다.

## AAS — 부하 측정의 기본 단위, 그러나 범인은 아니다

AAS(Average Active Sessions)는 일정 시간 동안 **평균적으로 동시에 실행 중이거나 기다리는 세션 수**다. 활성 시간을 정확히 적분하면 누적 120 세션초 / 관측 60초 = 평균 2세션이다. Database Insights의 AAS는 매초 활성 세션을 샘플링해 평균하므로 쿼리 실행 시간 합으로 구한 AAE와 근사하게 같아도 차이가 날 수 있다. 상위 SQL은 부하 기여도를 보여준다([[RDS-Monitoring-Metrics#Database Insights와 Performance Insights 전환|Database Insights]]). 총 AAS가 vCPU 선을 넘었다고 곧 CPU 포화는 아니다. CPU 대기와 I/O, lock 등 wait event별 기여도를 나누고 CPU load가 vCPU 용량에 근접하는지 확인한다.

**AAS가 높다고 곧 장애 원인은 아니다.** 우선 비교할 후보:
- 원래 무거운 쿼리도 배제하지 않는다. 평소부터 자원을 많이 쓰거나 lock을 오래 보유했고, 장애 때 다른 부하나 가용 용량 변화와 겹쳤을 수 있다
- 평소 조용하다 갑자기 늘어난 쿼리 (호출량 변화 — 의심)
- 배포 후 새로 유입된 쿼리 (신규 — 후보). 신규라는 사실만으로 원인이라고 판정하지 않는다

시점 비교로 후보를 좁힌 뒤 wait event, blocker와 실행 계획을 대조한다. AAS가 높은 대기 쿼리는 피해자일 수 있고, 원인인 blocker는 현재 쿼리를 실행하지 않는 idle transaction일 수도 있다.

## 시점 비교 (baseline vs incident)

장애 구간과 정상 구간을 각각 지정하고, **쿼리별 지표의 델타**를 본다.

- CPU 그래프에서 문제 구간을 **장애 시점**, 평소 구간을 **비교(baseline) 시점**으로 지정.
- 쿼리별 **QPS, 레이턴시, 읽은 행 수(rows examined)** 가 얼마나 증감했는지 비교.
- **신규 쿼리**(baseline엔 없고 장애 시점에만 등장)는 별도 강조.

이 비교로 신규 유입, 호출량과 호출당 비용 변화의 가설을 세운다. 같은 시간 길이와 집계 단위로 맞추고 트래픽 주기, 인스턴스 용량, 배포와 통계 수집 설정 변화도 확인한다. baseline이 없거나 샘플에서 빠졌다는 사실만으로 신규 쿼리라고 확정하지 않는다.

## 쿼리 변화 3유형과 대응 후보

| 유형 | 신호 | 1차 대응 |
|------|------|----------|
| **① 신규 쿼리 유입** | baseline에 없던 쿼리가 장애 시점에 등장, 높은 부하 | **배포 롤백** 또는 호출량 조절 |
| **② 기존 쿼리 호출량 폭증** | 특정 쿼리가 나쁜 게 아니라 전체 트래픽 급증 (대규모 알림 발송 등) | **발송 속도 제어** 같은 트래픽 throttling |
| **③ 기존 쿼리 레이턴시 증가** | 같은 쿼리인데 rows examined/latency 급증 | 입력 폭증이면 **입력 제한**, plan 변화나 lock/I/O 대기면 해당 원인 조치 |

유형 ③의 한 사례는 `IN` 파라미터 증가와 함께 실제 읽는 행 수와 CPU가 늘어나는 경우다. 값이 2,000개라는 숫자만으로 폭증을 보장하지 않으며 실행 계획과 실제 부하를 확인해 상한을 정한다. 이 세 유형은 발표 사례의 쿼리 중심 분류로, 스토리지 지연, 메모리 압박과 failover 등 모든 DB 장애를 포괄하지 않는다.

## 원인 확정: 실행 계획 + 스키마/통계

문제 쿼리를 찾는 것만으로는 부족하다. **왜 느린지**를 봐야 한다.

- **실행 계획(EXPLAIN)**: 인덱스를 타는지, 풀스캔인지, 정렬/임시테이블이 끼는지 ([[Execution-Plan|실행 계획]]).
- **테이블 스키마 + 테이블 통계 + 인덱스 통계**: 데이터 규모와 카디널리티로 옵티마이저 선택을 설명.
- **lock wait와 blocker transaction**: 대기자만 튜닝하지 않는다. MySQL 8.4의 `sys.innodb_lock_waits`와 transaction 정보를 대조하며, idle blocker는 `blocking_query`가 `NULL`일 수 있어 statement history도 확인한다.

이 정보로 "쿼리가 많아서(부하)인지 / 인덱스를 못 타서인지 / 읽는 범위가 넓어진 것인지"를 판단한다. 같은 쿼리가 갑자기 느려졌다면 **데이터 증가나 통계 갱신으로 실행 계획이 바뀐(plan flip)** 경우를 의심.

## MongoDB — 슬로우 쿼리 로그 중심

MongoDB는 버전별 기능 차이가 있어, 버전 의존이 적은 **로그 파싱** 방식이 범용적이다.

- 임계(예: 100ms) 이상 슬로우 쿼리를 추출, **발생 빈도순** 정렬.
- 쿼리별 발생 횟수, 평균 수행 시간, **스캔한 문서 수**, **인덱스 사용 여부** 확인.
- `IXSCAN` = 인덱스 사용, `COLLSCAN` = 컬렉션 풀스캔(인덱스 미사용 — 위험 신호).
- 조회 기간이 길면 전체 로그를 다 파싱하지 않고 **샘플링**으로 부하를 줄인다.

## 면접 체크포인트

- Top SQL, baseline 비교와 wait/blocker 정보를 함께 보는 이유
- 샘플링한 AAS와 실행 시간으로 구한 AAE의 차이, 대기자와 원인 blocker의 구분
- 시점 비교로 신규/호출량/레이턴시 변화를 가르는 방법
- 발표 사례의 쿼리 변화 3유형과 대응 후보, 이 분류가 포함하지 않는 자원/인프라 장애
- `IN` 절 폭증 같은 유형 ③ 사례와 plan flip
- MongoDB IXSCAN vs COLLSCAN, 슬로우 로그 샘플링

## 사례
- 대규모 DB fleet 운영팀이 셀프서비스 진단 도구에 "장애 시점 vs 평소 시점" 비교를 핵심으로 넣고, 장애를 신규 쿼리 유입/호출량 폭증/레이턴시 증가 세 유형으로 분류해 대응한 사례가 있다.

## 출처

2026-10-02에는 AAS/AAE와 Top SQL의 범위 및 MySQL 8.4의 idle blocker 반례를 공식 자료에 대조했다. 세 유형 분류와 운영 사례는 아래 발표의 관점이며 모든 DB 장애의 보편 계약이 아니다. MongoDB 로그 절 전체는 이번 검증 범위에서 제외했다.

- [Amazon RDS, Database load](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.ActiveSessions.html)
- [MySQL 8.4 Reference Manual, Using InnoDB Transaction and Locking Information](https://dev.mysql.com/doc/refman/8.4/en/innodb-information-schema-examples.html)
- [KDMS 데이터베이스 인사이트 — DB 이슈 분석 도구와 운영 (YouTube)](https://www.youtube.com/watch?v=NrPY9J1a2ag&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=5)

## 관련 문서
- [[Self-Service-DB-Diagnostics|셀프서비스 DB 진단 플랫폼]] — 이 방법론을 담는 도구
- [[MySQL-Slow-Query-Diagnosis|MySQL Slow Query 진단]] — MySQL 도구별 진단 절차
- [[MySQL-Digest-Statistics|MySQL Digest 통계 운영]] — 통계가 왜곡/유실되면 비교 자체가 어긋남
- [[RDS-Monitoring|RDS 모니터링]] — Performance Insights, AAS, CloudWatch 지표
- [[Execution-Plan|실행 계획 (EXPLAIN)]] — 원인 확정 단계
- [[Incident-Recovery-Prevention|장애 복구와 재발 방지]] — 사고 대응 전반
