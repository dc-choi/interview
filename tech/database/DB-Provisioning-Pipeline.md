---
tags: [database, operations, provisioning, aurora, aws, automation, saga]
status: done
category: "데이터&저장소(Data&Storage)"
aliases: ["DB Provisioning Pipeline", "DB 프로비저닝 파이프라인", "Aurora 생성 자동화", "DB 생성 표준화"]
---

# DB 프로비저닝 자동화 파이프라인 (표준 생성)

운영 DB 생성은 콘솔 클릭 몇 번이 아니라 네트워크, 보안, 파라미터, 로그, 백업, 모니터링까지 일관되게 엮어야 하는 작업이다. 자동화의 목적은 "빠르게 만들기"가 아니라 **항상 같은 기준으로 안전하게 만들기**다. 수동 생성은 서브넷, 보안 그룹, 파라미터, 로그, 백업 설정이 매번 달라지고, 그 작은 차이가 운영에서 장애, 보안 허점, 복구 실패, 비용 증가로 번진다.

이 문서는 [[Database-Operations-Automation|DB 운영 자동화]]의 "설치, 구성 표준화" 도메인을 실제 파이프라인으로 구현한 모습이다.

## 이벤트 기반 순차 생성 + 보상 롤백

생성 요청은 API 컨트롤러가 받고, 이후 리소스 생성은 **메시지 이벤트 체인**으로 이어진다.

`Create Subnet Group` 이벤트 → 컨슈머가 AWS API 호출 → 성공 시 `Create Security Group` 발행 → 파라미터 그룹 → 클러스터 → 인스턴스 순서로 진행한다.

```
요청 → [Subnet Group] → [Security Group] → [Parameter Group] → [Cluster] → [Instance] → 후처리
                     실패 시 ← 역순으로 이미 만든 리소스 정리(보상 트랜잭션)
```

- **단계 독립성**: 각 리소스 생성이 독립 컨슈머라 어느 지점에서 실패했는지 추적이 쉽다.
- **보상 트랜잭션(Saga)**: 중간 실패 시 이미 만든 리소스를 **역순으로 정리**해 고아 리소스를 남기지 않는다. 분산 환경의 일관성을 분산 트랜잭션 없이 보상으로 푸는 [[Saga-Pattern|Saga]] 그대로다.
- 이벤트 브로커는 [[MQ-Kafka|Kafka]] 같은 로그 기반 브로커를 쓰면 재처리, 순서 보장, 추적이 쉽다.

## 클러스터별 전용 서브넷, 보안 그룹

Aurora 클러스터마다 **전용 서브넷 그룹 + 전용 보안 그룹**을 둔다.

- 공용 리소스는 관리가 편해 보이지만, 특정 DB만 격리하거나 정책을 바꿀 때 다른 DB까지 영향을 받는다.
- **서브넷 그룹은 생성 후 변경이 까다롭다** — 처음부터 클러스터 단위로 분리하는 편이 안전.
- 보안 그룹을 개별화하면 접근 제어 변경의 **영향 범위(blast radius)를 한 DB로 한정**할 수 있다. SG 구성 패턴은 [[RDS-Security-Group|RDS Security Group]] 참고.

## 파라미터 그룹: 전용 리소스 + 템플릿 복사

각 DB는 자기 전용 파라미터 그룹을 갖되, **설정값은 표준 템플릿에서 복사**해 생성한다. "전용 리소스"와 "공통 기준"을 동시에 만족시키는 구조다.

- 특정 DB만 파라미터를 따로 조정할 수 있으면서, 기본값은 조직 전체에서 일관.
- 수동 설정이나 과거 DB 복사는 시간이 지나면 설정이 제각각이 된다(drift).
- 템플릿에 담는 표준 파라미터 값은 [[MySQL-Aurora-Parameter-Tuning|MySQL/Aurora 파라미터 표준 튜닝]] 참고.

## 로그 Export 표준

모든 DB는 생성 시점부터 로그를 **CloudWatch Logs로 내보내도록** 표준화한다.

| 로그 | 용도 |
|------|------|
| Audit Log | 누가 어떤 쿼리를 실행했는지 추적 (보안, 컴플라이언스) |
| Error Log | 장애 원인 분석 |
| Slow Query Log | 병목 쿼리 발굴, 튜닝의 1차 자료 ([[MySQL-Slow-Query-Diagnosis|Slow Query 진단]]) |

PostgreSQL은 하나의 로그 체계에서 감사, 에러, 슬로우 역할을 함께 관리하며, 감사 로그에는 `pgaudit` 확장이 필요하다. 로그 파이프라인 일반론은 [[Log-Pipeline|로그 파이프라인]], CloudWatch 연동은 [[CloudWatch-Logs-Alarms|CloudWatch Logs]] 참고.

