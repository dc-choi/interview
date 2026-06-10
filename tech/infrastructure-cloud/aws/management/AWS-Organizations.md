---
tags: [infrastructure, aws, organizations, multi-account, governance, scp]
status: done
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

- **계정이 VPC보다 독립적** — 다수 VPC를 가진 단일 계정보다 멀티 계정이 보안 우수
- 환경별 격리 (dev/staging/prod)
- 비용 분리 (팀, 프로젝트별)
- 폭발 반경 축소

## SCP (Service Control Policy)

- 특정 **OU 또는 계정에 적용되는 IAM 정책** — 해당 사용자, 역할 권한 제한 (**관리 계정 제외**)
- IAM과 유사한 구체적 허용 항목 설정으로 작동
- 계정에서 사용, 생성하지 못하게 할 서비스 지정하는 **차단 목록** + 특정 서비스만 허용하는 **허용 목록** 둘 다 가능
- 멤버 계정의 root 사용자에게도 적용 (IAM은 root 통제 못함 → SCP의 강력함)

## 시험 빈출 포인트

- "여러 계정 통합 결제" → Organizations
- "계정 단위 서비스 차단" → SCP
- "**관리 계정에는 SCP 적용 안 됨**"
- "모든 계정 CloudTrail 중앙 S3 집계" → Organizations + CloudTrail Organization Trail
- "Firewall Manager, GuardDuty 등 멀티계정 거버넌스" → Organizations 전제

## 관련 문서

- [[IAM]], [[CloudTrail-Config]], [[Shield-WAF-NetworkFirewall]]

## 출처

- AWS SAA C03 Udemy 강의 요약본 (Stephane Maarek, 로컬)
