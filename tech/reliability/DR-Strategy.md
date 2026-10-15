---
tags: [reliability, disaster-recovery, multi-region, rto, rpo, high-availability]
status: done
verified_at: 2026-10-10
category: "안정성엔지니어링(Reliability)"
aliases: ["DR Strategy", "재해 복구 전략", "Disaster Recovery", "multi-region DR", "pilot light", "warm standby"]
---

# DR 전략 (Disaster Recovery)

DR은 **정의한 재해 범위에서 서비스를 복구하는 계획**이다. AZ 장애와 리전 전체 장애는 복구 자원과 데이터의 경계가 다르다. Multi-AZ 구성만으로 리전 장애 복구까지 증명되지는 않는다. 선택은 결국 **RTO, RPO를 비용과 맞바꾸는** 문제다. 모든 서비스가 active-active일 필요는 없다.

## 4가지 전략 — 싸고 느림에서 비싸고 빠름까지

| 전략 | RTO | RPO | 비용 | 설명 |
|---|---|---|---|---|
| **Backup & Restore** | 수 시간 | 수 시간 | 최저 | 다른 리전에 백업만. 재해 시 복원, 재프로비저닝 |
| **Pilot Light** | 수십 분 | 분 | 낮음 | DB만 DR 리전에 복제(최소 가동), 나머지는 꺼둠 → 재해 시 기동 |
| **Warm Standby** | 분 | 초 | 중간 | 축소된 전체 스택이 DR에 상시 가동 → 재해 시 스케일업 |
| **Multi-site Active/Active** | ~0 | ~0 | 최고 | 여러 리전이 동시에 트래픽 처리. 가장 복잡 |

표의 시간은 전략의 상대적 차이를 이해하는 예시이며 제품 SLA나 달성 보장이 아니다. 실제 RTO/RPO는 데이터 크기, 복제 방식, 의존성, 탐지와 전환 절차로 달라진다. Active/Active도 삭제와 논리 손상이 여러 리전에 퍼지면 이전 백업으로 복구해야 하므로 RPO 0을 보장하지 않는다.

핵심 직관: **데이터를 미리 복제해 둘수록 RPO가 줄고(손실↓), 컴퓨팅을 미리 띄워 둘수록 RTO가 준다(복구↓)**. 둘 다 미리 할수록 비싸진다.

## 구성 요소

- **데이터 복제**: 크로스 리전 Read Replica 승격, **Aurora Global Database**, S3 CRR, DynamoDB Global Table. Aurora의 계획된 switchover는 정상 클러스터를 먼저 동기화해 RPO 0을 제공하지만, 비계획 failover는 장애 당시 리전 간 복제 지연만큼 손실이 생길 수 있다. DB 승격 시간과 전체 서비스 복구 시간도 구분한다. [[RDS-Aurora]], [[RDS-Migration-Scenarios]]
- **트래픽 전환**: Route 53 헬스체크 기반 DNS failover. **TTL을 낮춰둬야** 전환이 빠르다([[RDS-Zero-Downtime-Migration|엔드포인트 전환]]).
- **재프로비저닝**: 인프라를 코드로(IaC) 두어 DR 리전에 동일하게 재현. 수동 구성은 재해 때 못 따라간다.
- **런북 + 정기 DR 드릴**: 절차 문서화 + 주기적 실제 전환 훈련. 안 돌려본 DR은 작동하지 않는다.

## 전략 선택

비즈니스가 요구하는 RTO/RPO, 중단과 손실의 비용 및 운영 역량으로 정한다. 결제나 주문이라는 도메인 이름만으로 Warm Standby 이상을 필수로 정하지 않는다. 선택한 전략이 실제 거래 복구와 정합성 목표를 충족하는지 드릴로 확인한다.

## 트래픽 전환 경로도 장애를 견뎌야 한다

2026-10-13 Amazon Application Recovery Controller(ARC) 공식 문서 확인 기준. 복구 대상이 준비되어 있어도 전환에 필요한 관리 API가 응답하지 않으면 복구가 지연될 수 있다. 리소스를 생성하는 제어 계층과, 미리 구성한 경로를 전환하는 데이터 계층을 나눠 설계한다.

