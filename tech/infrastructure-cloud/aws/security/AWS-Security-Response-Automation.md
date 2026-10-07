---
tags: [aws, security, eventbridge, incident-response, automation]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["AWS Security Response Automation", "AWS 보안 대응 자동화"]
---

# AWS 보안 경보와 대응 자동화

보안 finding은 조사와 조치를 시작하는 신호다. finding의 심각도를 바꾸거나 알림을 보낸 사실과 실제 자원의 설정을 고친 사실은 구분한다. 대응 자동화는 신호를 분류한 뒤 허용된 작업을 실행하고 결과를 확인하는 흐름으로 설계한다.

## 분류와 실제 조치를 구분한다

| 단계 | AWS 기능의 예 | 확인할 결과 |
|---|---|---|
| 탐지 | GuardDuty finding | 영향을 받은 자원과 탐지 근거 |
| 분류 | Security Hub CSPM automation rule | finding의 심각도, 메모와 workflow 상태 변경 |
| 전달 | EventBridge rule | 조건에 맞는 이벤트와 대상 호출 |
| 실행 | Lambda, Step Functions, Systems Manager Automation | 실제 API 호출과 자원 상태 변경 |

Security Hub CSPM의 automation rule은 finding 필드를 변경한다. 이를 EC2 격리나 접근 정책 수정으로 해석하지 않는다. Security Hub의 새 finding과 갱신 finding을 EventBridge로 받아 Lambda나 Step Functions 등을 호출하는 대응 경로는 별도로 구성한다. GuardDuty finding을 EventBridge로 직접 받는 경로도 가능하다.

## 런북의 권한과 승인

AWS의 Automated Security Response 솔루션은 대상 계정의 조치 역할과 Systems Manager 런북을 구성하는 예다. 계정 간 이벤트 전달만으로 대상 자원의 변경 권한까지 생기지는 않는다. 조치에 필요한 API와 대상 자원으로 실행 역할을 제한한다.

서비스 중단 가능성이 있는 격리나 정책 변경은 실행 전 승인 단계가 필요한지 판단한다. Systems Manager의 `aws:approve`는 자동화 실행을 일시 중지하고 지정된 주체의 승인을 기다리는 단계다. 탐지 심각도 하나만으로 모든 운영 변경을 즉시 실행하도록 묶지 않는다.

## 관리형 사고 대응의 권한 경계

AWS Security Incident Response는 finding의 자동 분류와 사고 조사, 대응을 지원하는 관리형 서비스다. 2026-10-07 공식 가이드 기준으로 도입과 격리 권한을 다음처럼 구분한다.

- **등록 범위**: AWS Organizations의 All Features가 필요하다. 중앙 membership은 위임 관리자 계정에 두는 구성이 권장되며, 적용 범위는 조직 전체 또는 선택한 OU와 하위 OU다. 개별 계정을 직접 고르는 방식은 아니다.
- **조사 권한**: 서비스 연결 역할, 로그 접근과 Proactive Response의 finding 수집 권한을 검토한다. GuardDuty와 Security Hub CSPM의 탐지 설정도 별도로 확인한다.
- **경보 억제**: 정상 활동으로 분류한 finding을 보관하거나 억제하고, quota가 허용하면 같은 활동의 후속 경보를 억제할 규칙을 만들 수 있다. 경보 감소 자체는 자원의 취약점 수정이나 침해 차단을 뜻하지 않는다.
- **격리 권한**: containment는 별도의 권한과 선호 설정이 필요하다. 사전 승인한 범위와 서비스 영향을 확인하고 조사 권한만으로 모든 격리 조치를 허용했다고 판단하지 않는다.

EC2 containment는 인스턴스를 보존한 채 보안 그룹을 제한적인 그룹으로 바꾼다. **이미 추적 중인 연결은 보안 그룹 변경만으로 끊어지지 않는다.** 따라서 조치 완료 기록과 실제 연결 차단 효과를 따로 확인한다. 격리 해제와 근본 원인 제거, 서비스 복구도 별개의 단계다.

## 운영 검토 예시

다음은 위 기능을 조합할 때 사용할 설계 점검 항목이며, 제품이 자동으로 보장하는 동작은 아니다.

1. finding의 자원, 계정과 리전을 확인하고 현재 자원 상태를 다시 읽는다. 이미 해결된 경보에 조치를 반복하지 않는다.
2. 같은 finding의 갱신이나 재처리에도 안전하도록 작업의 멱등성과 완료 기록을 정한다.
3. 변경 전 설정, 실행 역할, 승인과 실행 결과를 기록한다. 차단 중에도 조사에 필요한 접근과 증거를 보존한다.
4. API 성공 뒤 실제 차단 여부와 서비스 영향을 따로 확인한다. 알림 전달 성공을 조치 완료로 계산하지 않는다.
5. 오탐과 실패 시 복구할 설정, 담당자와 중단 조건을 런북에 둔다.

예를 들어 EC2를 격리하는 작업은 경보 분류, 현재 연결 확인, 승인, 격리 실행, 효과 확인으로 나눠 검토한다. 어떤 네트워크 경로를 차단할지는 해당 환경에서 별도로 검증한다.

## 출처

- [AWS, Step 1: Enable and configure AWS Security Incident Response](https://docs.aws.amazon.com/security-ir/latest/userguide/deploy-configure.html)
- [AWS, Detect and Analyze](https://docs.aws.amazon.com/security-ir/latest/userguide/detect-and-analyze.html)
- [AWS, Contain](https://docs.aws.amazon.com/security-ir/latest/userguide/contain.html)
- [AWS, Understanding automation rules in Security Hub CSPM](https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html)
- [AWS, Automation rules in EventBridge](https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-v2-eventbridge-automations.html)
- [AWS, Processing GuardDuty findings with Amazon EventBridge](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html)
- [AWS, Adding new remediations](https://docs.aws.amazon.com/solutions/latest/automated-security-response-on-aws/adding-new-remediations.html)
- [AWS, aws:approve – Pause an automation for manual approval](https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-approve.html)

## 관련 문서

- [[GuardDuty-Investigation|GuardDuty 경보 조사]]
- [[EventBridge|이벤트 전달과 라우팅]]
- [[Security-Incident-Response|보안 사고 대응]]
