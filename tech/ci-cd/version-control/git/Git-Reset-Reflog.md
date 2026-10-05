---
tags: [cicd, git, reset, revert, reflog, recovery]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Git Reset Reflog", "Git 복구", "force-with-lease", "Git Revert"]
verified_at: 2026-10-06
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
- 공유 브랜치의 히스토리 재작성에 합의와 보존 절차가 필요한 이유는 [[Git-Merge-Strategies|Git 통합 방식]]과 같은 맥락이다.

### 오래된 커밋 revert의 충돌

revert는 대상 커밋이 도입한 patch의 역방향을 현재 트리에 적용해 새 커밋으로 기록한다. 작업 트리가 깨끗해야 시작하고, 편집기에 `Revert "<원 커밋 제목>"`과 `This reverts commit <해시>.` 형태의 자동 메시지가 열리며 저장하면 커밋이 생긴다. Git 문서는 원 커밋을 되돌리는 이유를 메시지에 적으라고 강하게 권한다. GUI 도구의 되돌리기(Reverse commit) 메뉴도 같은 revert 커밋을 만든다.

오래된 커밋일수록, 그 뒤 커밋이 같은 파일과 영역을 건드렸을수록 역방향 patch가 현재 트리와 충돌하기 쉽다. 예를 들어 어떤 커밋이 추가한 파일을 이후 커밋이 수정했다면, 그 커밋을 revert할 때 git은 파일을 지워야 하지만 현재 내용이 그 커밋이 만든 내용과 달라 판단하지 못하고 멈춘다.

역방향 patch 적용의 실제 계산은 3-way merge다. git의 sequencer는 cherry-pick과 같은 merge 기계를 쓰되 base와 합쳐 오는 쪽을 맞바꾼다.

| 명령 | base (`:1:`) | HEAD 쪽 (`:2:`) | 합쳐 오는 쪽 (`:3:`) |
|---|---|---|---|
| `git cherry-pick C` | C의 부모 | 현재 HEAD | C |
| `git revert C` | C | 현재 HEAD | C의 부모 |

