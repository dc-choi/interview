---
tags: [cicd, git, internals, merge, rebase]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Git Mental Model", "Git 멘탈 모델", "커밋 브랜치 HEAD"]
verified_at: 2026-09-30
---

# Git 멘탈 모델 — 커밋은 점, 브랜치는 포인터

git이 어렵게 느껴지는 이유는 명령이 많아서가 아니라, 명령을 기반 모델 없이 하나씩 외우기 때문이다. **커밋은 스냅샷 점, 브랜치는 그 점에 붙인 포인터**라는 모델 하나를 잡으면 merge, rebase, reset이 전부 **포인터를 어떻게 움직이느냐**의 문제로 읽힌다.

## 핵심 명제

- **커밋** = 그 시점 프로젝트 전체의 스냅샷. 부모 커밋을 가리켜 사슬(DAG)을 이룬다
- **브랜치** = 커밋 하나를 가리키는 **포인터(이름표)일 뿐**. 생성과 삭제 비용이 거의 0
- **HEAD** = 내가 지금 서 있는 위치. 보통 브랜치를 가리킨다
- 커밋 생성 = 새 점을 찍고 **현재 브랜치 포인터를 그 점으로 전진**
- fast-forward, 3-way merge, rebase는 모두 이 모델의 파생 — 별개의 암기 대상이 아니다

## 커밋 — 스냅샷의 사슬

```
A <--- B <--- C        (화살표는 부모를 가리킴)
```

- git의 객체 모델은 diff가 아니라 **스냅샷**이다. 저장 계층(packfile)에서는 유사한 객체끼리 델타 압축을 해 용량을 관리하지만, 커밋을 읽고 다루는 단위는 전체 스냅샷이다
- 전체 스냅샷이 공간을 낭비하지 않는 이유는 바뀌지 않은 파일을 다시 저장하지 않기 때문이다. git은 내용의 해시를 key로 쓰는 저장소라 같은 내용의 blob은 한 번만 저장되고, 새 커밋의 tree는 변경 없는 파일에 대해 이전과 같은 blob 해시를 가리킨다. packfile의 델타 압축은 그 위의 추가 최적화다
- 변경분(델타)을 쌓는 방식은 특정 버전을 복원할 때 기준본에 델타를 차례로 적용해야 해서 버전이 쌓일수록 복원 경로가 길어질 수 있다. 실제 도구는 이 경로를 줄이는 저장 기법을 쓰기도 하므로 제품 간 속도 우열로 단정하지 않는다. 중앙집중식과 분산 방식의 비교는 [[Version-Control-Tooling|버전 관리 도구]]를 따른다
- 커밋의 이름이 해시(SHA)이고, 내용이나 부모가 바뀌면 해시도 바뀐다 — 뒤의 rebase 이해에 핵심
- 히스토리는 부모 링크가 만드는 그래프일 뿐, 별도의 타임라인 저장소가 있는 게 아니다

## 브랜치와 HEAD — 이름표 붙이기

```
A---B---C   ← main, feature (둘 다 C를 가리킴)
        ↑
       HEAD → main
```

- `git branch feature` = C에 이름표를 하나 더 붙이기. 파일 복사 같은 건 일어나지 않는다
- `git switch feature` = HEAD를 feature로 옮기기
- feature에서 커밋하면 feature 이름표만 전진하고 main은 C에 남는다
- 브랜치가 아니라 커밋을 직접 체크아웃하면 detached HEAD — 이름표 없이 점 위에 서 있는 상태

### HEAD 기준 상대 이동

| 표기 | 의미 |
|---|---|
| `HEAD~3` | 첫 부모만 따라 3세대 위. `HEAD^^^`, `HEAD~1~1~1`과 같다 |
| `HEAD^2` | 두 번째 부모. merge commit에서 합쳐 온 쪽 부모라 첫 부모의 첫 부모인 `HEAD~2`와 다르다 |
| `@{-1}`, `-` | 직전에 switch나 checkout한 브랜치 또는 커밋. `git switch -`나 `git checkout -`로 잘못 이동한 것을 되돌린다 |
| `HEAD@{2}` | reflog에 남은 HEAD의 두 번째 이전 값. 복구할 때 해시 대신 쓸 수 있다 |

- `git switch --detach HEAD~3`이나 `git checkout HEAD~3`으로 과거 커밋에 가면 detached HEAD가 되고 `git status`는 `HEAD detached at <해시>`를 보여 준다.
- 그 상태에서 `git switch -c <새 브랜치>`를 하면 그 중간 커밋에 이름표가 생기고, 이후 커밋은 그 지점에서 새 가지로 뻗는다.
- `git reset --hard HEAD~1`처럼 해시를 몰라도 커밋 수만큼 되돌릴 수 있다. reflog 번호로 복구할 때도 [[Git-Reset-Reflog|후보 내용을 검증한 뒤 이동한다]].