ARC의 routing control은 Route 53 헬스체크 상태를 바꾸는 on/off 스위치다. 이 헬스체크를 각 애플리케이션 복제본의 DNS 레코드에 미리 연결해 두면 routing control 상태 변경으로 트래픽을 전환할 수 있다. 스위치 자체가 서비스 응답 시간이나 TCP 연결을 관측하는 것은 아니므로, 장애 탐지와 전환 결정은 별도 모니터링에 근거한다.

| 단계 | 준비와 확인 |
|---|---|
| 평시 구성 | 클러스터, routing control, 헬스체크와 DNS 연결을 준비한다. 리소스 생성과 삭제는 제어 계층 작업이다. |
| 전환 실행 | 5개 리전에 걸친 클러스터 데이터 계층의 API로 상태를 조회하고 바꾼다. `ListRoutingControls`, `UpdateRoutingControlState`를 CLI나 SDK에서 호출한다. |
| 호출 경로 장애 | 클러스터 엔드포인트 5개와 routing control ARN을 사전에 확보한다. 선택한 엔드포인트가 응답하지 않으면 다른 엔드포인트로 재시도한다. 장애 중 `DescribeCluster` 호출이나 콘솔 접근에 의존하지 않도록 준비한다. |
| 클라이언트 복귀 | DNS TTL과 이미 열린 연결의 재사용 시간을 함께 확인한다. 상태 변경 성공과 모든 요청의 새 리전 도착은 다른 사건이다. |

DNS 응답이 바뀌어도 기존 연결은 재연결 전까지 장애 리전에 요청을 보낼 수 있다. 따라서 DR 드릴에서는 API 성공 시각뿐 아니라 새 연결과 재사용 연결의 요청 성공 시각도 측정하는 절차를 권한다. 이 절은 전환 경로의 설계 기준이며 특정 서비스의 복구 시간을 보장하지 않는다.

## Region switch의 계획 평가와 실제 복구를 구분한다

부분 검증(2026-10-16): ARC Region switch 공식 문서를 대조했다. Region switch는 애플리케이션의 리전 전환 절차를 plan, workflow, step과 execution block으로 구성한다. 블록을 순차 또는 병렬로 실행할 수 있으므로 트래픽 전환뿐 아니라 자원 확장 등 복구 작업의 순서를 표현할 수 있다. 앞 절의 routing control은 트래픽 전환 수단이고, Region switch는 여러 복구 작업을 조정하는 기능이다.

- **평시 평가:** plan 생성과 변경 때, 이후 정상 운영 중 30분마다 IAM 권한, 리소스 설정과 실행 용량 등을 검사한다. 경고는 콘솔, API 또는 EventBridge로 확인한다. 이 평가만으로 실제 애플리케이션 복구를 검증했다고 보지 않는다.
- **전환 실행:** 비활성화할 리전에 의존하지 않도록 리전별 데이터 계층을 제공한다. 복구 대상 리전에서 실행할 경로와 권한을 사전에 준비한다.
- **복구 시간:** plan 실행 시간에 지정한 리전별 CloudWatch 애플리케이션 상태 알람이 정상으로 돌아올 때까지의 추가 시간을 합쳐 actual recovery time을 계산한다. 알람이 어떤 업무 상태를 관측하는지가 결과의 의미를 결정한다.

설계 검토 제안: DB 전환 전에 필요한 쓰기 차단과 승인, 트래픽 전환 전에 필요한 용량 및 애플리케이션 준비 조건을 의존성으로 적는다. 독립된 작업만 병렬화하고 핵심 조회와 쓰기의 성공을 별도로 시험한다. Plan evaluation 통과를 실제 전환 시험이나 업무 정합성 검증으로 대신하지 않는다. 이번 확인은 문서 계약에 한정하며 실제 리전 장애 전환은 실행하지 않았고 기존 절의 검증일은 유지한다.

## 단일 AZ 배치 클러스터의 재생성과 작업 재개

