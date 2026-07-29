---
tags: [cicd, git, reset, reflog, recovery]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Git Reset Reflog", "Git 복구", "force-with-lease"]
verified_at: 2026-07-29
---

# Git Reset과 복구 — reset, revert, reflog, force-with-lease, range-diff

reset이 무서운 이유는 뭐가 사라지는지 모르기 때문이다. 커밋을 대상으로 하는 reset(`git reset [<옵션>] <커밋>`)의 본질은 하나 — **현재 브랜치 포인터를 지정한 커밋으로 옮기는 것** — 이고, 옵션은 그때 스테이징과 작업 파일을 어떻게 할지만 정한다. 그리고 커밋에 담겼던 작업의 사고는 대부분 reflog로 복구된다.

## 핵심 명제

- **reset** = 브랜치 포인터 이동. 아래 세 옵션 중 작업 파일까지 되돌리는 것은 `--hard`뿐
- **revert** = 히스토리를 지우지 않고 반대 내용의 커밋을 추가. 공유된 히스토리에는 revert
- **reflog** = HEAD와 브랜치 포인터의 이동 일지. reset과 rebase 사고의 복구 안전망
- **--force-with-lease** = 원격이 내가 마지막으로 본 상태일 때만 덮어쓰는 force push
- **range-diff** = 커밋 범위 두 개를 통째로 비교 — rebase 전후 검증용

## reset — 포인터 이동 + 작업물 처리 3단계

```
A---B---C---D   ← main        git reset B 후:

A---B---C---D                 (C, D는 이름표를 잃은 점으로 남는다)
    ↑
   main
```

| 옵션 | 브랜치 포인터 | 스테이징(index) | 작업 파일 | 용도 |
|---|---|---|---|---|
| `--soft` | 이동 | 유지 (커밋 직전 상태) | 유지 | 커밋 여러 개를 하나로 다시 묶기 |
| `--mixed` (기본) | 이동 | 해제 | 유지 | 커밋과 add를 무르고 파일만 남기기 |
| `--hard` | 이동 | 초기화 | **그 시점으로 되돌림** | 커밋과 작업 파일 변경을 함께 버리기 — 셋 중 유일하게 위험 |

```bash
git reset --soft HEAD~1    # 마지막 커밋만 취소, 변경은 스테이징에 유지
git reset HEAD~1           # 커밋과 add 취소, 파일 내용은 그대로
git reset --hard HEAD~1    # 마지막 커밋의 변경을 작업 파일에서도 제거
```

- 이 밖에 특수 용도의 `--merge`, `--keep` 모드도 있으며 이들도 작업 트리를 바꾼다
- 경로를 주는 `git reset -- <file>`은 별개 형태 — 포인터를 움직이지 않고 그 파일의 스테이징만 HEAD 상태로 되돌린다

## reset vs revert — 떼어내기 vs 상쇄하기

```
reset:   A---B                 (C를 브랜치에서 떼어냄 — 커밋 자체는 reflog 만료 전까지 남는다)
revert:  A---B---C---C역방향   (C를 되돌리는 새 커밋 추가 — 히스토리 보존)
```

- **push 전 로컬 정리는 reset**, **이미 공유된 커밋을 되돌릴 때는 revert**
- 공유 브랜치의 히스토리를 다시 쓰면 안 되는 이유는 공유 브랜치 rebase 금지 원칙과 같은 맥락 — [[Git-Merge-Strategies]]

## reflog — 포인터 이동 일지 = 내장 백업

reset으로 이름표를 잃은 커밋도 **즉시 삭제되지 않는다**. git은 HEAD와 각 브랜치가 언제 어디로 움직였는지를 로컬에 전부 기록한다.

```bash
git reflog                  # HEAD가 거쳐온 커밋 목록
git reset --hard HEAD@{2}   # 두 번 이동하기 전 위치로 복귀
git reflog show feature     # 특정 브랜치의 이동 이력
```

