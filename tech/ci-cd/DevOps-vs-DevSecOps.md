---
tags: [cicd, devops, devsecops, security, automation, iac]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["DevOps vs DevSecOps", "데브옵스 vs 데브섹옵스", "보안을 왼쪽으로"]
---

# DevOps vs DevSecOps

DevOps가 개발과 운영을 통합했다면, DevSecOps는 **보안(Security)을 양쪽에 처음부터 통합**한다. 핵심은 "보안을 파이프라인 왼쪽으로 (Shift Left)" — 배포 직전이 아니라 **설계·코드·CI 단계부터** 보안을 검증. 개발 속도와 보안 중 하나를 택하는 것이 아니라 **자동화로 두 가지를 모두 얻는다**.

## 핵심 명제

- **DevOps = 개발 + 운영 통합**. 속도·협업·자동화가 가치
- **DevSecOps = DevOps + 보안 통합**. 속도·협업·자동화 **+ 보안 내재화**
- 보안을 **말기에 다루면** 취약점 수정 비용·리드타임 폭증
- **Shift Left**: 왼쪽(초기 단계)으로 보안 검증 이동
- **Everything as Code** — IaC·Policy as Code로 보안도 자동화

## 네 가지 축으로 본 차이

### 1. 보안 (Security)

| DevOps | DevSecOps |
|---|---|
| 개발 속도·협업 중심 | **보안을 처음부터 염두** |
| 별도 보안팀이 사후 점검 | 보안 전문가가 파이프라인에 상주 |
| 배포 말기에 보안 리뷰 | CI 단계에서 SAST·의존성 스캔 |
| 미발견 취약점이 프로덕션까지 | **왼쪽 이동(Shift Left)** 으로 조기 차단 |

### 2. 협업 (Collaboration)

- DevOps: 개발·운영 팀 간 **사이로 제거**
- DevSecOps: 여기에 **보안 전문가** 추가. 조직 차원의 계획·기준 정의 필요
- 코드 리뷰 시스템에 보안 기준을 붙여 **일관성** 확보
- 보안 전문가는 장애물이 아니라 **동료** — 초기에 기준을 세워 개발자가 자주 묻지 않고도 올바른 선택을 하도록

### 3. 자동화 (Automation)

- "보안을 파이프라인 앞으로 당기는 가장 큰 이득은 **자동화**"
- **SAST** (Static Application Security Testing) — 코드 정적 분석
- **DAST** (Dynamic Application Security Testing) — 실행 중 앱 검증
- **SCA** (Software Composition Analysis) — 오픈소스 의존성 취약점
- **Secret Scanning** — 커밋 히스토리에서 API 키·토큰 탐지
- **IaC Security** — Terraform·CloudFormation 코드의 보안 검증
- **Policy as Code** — OPA·Rego로 정책을 코드로 강제

### 4. 협업·커뮤니케이션 단절

- DevOps와 보안은 **상충 사고방식** — 속도 vs 엄격성
- 팀 간 물리적·조직적 거리로 갈등 발생
- DevSecOps는 **조기 발견**으로 비용 효율 확보
- 성공 열쇠: **교육 과정**으로 팀 구성원이 서로의 언어를 이해하게

## Shift Left 단계별 적용

```
Plan → Code → Build → Test → Release → Deploy → Operate → Monitor
  ↑      ↑      ↑       ↑
  보안이 여기까지 이동해야 비용 절감이 크다
```

| 단계 | 보안 활동 |
|---|---|
| **Plan** | 위협 모델링, 설계 리뷰, Privacy by Design |
| **Code** | IDE 경고, Pre-commit Hook, Lint + SAST |
| **Build** | 의존성 스캔(SCA), SBOM 생성 |
| **Test** | DAST, 통합 보안 테스트, 퍼징 |
| **Release** | 이미지 서명, 컨테이너 스캔 |
| **Deploy** | IaC 정책 검증, Runtime Policy 적용 |
| **Operate** | WAF, 런타임 보안 모니터링 |
| **Monitor** | 이상 감지, 침해 대응 |

초기 단계에서 잡는 비용 < 배포 후 잡는 비용의 **약 100배** 차이.

