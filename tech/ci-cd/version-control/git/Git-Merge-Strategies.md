---
tags: [cicd, git, merge, rebase, squash]
status: done
verified_at: 2026-08-04
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Git Merge Strategies", "Git 머지 전략", "Rebase vs Squash vs Merge"]
---

# Git 통합 방식, Merge commit, Squash, Rebase

이 문서는 feature 변경을 대상 브랜치의 히스토리에 통합하는 세 방식을 비교한다. 셋 모두 `git merge`의 merge strategy는 아니다. Git 공식 문서에서 merge strategy는 `ort`, `octopus`처럼 merge 결과를 계산하는 알고리즘을 뜻하고, 여기서는 merge commit, squash와 rebase가 만드는 히스토리 및 협업 선택을 다룬다.

## 핵심 명제

- **Merge commit** — `git merge`로 병합 이력을 그대로 보존. 가지 구조가 눈에 보임
- **Squash** — `git merge --squash` 등으로 브랜치 변경을 하나의 새 commit으로 기록
- **Rebase** — `git rebase`로 commit을 새 base 위에 다시 만든 뒤 Fast-forward 가능
- 하나의 정답 없음 — **팀의 우선순위**(히스토리 추적, 가독성, 롤백 용이성)에 따라 선택

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

- **병합 커밋 M** 생성 — 이 지점에서 합쳤다는 기록
- 브랜치 그래프가 **그대로 남음**
- 각 커밋 메시지, 시점 보존

### 2. Squash and merge

```
main:  A---B---C---[D+E]
```

- feature의 D, E가 **한 커밋**으로 압축되어 main에 추가
- D와 E는 main의 부모 히스토리에 연결되지 않는다. 원 feature branch는 삭제하기 전까지 별도로 남는다
- main은 선형이고 PR 단위로 깔끔

### 3. Rebase and merge

```
main:  A---B---C---D'---E'
```

- D, E를 C 위에 재정렬 (D', E'로 새 해시 생성)
- **병합 커밋 없음** — Fast-forward
- 각 커밋 메시지 보존, 선형 히스토리

## Fast-forward (FF) — 포인터 전진

**대상 브랜치가 갈라진 커밋 없이 그냥 뒤처져 있을 때**, git은 머지 커밋을 만들지 않고 **브랜치 포인터를 앞으로 이동**만 한다. 이게 fast-forward다.

```
before:  main → C        feature → C---D---E
after:   main ----------→ E   (커밋 추가 없이 포인터만 E로 전진)
```

- main이 feature가 갈라진 뒤로 **새 커밋이 없으면** FF 가능 → 히스토리가 선형으로 남고 머지 커밋이 안 생김
- main이 그새 앞서 나갔으면(양쪽이 갈라졌으면) FF 불가 → 일반 3-way merge로 머지 커밋 생성
- 옵션: `--ff`(기본, 가능하면 FF), `--no-ff`(FF 가능해도 강제로 머지 커밋 생성해 브랜치 흔적 보존), `--ff-only`(FF 안 되면 실패, CI에서 선형 강제용)

## 각 통합 방식의 장단점

### Merge commit

**장점**
- **원본 히스토리 그대로 보존** — 언제 브랜치가 시작됐고 합쳐졌는지 추적 가능
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
- 미완성, WIP 커밋이 사라짐
- **롤백이 단순** — 한 커밋만 revert

**단점**
- **브랜치 내부 히스토리 소실** — 개별 단계별 추적 불가
- 긴 PR의 중간 단계 bisect 불가
- 작성자 정보, 시점이 하나로 통합

**적합**: 트렁크 기반 개발, PR 단위로 관리, 깔끔한 main 선호

### Rebase and merge

**장점**
- **선형 히스토리** — 읽기 쉬움
- 각 커밋 메시지 **보존**
- bisect로 세밀한 원인 추적 가능

**단점**
- 재정렬 과정에서 **커밋 해시 변경** — 같은 원격 브랜치를 갱신하면 보통 non-fast-forward push가 되어 별도 안전 절차가 필요
- 충돌 시 **여러 커밋에서 반복 해결** 가능
- 다른 사람이 사용하는 브랜치를 rebase하려면 팀 합의, 작업 보존과 복구 계획이 필요

**적합**: 1인 1브랜치, 커밋이 작고 의미있게 쪼개져 있음

## 비교 표

