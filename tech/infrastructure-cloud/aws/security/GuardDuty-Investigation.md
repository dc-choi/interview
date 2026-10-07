---
tags: [infrastructure, aws, guardduty, security, incident-response]
status: done
verified_at: 2026-10-07
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

## 출처

- [Amazon GuardDuty, GuardDuty Investigation (Preview)](https://docs.aws.amazon.com/guardduty/latest/ug/guardduty-investigation.html)

## 관련 문서

- [[Security-Incident-Response|보안 사고 대응]]
- [[CloudTrail-Config|CloudTrail과 Config]]
- [[IAM|IAM 권한 평가]]