- 잘못된 `reset --hard`, 꼬인 rebase가 대부분 이걸로 복구된다 — **reflog를 알면 rebase가 무섭지 않다**
- reflog 항목은 기본 90일, 해당 브랜치의 현재 끝에서 도달할 수 없게 된 항목은 기본 30일 보관된다 (`gc.reflogExpire`, `gc.reflogExpireUnreachable`로 조정 가능). 만료된 뒤에야 gc가 해당 커밋을 지울 수 있다
- **로컬 전용** — push되지 않고 clone에도 없다. 다른 머신에서는 복구 불가

## force push와 --force-with-lease

rebase는 히스토리를 재작성하므로(새 해시) 이미 push된 브랜치는 원격과 갈라져 일반 push가 거부된다. 그래서 강제 push가 필요한데:

- `--force` — 원격 브랜치를 내 로컬 상태로 그대로 덮어쓴다. 그 사이 동료가 올린 커밋도 날아간다
- `--force-with-lease` — **원격 브랜치가 내 로컬이 기억하는 위치일 때만** 성공. 마지막 fetch 이후 누군가 push했다면 실패한다
- 한계: fetch만 하고 원격의 새 커밋을 확인하지 않은 채 force하면 lease 기준이 이미 갱신되어 보호가 무력화된다 — fetch 후에는 원격에 뭐가 올라왔는지 보고 진행

```bash
git push --force-with-lease origin feature
```

## range-diff — rebase 전후가 같은 내용인지 검증

rebase 전 커밋(C, D)과 후(C', D')는 해시가 다르지만 내용은 같아야 한다. range-diff는 커밋 하나가 아니라 **범위 대 범위**를 비교한다.

```bash
# main 위로 rebase한 직후, force push 전:
# 원격에 남아 있는 옛 커밋들 vs 로컬의 새 커밋들
git range-diff origin/main origin/feature feature
```

- `<base> <옛 tip> <새 tip>` 형식 — base 기준으로 두 범위를 만들어 커밋별로 1:1 대응시키고 메시지와 내용 차이를 보여준다
- 옮겨심는 과정에서 충돌 해결이 잘못됐거나 커밋이 누락됐는지 push 전에 확인 가능

## 흔한 실수

- 커밋 안 한 변경이 있는 상태에서 `reset --hard` — **커밋에 담긴 적 없는 변경은 reflog로 복구 불가** (reflog는 ref의 이동만 기록한다). 단 `git add`까지 한 내용은 blob이 객체 DB에 남아 `git fsck --lost-found`로 gc 전까지 건질 수 있다
- 공유 브랜치에 reset 후 force push — 팀원 히스토리 꼬임. 공유 브랜치는 revert
- reflog만 믿고 백업 없이 대수술 — reflog는 로컬 전용이고 만료가 있다. 큰 rebase 전엔 백업 브랜치(`git branch backup/x`)가 확실

## 면접 체크포인트

- reset 3옵션이 각각 무엇을 되돌리는지 (포인터, 스테이징, 작업 파일의 3층 모델)
- reset vs revert 선택 기준 — 히스토리 공유 여부
- reflog가 복구할 수 있는 것과 없는 것 (ref에 담겼던 것만, 로컬 전용)
- `--force`와 `--force-with-lease`의 차이, lease의 한계
- range-diff의 용도 — rebase 검증

## 출처

- [git-reset 공식 문서 — 모드별 동작, pathspec 형태](https://git-scm.com/docs/git-reset)
- [git-config 공식 문서 — gc.reflogExpire, gc.reflogExpireUnreachable 기본값](https://git-scm.com/docs/git-config)
- [git-push 공식 문서 — --force-with-lease와 fetch 상호작용 경고](https://git-scm.com/docs/git-push)
- [git-range-diff 공식 문서 — base rev1 rev2 형식](https://git-scm.com/docs/git-range-diff)
- [git-fsck 공식 문서 — --lost-found](https://git-scm.com/docs/git-fsck)

## 관련 문서

- [[Git-Mental-Model|Git 멘탈 모델 (커밋/브랜치/HEAD)]]
- [[Git-Merge-Strategies|Git 머지 전략 (공유 브랜치 rebase 금지)]]
- [[Development-Workflow|개발 워크플로 (PR 기반 협업)]]
