---
tags: [cicd, git, log, blame, bisect, tags]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Git History Debugging", "Git 히스토리 디버깅"]
verified_at: 2026-08-04
---

# Git 히스토리 분석과 디버깅

Git 히스토리는 사람을 지목하는 기록이 아니라 변경의 맥락과 회귀 범위를 좁히는 데이터다. 먼저 `log`, `show`, `diff`로 후보를 만들고, `blame`으로 줄의 마지막 변경을 추적하며, 범위가 크면 `bisect`로 실패를 처음 도입한 커밋을 찾는다.

## log로 그래프와 범위 읽기

```bash
git log --graph --oneline --decorate --all
git log --first-parent main
git log -- path/to/file
git log -S'oldApi(' --all
git log -G'regex' --all
```

- `--all`은 모든 ref를 보여 주며 저장소의 모든 객체를 뜻하지 않는다.
- `--first-parent`는 merge된 주제 브랜치의 세부 커밋을 접어 통합 흐름을 읽게 한다.
- `-S`는 문자열의 등장 횟수가 바뀐 커밋, `-G`는 patch가 정규식과 맞는 커밋을 찾는다.
- 경로를 붙이면 그 경로에 영향을 준 커밋으로 탐색 범위를 제한한다.

## 어느 두 상태를 비교하는가

| 명령 | 비교 |
|---|---|
| `git diff` | 작업 트리와 인덱스 |
| `git diff --cached` | 인덱스와 `HEAD` |
| `git diff HEAD` | 작업 트리 현재 상태와 `HEAD` |
| `git diff A B` | 두 커밋의 트리 |
| `git show <commit>` | 커밋 메타데이터와 그 커밋이 도입한 patch |

점 두 개와 세 개는 의미가 다르다. `git diff A..B`는 사실상 두 끝점 A와 B를 비교한다. `git diff A...B`는 A와 B의 merge base부터 B까지를 비교하므로 PR의 주제 브랜치 변경을 볼 때 유용하다.

## blame은 마지막 변경 단서다

```bash
git blame -L 40,70 path/to/file
git blame -w -C path/to/file
```

`blame`은 각 줄이 현재 형태가 된 마지막 커밋과 작성자 정보를 표시한다. 원래 작성자를 확정하거나 결함의 책임자를 판정하는 명령이 아니다. 이동, 복사, 포맷 변경은 결과를 흐릴 수 있으며 `-w`는 공백 변경을 무시하고 `-C`는 다른 파일에서 복사되거나 이동한 줄을 추가 탐색한다.

결과의 커밋을 `git show`로 열고 그 시점의 이슈, PR, 주변 코드를 함께 확인해야 변경 이유에 가까워진다.

## bisect로 회귀를 이진 탐색하기

현재 실패 상태와 과거의 정상 커밋 사이에서 테스트 판정이 일관되면 `bisect`가 중간 커밋을 반복 체크아웃해 최초 실패 후보를 좁힌다.

```bash
git bisect start
git bisect bad
git bisect good <known-good-commit>

# 각 체크아웃에서 같은 재현 절차를 실행
git bisect good   # 정상
git bisect bad    # 실패

git bisect reset
```

자동화 가능한 테스트라면 다음처럼 반복 판정을 맡긴다.

```bash
git bisect start <bad> <good>
git bisect run ./scripts/reproduce-regression.sh
git bisect reset
```

테스트가 비결정적이거나 중간 커밋이 빌드되지 않으면 결과도 신뢰하기 어렵다. 해당 커밋을 판정할 수 없을 때는 `git bisect skip`을 쓰되 후보가 여러 개로 남을 수 있다. 시작 전 커밋하지 않은 변경을 보존하고, 마지막 후보는 `show`, 테스트와 관련 문맥으로 다시 검증한다.

## 태그와 GitHub Release

태그는 특정 객체에 붙인 ref다.

- lightweight tag는 이름이 객체를 직접 가리킨다.
- annotated tag는 태거, 시각, 메시지와 선택적 서명을 담는 별도 tag object다.
- `v1.2.3` 같은 이름은 관례일 뿐, Git이 Semantic Versioning을 강제하지 않는다.
- 태그는 브랜치 push에 자동으로 모두 따라가지 않는다. 필요한 태그를 명시적으로 push한다.

```bash
git tag -a v1.2.3 -m "release v1.2.3"
git push origin v1.2.3
git show v1.2.3
```

GitHub Release는 Git tag를 기반으로 릴리스 노트와 바이너리 자산 등을 붙이는 GitHub의 별도 배포 메타데이터다. tag와 Release를 같은 개념으로 취급하지 않는다.

## 출처

- Git 공식 문서: [git log](https://git-scm.com/docs/git-log), [git diff](https://git-scm.com/docs/git-diff), [git blame](https://git-scm.com/docs/git-blame), [git bisect](https://git-scm.com/docs/git-bisect), [git tag](https://git-scm.com/docs/git-tag)
- GitHub 공식 문서: [About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- 얄팍한 코딩사전, [log 더 자세히 알아보기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=403305), [차이 살펴보기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=404540), [누가 코딩했는지 알아내기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=404737), [오류가 발생한 시점 찾아내기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=404989)
- 얄팍한 코딩사전, [커밋에 태그 달기](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401090), [원격의 태그와 릴리즈](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=401091)

## 관련 문서

- [[Git-Working-Tree-and-Commits|Git 작업 트리와 커밋 관리]], [[Git-Reset-Reflog|Git Reset과 복구]], [[Git-Merge-Strategies|Git 통합 방식]]
