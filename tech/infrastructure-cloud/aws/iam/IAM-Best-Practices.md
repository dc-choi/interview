---
tags: [infrastructure, aws, iam, security, identity]
status: done
category: "Infrastructure - AWS"
aliases: ["IAM 모범 사례", "IAM 면접 체크포인트"]
verified_at: 2026-07-21
---

# IAM 모범 사례, 흔한 실수, 체크포인트

## 모범 사례

- **Root 사용자 일상 사용 금지** — passkey 또는 MFA로 보호하고 AWS가 root credentials를 요구하는 root-only task에만 사용. 일상 작업은 federation과 IAM Role의 임시 자격증명을 우선
- **최소 권한 원칙** — `*` 정책 회피, 필요한 Action, Resource만
- **MFA 강제** — 콘솔, 민감 API 호출
- **장기 Access Key 최소화** — 사람은 federation, workload는 IAM Role의 임시 자격증명을 우선. 장기 키가 불가피하면 사용 사례에 필요한 시점에 갱신하고 미사용 키를 제거하며 노출을 모니터링
- **CloudTrail로 감사** — 모든 IAM 호출 기록
- **Access Analyzer** — 외부 공개, 크로스 어카운트 노출 자동 탐지
- **태그 기반 권한** — `aws:RequestTag` / `aws:ResourceTag`로 동적 분리

## 흔한 실수

- **Access Key를 코드, git에 커밋** — 즉시 자격증명 침해. Role + IRSA, Instance Profile 사용
- **`*` 정책으로 시작해 좁힐 계획** — 계속 그 상태 유지됨. 처음부터 좁게
- **Trust Policy 광범위** — 의도하지 않은 principal이 AssumeRole할 수 있음. Principal과 조건을 좁히고, 제3자에게 역할을 위임해 confused deputy 위험이 있을 때는 `ExternalId`를 사용. 조직 내부 등 모든 신뢰 정책에 ExternalId가 필수인 것은 아님
- **Resource Policy + Identity Policy 충돌** — Deny 한쪽이라도 있으면 차단
- **Permission Boundary 무시** — 위임 관리 시 권한 escalation 위험
- **콘솔에서 직접 정책 변경** — CloudTrail로 감사할 수는 있지만 IaC의 review, state와 재현 가능한 배포 경로 밖에서 drift가 생김. break-glass를 제외한 정상 변경은 Terraform, CDK 등 코드 경로로 관리하고 CloudTrail과 drift detection을 함께 사용
- **Inline policy 남발** — 추적, 재사용 어려움. Managed policy 우선

## 면접 / 시험 체크포인트

- IAM은 **글로벌 서비스** — Region 무관
- 정책 평가 순서 — 명시 Deny → 명시 Allow → default Deny
- Identity vs Resource Policy 차이와 평가 시 합집합
- Permissions Boundary는 identity-based policy가 부여할 수 있는 상한이다. 실제 권한은 resource-based policy, SCP/RCP, session policy와 명시적 Deny까지 요청 문맥 전체로 평가
- AssumeRole의 STS 임시 자격증명 흐름과 Trust Policy
- Cross-Account Access의 ExternalId 패턴
- EC2 Instance Profile, IRSA의 자격증명 노출 메커니즘 (IMDS, OIDC)
- Condition Key로 IP, MFA, 암호화 강제하는 fine-grained 제어
- Access Key vs Role — 왜 Role 우선인가
- **Access Key는 생성 시점에만 노출** — 분실 시 재발급
- 신규 User는 기본 **권한 없음**, 콘솔, 프로그래밍 액세스 별도 선택
- JSON 정책의 주요 요소는 `Effect`, `Action`, `Resource`, `Condition` 등이며 정책 유형마다 허용 요소가 다르다. `Principal`은 resource-based policy와 role trust policy에 사용하고 identity-based policy에는 넣지 않는다
- Federation 종류: **SAML, OIDC, Web Identity, IAM Identity Center**

## 관련 문서
- [[IAM|IAM (인덱스)]]
- [[IAM-Policy|IAM 정책]]
- [[IAM-Role-Federation|AssumeRole과 Federation]]

## 출처

- [AWS IAM — Security best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [Principal 정책 요소](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html)
- [IAM 정책 평가 로직](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)
- [제3자 접근과 ExternalId](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html)
- [Root user 전용 작업](https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-tasks.html)
- [IAM과 CloudTrail](https://docs.aws.amazon.com/IAM/latest/UserGuide/cloudtrail-integration.html)