2026-10-10 Amazon EMR 공식 문서 대조 기준, EMR on EC2의 개별 클러스터는 한 AZ에 존재한다. Instance fleets에 여러 AZ의 subnet을 후보로 지정해도 생성할 AZ의 용량 선택 폭을 넓히는 것이며, 한 클러스터의 노드를 여러 AZ에 분산하는 설정은 아니다. 다른 AZ의 클러스터로 복구하는 설계와 리전 전체 장애에 대비하는 설계를 구분한다.

Bootstrap action은 인스턴스 시작 뒤 EMR 애플리케이션 설치와 데이터 처리 전에 실행되며, 나중에 추가한 노드에도 실행된다. 이를 이용해 필요한 소프트웨어와 설정을 재현할 수 있다. 실패한 bootstrap은 인스턴스 종료를 일으키고 실패 수에 따라 클러스터 종료로 이어질 수 있으므로, 복구용 스크립트 자체도 시험 대상이다.

이 동작에서 도출한 복구 점검 제안은 다음과 같다.

1. 운영 중 수동 변경한 설정과 라이브러리를 재생성 절차에 반영한다. 새 클러스터가 생성됐다는 사실과 필요한 실행 환경이 재현됐다는 사실을 구분한다.
2. 입력, 중간 상태, 최종 결과를 나눠 보존 위치와 재계산 범위를 정한다. 클러스터 재생성만으로 중단된 작업이 이어지거나 결과 중복이 방지된다고 가정하지 않는다.
3. 클러스터 생성 시간에 bootstrap, 작업 재제출, 결과 정합성 확인까지 더해 복구 시간을 측정한다. 원래 AZ로 복귀할 때도 작업 인계와 용량을 다시 확인한다.

## 백업 복사, 복원 작업과 서비스 검증을 나눈다

부분 검증(2026-10-14): AWS Backup의 리전 간 복사, 복원 메타데이터와 restore testing validation을 대조했다. 기존 절의 검증일은 유지한다.

백업을 DR 리전에 복사해 두는 작업과 애플리케이션을 다시 서비스하는 작업은 다르다. AWS Backup의 리전 간 복사 지원은 리소스와 리전별로 확인해야 한다. 특히 RDS의 사용자 정의 option group은 그대로 전달되지 않으며, persistent option을 쓰면 대상 리전에 같은 option group을 미리 준비해야 하는 조건이 있다.

복원 자동화는 `GetRecoveryPointRestoreMetadata`로 백업의 복원 설정을 조회하고, 리소스별로 필요한 값을 검토한 뒤 `StartRestoreJob`을 호출하는 흐름으로 설계할 수 있다. DR 리전의 서브넷과 보안 그룹 등 대상 환경에 맞는 설정, IaC와 실행 경로의 가용성을 별도로 확인한다.

Restore testing의 복원 작업이 `COMPLETED`가 되면 EventBridge로 별도 검증 워크플로를 실행할 수 있다. 이 워크플로가 데이터 조회나 애플리케이션 health check를 수행하고 `PutRestoreValidationResult`로 결과를 기록한다. 복원 완료 상태 자체가 업무 동작의 검증 결과는 아니다. 기록한 validation status는 변경할 수 없으므로 검사 결과를 모은 뒤 보고한다.

운영 검증 제안: DR 리전에서 백업 접근, 리소스 복원, 애플리케이션 연결, 핵심 업무 조회와 트래픽 전환까지 시험한다. AWS Backup은 복원 시간 SLA를 제공하지 않으므로, 복원 작업 시간과 전체 서비스 복구 시간을 각각 측정해 RTO 충족 여부를 판단한다.

## 흔한 함정

