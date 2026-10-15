---
tags: [infrastructure, aws, guardduty, security, incident-response]
status: done
verified_at: 2026-10-09
category: "Infrastructure - AWS"
aliases: ["GuardDuty Investigation", "GuardDuty 경보 조사"]
---

# GuardDuty 경보 조사와 대응 판단

GuardDuty Investigation은 finding, 계정 또는 조직 범위의 보안 신호를 AI로 분석한다. 결과에는 위험 수준, 판단 신뢰도, 근거와 권고 조치가 포함된다. 조사 보고서는 대응 판단의 입력이며 침해 부재를 보증하는 결과가 아니다.

## 사용 전제

2026-10-07 공식 문서는 이 기능을 **Preview**로 명시한다.

- 지원 리전의 활성 detector에서 Investigation 기능을 켜고 조사 API 권한을 부여해야 한다.
- finding 분석은 모든 finding 유형을 지원하지 않는다. 대상 유형을 먼저 확인한다.
- 조직의 관리자 계정은 자신과 멤버 계정의 조사를 만들 수 있다. 멤버 계정은 자신의 조사 조회와 목록 열람만 가능하다.
- Cross-Region inference를 사용한다. 요청 리전에 저장하더라도 분석 처리는 같은 지리 범위의 다른 리전에서 수행될 수 있다.

지원 리전, 분석 유형과 quota는 도입 시 공식 문서에서 다시 확인한다.

## 결과를 읽는 순서

| 항목 | 판단할 것 |
|---|---|
| 조사 범위와 상태 | 원하는 계정과 finding을 조사했고 완료됐는가 |
| 위험 수준 | 대응 우선순위는 어느 정도인가 |
| 판단 신뢰도와 근거 | 결론을 뒷받침하는 데이터가 충분한가 |
| 권고 조치 | 대상 리소스와 실제 변경 효과가 맞는가 |

낮은 위험과 낮은 신뢰도는 다른 의미다. 정상 로그인과 일치한다는 판단만으로 계정 전체에 공격이 없었다고 확대하지 않는다. 공식 문서도 AI 분석의 오류와 불완전 가능성 때문에 사람의 검토를 권한다.

## 대응 절차에 연결한다

다음은 조사 결과를 운영에 적용하기 위한 점검 제안이다. 사건 시각, 호출 주체와 영향 리소스를 원 로그와 대조한다. 권고 CLI는 실행 전에 권한 축소나 격리의 서비스 영향, 복구 방법을 검토한다. 실행 뒤에는 실제 차단과 정상 기능을 확인한다. 권고 명령이 있다는 사실과 대응 완료는 구분한다.

## 경보가 없을 때 보호 범위부터 확인한다

### EventBridge 알림의 발생과 반복 주기를 나눈다

부분 검증(2026-10-16): GuardDuty의 EventBridge 연동 문서를 대조했다. 새로운 finding ID의 알림은 finding 생성 뒤 거의 실시간으로 발행한다. 공격 발생 순간부터의 탐지 시간이나 대응 완료 시간을 보장한다는 뜻은 아니다.

기존 finding의 후속 발생분은 기본 6시간 간격으로 집계해 알린다. 관리자 계정은 이 간격을 15분, 1시간 또는 6시간으로 설정할 수 있으며 멤버 계정은 자기 계정의 간격을 바꿀 수 없다. 알림 건수를 공격 발생 횟수로 그대로 계산하지 않는다.

수동으로 보관한 finding의 후속 발생분은 EventBridge로 전달되지만, suppression rule로 자동 보관된 finding은 초기와 후속 발생분 모두 전달되지 않는다. 알림이 없으면 탐지 상태뿐 아니라 suppression 설정도 확인한다. 실제 Lambda나 SNS 대상으로 전달하려면 이벤트 패턴과 대상이 있는 EventBridge rule이 필요하다.

운영 점검 제안: 새 finding, 반복 발생과 자동 보관을 나누어 알림 경로를 시험한다. 전달 성공과 실제 격리 성공도 별도로 기록한다. 이 절은 문서 대조이며 실제 경보 생성이나 대응 실행을 시험한 기록은 아니다.

### 탐지용 수집과 조사 증거 보존을 나눈다

2026-10-14 foundational data sources와 finding export 공식 가이드 부분 대조 기준이다. 기존 Investigation Preview와 조직 정책의 검증일은 유지한다.