| 축 | Merge commit | Squash | Rebase |
|---|---|---|---|
| main 히스토리 | 그래프 | 선형, PR 1커밋 | 선형 |
| 브랜치 커밋 보존 | O | ✗ | O |
| 병합 커밋 생성 | O | ✗ | ✗ |
| 롤백 단순성 | 중간 | **쉬움** | 중간 |
| bisect | 노이즈 | 거친 | **정교** |
| Force push 필요 | ✗ | ✗ | 이미 push한 같은 원격 ref 갱신 시 보통 `--force-with-lease` |

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

# 인터랙티브 Rebase (커밋 재구성, 합치기)
git rebase -i HEAD~5
```

## 정책 선택 가이드

- **Trunk-based + Squash**: 짧은 브랜치, 빠른 머지, main이 PR 단위로 1:1 매핑, WIP 커밋 메시지 자유
- **GitFlow + Merge commit**: 장기 브랜치(`develop`, `release/*`), 브랜치 추적, merge 이력 중요, 팀 규모 큼

## 공유 브랜치 히스토리 재작성 주의

- 다른 팀원이 이미 사용한 commit을 rebase하면 새 hash가 생겨 각자의 히스토리가 갈라진다.
- main, develop이나 공유 feature 브랜치는 팀의 명시적 합의, 작업 보존과 복구 계획 없이 rebase와 force-push로 다시 쓰지 않는다.
- 개인 브랜치도 원격을 다시 써야 한다면 현재 원격 ref를 확인하고 [[Git-Reset-Reflog|`--force-with-lease`와 백업 절차]]를 적용한다.

## Interactive Rebase, Cherry-pick

`git rebase -i HEAD~N`의 명령어: `pick`(그대로), `squash`(이전과 합침, 메시지 병합), `fixup`(합침, 메시지 무시), `reword`(메시지 수정), `edit`(해당 커밋 멈춤), `drop`(삭제). push 전 커밋 정리용.

**Cherry-pick vs Rebase**: Cherry-pick은 특정 커밋 하나를 다른 브랜치로 복사(일회성 패치), Rebase는 연속된 여러 커밋을 다른 베이스 위로 이동(브랜치 재구성).

`git rebase --onto <newbase> <upstream> <branch>`는 `branch`에서 `upstream`에 포함되지 않은 커밋들을 골라 `newbase` 위에 다시 만든다. 잘못된 base에서 시작한 하위 branch를 떼어 옮길 때 유용하지만 대상 범위를 `git log <upstream>..<branch>`로 먼저 확인한다.

## 흔한 실수

- **공유 브랜치 force-push** — 원격의 다른 commit을 덮어쓸 수 있다. 현재 ref, 팀 합의와 복구 경로를 먼저 확인한다
- **Squash 뒤 source branch까지 즉시 삭제** — target branch에서는 원 commit 단위의 감사와 bisect가 어려워지므로 보존 필요를 먼저 판단한다
- **Merge commit 남발** → `git log`가 엉망. `--first-parent` 옵션으로 보기
- **Rebase 충돌을 맥락 없이 반복 해결** — abort한 뒤 변경 단위와 통합 방식을 다시 판단한다
- **정책 없이 팀원마다 다른 방식** → 히스토리 일관성 깨짐

## 면접 체크포인트

- 세 통합 방식의 **히스토리 모양** 차이와 Git merge strategy 용어와의 구분
- Squash의 롤백 이점과 정보 소실 트레이드오프
- Rebase의 선형 히스토리 장점과 force-push 위험
- 공유 브랜치 히스토리 재작성 위험과 필요한 협의 및 보존 조건
- Trunk-based vs GitFlow에서의 선택 근거
- Interactive Rebase의 `pick`, `squash`, `fixup` 차이

## 출처

- Git: [git merge](https://git-scm.com/docs/git-merge), [git rebase](https://git-scm.com/docs/git-rebase), [권장 workflow](https://git-scm.com/docs/gitworkflows)
- 얄팍한 코딩사전, [Fast-Forward vs 3-Way Merge](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401704), [체리픽, 잔가지 옮기기, 마디 묶어 가져오기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=402152)

## 관련 문서

- [[git|Git 폴더 인덱스]], [[Git-Mental-Model|Git 멘탈 모델]], [[Git-Reset-Reflog|Git Reset과 복구]]
- [[CICD-Basics|CI/CD 기초]], [[GitHub-Actions|GitHub Actions]], [[Code-Review-Culture|생산적 코드 리뷰 문화]], [[Blue-Green|Blue/Green 배포]]