- **DR을 한 번도 드릴 안 함** — 진짜 재해 때 처음 돌려보다 실패
- **리전 간 설정 드리프트** — DR 리전 구성이 운영과 어긋나 전환 실패
- **상태 데이터 미복제** — 컴퓨팅만 이중화하고 DB/캐시/세션을 안 옮김
- **DNS TTL이 높음** — 전환해도 옛 리전으로 트래픽이 한참 감
- **리전별 의존성 누락** — KMS 키, Secrets, ACM 인증서는 리전마다 따로 필요
- **복제본을 백업으로 오해** — 잘못된 쓰기나 삭제도 복제되므로 이전 시점의 독립 백업과 복원 경로를 유지한다.
- **전환 후 쓰기 충돌** — 옛 리전의 쓰기를 차단하고 새 writer, DNS 캐시와 연결 풀을 확인한다. 복귀(failback) 때도 변경 데이터를 정합하게 합치는 절차를 별도로 검증한다.
- **복구 리전의 용량 부족** — 서비스 quota, 실제 확보 가능한 용량과 스케일업 의존성을 사전에 확인한다.

## 면접 체크포인트

- AZ 장애 복구와 리전 장애 복구의 범위 차이
- 4가지 전략과 RTO/RPO/비용 트레이드오프, 데이터 복제와 컴퓨팅 상시화가 각 복구 목표에 미치는 영향
- Aurora Global Database의 RPO/RTO와 크로스 리전 복제본 승격
- Route 53 헬스체크 failover와 TTL의 역할
- DR 드릴과 설정 드리프트, 리전별 KMS/Secrets 의존성

## 출처

2026-10-13에는 ARC routing control의 데이터 계층, 엔드포인트 재시도와 기존 연결의 전환 지연을 대조했다. 앞선 절들의 검증 기준일은 유지하며 실제 AWS 환경에서 장애 전환을 실행한 결과는 아니다.

2026-10-10에는 EMR의 AZ 선택과 bootstrap 실행 계약을 추가 대조하고, 기존 전략 비교와 Aurora switchover/failover 설명이 공식 문서와 상충하지 않음을 확인했다. 작업 재개 점검은 이 계약에서 도출한 설계 제안이며 실제 복구 시간을 측정한 결과가 아니다.

2026-10-02에는 전략별 시간 예시의 한계, 백업과 복제의 구분 및 Aurora switchover/failover 계약을 대조했다. 특정 서비스가 표의 목표를 달성했다는 운영 검증은 아니다.

- [AWS — Region switch in ARC](https://docs.aws.amazon.com/r53recovery/latest/dg/region-switch.html)
- [AWS — About Region switch](https://docs.aws.amazon.com/r53recovery/latest/dg/region-switch-plans.html)
- [AWS — Creating backup copies across AWS Regions](https://docs.aws.amazon.com/aws-backup/latest/devguide/cross-region-backup.html)
- [AWS — Restore a backup by resource type](https://docs.aws.amazon.com/aws-backup/latest/devguide/restoring-a-backup.html)
- [AWS — Restore testing validation](https://docs.aws.amazon.com/aws-backup/latest/devguide/restore-testing-validation.html)
- [AWS — Data and control planes for routing control](https://docs.aws.amazon.com/r53recovery/latest/dg/data-and-control-planes.html)
- [AWS — About routing control](https://docs.aws.amazon.com/r53recovery/latest/dg/routing-control.about.html)
- [AWS — Best practices for routing control in ARC](https://docs.aws.amazon.com/r53recovery/latest/dg/route53-arc-best-practices.regional.html)
- [AWS — Availability Zone flexibility for an Amazon EMR cluster](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-flexibility.html)
- [AWS — Create bootstrap actions to install additional software with an Amazon EMR cluster](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-plan-bootstrap.html)
- [Amazon Aurora — Using switchover or failover in Amazon Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html)
- [AWS — Disaster recovery options in the cloud (4 strategies)](https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html)
- [AWS — Aurora Global Database](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html)

## 관련 문서

- [[Backup-Restore|백업과 복원 (RTO/RPO, PITR)]]
- [[RDS-Aurora|RDS / Aurora (Global Database, Multi-AZ)]]
- [[RDS-Migration-Scenarios|RDS 마이그레이션 (크로스 리전 복제본)]]
- [[RDS-Zero-Downtime-Migration|무중단 컷오버 (엔드포인트 전환, TTL)]]
- [[Route53|Route 53 (헬스체크 DNS failover)]]
