---
tags: [infrastructure, aws, rds, operations, scheduling, cost]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["RDS 중지와 재시작 예약", "RDS Stop Start Scheduling"]
---

# RDS 중지와 재시작 예약

RDS DB 인스턴스의 중지는 개발과 테스트 환경에서 사용하지 않는 시간의 인스턴스 비용을 줄이는 기능이다. **연속 중지 한도는 7일**이며, 이후에는 필요한 유지보수가 밀리지 않도록 자동으로 시작한다. 장기 미사용 환경의 자동화는 이 한도를 없애는 설정이 아니라 시작, 유지보수와 재중지를 반복하는 운영 절차다.

## 적용 범위와 남는 비용

- 중지 중에는 DB 인스턴스 시간 요금이 발생하지 않지만 프로비저닝한 스토리지, Provisioned IOPS와 과금 대상 백업 비용은 남는다. 공개 접근 인스턴스의 공인 IPv4 비용도 확인한다.
- 시작에는 복구가 필요해 수분에서 수시간이 걸릴 수 있다. 시작 API 성공을 접속 준비 완료로 취급하지 않는다.
- Read Replica가 있는 인스턴스와 Read Replica 자체는 중지할 수 없다. RDS for SQL Server의 Multi-AZ DB 인스턴스도 중지 대상에서 제외한다.
- 여기서는 DB 인스턴스를 다룬다. Aurora와 Multi-AZ DB 클러스터에 인스턴스용 API와 지원 조건을 그대로 적용하지 않는다.

## 예약 자동화의 기본 흐름

AWS Knowledge Center는 대상 태그, Lambda와 EventBridge로 유지보수 시간 전후에 시작과 중지를 예약하는 예를 제공한다. `autostart=yes`, `autostop=yes`는 해당 구현이 읽는 태그이며, 태그만 붙여서는 RDS가 자동으로 시작하거나 중지하지 않는다.

| 단계 | 확인할 조건 | 다음 동작 |
|---|---|---|
| 대상 선택 | 계정, 리전, 대상 태그와 중지 지원 구성 | 승인된 개발, 테스트 인스턴스만 선택 |
| 시작 | 현재 상태가 `stopped` | 시작 요청 후 상태 확인 |
| 유지보수 | 실제 유지보수와 보류 작업 상태 | 진행 중인 작업을 확인하며 대기 |
| 재중지 | 유지보수 완료와 `available` 상태 | 중지 요청 후 `stopped` 도달 확인 |
| 실패 처리 | 권한 오류, 상태 충돌, 시간 초과 | 실패를 알리고 재시도 또는 수동 조치 |

위 표는 공식 예제를 운영에 적용할 때의 점검 흐름이다. 예제의 태그 필터는 대상 선택이고 IAM 권한 경계는 별도다. 시작과 중지 권한은 지원되는 리소스 범위나 태그 조건으로 제한하고, 조회와 로그 기록에 필요한 권한도 따로 확인한다.

## 유지보수 종료 시각을 고정 대기로 대신하지 않는다

유지보수 창은 작업이 시작될 시간 범위다. 작업이 창 종료 전에 끝난다는 보장은 없다. 따라서 종료 시각에서 30분 뒤에 중지하도록 예약해도 유지보수 완료가 증명되지는 않는다.

운영에서는 다음을 함께 확인한다.

1. 시작에 걸리는 시간을 측정해 유지보수 전에 준비될 여유를 둔다.
2. 예약 시각뿐 아니라 DB 상태와 유지보수 진행 결과를 확인한다.
3. `DescribePendingMaintenanceActions`는 최종 일관성이므로 직후 조회 한 번을 확정 결과로 삼지 않는다. 공식 문서의 지수 백오프 지침을 적용한다.
4. 중지 실패로 인스턴스가 계속 실행되는 경우를 알림과 실행 이력에서 확인한다.

자동화가 복잡해지면 상태 대기와 실패 분기를 관리할 방법을 검토한다. [[Step-Functions|Step Functions]]나 Systems Manager Maintenance Windows는 대안이며, 단순한 일정에 모두 도입할 필요는 없다.

## Instance Scheduler의 태그, 일정과 수동 조작

부분 검증(2026-10-13): Instance Scheduler on AWS의 공식 운영 가이드와 일정 정의를 대조했다. 이 절은 RDS 인스턴스에 일정을 연결하는 방법을 보강하며, 앞 절의 중지 지원 조건과 유지보수 검증 기준일은 유지한다.

Instance Scheduler는 리소스 태그와 Lambda를 사용해 여러 계정과 리전의 EC2, RDS 시작과 중지를 자동화하는 배포형 솔루션이다. RDS에서는 중지 가능한 구성인지 먼저 확인한 뒤 다음 연결을 점검한다.

| 설정 | 확인할 관계 |
|---|---|
| 태그 key | 솔루션 배포 때 지정한 key와 같아야 한다. 기본값은 `Schedule`이다 |
| 태그 value | 적용할 **schedule 이름**이다. period 이름을 넣는 필드가 아니다 |
| schedule | 하나 이상의 period를 참조한다. 여러 period 중 하나라도 실행 조건을 만족하면 실행 대상으로 판단한다 |
| period와 시간대 | period에 실행 시간과 요일 등을 두고 schedule의 `timezone`을 명시한다. 한국 업무 시간 예시는 `Asia/Seoul`이다 |

