---
tags: [cicd, devops, sre, gitops, kubernetes, decision]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["CICD Tool Selection", "CI/CD 툴 선택", "GitOps 도구 선택"]
---

# CI/CD 툴 선택 — 평가 기준과 트레이드오프

CI/CD 도구는 한 번 선택하면 **팀 워크플로·운영 부담·인프라 비용**을 수년간 좌우한다. 도구 자체의 기능 비교 이전에 **팀 규모·클라우드 종속성·GitOps 도입 여부** 같은 컨텍스트가 선택을 결정한다.

## 평가 기준 3축

| 기준 | 핵심 질문 | 영향 |
|---|---|---|
| **러닝 커브** | 신규 인원이 며칠 안에 손댈 수 있는가? | 팀 적응 속도, 온보딩 비용 |
| **운영 효율성** | 도구 자체를 운영하는 부담이 얼마나 되는가? | SRE 인력 시간, 장애 시 대응 비용 |
| **비용 효율성** | 인프라·라이선스·인력 비용 총합 | TCO(Total Cost of Ownership) |

추가 고려:
- **클라우드 종속성** — AWS Code* 같은 클라우드 락인은 멀티/하이브리드 클라우드 전환 시 비용
- **확장성** — N개 클러스터, 수십 개 서비스로 늘어났을 때의 관리 가능성
- **가시성** — 빌드/배포 상태를 한 화면에서 볼 수 있는가

## CI 도구 비교

| 도구 | 형태 | 강점 | 약점 |
|---|---|---|---|
| **Jenkins** | 셀프 호스팅 | 플러그인 생태계, 커스터마이징 자유도 | 별도 서버 운영, UI 기반 설정의 블랙박스화, 플러그인 호환성 지옥 |
| **GitHub Actions** | 관리형 (SaaS) | YAML 코드 관리, GitHub 통합, 서버 불필요 | private runner 운영 시 추가 작업, GitHub 종속 |
| **GitLab CI** | 관리형/셀프 둘 다 | GitLab 통합, 풀 DevOps 플랫폼 | GitLab 안에 갇힘, 사용처가 GitLab일 때만 의미 |
| **CircleCI** | 관리형 (SaaS) | 빠른 빌드 속도, 직관적 UI | 무료 티어 제한, 가격 |
| **AWS CodeBuild** | 관리형 (AWS) | AWS 통합, IAM 연동 | AWS 종속, UI 빈약 |
| **Tekton** | 셀프 호스팅 (K8s 네이티브) | K8s CRD 기반, 표준화 | 학습 곡선 높음, ecosystem 작음 |

**선택 휴리스틱**:
- 작은 팀 + GitHub 중심 → **GitHub Actions**
- 운영 리소스 충분 + 커스터마이징 절실 → **Jenkins**
- K8s 네이티브 + 컨테이너 빌드 표준화 필요 → **Tekton**
- 이미 GitLab 쓰는 팀 → **GitLab CI**

## CD 도구 비교 (GitOps 중심)

| 도구 | 형태 | 강점 | 약점 |
|---|---|---|---|
| **ArgoCD** | K8s 컨트롤러 | 직관적 대시보드, ApplicationSet으로 멀티 클러스터, 활발한 커뮤니티 (CNCF Graduated) | 메모리 사용량 큼, 대규모 시 튜닝 필요 |
| **FluxCD** | K8s 컨트롤러 | 가벼움, GitOps 원칙 충실 (CNCF Graduated) | 기본 UI 없음 → 별도 모니터링 필요, 학습 곡선 |
| **Spinnaker** | 셀프 호스팅 | 멀티 클라우드, 고급 배포 전략 (Canary, Blue/Green) | 무거움, 운영 부담 큼 |
| **AWS CodeDeploy** | 관리형 (AWS) | EC2/ECS 통합 | K8s 약함, AWS 종속 |
| **Helm + 스크립트** | 직접 구현 | 단순, 통제 가능 | GitOps 자동화 부재, 스크립트 누적 |

**선택 휴리스틱**:
- K8s + 멀티 클러스터 + UI 필요 → **ArgoCD**
- K8s + 최소 의존성 + GitOps 정통주의 → **FluxCD**
- 다양한 배포 전략·다중 환경 → **Spinnaker** (단, 운영 비용 감수)

## 결합 패턴 (CI + CD)

