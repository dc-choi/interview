---
tags: [cicd, git, merge, rebase, squash]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Git Merge Strategies", "Git 머지 전략", "Rebase vs Squash vs Merge"]
---

# Git 머지 전략 · Merge · Rebase · Squash

`git merge`에는 겉보기 같은 이름 아래 **3가지 전혀 다른 전략**이 있다. 히스토리 보존 방식이 달라 **협업 스타일·브랜치 정책·롤백 용이성**에 직접 영향을 준다. GitHub는 이 셋을 "Create a merge commit / Squash and merge / Rebase and merge"로 제공하며, 팀은 보통 **하나를 정책**으로 고정한다.

## 핵심 명제

- **Merge commit** — 병합 이력을 그대로 보존. 가지 구조가 눈에 보임
- **Squash** — 브랜치 커밋 다수를 **하나로 압축**해서 main에 붙임
- **Rebase** — 브랜치를 main 최신 위에 **재정렬** 후 Fast-forward 병합
- 하나의 정답 없음 — **팀의 우선순위**(히스토리 추적·가독성·롤백 용이성)에 따라 선택

## 시각적 차이

```
main:        A---B---C---F---G
                      \       \
feature:               D---E
```

### 1. Merge commit (기본)

```
main:  A---B---C-----------M
                \         /
feature:         D---E---/
```

- **병합 커밋 M** 생성 — "이 지점에서 합쳤다"
- 브랜치 그래프가 **그대로 남음**
- 각 커밋 메시지·시점 보존

### 2. Squash and merge

```
main:  A---B---C---[D+E]
```

- feature의 D·E가 **한 커밋**으로 압축되어 main에 추가
- 브랜치 히스토리 **제거**
- main은 선형이고 PR 단위로 깔끔

### 3. Rebase and merge

```
main:  A---B---C---D'---E'
```

- D·E를 C 위에 재정렬 (D', E'로 새 해시 생성)
- **병합 커밋 없음** — Fast-forward
- 각 커밋 메시지 보존, 선형 히스토리

## 각 전략의 장단점

### Merge commit

**장점**
- **원본 히스토리 완전 보존** — 언제 브랜치가 시작됐고 합쳐졌는지 추적 가능
- 브랜치별 작업 단위가 **그래프로 시각화**
- 충돌 해결 이력까지 남음

**단점**
- **많은 merge commit**이 섞여 히스토리가 복잡
- `git log`가 어지러움
- bisect 같은 도구로 디버깅 시 노이즈

**적합**: 팀 규모 큼, 브랜치 단위 추적 중요, 운영 안정성 중시

### Squash and merge

**장점**
- main 히스토리가 **PR 단위로 1:1** — 매우 깔끔
- 미완성·WIP 커밋이 사라짐
- **롤백이 단순** — 한 커밋만 revert

**단점**
- **브랜치 내부 히스토리 소실** — 개별 단계별 추적 불가
- 긴 PR의 중간 단계 bisect 불가
- 작성자 정보·시점이 하나로 통합

**적합**: 트렁크 기반 개발, PR 단위로 관리, 깔끔한 main 선호

### Rebase and merge

**장점**
- **선형 히스토리** — 읽기 쉬움
- 각 커밋 메시지 **보존**
- bisect로 세밀한 원인 추적 가능

**단점**
- 재정렬 과정에서 **커밋 해시 변경** — 이미 push한 브랜치면 force-push 필요
- 충돌 시 **여러 커밋에서 반복 해결** 가능
- 협업 중인 브랜치 rebase는 **금지** — 다른 사람 히스토리 꼬임

**적합**: 1인 1브랜치, 커밋이 작고 의미있게 쪼개져 있음

## 비교 표

