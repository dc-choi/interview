---
tags: [cicd, devops, devsecops, security, automation, iac]
status: done
verified_at: 2026-10-07
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["DevOps vs DevSecOps", "데브옵스 vs 데브섹옵스", "보안을 왼쪽으로"]
---

# DevOps vs DevSecOps

DevOps가 개발과 운영의 협업을 강조한다면, DevSecOps는 **보안(Security)을 개발과 운영 전 과정에 통합**하는 데 초점을 둔다. **Shift Left**는 배포 직전까지 기다리지 않고 설계, 코드와 CI 단계부터 보안을 검증하는 접근이다. 자동화와 빠른 피드백은 재작업을 줄일 수 있지만 도구 도입만으로 속도와 보안이 함께 개선되지는 않는다.

## 핵심 명제

- **DevOps = 개발 + 운영 통합**. 속도, 협업, 자동화가 가치
- **DevSecOps = DevOps + 보안 통합**. 속도, 협업, 자동화 **+ 보안 내재화**
- 보안을 **말기에 다루면** 취약점 수정 비용, 리드타임 폭증
- **Shift Left**: 왼쪽(초기 단계)으로 보안 검증 이동
- **Everything as Code** — IaC, Policy as Code로 보안도 자동화

## 네 가지 축으로 본 차이

### 1. 보안 (Security)

| DevOps | DevSecOps |
|---|---|
| 개발 속도, 협업 중심 | **보안을 처음부터 염두** |
| 보안 협업의 방식은 조직마다 다름 | 보안 전문가와 개발자가 기준과 대응 책임을 공유 |
| 보안 검증 시점은 구현에 따라 다름 | CI 단계부터 SAST와 의존성 스캔 연결 |
| 도구와 검사 범위에 따라 탐지 공백 존재 | **왼쪽 이동(Shift Left)** 으로 조기 발견 기회 확대 |

### 2. 협업 (Collaboration)

- DevOps: 개발, 운영 팀 간 **사이로 제거**
- DevSecOps: 여기에 **보안 전문가** 추가. 조직 차원의 계획, 기준 정의 필요
- 코드 리뷰 시스템에 보안 기준을 붙여 **일관성** 확보
- 보안 전문가는 장애물이 아니라 **동료** — 초기에 기준을 세워 개발자가 자주 묻지 않고도 올바른 선택을 하도록

### 3. 자동화 (Automation)

- 보안 검사를 초기 단계에 **자동화**해 피드백을 앞당긴다
- **SAST** (Static Application Security Testing) — 코드 정적 분석
- **DAST** (Dynamic Application Security Testing) — 실행 중 앱 검증
- **SCA** (Software Composition Analysis) — 오픈소스 의존성 취약점
- **Secret Scanning** — 커밋 히스토리에서 API 키, 토큰 탐지
- **IaC Security** — Terraform, CloudFormation 코드의 보안 검증
- **Policy as Code** — OPA, Rego로 정책을 코드로 강제

### 4. 협업, 커뮤니케이션 단절

- 개발 속도와 보안 검토 기준을 합의하지 않으면 팀 사이에 갈등이 생길 수 있다
- 팀 간 물리적, 조직적 거리로 갈등 발생
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

초기 단계에서 잡는 비용이 배포 후 잡는 비용보다 낮다는 것이 Shift Left의 근거다. 다만 흔히 인용되는 **배포 후 약 100배** 수치는 IBM Systems Sciences Institute 자료로 귀속되지만 원 연구가 확인되지 않는 경험칙이다. 방향성 근거로만 쓰고, 측정된 값처럼 인용하지 않는다.

## 대표 도구 스택

### SAST (정적 분석)

- SonarQube, Semgrep, CodeQL, Checkmarx

### SCA (의존성)

- Snyk, Dependabot, OWASP Dependency-Check, Mend(구 WhiteSource)

### DAST (동적 분석)

- OWASP ZAP, Burp Suite, Invicti(구 Netsparker)