| CI | CD | 적합한 상황 |
|---|---|---|
| GitHub Actions | ArgoCD | 작은 SRE 팀 + K8s + 멀티 클러스터 — 가장 흔한 GitOps 조합 |
| GitHub Actions | FluxCD | GitOps 원칙 강조 + UI 부담 감수 |
| Jenkins | ArgoCD | 레거시 Jenkins 자산 + GitOps 단계 도입 |
| GitLab CI | GitLab Auto Deploy | GitLab 단일 플랫폼 |
| Tekton | ArgoCD | K8s 네이티브 통일성 |

## 의사결정 프레임워크

새 도구를 도입할 때 답해야 할 5가지 질문.

1. **팀 규모와 시간 여유** — 운영자 1명짜리 팀에 Jenkins를 새로 들이면 학습·관리 시간이 본업을 잡아먹는다
2. **현재 클라우드 종속도와 미래 계획** — 멀티 클라우드/하이브리드로 갈 거면 클라우드 락인 도구 회피
3. **GitOps를 진짜 할 것인가** — Pull 기반 GitOps를 안 한다면 ArgoCD/FluxCD 대신 push 기반 단순 스크립트도 충분
4. **기존 자산과의 마찰** — 이미 잘 돌아가는 Jenkins 파이프라인을 한꺼번에 옮기는 비용 vs 점진적 이전
5. **장애 시나리오** — 도구 자체가 죽었을 때 배포가 막히는가? 우회 경로는?

**안티패턴**:
- "유행하니까 ArgoCD 도입" — 클러스터가 1개고 작은 서비스면 Helm + 스크립트로 충분
- "Jenkins 다 만들어진 게 있으니 유지" — 플러그인 호환 깨짐과 서버 장애로 누적되는 비용 무시
- "AWS Code* 시리즈 쓰니 다 이걸로" — 클라우드 락인이 미래 의사결정 자유도를 잠식

## 운영 측면 체크리스트

- **Runner / Agent 인프라**: 셀프 호스트 러너의 사이즈·자동 확장
- **시크릿 관리**: GitHub Secrets / Vault / SOPS / SealedSecrets 중 어떤 것
- **권한 분리**: 환경별(dev/stg/prod) 배포 권한 분리, RBAC 설계
- **캐시 전략**: 빌드 캐시 (npm/pnpm, Docker layer)로 빌드 시간 단축
- **롤백 절차**: 한 번의 명령으로 이전 버전 복귀 가능한가
- **알림과 가시성**: 실패 시 누구에게 어떻게 알리는가, 대시보드 위치
- **DR**: CI/CD 도구 자체의 백업·복구 절차

## 사례 (참고)

K8s 마이그레이션 시 작은 SRE 팀이 흔히 채택하는 조합: **GitHub Actions(CI) + ArgoCD(CD)**. 이유는 (a) Actions는 GitHub 종속만 감수하면 서버 운영 부담 0, (b) ArgoCD는 ApplicationSet으로 N개 클러스터를 단일 UI에서 관리, (c) 둘 다 YAML 코드 관리. Jenkins 장기 운영의 함정(플러그인 호환·블랙박스 설정·장애 시 18시간 단위 대응)에서 벗어나는 것이 이 조합의 큰 동기 중 하나.

## 면접 체크포인트

- CI/CD 도구 선택의 **3축 평가 기준**(러닝 커브·운영 효율성·비용)
- **Jenkins가 부담스러운 이유** (관리 포인트, 블랙박스화, 장애 대응)
- **GitOps의 핵심 가치**와 ArgoCD/FluxCD의 차이
- **ApplicationSet**이 멀티 클러스터에서 해결하는 문제
- 작은 팀에서 도구 선택 시 **"유행 vs 컨텍스트"** 판단
- 도구 도입 시 **장애 시나리오와 우회 경로**를 함께 설계해야 하는 이유

## 출처
- [sienna1022 — [SRE] CI/CD 툴 선택 및 이유](https://sienna1022.tistory.com/entry/SRE-CICD-%ED%88%B4-%EC%84%A0%ED%83%9D-%EB%B0%8F-%EC%9D%B4%EC%9C%A0)

## 관련 문서
- [[GitHub-Actions|GitHub Actions]]
- [[Docker-Image-Pipeline|Docker image build pipeline]]
- [[Tech-Decision|기술 의사결정]]
- [[Architecture-Decision-Making|아키텍처 의사결정]]
- [[Operational-Efficiency|운영 및 생산성 효율화]]