- 기본 탐지는 CloudTrail 관리 이벤트, EC2의 VPC flow log와 Route 53 Resolver DNS query log를 분석한다. GuardDuty는 독립적인 데이터 스트림을 사용하므로 이 분석을 위해 사용자가 trail이나 VPC Flow Logs를 별도로 만들 필요는 없다.
- DNS 분석에는 EC2가 사용하는 resolver 조건이 있다. 외부 DNS나 직접 구성한 resolver를 사용하면 이 DNS 데이터 소스를 분석할 수 없다. 경보 부재를 확인할 때 실제 resolver 경로도 조사한다.
- GuardDuty는 분석에 필요한 필드를 추출한 뒤 수집 로그를 폐기한다. 탐지 기능 활성화가 조사자가 조회할 원 로그의 보존을 대신하지 않으므로 CloudTrail과 VPC Flow Logs의 보존은 별도로 설계한다.
- 생성된 finding은 90일 보존한다. 더 긴 이력이 필요하면 S3 내보내기를 구성하고, 리전별 설정과 S3/KMS 권한을 확인한다. 보관 상태의 finding과 suppression으로 보관된 발생분은 기본적으로 내보내지 않는다.

운영 점검 제안: 탐지 범위, 원 로그 보존, finding 내보내기를 각각 확인한다. S3에 finding이 있다는 사실만으로 사건의 원 로그까지 확보했다고 판단하지 않는다. 위 기본 데이터 수집 조건을 security agent가 필요한 Runtime Monitoring에 확대 적용하지 않는다.

### 공격 시퀀스와 실제 수집 범위를 구분한다

부분 검증(2026-10-14): Extended Threat Detection과 Runtime Monitoring 활성화 문서를 대조했다. 기존 Investigation Preview와 조직 정책 전체를 재검증한 날짜는 아니다.

Extended Threat Detection은 계정 안에서 시간과 리소스에 걸친 신호를 연결해 공격 시퀀스 finding을 만든다. GuardDuty 활성화 시 기본으로 켜지고 이 기능 자체의 추가 비용은 없지만, 추가 보호 계획의 활성화와 비용까지 포함한다는 뜻은 아니다.

- EC2는 Auto Scaling group, instance profile, launch template 같은 공통 속성으로 관련 인스턴스를 묶을 수 있다. `AttackSequence:EC2/CompromisedInstanceGroup`은 Critical finding이며, Runtime Monitoring을 더하면 프로세스 행동과 시스템 호출 신호를 보강한다.
- ECS의 `AttackSequence:ECS/CompromisedCluster` 탐지에는 실행 방식에 맞는 EC2 또는 Fargate Runtime Monitoring이 필요하다. 현재 문서는 ECS on Managed EC2 instances를 지원하지 않는다고 명시한다.
- Runtime Monitoring 설정 활성화와 security agent 배포를 모두 확인한다. 설정이 켜졌다는 사실만으로 대상 리소스의 이벤트가 수집된다고 판단하지 않는다.
- 보관 처리한 finding은 공격 시퀀스 상관분석에서 제외된다. suppression rule이 자동 보관한 finding도 포함되므로, 경보를 줄이는 규칙의 탐지 영향을 함께 점검한다.

운영 점검 제안: 시퀀스의 신호, 시각, 리소스를 원 로그와 대조한 뒤 격리 대상을 결정한다. finding 하나로 묶였다는 사실을 모든 관련 자원의 침해 확정이나 자동 복구 완료로 해석하지 않는다.

### EKS 제어 평면과 컨테이너 내부의 탐지 범위를 나눈다

부분 검증(2026-10-16): EKS 공격 시퀀스의 활성화 조건과 Runtime Monitoring 지원 범위를 공식 가이드로 대조했다.

- EKS의 Extended Threat Detection에는 EKS Protection 또는 EKS add-on을 사용하는 Runtime Monitoring 중 적어도 하나가 필요하다. 두 보호 계획을 모두 켜는 것은 탐지 범위를 넓히는 권장 구성이다.
- EKS Protection은 audit log를 통해 제어 평면 활동을 관찰한다. Runtime Monitoring은 컨테이너 안의 프로세스 실행, 파일 접근과 네트워크 연결 같은 행동을 관찰한다. 한쪽만 활성화한 상태를 두 범위 모두의 수집 완료로 해석하지 않는다.
- 관련 신호는 Critical 등급의 `AttackSequence:EKS/CompromisedCluster`로 묶일 수 있다. 특권 컨테이너 배포와 그 안의 채굴 프로세스 실행을 연결하는 경우처럼, 설정 변경과 실행 행동을 시간순으로 확인한다.
- Runtime Monitoring은 EKS on Fargate를 지원하지 않는다. ECS on Fargate 지원을 EKS에 그대로 적용하지 않는다.

