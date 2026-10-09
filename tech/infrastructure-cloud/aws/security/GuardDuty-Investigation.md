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

2026-10-09 공식 문서 대조 기준. Cost Explorer의 GuardDuty 비용은 조사할 계정과 리전을 찾는 보조 신호다. 비용이 없다는 사실만으로 미활성화를 확정하거나, 비용이 있다는 사실만으로 모든 보호 계획이 현재 활성화됐다고 판단하지 않는다. 대부분의 보호 계획에는 계정별 30일 무료 체험이 있으며, Cost Explorer 데이터도 최소 하루 한 번 갱신하지만 상위 청구 데이터에 따라 24시간보다 늦게 반영될 수 있다.

다음은 비용과 설정을 대조하는 점검 절차다.

1. 조직의 계정 목록과 점검할 리전 목록을 기준으로 조사 대상을 만든다. 비용이 발생한 계정만 목록에 넣지 않는다.
2. 해당 리전의 GuardDuty Accounts 화면과 `ListMembers`로 멤버 구성을 확인한다. `GetMemberDetectors`로 멤버 detector의 데이터 소스와 feature 상태를 확인하고 조회에 실패한 계정은 미확인으로 남긴다.
3. 기존 리전별 auto-enable 방식을 쓰면 `ALL`, `NEW`, `NONE`을 구분한다. `NEW`는 신규 가입 멤버만 대상으로 하며, `NONE`으로 변경해도 기존 활성 설정을 끄지는 않는다. 보호 계획별 설정과 리전 지원 여부도 확인한다.
4. 설정을 바꾼 뒤 실제 상태를 다시 읽는다. 기존 auto-enable 설정의 전체 멤버 반영에는 최대 24시간이 걸릴 수 있으므로 요청 성공과 적용 완료를 나눈다.

조직 선언적 정책을 사용하는 환경은 리전별 auto-enable 방식과 구분한다. 이 정책은 조직 root, OU 또는 계정에 기본 활성화 설정과 리전별 재정의를 적용할 수 있으며, 정책으로 정한 활성화 상태는 GuardDuty 콘솔이나 API에서 덮어쓸 수 없다. 적용 정책과 실제 계정 상태를 함께 확인한다.

## 출처

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