## 백업: AWS Backup vs RDS Automated Backup

| 항목 | RDS Automated Backup | AWS Backup |
|------|----------------------|------------|
| 종속성 | **클러스터에 종속** — 삭제되면 백업 관리도 영향 | 클러스터와 **독립** 보관 |
| 보관 기간 | 제한적 (최대 35일) | 정책으로 장기 보관 |
| 삭제, 변조 방지 | 약함 | **Backup Vault Lock**으로 차단 |
| 적용 방식 | 인스턴스 설정 | **태그 기반 자동 적용** |

백업의 핵심 원칙은 "DB가 사라져도 백업은 살아 있어야 한다". 그래서 클러스터 수명에 묶이지 않는 AWS Backup을 태그 기반으로 자동 적용하면, 새 DB가 생성되는 순간 정책에 맞는 백업이 따라붙는다. 복원 절차와 RTO/RPO는 [[MySQL-Backup|MySQL 백업, 복원]], Aurora 백업 운영은 [[RDS-Aurora-Backup-Operations|Aurora 백업 운영]] 참고.

## 유지보수 설정: 자동보다 통제 가능성

- **Auto Minor Version Upgrade는 끈다.** 자동 업그레이드는 예기치 않은 재시작, 호환성 문제, 장애 가능성을 만든다. 검증 후 계획된 시점에 수동 업그레이드한다.
- **Deletion Protection은 파이프라인 진행 중엔 꺼두고**(롤백을 위해), 모든 생성 절차가 성공한 뒤에 켠다. 생성 자동화와 삭제 보호가 충돌하지 않도록 순서를 분리한 것.

## 후처리: 엔드포인트, 계정, binlog

생성 직후에는 추가 작업이 필요하다.

- **커스텀 엔드포인트**: 리더 인스턴스를 서비스용/배치용으로 나눠 라우팅한다. 무거운 배치 쿼리가 서비스 트래픽을 건드리지 않게 분리. 엔드포인트 종류는 [[RDS-Aurora-Endpoints|Aurora 엔드포인트]] 참고.
- **목적별 공용 계정**: 모니터링 계정, 덤프 계정, DBA 관리 계정, 서비스 계정을 표준으로 생성. 자격증명 관리는 [[RDS-Connection-Credentials|RDS 연결, 자격증명]] 참고.
- **binlog 보관 기간**: MySQL은 CDC, 복제, PITR 요건에 따라 binlog 보관 기간을 설정. binlog 활용은 [[CDC&Outbox|CDC]] 참고.

## 면접 체크포인트

- DB 생성 자동화의 목적이 "속도"가 아니라 "일관된 기준"인 이유 (설정 drift → 장애, 복구 실패)
- 이벤트 체인 + 보상 롤백(Saga)으로 다단계 생성의 부분 실패를 처리하는 방식
- 클러스터별 전용 서브넷/SG가 blast radius를 줄이는 메커니즘 (서브넷은 변경 까다로움)
- "전용 파라미터 그룹 + 템플릿 복사"가 전용성과 표준성을 동시에 잡는 법
- AWS Backup을 RDS Automated Backup 대신 쓰는 이유 (클러스터 독립, Vault Lock, 태그 자동 적용)
- Auto Minor Upgrade off / Deletion Protection 타이밍 — 자동화와 통제의 균형

## 사례
- 대규모 Aurora fleet을 운영하는 팀이 DB 생성을 Kafka 이벤트 파이프라인으로 자동화하고, 클러스터별 전용 서브넷/SG, 템플릿 복사 파라미터, 태그 기반 AWS Backup, CloudWatch 로그 Export를 표준으로 적용한 사례가 있다. 후처리로 커스텀 엔드포인트(서비스/배치 분리)와 목적별 공용 계정, binlog 보관 기간을 자동 설정한다.

## 출처
- [Aurora DB 생성 자동화와 표준 운영 — DB 밋업 (YouTube)](https://www.youtube.com/watch?v=NrPY9J1a2ag&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=4)

## 관련 문서
- [[Database-Operations-Automation|DB 운영 자동화]] — 이 파이프라인이 구현하는 상위 표준화 도메인
- [[MySQL-Aurora-Parameter-Tuning|MySQL/Aurora 파라미터 표준 튜닝]] — 템플릿에 담는 파라미터 값
- [[Multi-Target-Exporter|멀티타겟 Exporter, 서비스 디스커버리]] — 생성된 DB의 모니터링 자동 편입
- [[Saga-Pattern|Saga 패턴]] — 보상 트랜잭션으로 다단계 작업의 일관성 확보
- [[RDS-Aurora|관리형 DB (RDS, Aurora)]] — Aurora 아키텍처와 운영 전반
- [[RDS-Security-Group|RDS Security Group]] — 클러스터별 SG 구성