운영 점검 제안: 클러스터별 실행 방식, 보호 계획과 agent 상태를 확인하고 finding의 신호를 원 로그와 대조한다. 이 절은 실제 공격 시뮬레이션이나 계정 설정 검증 결과가 아니며 기존 Investigation 기능의 검증일은 유지한다.

### 계정과 보호 계획 설정을 대조한다

2026-10-09 공식 문서 대조 기준. Cost Explorer의 GuardDuty 비용은 조사할 계정과 리전을 찾는 보조 신호다. 비용이 없다는 사실만으로 미활성화를 확정하거나, 비용이 있다는 사실만으로 모든 보호 계획이 현재 활성화됐다고 판단하지 않는다. 대부분의 보호 계획에는 계정별 30일 무료 체험이 있으며, Cost Explorer 데이터도 최소 하루 한 번 갱신하지만 상위 청구 데이터에 따라 24시간보다 늦게 반영될 수 있다.

다음은 비용과 설정을 대조하는 점검 절차다.

1. 조직의 계정 목록과 점검할 리전 목록을 기준으로 조사 대상을 만든다. 비용이 발생한 계정만 목록에 넣지 않는다.
2. 해당 리전의 GuardDuty Accounts 화면과 `ListMembers`로 멤버 구성을 확인한다. `GetMemberDetectors`로 멤버 detector의 데이터 소스와 feature 상태를 확인하고 조회에 실패한 계정은 미확인으로 남긴다.
3. 기존 리전별 auto-enable 방식을 쓰면 `ALL`, `NEW`, `NONE`을 구분한다. `NEW`는 신규 가입 멤버만 대상으로 하며, `NONE`으로 변경해도 기존 활성 설정을 끄지는 않는다. 보호 계획별 설정과 리전 지원 여부도 확인한다.
4. 설정을 바꾼 뒤 실제 상태를 다시 읽는다. 기존 auto-enable 설정의 전체 멤버 반영에는 최대 24시간이 걸릴 수 있으므로 요청 성공과 적용 완료를 나눈다.

조직 선언적 정책을 사용하는 환경은 리전별 auto-enable 방식과 구분한다. 이 정책은 조직 root, OU 또는 계정에 기본 활성화 설정과 리전별 재정의를 적용할 수 있으며, 정책으로 정한 활성화 상태는 GuardDuty 콘솔이나 API에서 덮어쓸 수 없다. 적용 정책과 실제 계정 상태를 함께 확인한다.

## 출처

- [Amazon GuardDuty, GuardDuty Runtime Monitoring](https://docs.aws.amazon.com/guardduty/latest/ug/runtime-monitoring.html)
- [Amazon GuardDuty, Processing GuardDuty findings with Amazon EventBridge](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html)

- [Amazon GuardDuty, GuardDuty foundational data sources](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_data-sources.html)
- [Amazon GuardDuty, Exporting generated GuardDuty findings to Amazon S3 buckets](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_exportfindings.html)
- [Amazon GuardDuty, GuardDuty Extended Threat Detection](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-extended-threat-detection.html)
- [Amazon GuardDuty, Enabling Runtime Monitoring](https://docs.aws.amazon.com/guardduty/latest/ug/runtime-monitoring-enablement.html)
- [Amazon GuardDuty, GuardDuty Investigation (Preview)](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-investigation.html)
- [Amazon GuardDuty, Monitoring GuardDuty Usage and Estimating Costs](https://docs.aws.amazon.com/guardduty/latest/ug/monitoring_costs.html)
- [AWS Cost Management, Analyzing your costs and usage with AWS Cost Explorer](https://docs.aws.amazon.com/cost-management/latest/userguide/ce-what-is.html)
- [Amazon GuardDuty, Setting organization auto-enable preferences](https://docs.aws.amazon.com/guardduty/latest/ug/set-guardduty-auto-enable-preferences.html)
- [Amazon GuardDuty, GetMemberDetectors](https://docs.aws.amazon.com/guardduty/latest/APIReference/API_GetMemberDetectors.html)
- [Amazon GuardDuty now supports centralized management using AWS Organizations declarative policies — AWS](https://aws.amazon.com/about-aws/whats-new/2026/10/guardduty-org-enablement-policies/)

## 관련 문서

- [[Security-Incident-Response|보안 사고 대응]]
- [[CloudTrail-Config|CloudTrail과 Config]]
- [[IAM|IAM 권한 평가]]