C에서 C의 부모로 가는 변경이 C의 역방향이고, C에서 HEAD로 가는 변경은 C 이후 커밋들이 쌓은 변경이다. 두 변경이 C의 같은 영역을 서로 다르게 바꾸면 [[Git-Mental-Model|3-way merge]]의 충돌 조건대로 멈춘다. 위의 파일 예시는 base(C)에 있던 파일을 합쳐 오는 쪽은 지우고 HEAD 쪽은 고친 modify/delete 충돌이라 파일에 마커가 없고, HEAD 쪽 내용이 남은 채 `git status`에 `deleted by them`으로 표시된다. 같은 영역의 내용 충돌이면 충돌 마커는 위쪽이 `HEAD`, 아래쪽이 `parent of <짧은 해시> (<제목>)`이므로 아래쪽이 C 이전의 코드이고, [[Git-Mental-Model#3-way merge — 세 지점을 비교해 새 커밋 생성|zdiff3]](Git 2.35 이상)를 켜면 가운데 base 구간에 C의 내용이 나온다. 되돌리는 중인 커밋은 `REVERT_HEAD`가 가리키므로 `git show REVERT_HEAD`로 원래 변경을 다시 확인한다.

```bash
git rm <파일>            # 삭제가 의도라면 삭제와 스테이징을 한 번에
# 다른 결과가 필요하면 파일을 고친 뒤 git add <파일>
git revert --continue    # revert 커밋 완성
git revert --abort       # 시작 전 상태로 되돌리기
```

`--skip`은 현재 커밋을 건너뛰고 나머지 순서를 계속하며, `--quit`은 진행 상태만 지운다. 충돌을 해결해 만든 revert 커밋은 결과 트리를 테스트로 다시 검증한다. 충돌 해결의 공통 절차는 [[Git-Mental-Model#충돌이 났을 때의 처리 절차|Git 멘탈 모델]]을 따른다.

여러 커밋을 revert 커밋 하나로 묶을 때는 `--no-commit`(`-n`)을 쓴다. 커밋을 만들지 않고 역변경을 작업 트리와 index에만 쌓으며, 이 옵션을 쓰면 index가 HEAD와 같지 않아도 되고 시작 시점의 index를 기준으로 되돌린다. 범위를 주면 cherry-pick은 오래된 커밋부터 적용하도록 순서를 뒤집지만 revert는 뒤집지 않아 최근 커밋부터 되돌린다.

```bash
git revert -n main~5..main~2   # main이 선형이면 main~2, main~3, main~4 순서로 역변경을 쌓는다
git commit                      # 되돌리는 이유를 적어 한 커밋으로 기록
```

### merge commit revert와 재병합

merge commit은 부모가 둘 이상이라 `-m` 없이 revert하면 `commit <해시> is a merge but no -m option was given.` 오류로 멈춘다. `-m <부모 번호>`(1부터)로 기준이 될 mainline 부모를 정하고, `-m 1`이면 첫 부모(merge를 실행한 쪽)가 기준이다. 계산은 일반 revert와 같아 base는 merge commit M, 합쳐 오는 쪽은 지정한 부모이고, 결과는 그 merge가 들여온 변경을 되돌린다.

```
---o---o---M---x---W---Y        ← main   (W = revert -m 1 M, Y = revert W)
          /
  ---A---B---------------C---D  ← topic  (C, D는 A, B의 결함 수정)
```

W는 M이 들여온 데이터만 되돌리고 히스토리의 M은 그대로 둔다. M은 계속 두 가지를 합친 지점이라 다음 merge는 B까지 이미 합쳐진 것으로 계산한다. 그래서 수정 없이 다시 merge하면 이미 최신이라며 아무것도 가져오지 않고, C와 D를 더해 merge하면 C와 D만 들어오며 A와 B의 변경은 W에 지워진 채 남는다.

- 고친 topic을 다시 합치기 전에 W를 revert해 Y를 만든다. Y가 A와 B의 변경을 되살리고 이어서 topic을 merge하면 C와 D가 들어와, 결과에 A부터 D까지 모두 반영된다. W 이후 커밋이 같은 영역을 바꿨다면 Y에서도 충돌할 수 있다. Git 2.43부터 되돌리는 커밋의 제목이 기본값 `Revert "<원 제목>"` 그대로이면 새 기본 제목은 `Revert "Revert ..."` 대신 `Reapply "<원 제목>"`이다. 제목을 고쳐 썼거나 `--reference`를 쓰면 해당하지 않는다.
- topic을 `git rebase --no-ff <원래 분기점>`으로 모두 새 커밋으로 다시 만들었다면 Y 없이 그대로 merge한다.
- GitHub에서 merge된 PR을 Revert하면 원 merge commit을 되돌리는 새 PR이 생긴다(2026-10-06 GitHub Docs 기준). merge commit으로 합쳤던 브랜치를 다시 합칠 때 같은 함정을 확인한다.
- 문제를 추적하다 merge revert 커밋을 만나면 합쳐진 커밋들의 변경이 역방향 커밋 하나로 뭉쳐 있어 어느 부분이 원인인지 좁히기 어렵다. 기술적으로 문제는 없지만 workflow 측면에서는 피하는 편이 낫고, 가능하면 [[Git-History-Debugging|bisect]]로 원인 커밋을 찾아 그 커밋만 고치거나 revert한다.

## reflog — 포인터 이동 일지 = 내장 백업

reset으로 이름표를 잃은 커밋도 **즉시 삭제되지 않는다**. git은 HEAD와 각 브랜치가 언제 어디로 움직였는지를 로컬에 전부 기록한다.

```bash
git reflog --date=iso                         # HEAD가 거쳐온 위치와 시각 확인
git show <candidate-oid>                      # 복구 후보 내용 검증
git branch rescue/reflog-recovery <candidate-oid>  # 후보를 비파괴 ref로 보존
git log --graph --oneline --decorate --all    # 현재 graph에서 위치 재확인
```

복구 후보를 branch로 보존하고 변경 파일도 별도로 지킨 뒤, 작업 트리가 clean하고 branch pointer를 실제로 옮길 필요가 있을 때만 `git reset --hard rescue/reflog-recovery`를 실행한다. 단순히 commit을 되살리는 목적이라면 rescue branch를 유지한 채 merge, rebase 또는 cherry-pick 중 필요한 방식을 고른다.

- reflog는 잘못 움직인 ref가 가리켰던 commit을 찾는 복구 단서다. 후보 OID와 내용을 검증하지 않고 reflog 순번만 보고 pointer를 옮기지 않는다
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
- revert 충돌의 3-way 구조(base는 되돌릴 커밋, 합쳐 오는 쪽은 그 부모)와, merge revert 뒤 고친 topic을 다시 합칠 때 revert의 revert가 필요한 이유와 rebase --no-ff로 다시 만들면 필요 없는 이유
- reflog가 복구할 수 있는 것과 없는 것 (ref에 담겼던 것만, 로컬 전용)
- `--force`와 `--force-with-lease`의 차이, lease의 한계
- range-diff의 용도 — rebase 검증

## 출처

- [git-reset 공식 문서 — 모드별 동작, pathspec 형태](https://git-scm.com/docs/git-reset)
- [git-config 공식 문서 — gc.reflogExpire, gc.reflogExpireUnreachable 기본값](https://git-scm.com/docs/git-config)
- [git-push 공식 문서 — --force-with-lease와 fetch 상호작용 경고](https://git-scm.com/docs/git-push)
- [git-range-diff 공식 문서 — base rev1 rev2 형식](https://git-scm.com/docs/git-range-diff)
- [git-fsck 공식 문서 — --lost-found](https://git-scm.com/docs/git-fsck)
- [git-revert 공식 문서 — sequencer 명령(--continue, --skip, --quit, --abort), -m, --no-commit, 메시지 권고와 Reapply 제목](https://git-scm.com/docs/git-revert)
- [revert-a-faulty-merge 공식 문서 — merge revert가 남기는 히스토리, revert의 revert, rebase --no-ff 재작성](https://www.kernel.org/pub/software/scm/git/docs/howto/revert-a-faulty-merge.html)
- [git-rebase 공식 문서 — --no-ff로 되돌린 topic 재작성](https://git-scm.com/docs/git-rebase)
- [gitrevisions 공식 문서 — REVERT_HEAD](https://git-scm.com/docs/gitrevisions)
- [GitHub 공식 문서 — Reverting a pull request](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/reverting-a-pull-request)
- [Git Tools - Advanced Merging — Pro Git 2판](https://git-scm.com/book/en/v2/Git-Tools-Advanced-Merging)
- [sequencer.c — git/git 저장소](https://github.com/git/git/blob/master/sequencer.c)
- [Git 2.43.0 릴리즈 노트 — git/git 저장소](https://github.com/git/git/blob/master/Documentation/RelNotes/2.43.0.adoc)
- 얄팍한 코딩사전, [과거로 돌아가는 세 가지 방법](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401003), [나머지 두 방법들](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401004), [reset 했어도 희망은 있다](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401084), [GUI 및 AI로 진행히보기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401005)

## 관련 문서

- [[Git-Mental-Model|Git 멘탈 모델 (커밋/브랜치/HEAD)]]
- [[Git-Merge-Strategies|Git 통합 방식 (공유 브랜치 히스토리 재작성 주의)]]
- [[Git-History-Debugging|Git 히스토리 분석과 디버깅 (bisect로 원인 커밋 좁히기)]]
- [[Development-Workflow|개발 워크플로 (PR 기반 협업)]]
