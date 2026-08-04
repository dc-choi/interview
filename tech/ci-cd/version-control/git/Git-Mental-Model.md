---
tags: [cicd, git, internals, merge, rebase]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Git Mental Model", "Git 멘탈 모델", "커밋 브랜치 HEAD"]
verified_at: 2026-08-04
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

## 면접 체크포인트

- 브랜치가 저렴한 이유 (포인터일 뿐 — Git vs SVN 비교로 연결)
- fast-forward가 가능한 조건, 이때 커밋이 안 생기는 이유
- 3-way merge에서 base(공통 조상)가 필요한 이유, 충돌이 나는 정확한 조건 (같은 영역 + add/add, modify/delete)
- rebase가 새 해시를 만드는 이유와 force push로 이어지는 연결고리
- merge vs rebase — 히스토리 보존 vs 선형성 트레이드오프

## 출처

- [Pro Git 2판 1.3 — Snapshots, Not Differences](https://git-scm.com/book/en/v2/Getting-Started-What-is-Git%3F)
- [Pro Git 2판 10.4 — Packfiles (저장 계층의 델타 압축)](https://git-scm.com/book/en/v2/Git-Internals-Packfiles)
- [git-merge 공식 문서 — HOW CONFLICTS ARE PRESENTED, MERGE STRATEGIES(ort)](https://git-scm.com/docs/git-merge)
- [git-config 공식 문서 — merge.conflictStyle(zdiff3)](https://git-scm.com/docs/git-config)
- [Git 2.35 릴리즈 노트 — zdiff3 도입](https://github.com/git/git/blob/master/Documentation/RelNotes/2.35.0.adoc)
- 얄팍한 코딩사전, [Git을 특별하게 만드는 것](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401052), [Git의 3가지 공간](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401053), [HEAD](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401059)

## 관련 문서

- [[Git-Merge-Strategies|Git 통합 방식 (Merge commit/Squash/Rebase, fast-forward 옵션)]]
- [[Git-Reset-Reflog|Git Reset과 복구 (reset, reflog, force-with-lease, range-diff)]]
- [[Version-Control-Tooling|버전 관리 도구 (Git vs SVN, 브랜치 전략)]]
