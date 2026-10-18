---
tags: [palantir, foundry, release-history]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["2024 거버넌스 가시성과 승인 경계"]
---

# 2024 거버넌스 가시성과 승인 경계

2024년 공식 release note의 역사적 변경 기록이다. 현재 지원과 기본값은 해당 제품의 최신 계약을 다시 확인한다.

## 발견 가능한 정보와 사용 가능한 데이터

Project cover page와 Portfolio가11월 GA로 소개됐다. Space에 접근하면 Portfolio를 볼 수 있어도 내부 project 권한은 별도이고 당시 project는 최대 하나의 Portfolio에 속한다. Marked project의 cover page도 Organization에 발견 가능하게 만들 수 있어 설명에 민감정보가 들어가는 경계를 검토해야 한다.

4월 Project constraints는 사용자가 각각 읽을 수 있는 Marking 조합이라도 같은 project에서 결합하지 못하도록 제한하는 목적을 설명한다.12월 Project template은 space별 role/group/marking/constraint 기본을 mandate하는 경로다. UI metadata나 template 적용만으로 법률 준수를 자동 증명하지 않는다.

1월 beta→4월 GA time-based group membership은 latest expiration/maximum duration과 access request를 함께 제한한다. Request 생성 가능과 membership 승인/실제 access는 다르다.3월 expiry reminder/revocation notification도 실제 credential/data 사본의 회수 범위와 구분한다.

## 승인과 적용의 상태

Approvals는 request/subtask/eligible task/override/revert를 점차 개선했다.12월 eligible reviewer는 이전 review를 override할 수 있고 revert는 사용자가 수동 undo할 권한과 아직 유효한 변경이 있어야 하며 checkpoint가 적용된다. 취소한 dialog에 성공 메시지가 잘못 보이던 bug도11월 수정됐다. UI toast만으로 실제 role/marking 상태를 확정하지 않는다.

11월 Application access change는 Approvals에 나타나지만 당시 auto-approved/auto-applied이며 mandatory admin approval은 roadmap이었다. 승인 inbox에 있다는 사실을 human approval 완료로 보고하지 않는다.7월 lifecycle 변경은 기존 access 유지, GA 기본 enable(명시적 disable/restriction 예외), deprecation access 제거를 설명한다. Sunset은 즉시 migration 강제가 아니다.

5월 egress suggestion은 Information Security Officer 승인/거절을 따르고 해당 officer의 제안은 자동 승인된다. Sources/credentials/egress policy와 approval pending 상태를 분리한다. Same-region S3 policy는 당시 AWS 조건이며 다른 provider/region의 현재 지원을 여기서 추론하지 않는다.

## Checkpoint와 최소 공개

2월 reauthentication justification은 configured IdP 재인증과 기록을 제공하며 Login/Scoped Session Select에는 적용하지 않는다고 명시한다. Build/schedule/model download/API metadata/branch policy/merge 같은 추가 checkpoint type은 각각 민감한 경계다. Recent justification 재사용은 최대5개/30일 설정이며 새 행위의 적절성을 자동 증명하지 않는다.

Cipher는4월 legacy purpose justification을 Checkpoints로 바꿨고 기존 channel 복구에 checkpoint 설정이 필요했다.11월 visual obfuscation은 reversible/commutative pixel scrambling과 license/빈도 제한/checkpoint를 다룬다. Irreversible redaction/anonymization과 구분하며 PNG와 지원 포맷/decoder 경계가 있다.

Sensitive Data Scanner는 독립 앱/내장 match/사후 match action reverse와10월 Virtual Table one-time scan을 확장했다. Scan 결과는 검출 후보이며 unknown이나 미검출이 민감정보 부재를 증명하지 않는다. 실제 권한/egress/scan/암호 변경은 하지 않았다.

## 출처

- [Palantir, 2024 release notes](https://www.palantir.com/docs/foundry/announcements/release-notes/2024)
- [Palantir, 2024 release notes](https://www.palantir.com/docs/foundry/release-notes/2024)

## 관련 문서

- [[Palantir-Platform-Evolution-2024]]
