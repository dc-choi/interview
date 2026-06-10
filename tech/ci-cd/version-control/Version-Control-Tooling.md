---
tags: [ci-cd, git, version-control]
status: done
category: "CICD&배포(CICD&Delivery)"
aliases: ["Version Control Tooling", "버전 관리 도구"]
---

# 버전 관리 도구 선택

**VCS(Version Control System) + 호스팅 + GUI** 세 층위의 결정. 실무에선 사실상 **Git + GitHub** 조합이 표준이지만, 왜 그 조합인지 근거를 갖고 있어야 팀 설득·대안 평가가 가능.

## VCS 선택: Git이 표준인 이유

| 비교 | Git | SVN | Mercurial |
|---|---|---|---|
| 구조 | **분산형** (로컬에 full history) | **중앙집중형** (서버 접속 필수) | 분산형 |
| 브랜치 | 네이티브 지원, 저렴 | 복사 기반, 무거움 | 네이티브 |
| 속도 | 빠름 (로컬 작업) | 느림 (서버 왕복) | 빠름 |
| 저장 방식 | **스냅샷** | 변경분(diff) | 스냅샷 |
| 생태계·도구 | 압도적 | 제한적 | 줄어드는 중 |
| 학습 곡선 | 중간 | 낮음 | 낮음 |

Git의 본질적 장점:
- **오프라인 작업** 가능 (로컬에 전체 히스토리)
- **브랜치가 싸다** → 기능별 분리가 자연스러움
- **커뮤니티·도구 표준화** → 어디서든 통용

SVN·Mercurial의 영역(엔터프라이즈 일부·대용량 바이너리)을 빼면 사실상 Git이 기본값.

## 호스팅 선택

| 호스팅 | 강점 | 약점 |
|---|---|---|
| **GitHub** | PR 워크플로 표준·가장 큰 커뮤니티·Actions CI 강력 | 엔터프라이즈 기능은 유료 |
| **GitLab** | **무료 self-hosted + 통합 CI/CD** · 이슈·CI 통합 | 호스팅형은 GitHub 대비 작은 생태계 |
| **Bitbucket** | Atlassian 제품군(Jira·Confluence) 통합 | 무료 플랜 제한·커뮤니티 축소 중 |

### 선택 기준
- **오픈소스·공개 프로젝트** → GitHub (네트워크 효과)
- **사내 self-hosted + 통합 파이프라인** → GitLab
- **Jira 중심 조직** → Bitbucket
- **채용 어필** → GitHub (이력서에 포트폴리오 연결 표준)

GitHub은 2019년 **Private Repo 무료화** 이후 개인 프로젝트에서도 비용 우려가 사라짐. 오늘날 기본값은 GitHub.

## Git GUI 선택

CLI만으로 충분하지만, 팀원 온보딩·시각적 브랜치 추적에 GUI가 유용.

- **GitKraken** — 통합 UI·시각적 브랜치 트리·무료 티어 있음
- **SourceTree** — Atlassian 공식, 안정적·무료
- **GitHub Desktop** — 간단·가벼움, 고급 기능 제한
- **Fork** — 빠르고 가벼움, 일부 유료
- **IDE 통합** (IntelliJ·VSCode Git Lens) — 별도 도구 없이 충분

실무에선 **IDE 내장 + `git` CLI** 조합이 가장 흔함. GUI는 복잡한 머지·체리픽·리베이스 시각화 용도로 보조.

## 브랜치 전략 간단 요약

| 전략 | 적합 상황 |
|---|---|
| **GitHub Flow** | 1 메인 브랜치 + 기능 브랜치 + PR. 웹 서비스·SaaS |
| **Git Flow** | develop + main + release + hotfix. 릴리스 주기 고정 제품 |
| **Trunk-Based** | 주로 main에 작은 커밋 + feature flag. 고숙련 팀·대규모 빌드 |

작은~중간 팀·지속 배포 환경은 **GitHub Flow가 기본**.

## master/main 안정성 원칙

> "master의 코드는 항상 안정적(= 배포 가능한) 상태로 둔다"

이를 지키는 수단:
- 모든 변경은 **PR을 통해**만 머지
- PR에 **CI 통과 + 최소 1명 리뷰** 필수
- 직접 push 금지 (브랜치 보호 규칙)
- 머지 후 **즉시 배포 가능해야** 함 — 반대로 말하면 머지되면 언제든 배포 OK

이 원칙이 깨지면 "지금 main에 뭐가 있는지 모름" 상태가 되고, 긴급 배포·롤백이 다 위험해짐.

## 면접 체크포인트

- Git이 SVN보다 우위인 핵심 이유 3가지 (분산·브랜치·스냅샷)
- GitHub·GitLab·Bitbucket 선택 기준
- 브랜치 전략 3가지와 팀 규모별 적합성
- master 안정성 원칙이 왜 중요한가
- 브랜치 보호 규칙으로 강제해야 할 것 (PR 필수·CI 통과·리뷰)

## 출처
- [velog @city7310 — 백엔드가 이정도는 해줘야 함 2. 버전 관리 시스템](https://velog.io/@city7310/%EB%B0%B1%EC%97%94%EB%93%9C%EA%B0%80-%EC%9D%B4%EC%A0%95%EB%8F%84%EB%8A%94-%ED%95%B4%EC%A4%98%EC%95%BC-%ED%95%A8-2.-%EB%B2%84%EC%A0%84-%EA%B4%80%EB%A6%AC-%EC%8B%9C%EC%8A%A4%ED%85%9C%EA%B3%BC-%EB%B2%84%EC%A0%84-%EA%B4%80%EB%A6%AC-%EC%9B%B9%ED%98%B8%EC%8A%A4%ED%8C%85-%EC%84%9C%EB%B9%84%EC%8A%A4-%EA%B2%B0%EC%A0%95)

## 관련 문서
- [[Development-Workflow|개발 워크플로 (Issue → Branch → PR → Merge)]]
- [[Code-Review-Culture|코드 리뷰 문화]]