## 대표 도구 스택

### SAST (정적 분석)

- SonarQube, Semgrep, CodeQL, Checkmarx

### SCA (의존성)

- Snyk, Dependabot, OWASP Dependency-Check, Mend(구 WhiteSource)

### DAST (동적 분석)

- OWASP ZAP, Burp Suite, Netsparker

### Secret Scanning

- GitGuardian, TruffleHog, GitHub Secret Scanning

### Container Security

- Trivy, Clair, Anchore, Snyk Container

### IaC Security

- Checkov, tfsec, Terrascan

### Policy as Code

- OPA(Open Policy Agent), Kyverno, HashiCorp Sentinel

## 자동화의 양면성

### 이득

- **일관된 기준** — 사람마다 다르지 않음
- **빠른 피드백** — 개발자가 PR 시점에 문제 파악
- **누락 없음** — 점검 체크리스트 자동화
- **인프라 유지 비용 절감**

### 위험

- **부실한 자동화는 오히려 보안 문제 유발**
- **False Positive 피로도** — 노이즈로 중요 경고 놓침
- **Rule 의존** — 룰에 없는 새 취약점은 자동 탐지 불가
- **IaC·Policy as Code 자체의 보안 취약점**

대응: 정기적 룰 튜닝, False Positive 억제, 보안 전문가의 **최종 검증**.

## 조직적 접근

### 성공 조건

- **C-Level 지원** — 보안팀에 파이프라인 변경 권한
- **보안 챔피언** 제도 — 각 팀에 보안 이해자 1명
- **교육** — 개발자 대상 OWASP Top 10·시큐어 코딩
- **인센티브** — 보안 이슈 발견·수정에 보상
- **투명성** — 보안 메트릭을 팀 KPI의 일부로

### 실패 원인

- 보안팀이 **게이트키퍼**로만 작동 → 개발 지연
- CI 파이프라인이 보안 검사로 **수 시간** 소요 → 우회·비활성화
- **False Positive 관리 부재**
- 개발·보안의 **조직적 거리** 유지

## 주니어 개발자 관점

- DevOps·DevSecOps 용어에 지나치게 매몰되지 말 것
- 현실은 **조직 성숙도에 따른 연속선**
- 기본 보안(OWASP Top 10, SSO, Secret 관리)을 **꾸준히 체화**
- 자동화 도구 1~2개를 **실제로 써보기** (Dependabot·Trivy 추천)
- 이슈 발견 시 **조용히 넘어가지 말고 티켓화** — 문화 기여

## 한계와 오해

- **"DevSecOps = 도구 도입"** — 도구는 수단. 문화·프로세스·교육이 본질
- **"보안은 개발자 책임만"** — 조직·리더십·보안 전문가 협업
- **"100% 자동화 가능"** — 페넷트레이션 테스트·위협 모델링 같은 수동 활동 필수
- **"속도와 보안은 트레이드오프"** — Shift Left로 **둘 다 개선 가능**
- **"DevSecOps가 DevOps를 대체"** — 확장 개념. 기본 DevOps 위에 보안 추가

## 면접 체크포인트

- DevOps와 DevSecOps의 **한 문장 차이**
- Shift Left의 정의와 이득 산정 근거(100x 법칙)
- SAST·DAST·SCA·IaC Security 용어 구분
- False Positive가 DevSecOps의 실패를 만드는 메커니즘
- 조직 성숙도별 **도입 단계**(CI 스캔 → IaC 정책 → Runtime)
- Policy as Code가 주는 이점과 주의

## 출처
- [요즘IT — 데브옵스 vs 데브섹옵스](https://yozm.wishket.com/magazine/detail/1553/)

## 관련 문서
- [[CICD-Basics|CI/CD 기초]]
- [[GitHub-Actions|GitHub Actions]]
- [[Docker-Image-Pipeline|Docker 이미지 파이프라인]]
- [[IaC|IaC (Terraform·CDK·Pulumi)]]
- [[Password-Hashing|패스워드 해싱]]
- [[Public-Key-Cryptography|공개키 암호]]
- [[Container-Monitoring|컨테이너 모니터링]]
