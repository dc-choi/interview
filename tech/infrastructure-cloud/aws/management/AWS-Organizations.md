---
tags: [infrastructure, aws, organizations, multi-account, governance, scp]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["Organizations", "AWS Organizations", "SCP", "Service Control Policy"]
---

# AWS Organizations

여러 AWS 계정을 **동시에 관리**해주는 글로벌 서비스. 멀티 계정 전략의 기반.

## 핵심

- **관리 계정 (Management Account)** + **멤버 계정 (Member Account)** 구성
- 멤버 계정은 한 조직에만 소속됨
- **통합 결제** (Consolidated Billing): 모든 계정 비용 합산 청구
- API로 계정 자동 생성 가능
- 모든 계정에 CloudTrail 활성화 → 중앙 S3 계정으로 로그 전송 가능
- 관리 계정에서 모든 멤버 계정 관리

## 멀티 계정 전략 이점

- **계정과 VPC의 경계가 다르다** — 계정은 권한, 비용과 워크로드의 분리 단위이고 VPC는 네트워크 경계다. 계정 분리만으로 안전성이 보장되지는 않는다
- 환경별 격리 (dev/staging/prod)
- 비용 분리 (팀, 프로젝트별)
- 폭발 반경 축소

## SCP (Service Control Policy)

- 조직 루트, OU와 계정에 연결하는 조직 정책이다. 멤버 계정의 주체가 가질 수 있는 **권한 상한**을 제한하며 권한을 직접 부여하지 않는다.
- IAM 정책과 비슷한 문법으로 허용 목록이나 차단 목록을 작성한다. 실제 접근 허용에는 별도의 IAM 또는 리소스 정책 등이 필요하다.
- 상위 경로의 제한을 하위 OU나 계정에서 더 넓게 허용해 풀 수 없다. `AdministratorAccess`도 SCP의 제한을 넘지 못한다.
- 멤버 계정의 root와 위임 관리자 계정에도 적용하지만 **관리 계정의 사용자와 역할, service-linked role에는 적용하지 않는다**.
- SCP를 사용하려면 Organizations의 all features가 필요하다. 통합 결제만 활성화한 조직에서는 사용할 수 없다.

## SCP, RCP와 선언적 정책의 경계

| 정책 | 통제 대상 | 예시 |
|---|---|---|
| SCP | 멤버 계정의 IAM 주체가 수행할 수 있는 작업 | 조직 내부 역할이 특정 서비스를 사용하지 못하게 제한 |
| RCP | 멤버 계정의 지원 리소스에 대한 접근 | 외부 주체가 조직 내부 S3 리소스에 접근하는 조건 제한 |
| 선언적 정책 | 지원 서비스의 설정 기준 | 서비스 수준에서 조직의 구성 기준 유지 |

SCP는 조직 외부 주체의 권한을 직접 제한하지 않는다. 외부 계정에 열어 둔 버킷을 보호하려면 리소스 정책과 RCP의 적용 여부를 함께 본다. RCP도 권한을 부여하지 않으며 관리 계정의 리소스와 service-linked role에는 적용하지 않는다. 모든 서비스에 같은 RCP가 적용된다고 가정하지 말고 지원 목록을 확인한다.

선언적 정책은 API 호출 권한 대신 서비스 control plane에서 구성 기준을 집행한다. 정책 유형별 지원 속성과 상속 규칙을 확인하며 SCP의 평가 방식을 그대로 대입하지 않는다. [[AWS-Control-Tower|Control Tower]]의 탐지 통제는 위반을 알리는 별도 기능이다.

## 적용 전 검증

1. 테스트 계정과 작은 OU에서 허용해야 할 업무와 차단할 작업을 함께 실행한다.
2. CloudTrail의 접근 거부와 기존 운영 경로 영향을 확인한다.
3. 영향 범위를 확인한 뒤 상위 OU로 확대한다. 조직 루트에 먼저 붙여 전체를 시험하지 않는다.

정책 이름이나 계정 분리 여부보다 실제 허용과 거부 결과를 증거로 남긴다.

## 시험 빈출 포인트

- 여러 계정 통합 결제: Organizations
- 멤버 계정 주체의 서비스 사용 제한: SCP
- 관리 계정의 주체에는 SCP가 적용되지 않음
- 여러 계정 CloudTrail 중앙 집계: 조직 추적의 수집 범위와 저장 설정 확인
- Firewall Manager, GuardDuty 등의 멀티 계정 연동: Organizations와 각 서비스의 활성화 설정 확인

## 관련 문서

- [[IAM]], [[CloudTrail-Config]], [[Shield-WAF-NetworkFirewall]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
- [AWS, What is AWS Organizations?](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_introduction.html)
- [AWS, Service control policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)
- [AWS, Resource control policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_rcps.html)
- [AWS, Authorization policies in AWS Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_authorization_policies.html)
- [AWS, Declarative policies in AWS Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_declarative_policies.html)
- [거버넌스 마스터플랜: 클라우드 카오스를 질서로 바꾸는 7가지 방법 — Amazon Web Services Korea](https://www.youtube.com/watch?v=ShOQ8WP51ho)
