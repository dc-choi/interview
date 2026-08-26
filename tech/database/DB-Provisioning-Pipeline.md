---
tags: [database, operations, provisioning, aurora, aws, automation, saga]
status: done
verified_at: 2026-08-26
category: "데이터&저장소(Data&Storage)"
aliases: ["DB Provisioning Pipeline", "DB 프로비저닝 파이프라인", "Aurora 생성 자동화", "DB 생성 표준화"]
---

# DB 프로비저닝 자동화 파이프라인 (표준 생성)

운영 DB 생성은 콘솔 클릭 몇 번이 아니라 네트워크, 보안, 파라미터, 로그, 백업, 모니터링까지 일관되게 엮어야 하는 작업이다. 자동화의 목적은 "빠르게 만들기"가 아니라 **항상 같은 기준으로 안전하게 만들기**다. 수동 생성은 서브넷, 보안 그룹, 파라미터, 로그, 백업 설정이 매번 달라지고, 그 작은 차이가 운영에서 장애, 보안 허점, 복구 실패, 비용 증가로 번진다.

이 문서는 [[Database-Operations-Automation|DB 운영 자동화]]의 "설치, 구성 표준화" 도메인을 실제 파이프라인으로 구현한 모습이다.

## 이벤트 기반 순차 생성 + 보상과 reconciliation

생성 요청은 API 컨트롤러가 받고, 이후 리소스 생성은 **메시지 이벤트 체인**으로 이어진다.

`Resolve Subnet Group` 이벤트 → 기존 표준 그룹을 선택하거나 필요한 경우 생성 → `Create Security Group` → 파라미터 그룹 → 클러스터 → 인스턴스 순서로 진행한다.

```
요청 → [Subnet Group 선택/생성] → [Security Group] → [Parameter Group] → [Cluster] → [Instance] → 후처리
                     실패 시 ← 역순 보상 시도, reconciliation으로 잔여 리소스 확인
```

- **단계 독립성**: 각 리소스 생성이 독립 컨슈머라 어느 지점에서 실패했는지 추적이 쉽다.
- **보상 트랜잭션(Saga)**: 중간 실패 시 이미 만든 리소스를 **역순으로 정리하려고 시도**한다. 원격 API 성공 뒤 응답 유실, at-least-once 재전달, 비동기 생성 상태, 보상 실패가 있으므로 보상만으로 고아 리소스가 없다고 단정할 수는 없다.
- 이벤트 브로커는 [[MQ-Kafka|Kafka]] 같은 로그 기반 브로커를 쓰면 재처리와 추적에 유리하다. 순서는 key 또는 partition 범위에서만 보장되므로 전체 체인의 정합성은 별도 상태로 관리한다.

### 완료를 판정하는 상태 머신

요청마다 안정적인 `request_id`를 만들고, 단계 상태, 생성된 ARN 또는 식별자, 재시도 횟수, 보상 상태를 영속 저장한다. 컨슈머는 `(request_id, step)`의 유일성과 조건부 상태 전이로 실행권을 먼저 획득한다. 중복 수신은 저장된 식별자나 결정적인 리소스 이름으로 기존 리소스를 조회해 다음 상태만 진행한다. 가능한 API에는 client token을 전달하고, 지원하지 않는 API는 생성 시 `request_id` 태그를 붙여 reconciliation에 사용한다.

AWS API의 성공 응답은 즉시 사용 가능을 뜻하지 않을 수 있다. Aurora는 클러스터를 만든 뒤 writer instance를 별도로 생성해야 하고, 상태가 `available`이 된 것을 확인한 뒤에만 다음 단계와 성공 이벤트를 진행한다. timeout이나 worker crash 뒤에는 태그와 AWS 조회 결과를 대조하는 reconciliation job이 상태를 복구하고, 보상 실패는 재시도하며 해결 전까지 `CLEANUP_PENDING`으로 드러낸다.

## 네트워크 배치와 접근 제어를 분리