| 축 | Merge commit | Squash | Rebase |
|---|---|---|---|
| main 히스토리 | 그래프 | 선형·PR 1커밋 | 선형 |
| 브랜치 커밋 보존 | O | ✗ | O |
| 병합 커밋 생성 | O | ✗ | ✗ |
| 롤백 단순성 | 중간 | **쉬움** | 중간 |
| bisect | 노이즈 | 거친 | **정교** |
| Force push 필요 | ✗ | ✗ | O (rebase 시) |
| 추천 팀 규모 | 중·대 | 소·중 | 소 |

## 실제 커맨드

```bash
# 병합 커밋 강제 (Fast-forward 방지)
git merge --no-ff feature

# Squash — 스테이징만 하고 수동 커밋
git merge --squash feature
git commit -m "feat: new feature"

# Rebase
git checkout feature
git rebase main        # main 최신 위에 feature 재배치
git checkout main
git merge feature      # Fast-forward

# 인터랙티브 Rebase (커밋 재구성·합치기)
git rebase -i HEAD~5
# pick / squash / reword / drop 선택
```

## 정책 선택 가이드

- **Trunk-based + Squash**: 짧은 브랜치·빠른 머지, main이 PR 단위로 1:1 매핑, WIP 커밋 메시지 자유
- **GitFlow + Merge commit**: 장기 브랜치(`develop`, `release/*`), 브랜치 추적·merge 이력 중요, 팀 규모 큼
- **Rebase-only**: 선형 히스토리 선호, 1인 1브랜치, 커밋이 의미 단위로 쪼개져 있음

## Golden Rule: 공유 브랜치 rebase 금지

```
NEVER rebase commits that have been pushed to a shared branch.
```

- 다른 팀원이 이미 pull한 브랜치를 rebase하면 **히스토리 꼬임**
- force-push로 강제 동기화 → 팀원 작업 소실 위험
- main·develop·공유 feature 브랜치는 **rebase 금지**
- 본인만 쓰는 브랜치는 자유

## Interactive Rebase · Cherry-pick

`git rebase -i HEAD~N`의 명령어: `pick`(그대로) · `squash`(이전과 합침·메시지 병합) · `fixup`(합침·메시지 무시) · `reword`(메시지 수정) · `edit`(해당 커밋 멈춤) · `drop`(삭제). push 전 커밋 정리용.

**Cherry-pick vs Rebase**: Cherry-pick은 특정 커밋 하나를 다른 브랜치로 복사(일회성 패치), Rebase는 연속된 여러 커밋을 다른 베이스 위로 이동(브랜치 재구성).

## 흔한 실수

- **공유 브랜치 force-push** — 팀 작업 날림
- **Squash로 모든 커밋 정보 소실** → 감사·bisect 시 곤란
- **Merge commit 남발** → `git log`가 엉망. `--first-parent` 옵션으로 보기
- **Rebase 중 충돌 많이 나면 포기하고 merge** — 큰 PR은 처음부터 rebase 안 맞음
- **정책 없이 팀원마다 다른 방식** → 히스토리 일관성 깨짐

## 팀 정책 예시

- **스타트업 초기**: Squash 고정, main만 유지, PR=커밋 1개
- **중견 SaaS**: Squash(기능 PR) + Merge commit(릴리스 브랜치), GitFlow 변형
- **대형 엔터프라이즈**: Merge commit 강제, 서명 커밋, 감사·추적 중시

## 면접 체크포인트

- 3가지 머지 전략의 **히스토리 모양** 차이
- Squash의 롤백 이점과 정보 소실 트레이드오프
- Rebase의 선형 히스토리 장점과 force-push 위험
- **공유 브랜치 rebase 금지** 원칙
- Trunk-based vs GitFlow에서의 선택 근거
- Interactive Rebase의 `pick`·`squash`·`fixup` 차이

## 관련 문서
- [[CICD-Basics|CI/CD 기초]]
- [[Git-Flow|Git Flow / Trunk based]]
- [[GitHub-Actions|GitHub Actions]]
- [[Code-Review-Culture|생산적 코드 리뷰 문화]]
- [[Blue-Green|Blue/Green 배포]]
