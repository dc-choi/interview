---
tags: [cicd, gitlab, devsecops, security, policy]
status: done
verified_at: 2026-10-08
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["GitLab Security Policies", "GitLab 보안 정책"]
---

# GitLab 보안 정책 — 검사 실행과 병합 승인

보안 검사를 실행하는 통제와 검사 결과로 병합 승인을 요구하는 통제를 분리한다. 스캐너를 추가한 사실만으로 병합과 배포가 차단되는 것은 아니다.

아래 정책은 2026-10-08 GitLab 공식 문서 기준 **Ultimate** 기능이며 GitLab.com, Self-Managed와 Dedicated를 대상으로 한다. 실제 적용 전 설치 버전과 기능별 제약을 확인한다.

## 세 가지 정책의 역할

| 정책 | 통제 대상 | 선택 기준 |
|---|---|---|
| Scan execution policy | 파이프라인이나 일정에 따른 GitLab 보안 스캔 | 제공되는 스캐너를 일관되게 실행할 때 |
| Pipeline execution policy | 여러 프로젝트에 적용할 CI/CD job | 사용자 정의 스크립트, 외부 스캐너와 고급 설정이 필요할 때 |
| Merge request approval policy | 조건에 맞는 MR의 승인 규칙 | 취약점과 라이선스 결과 또는 MR 조건에 따라 승인을 요구할 때 |

승인 정책은 **보호된 대상 브랜치**에 적용한다. 검사 실행 정책과 조합해 보고서가 생성되는 경로와 병합을 판단하는 경로를 연결한다. 운영 배포 승인과 보호 규칙은 별도로 확인한다.

## 보고서의 전제

- 취약점과 라이선스 조건은 완료된 파이프라인의 보고서 artifact를 사용한다. 기본 브랜치에서 스캐너를 먼저 실행하고, 소스와 대상 브랜치에 같은 스캐너의 결과가 생성되는지 확인한다.
- 결과 누락을 취약점 0개로 읽지 않는다. 승인 정책을 평가할 수 없는 경우의 동작은 `fallback_behavior`와 해당 버전의 제약을 확인한다.
- 승인 정책은 보고서 자체의 무결성과 진위를 검증하지 않는다. 스캐너 실행 경로와 보고서 생성 경로를 수정할 권한도 통제해야 한다.
- Scan execution policy는 프로젝트의 로컬 CI YAML보다 우선한다. 사용자 정의 job이 필요하면 Pipeline execution policy를 검토한다.

## 정책 변경도 검토 대상

보안 정책은 연결된 security policy project에서 관리한다. 개발자가 애플리케이션을 바꾸는 권한과 공통 통제를 변경하는 권한을 나누고, 정책 저장소의 보호 브랜치와 MR 승인을 설정한다.

정책 내용을 비공개 저장소에 뒀더라도 연결된 프로젝트의 Policies 화면에서 보일 수 있다. 정책 파일에 자격 증명이나 비공개 운영 정보를 넣지 않는다. 정책은 MR로 변경하고 적용 대상, 브랜치와 실제 실행 결과를 확인한다.

## 운영 검증 예시

다음은 도입 후 확인할 검증 시나리오다. 제품이 모든 우회를 자동 방지한다는 보장은 아니다.

1. 정상 변경에서 필요한 스캔과 보고서가 생성되는지 확인한다.
2. 승인 조건에 해당하는 취약점 또는 라이선스 결과가 있을 때 필요한 승인이 표시되는지 확인한다.
3. 스캔 실패, 보고서 누락, 잘못된 정책에서 병합이 어떻게 처리되는지 확인한다.
4. 애플리케이션 CI 파일의 스캔 제거 시도가 공통 정책을 무력화하지 않는지 확인한다.

도구 통합만으로 개발 시간 절감이나 보안을 보장하지 않는다. 파이프라인 대기 시간, 예외 처리와 실제 배포 경로까지 측정한다.

## 출처

- [GitLab, Policies](https://docs.gitlab.com/user/application_security/policies/)
- [GitLab, Scan execution policies](https://docs.gitlab.com/user/application_security/policies/scan_execution_policies/)
- [GitLab, Pipeline execution policies](https://docs.gitlab.com/user/application_security/policies/pipeline_execution_policies/)
- [GitLab, Merge request approval policies](https://docs.gitlab.com/user/application_security/policies/merge_request_approval_policies/)

## 관련 문서

- [[DevOps-vs-DevSecOps|DevSecOps와 보안 관문]]
- [[CI-Tool-Selection|CI/CD 도구 선택]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔과 트리아지]]