### Secret Scanning

- GitGuardian, TruffleHog, GitHub Secret Scanning

### Container Security

- Trivy, Clair, Anchore, Snyk Container

### IaC Security

- Checkov, Trivy
- 2026-09-03 공식 저장소 기준, tfsec의 IaC 스캔 기능은 Trivy에 통합됐고 Terrascan은 유지보수가 종료돼 저장소가 archive됐다.

### Policy as Code

- OPA(Open Policy Agent), Kyverno, HashiCorp Sentinel

## 자동화의 양면성

### 이득

- **일관된 기준** — 사람마다 다르지 않음
- **빠른 피드백** — 개발자가 PR 시점에 문제 파악
- **반복 점검 누락 감소** — 정해진 체크리스트 자동화, 검사 범위 밖 위험은 남음
- **인프라 유지 비용 절감**

### 위험

- **부실한 자동화는 오히려 보안 문제 유발**
- **False Positive 피로도** — 노이즈로 중요 경고 놓침
- **Rule 의존** — 룰에 없는 새 취약점은 자동 탐지 불가
- **IaC, Policy as Code 자체의 보안 취약점**

대응: 정기적 룰 튜닝, 근거를 검토한 False Positive 억제, 보안 전문가의 **최종 검증**. SAST는 핵심 규칙부터 점진적으로 적용하고 탐지 결과를 확인하며 민감도를 조정한다. 예외의 사유와 만료 관리 기준은 [[Dependency-Vulnerability-Scanning#트리아지 절차|의존성 취약점 트리아지]]를 따른다.

### 스캔 성공과 배포 허용은 다르다

2026-10-07에 확인한 Amazon Inspector 공식 문서와 GitHub Action을 기준으로, 자산 목록 생성, 취약점 탐지와 배포 판정을 나누어 본다.

- **입력과 탐지:** Sbomgen으로 컨테이너 이미지의 SBOM을 만들고 Scan API로 취약점 보고서를 받는다. SBOM 생성 성공만으로 취약점 평가가 끝난 것은 아니다.
- **정책과 출력:** GitHub Action의 `critical_threshold: 1`은 critical 취약점이 하나 이상이면 `vulnerability_threshold_exceeded`를 `1`로 만든다. 해당 심각도의 임계값 `0`은 그 심각도의 임계값 판정을 비활성화하는 값이며, 취약점 0개만 허용한다는 뜻이 아니다.
- **배포 차단:** 위 출력은 판정 신호다. 공식 예제처럼 별도 단계가 이 값을 실패 종료 코드로 연결해야 해당 조건으로 작업을 막는다. 보고서 출력만 추가한 파이프라인을 차단 관문으로 간주하지 않는다.
- **운영 점검 제안:** 스캔 오류, 일부만 검사한 결과나 필수 출력 누락은 취약점 0개와 구분한다. 같은 배포 산출물을 검사했는지와 실패한 검사 뒤 배포가 진행되지 않는지를 확인한다.

예외 등록으로 경고 수만 줄어든 것과 취약점을 수정한 것은 다른 결과다. 관문 도입 효과를 볼 때는 확인된 취약점의 수정 시간, 검토에 든 시간과 배포 후 발견 건수를 함께 본다. 특정 고객 사례의 비용 절감률을 다른 조직의 예상 효과로 적용하지 않는다.

## 조직적 접근

### 성공 조건

- **C-Level 지원** — 보안팀에 파이프라인 변경 권한
- **보안 챔피언** 제도 — 각 팀에 보안 이해자 1명
- **교육** — 개발자 대상 OWASP Top 10, 시큐어 코딩
- **인센티브** — 보안 이슈 발견, 수정에 보상
- **투명성** — 보안 메트릭을 팀 KPI의 일부로

### 실패 원인

- 보안팀이 **게이트키퍼**로만 작동 → 개발 지연
- CI 파이프라인이 보안 검사로 **수 시간** 소요 → 우회, 비활성화
- **False Positive 관리 부재**
- 개발, 보안의 **조직적 거리** 유지

## 주니어 개발자 관점

- DevOps, DevSecOps 용어에 지나치게 매몰되지 말 것
- 현실은 **조직 성숙도에 따른 연속선**
- 기본 보안(OWASP Top 10, SSO, Secret 관리)을 **꾸준히 체화**
- 자동화 도구 1~2개를 **실제로 써보기** (Dependabot, Trivy 추천)
- 이슈 발견 시 **조용히 넘어가지 말고 티켓화** — 문화 기여

## 한계와 오해

- **도구 도입만으로 완성되지 않는다** — 문화, 프로세스와 교육도 필요하다
- **개발자에게만 책임을 두지 않는다** — 조직, 리더십과 보안 전문가가 협업한다
- **모든 보안 검토를 자동화할 수는 없다** — 침투 테스트와 위협 모델링에는 사람의 판단이 필요하다
- **속도와 보안을 함께 개선할 수 있다** — 검사 비용과 재작업 감소를 실제로 측정한다
- **DevOps를 대체하는 개념은 아니다** — 기존 협업 과정에 보안을 통합한다

## 면접 체크포인트

- DevOps와 DevSecOps의 **한 문장 차이**
- Shift Left의 정의와 이득. 100x 법칙을 근거로 들 때 원 연구가 확인되지 않는다는 한계까지 말할 수 있는가
- SAST, DAST, SCA, IaC Security 용어 구분
- False Positive가 DevSecOps의 실패를 만드는 메커니즘
- 조직 성숙도별 **도입 단계**(CI 스캔 → IaC 정책 → Runtime)
- Policy as Code가 주는 이점과 주의

## 출처
- [AWS DevOps Guidance, Enhance source code security with static application security testing](https://docs.aws.amazon.com/wellarchitected/latest/devops-guidance/qa.st.4-enhance-source-code-security-with-static-application-security-testing.html)
- [Amazon Inspector, Creating a custom CI/CD pipeline integration with Amazon Inspector Scan](https://docs.aws.amazon.com/inspector/latest/user/cicd-custom.html)
- [Vulnerability Scan GitHub Action for Amazon Inspector — AWS](https://github.com/aws-actions/vulnerability-scan-github-action-for-amazon-inspector)
- [요즘IT — 데브옵스 vs 데브섹옵스](https://yozm.wishket.com/magazine/detail/1553/) — 문서의 뼈대. 다만 이 기사에 100배 수치는 없고, 운영 환경에서 발견된 결함은 수정 비용이 크다는 서술만 있다
- [The Register (2021-07-22) — Everyone cites that 'bugs are 100x more expensive to fix in production' research, but the study might not even exist](https://www.theregister.com/2021/07/22/bugs_expense_bs/) — Laurent Bossavit, Hillel Wayne의 추적. IBM Systems Sciences Institute는 사내 교육 프로그램이었고 차트를 뒷받침하는 데이터가 확인되지 않는다
- [Netsparker is now Invicti — Invicti](https://www.invicti.com/blog/news/netsparker-is-now-invicti-signaling-a-new-era-for-modern-appsec/)
- [Terrascan — Tenable](https://github.com/tenable/terrascan)
- [tfsec — Aqua Security](https://github.com/aquasecurity/tfsec)

## 관련 문서
- [[CICD-Basics|CI/CD 기초]]
- [[GitHub-Actions|GitHub Actions]]
- [[Docker-Image-Pipeline|Docker 이미지 파이프라인]]
- [[IaC|IaC (Terraform, CDK, Pulumi)]]
- [[Password-Hashing|패스워드 해싱]]
- [[Public-Key-Cryptography|공개키 암호]]
- [[Container-Monitoring|컨테이너 모니터링]]
- [[Dependency-Vulnerability-Scanning|의존성 취약점 스캔]]