git 자체에는 주 브랜치와 곁가지의 구분이 없고 모든 브랜치가 대등한 포인터다. GUI가 어떤 브랜치를 곧은 선으로 그리는지는 최신 커밋 위치나 보기 편의에 따른 표현일 뿐이다. 어느 쪽에서 합쳤는지는 merge commit의 부모 순서에만 남고, `git log --first-parent`가 통합 흐름을 읽을 수 있는 이유가 여기 있다.

## Fast-forward — 포인터만 전진

내 브랜치가 상대 히스토리의 과거 지점에 그대로 있으면(갈라진 커밋 없음) 합칠 게 없다. **포인터를 앞으로 밀면 끝**이고 커밋은 생기지 않는다.

```
전:
        main
          ↓
  A---B---C---D---E
                  ↑
             origin/main

후:
                main
                  ↓
  A---B---C---D---E      (main 포인터만 E로 이동, 새 커밋 없음)
                  ↑
             origin/main
```

원격보다 뒤처지기만 한 로컬 브랜치에서 pull이 fast-forward를 허용하는 설정이면 fetch 뒤 통합은 이 포인터 이동으로 끝난다. `--no-ff`나 `pull.ff=false`는 FF 가능한 경우에도 merge commit을 만들 수 있으므로 실제 pull 설정과 선택 기준은 [[Git-Merge-Strategies|Git 통합 방식]]에서 확인한다.

## 3-way merge — 세 지점을 비교해 새 커밋 생성

양쪽 모두 커밋이 진행되어 히스토리가 갈라졌으면 포인터 이동만으로는 안 된다. main에서 `git merge feature`를 하면:

```
          C---------D          ← feature
         /           \
    A---B---E---F-----M        ← main (M의 부모는 F(첫 부모)와 D(둘째 부모))
```

git은 **세 지점**을 비교한다 — 그래서 3-way:

1. **공통 조상 B (base)** — 갈라지기 전 마지막 공통 상태
2. 내가 서 있는 쪽(main, HEAD)의 끝 F
3. 합쳐 오는 쪽(feature)의 끝 D

base 이후 각자 바꾼 내용을 합쳐 **부모가 둘인 병합 커밋 M**을 만든다. **내용 충돌은 양쪽이 base의 같은 영역(겹치는 부분)을 서로 다르게 고쳤을 때** 나고, 이 밖에 양쪽이 같은 파일을 새로 만든 add/add(base 없이 두 버전을 내용 병합), 한쪽이 지운 파일을 다른 쪽이 고친 modify/delete(경로 수준) 같은 충돌도 있다. 공통 조상이 여럿인 히스토리에서는 기본 전략(ort)이 조상들을 재귀적으로 합친 가상 base를 쓴다.

`merge.conflictstyle=zdiff3` 설정(git 2.35+)을 쓰면 충돌 마커에 내 것과 상대 것에 더해 **base의 원문**까지 표시되어 누가 뭘 바꾼 건지 판단이 쉬워진다.

## Rebase — 커밋을 복사해 옮겨심기

같은 상황의 다른 해법. feature에서 `git rebase main`을 하면 내 커밋들을 main 끝 위에서 **다시 만든다**.

```
전:
          C---D            ← feature
         /
    A---B---E---F          ← main

후:
                  C'---D'  ← feature
                 /
    A---B---E---F          ← main
```

- 결과가 일직선이라 로그가 깨끗하다
- C'는 내용이 같아도 부모가 달라졌으니 **다른 커밋(새 해시)** — 이것이 **히스토리 재작성(rewrite)**
- 이미 push한 브랜치를 rebase하면 원격과 갈라져 force push가 필요해진다 — 안전한 방식은 [[Git-Reset-Reflog]]의 `--force-with-lease`

한 줄 요약: **merge는 합친 흔적을 남기고, rebase는 처음부터 최신 위에서 작업한 것처럼 히스토리를 다시 쓴다.** 팀 정책으로서의 선택 기준은 [[Git-Merge-Strategies]].

## 충돌이 났을 때의 처리 절차

충돌은 같은 영역의 두 변경 중 무엇을 남길지 git이 정할 수 없어 결정을 사용자에게 넘긴 상태다. merge, rebase, pull, revert, cherry-pick 모두 같은 흐름으로 끝낸다.

1. `git status`의 `Unmerged paths`에서 충돌 파일(`both modified` 등)을 확인한다.
2. `<<<<<<<`, `=======`, `>>>>>>>` 구간을 원하는 최종 코드로 고치고 마커를 지운다. 필요하면 `git show :1:<파일>`(공통 조상), `:2:<파일>`(HEAD), `:3:<파일>`(합쳐 오는 쪽)으로 각 버전을 따로 본다.
3. `git add <파일>`로 해결을 표시한다.
4. 진행 중이던 명령을 이어 가거나 포기한다.

| 명령 | 이어 가기 | 포기하고 시작 전 상태로 |
|---|---|---|
| merge, merge 방식의 pull | `git commit` 또는 `git merge --continue` | `git merge --abort` |
| rebase, `pull --rebase` | `git rebase --continue` (다음 커밋에서 또 멈추면 반복) | `git rebase --abort` |
| revert, cherry-pick | `git revert --continue`, `git cherry-pick --continue` | 각 명령의 `--abort` |