DB subnet group은 Aurora가 배치될 subnet 집합을 정하고, security group은 실제 접근 규칙을 정한다. 같은 VPC와 네트워크 등급을 쓰는 클러스터는 표준 subnet group을 공유할 수 있고, 접근 권한의 영향 범위를 나누려면 클러스터별 security group을 둔다.

- subnet group은 최소 2개 AZ의 subnet을 포함해야 한다. 서로 다른 public/private 배치, network type이나 라우팅 경계가 필요할 때 별도 그룹을 만든다.
- subnet group 자체도 수정할 수 있지만 cluster의 연결 설정을 바꾸면 downtime이 생길 수 있어 배치 기준을 생성 전에 확정한다.
- security group을 개별화하면 접근 규칙 변경의 **영향 범위(blast radius)를 한 DB로 한정**할 수 있다. SG 구성 패턴은 [[RDS-Security-Group|RDS Security Group]] 참고.

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
| Slow Query Log | 병목 쿼리 발굴, 튜닝의 1차 자료 ([[MySQL-Slow-Query-Diagnosis\|Slow Query 진단]]) |

PostgreSQL은 하나의 로그 체계에서 감사, 에러, 슬로우 역할을 함께 관리하며, 감사 로그에는 `pgaudit` 확장이 필요하다. 로그 파이프라인 일반론은 [[Log-Pipeline|로그 파이프라인]], CloudWatch 연동은 [[CloudWatch-Logs-Alarms|CloudWatch Logs]] 참고.

## 백업: 네이티브 PITR와 중앙 백업 정책의 역할

| 항목 | Aurora Automated Backup | AWS Backup |
|------|----------------------|------------|
| 주 역할 | 1~35일 연속 백업과 해당 기간의 PITR | 태그 기반 중앙 계획, 장기 보관, 계정 간 거버넌스와 지원 범위 내 연속 백업 |
| 클러스터 삭제 | 자동 백업을 남길 수 있지만 남은 retention 기간 뒤 만료. final/manual snapshot은 직접 삭제 전까지 유지 | recovery point를 원본 리소스 수명과 분리해 정책으로 보관 |
| 삭제 통제 | IAM, deletion protection과 snapshot 정책 | **Backup Vault Lock**의 governance 또는 compliance mode |
| 적용 방식 | 클러스터 backup retention 설정 | backup plan과 태그 선택 |

둘은 무조건 대체 관계가 아니다. 짧은 PITR는 Aurora 네이티브 백업으로 두고, 장기 보관과 중앙 통제가 필요하면 AWS Backup 계획을 추가한다. 삭제 시 retained automated backup 또는 final snapshot을 만들지, AWS Backup recovery point를 얼마나 보존할지는 RPO/RTO와 복원 훈련 결과로 정한다. 복원 절차는 [[MySQL-Backup|MySQL 백업, 복원]], Aurora 백업 운영은 [[RDS-Aurora-Backup-Operations|Aurora 백업 운영]] 참고.

## 유지보수 설정: 검증과 rollout 정책

- **Auto Minor Version Upgrade는 일괄 고정하지 않는다.** 짧게 쓰는 비핵심 DB는 자동 적용을, 핵심 DB는 사전 복제 환경 검증과 단계별 rollout 또는 수동 일정을 선택할 수 있다. 끄는 경우에도 보안 수정과 지원 종료를 추적할 담당자와 적용 기한이 필요하며, 필수 업그레이드는 설정과 무관하게 적용될 수 있다.
- **Deletion Protection은 파이프라인 진행 중엔 꺼두고**(롤백을 위해), 모든 생성 절차가 성공한 뒤에 켠다. 생성 자동화와 삭제 보호가 충돌하지 않도록 순서를 분리한 것.

## 후처리: 엔드포인트, 계정, binlog

생성 직후에는 추가 작업이 필요하다.

