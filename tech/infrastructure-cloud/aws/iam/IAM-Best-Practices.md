---
tags: [infrastructure, aws, iam, security, identity]
status: done
category: "Infrastructure - AWS"
aliases: ["IAM 모범 사례", "IAM 면접 체크포인트"]
---

# IAM 모범 사례, 흔한 실수, 체크포인트

## 모범 사례

- **Root 계정 사용 금지** — MFA 강제 후 일상 작업은 IAM User/Role
- **최소 권한 원칙** — `*` 정책 회피, 필요한 Action, Resource만
- **MFA 강제** — 콘솔, 민감 API 호출
- **Access Key 회전** — 90일 회전, 사용 안 하는 키 삭제
- **CloudTrail로 감사** — 모든 IAM 호출 기록
- **Access Analyzer** — 외부 공개, 크로스 어카운트 노출 자동 탐지
- **태그 기반 권한** — `aws:RequestTag` / `aws:ResourceTag`로 동적 분리

## 흔한 실수

- **Access Key를 코드, git에 커밋** — 즉시 자격증명 침해. Role + IRSA, Instance Profile 사용
- **`*` 정책으로 시작해 좁힐 계획** — 계속 그 상태 유지됨. 처음부터 좁게
- **Trust Policy 광범위** — 임의 계정이 AssumeRole 가능. ExternalId, Org 조건 필수
- **Resource Policy + Identity Policy 충돌** — Deny 한쪽이라도 있으면 차단
- **Permission Boundary 무시** — 위임 관리 시 권한 escalation 위험
- **콘솔에서 직접 정책 변경** — 추적 불가. IaC (Terraform, CDK)로 관리
- **Inline policy 남발** — 추적, 재사용 어려움. Managed policy 우선

## 면접 / 시험 체크포인트

- IAM은 **글로벌 서비스** — Region 무관
- 정책 평가 순서 — 명시 Deny → 명시 Allow → default Deny
- Identity vs Resource Policy 차이와 평가 시 합집합
- Permission Boundary가 실효 권한에 미치는 영향 (`실효 = Identity ∩ Boundary`)
- AssumeRole의 STS 임시 자격증명 흐름과 Trust Policy
- Cross-Account Access의 ExternalId 패턴
- EC2 Instance Profile, IRSA의 자격증명 노출 메커니즘 (IMDS, OIDC)
- Condition Key로 IP, MFA, 암호화 강제하는 fine-grained 제어
- Access Key vs Role — 왜 Role 우선인가
- **Access Key는 생성 시점에만 노출** — 분실 시 재발급
- 신규 User는 기본 **권한 없음**, 콘솔, 프로그래밍 액세스 별도 선택
- JSON 정책 구성요소 5가지: **Effect, Principal, Action, Resource, Condition**
- Federation 종류: **SAML, OIDC, Web Identity, IAM Identity Center**

## 관련 문서
- [[IAM|IAM (인덱스)]]
- [[IAM-Policy|IAM 정책]]
- [[IAM-Role-Federation|AssumeRole과 Federation]]