- rebase는 커밋을 하나씩 다시 적용하므로 커밋마다 충돌할 수 있고 커밋 메시지는 새로 쓰지 않는다. 끝나면 대상 브랜치에서 merge해 fast-forward로 붙인다.
- rebase 충돌에서는 ours와 theirs가 뒤바뀐다. ours는 upstream부터 지금까지 재적용된 쪽, theirs는 옮겨지는 내 커밋이므로 `checkout --ours`나 `--theirs`로 한쪽을 고를 때 특히 주의한다.
- 기본 merge backend에서 충돌을 해결한 결과 그 커밋에 남는 변경이 없으면 `git rebase --continue`는 `--empty` 설정이나 `-i`와 관계없이 그 커밋을 조용히 빼고 넘어간다(Git 2.54에서 재현). 커밋을 남기려면 `--continue` 전에 `git commit --allow-empty -C REBASE_HEAD`로 원래 메시지의 빈 커밋을 만든다. `--empty=drop|keep|stop`(기본 drop, `-i`는 stop)은 충돌 없이 다시 적용했는데 변경이 이미 upstream에 있어 비게 된 커밋에만 적용된다. 어느 변경을 택하느냐에 따라 rebase 결과가 원래 가지와 다른 모양이 될 수 있는 이유다.
- merge를 시작할 때 커밋하지 않은 변경이 있었다면 `merge --abort`가 그 변경을 복원하지 못할 수 있다. merge나 pull 전에 커밋하거나 stash한다.
- 변수가 많은 작업이라 GUI의 충돌 팝업보다 `git status`로 상태를 확인하며 CLI로 진행하는 편이 추적하기 쉽다. 해결 결과는 테스트로 다시 검증하고 rebase 전후는 [[Git-Reset-Reflog|range-diff]]로 비교한다.

## 면접 체크포인트

- 브랜치가 저렴한 이유 (포인터일 뿐 — Git vs SVN 비교로 연결)
- fast-forward가 가능한 조건, 이때 커밋이 안 생기는 이유
- 3-way merge에서 base(공통 조상)가 필요한 이유, 충돌이 나는 정확한 조건 (같은 영역 + add/add, modify/delete)
- rebase가 새 해시를 만드는 이유와 force push로 이어지는 연결고리
- merge vs rebase — 히스토리 보존 vs 선형성 트레이드오프
- 충돌 해결 뒤 `--continue`와 `--abort`의 선택, rebase에서 ours와 theirs가 뒤바뀌는 이유
- `HEAD~2`와 `HEAD^2`의 차이

## 출처

- [Pro Git 2판 1.3 — Snapshots, Not Differences](https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F)
- [Pro Git 2판 10.4 — Packfiles (저장 계층의 델타 압축)](https://git-scm.com/book/en/v2/Git-Internals-Packfiles)
- [Pro Git 2판 10.2 — Git Objects (content-addressable 저장소와 tree, blob)](https://git-scm.com/book/en/v2/Git-Internals-Git-Objects)
- [git-merge 공식 문서 — HOW CONFLICTS ARE PRESENTED, HOW TO RESOLVE CONFLICTS, --abort, MERGE STRATEGIES(ort)](https://git-scm.com/docs/git-merge)
- [git-rebase 공식 문서 — 충돌 시 continue/abort, --empty, ours와 theirs 반전](https://git-scm.com/docs/git-rebase)
- [gitrevisions 공식 문서 — ~, ^, @{n}, @{-n}, :n:path](https://git-scm.com/docs/gitrevisions)
- [git-switch 공식 문서 — `-`와 @{-N}](https://git-scm.com/docs/git-switch)
- [git-config 공식 문서 — merge.conflictStyle(zdiff3)](https://git-scm.com/docs/git-config)
- [Git 2.35 릴리즈 노트 — zdiff3 도입](https://github.com/git/git/blob/master/Documentation/RelNotes/2.35.0.adoc)
- 얄팍한 코딩사전, [Git을 특별하게 만드는 것](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401052), [Git의 3가지 공간](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401053), [HEAD](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401059)
- 얄팍한 코딩사전, [여러 브랜치 만들어보기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401008), [충돌 해결하기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401022), [GUI로 진행해보기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401027), [push와 pull](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401044)
- 얄팍한 코딩사전, [reset 했어도 희망은 있다!](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401084), [Fast-Forward vs 3-Way Merge](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401704), [체리픽, 잔가지 옮기기, 마디 묶어 가져오기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=402152)

## 관련 문서

- [[Git-Merge-Strategies|Git 통합 방식 (Merge commit/Squash/Rebase, fast-forward 옵션)]]
- [[Git-Reset-Reflog|Git Reset과 복구 (reset, reflog, force-with-lease, range-diff)]]
- [[Version-Control-Tooling|버전 관리 도구 (Git vs SVN, 브랜치 전략)]]