태그에 적은 schedule이 없거나 이름이 틀리면 `UnknownSchedule` 오류로 중지되지 않을 수 있다. informational tagging을 켠 경우 `IS-Error`와 `IS-LastAction`을 실제 DB 상태와 함께 확인한다.

- `enforced: false`가 기본이다. 실행 시간 중 수동으로 중지한 인스턴스를 다시 시작하지 않으며, 최초 중지 전환 이후 실행 시간 밖에서 수동 시작한 인스턴스도 자동 중지하지 않는다. `true`는 이런 수동 변경을 일정에 맞게 되돌린다.
- `stop_new_instances: false`이면 처음 태그를 붙일 때 실행 시간 밖에서 켜져 있던 인스턴스가 다음 중지 전환까지 계속 실행될 수 있다.
- `retain_running: true`이면 실행 시간 전에 수동 시작한 인스턴스를 해당 실행 시간 종료 시 중지하지 않는다. 긴급 작업 예외로 사용할 때는 종료 책임과 모니터링을 함께 정한다.
- CloudFormation custom resource로 관리하는 schedule과 period는 DynamoDB 콘솔이나 Scheduler CLI로 따로 수정하지 않는다. 선언한 설정과 저장된 값이 어긋나기 때문이다.

적용 점검 제안: 개발 DB 하나에서 정상 일정, 잘못된 태그와 수동 시작을 각각 시험한다. 실행 시간 감소만으로 절감액을 확정하지 않고 남는 스토리지 비용과 솔루션 운영 비용도 함께 비교한다.

## Systems Manager로 시작과 중지를 예약한다

부분 검증(2026-10-16): 이 절의 대상 지정, runbook 입력과 역할 구분을 AWS Prescriptive Guidance와 Automation Runbook Reference에 대조했다. 기존 절의 검증 기준일은 유지한다.

단순한 업무 시간 예약은 Maintenance Windows와 제공 runbook으로 구성할 수 있다. 시작용 창에는 `AWS-StartRdsInstance`, 중지용 창에는 `AWS-StopRdsInstance`를 연결하고 각각 cron과 시간대를 지정한다. 이 창은 자동화 작업의 실행 일정이며 RDS 자체의 유지보수 창과 별개다.

| 연결 지점 | 확인할 값 |
|---|---|
| Resource Groups | 대상 DB에 붙인 태그와 리소스 유형 `AWS::RDS::DBInstance`로 그룹을 구성한다 |
| Maintenance Windows 대상 | 해당 그룹을 등록하고, 작업에서는 등록한 대상 그룹을 선택한다 |
| `InstanceId` | 그룹의 각 DB를 넘기는 공식 패턴은 `{{RESOURCE_ID}}`를 사용한다 |
| `AutomationAssumeRole` | RDS 시작과 중지를 수행할 Automation 역할 ARN을 지정한다 |
| 작업의 Service role | Maintenance Windows가 작업을 실행하는 역할이다. Automation 역할과 역할 용도를 구분한다 |

Automation 역할의 시작과 중지 권한은 대상 DB ARN으로 제한하고, `rds:DescribeDBInstances` 조회 권한은 별도로 둔다. runbook의 `AutomationAssumeRole`은 선택 입력이지만, 생략하면 runbook을 시작한 주체의 권한을 사용하므로 예약 실행에서는 사용할 역할을 명시한다.

운영 점검 제안: 태그 검색 결과를 먼저 확인하고 개발 DB 하나에서 시작과 중지를 시험한다. 실행 이력과 실제 DB 상태를 함께 확인하며, 창의 Duration을 DB가 켜져 있을 시간으로 해석하지 않는다. 7일 자동 재시작과 재가동 대기 시간은 이 예약 방식에서도 고려해야 한다.

## 이해 점검

- 7일보다 긴 미사용 기간과 7일 연속 중지는 어떻게 다른가?
- 중지 후에도 남는 비용과 다시 사용할 때의 대기 시간은 무엇인가?
- 유지보수 창이 끝났는데 DB가 작업 중이면 중지 자동화는 무엇을 확인해야 하는가?

## 출처

- [AWS Systems Manager Automation Runbook Reference, AWS-StartRdsInstance](https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-startrdsinstance.html)
- [AWS Systems Manager Automation Runbook Reference, AWS-StopRdsInstance](https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-stoprdsinstance.html)
- [Instance Scheduler on AWS, Operator guide](https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/operator-guide.html)
- [Instance Scheduler on AWS, Schedule reference](https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/schedule-reference.html)
- [Instance Scheduler on AWS, Automate starting and stopping AWS instances](https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/solution-overview.html)
- [Amazon RDS, Stopping an Amazon RDS DB instance temporarily](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html)
- [How do I use a Lambda function to stop an Amazon RDS DB instance for more than seven days? — AWS re:Post](https://repost.aws/knowledge-center/rds-stop-seven-days)
- [Amazon RDS, Maintaining a DB instance](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.Maintenance.html)
- [AWS Prescriptive Guidance, Automatically stop and start an Amazon RDS DB instance using AWS Systems Manager Maintenance Windows](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/automatically-stop-and-start-an-amazon-rds-db-instance-using-aws-systems-manager-maintenance-windows.html)

## 관련 문서

- [[rds-operations|RDS 운영 인덱스]]
- [[RDS-Operational-Pitfalls|RDS 운영 함정]]
- [[Budget-Alert|예산 알람과 조치]]
- [[AWS-Lambda|AWS Lambda]]
- [[EventBridge|Amazon EventBridge]]