- **커스텀 엔드포인트**: 서로 다른 크기나 설정의 Aurora Replica를 서비스 조회용과 배치용 그룹으로 나눠 연결한다. endpoint는 그룹 내 새 연결을 분산할 뿐 query 자원 격리를 자동 보장하지 않으므로 instance 구성과 부하를 함께 관리한다. 엔드포인트 종류는 [[RDS-Aurora-Endpoints|Aurora 엔드포인트]] 참고.
- **목적별 공용 계정**: 모니터링 계정, 덤프 계정, DBA 관리 계정, 서비스 계정을 표준으로 생성. 자격증명 관리는 [[RDS-Connection-Credentials|RDS 연결, 자격증명]] 참고.
- **binlog 보관 기간**: Aurora MySQL 외부 복제와 CDC consumer가 지연을 따라잡을 시간을 기준으로 설정하고 storage 사용량을 감시한다. Aurora PITR는 네이티브 연속 백업의 별도 기능이다. binlog 활용은 [[CDC&Outbox|CDC]] 참고.

## 면접 체크포인트

- DB 생성 자동화의 목적이 "속도"가 아니라 "일관된 기준"인 이유 (설정 drift → 장애, 복구 실패)
- `request_id` 상태 머신, 보상, reconciliation으로 다단계 생성의 부분 실패를 처리하는 방식
- subnet group의 배치 역할과 security group의 접근 제어 역할, 어느 경계에서 공유하거나 분리할지
- "전용 파라미터 그룹 + 템플릿 복사"가 전용성과 표준성을 동시에 잡는 법
- 네이티브 PITR와 AWS Backup의 장기 보관, Vault Lock, 태그 정책을 조합하는 기준
- Auto Minor Upgrade rollout과 Deletion Protection 타이밍 — 자동화와 통제의 균형

## 사례
- 대규모 Aurora fleet을 운영하는 팀이 DB 생성을 Kafka 이벤트 파이프라인으로 자동화하고, 클러스터별 전용 서브넷/SG, 템플릿 복사 파라미터, 태그 기반 AWS Backup, CloudWatch 로그 Export를 표준으로 적용한 사례가 있다. 후처리로 커스텀 엔드포인트(서비스/배치 분리)와 목적별 공용 계정, binlog 보관 기간을 자동 설정한다.

## 출처
- [Making retries safe with idempotent APIs — AWS Builders' Library](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
- [Amazon Aurora User Guide, Creating an Amazon Aurora DB cluster](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.CreateInstance.html)
- [Amazon RDS User Guide, Grant permission to tag resources during creation](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/security_iam_id-based-policy-examples-grant-permissions-tags-on-create.html)
- [Amazon Aurora User Guide, Working with DB subnet groups](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_VPC.WorkingWithRDSInstanceinaVPC.html)
- [Amazon Aurora User Guide, Backing up and restoring a DB cluster](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Managing.Backups.html)
- [AWS Backup Developer Guide, Vault Lock](https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html)
- [Amazon Aurora User Guide, Auto minor version upgrades](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.VersionPolicy.Upgrading.html)
- [Amazon Aurora User Guide, Custom endpoints](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Custom.html)
- [Amazon Aurora User Guide, Binary log retention](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/mysql-stored-proc-configuring.html)
- [Aurora DB 생성 자동화와 표준 운영 — DB 밋업 (YouTube)](https://www.youtube.com/watch?v=NrPY9J1a2ag&list=PLaHcMRg2hoBoFR-9MlfJP56xrcIxBInCm&index=4)

## 관련 문서
- [[Database-Operations-Automation|DB 운영 자동화]] — 이 파이프라인이 구현하는 상위 표준화 도메인
- [[MySQL-Aurora-Parameter-Tuning|MySQL/Aurora 파라미터 표준 튜닝]] — 템플릿에 담는 파라미터 값
- [[Multi-Target-Exporter|멀티타겟 Exporter, 서비스 디스커버리]] — 생성된 DB의 모니터링 자동 편입
- [[Saga-Pattern|Saga 패턴]] — 보상 트랜잭션으로 다단계 작업의 일관성 확보
- [[RDS-Aurora|관리형 DB (RDS, Aurora)]] — Aurora 아키텍처와 운영 전반
- [[RDS-Security-Group|RDS Security Group]] — 클러스터별 SG 구성
