---
tags: [ci-cd, git, version-control, branch-strategy]
status: done
category: "CI/CD&배포(CI/CD&Delivery)"
aliases: ["Git Flow", "브랜치 전략", "Branch Strategy", "Trunk-Based Development"]
verified_at: 2026-08-31
---

# 브랜치 전략 (GitHub Flow, Git Flow, Trunk-Based)

브랜치 전략은 릴리스 단위와 동시에 지원해야 하는 버전 수가 정하는 결과이지 팀 규모나 유행이 정하는 값이 아니다. 이 원칙, main을 배포 가능하게 유지하는 조건, VCS 층위 비교는 [[Version-Control-Tooling#Branch 전략은 배포 모델의 결과다|버전 관리 도구 선택]]에 있으므로 반복하지 않는다. 이 문서는 세 전략의 브랜치 해부, hotfix 전파 경로, 전환 판단 기준을 채운다.

## 핵심 명제

- 세 전략의 차이는 **영속 브랜치 수**와 **릴리스를 어디서 자르는가** 두 축으로 대부분 설명된다.
- 지원 버전이 하나면 영속 브랜치 하나로 충분하고, 동시에 유지할 버전이 둘 이상이면 release branch가 필요해진다.
- 브랜치가 길수록 머지가 커지고 위험해진다. 브랜치 수명이 곧 비용 축이다.

## 세 전략의 브랜치 해부

| 축 | GitHub Flow | Git Flow | Trunk-Based |
|---|---|---|---|
| 영속 브랜치 | main 1개 | main(master)과 develop 2개 | trunk 1개 |
| 임시 브랜치 | 작업 단위 feature branch | feature, release, hotfix | 개발자 1명(페어면 2명) 소유의 짧은 브랜치 |
| 릴리스 컷 지점 | main 머지 시점이 곧 릴리스 후보 | develop에서 release 브랜치를 잘라 안정화 후 main으로 | 필요할 때만 trunk에서 잘라내고 릴리스가 끝나면 삭제 |
| hotfix 출발 브랜치 | main | main(master) | trunk에서 재현하고 수정 |
| 역전파 대상 | 없음, main이 유일한 원본 | develop과 main 양쪽에 머지 | 없음, trunk에서 release 브랜치로 cherry-pick 단방향 |
| 배포 트리거 | main 머지 | main의 릴리스 태그 | trunk 커밋 또는 release 브랜치 태그 |

브랜치 이름 규칙, PR과 이슈 연결, branch protection 항목 같은 구현 규칙은 [[Development-Workflow|개발 워크플로]]에서 정한다. 통합 방식(merge commit, squash, rebase)의 히스토리 차이는 [[Git-Merge-Strategies|Git 통합 방식]]에 있고, 여기서는 전략별 궁합만 한 줄로 적는다. GitHub Flow와 Trunk-Based는 PR 1개가 커밋 1개가 되는 squash와 잘 맞고, Git Flow는 release와 hotfix 머지 흔적을 남기는 merge commit과 잘 맞는다.

## GitHub Flow, 언제 맞고 언제 깨지는가

GitHub 공식 문서가 설명하는 흐름은 브랜치 생성, 변경, PR, 리뷰 반영, 머지, 브랜치 삭제의 여섯 단계다 (문서 확인 기준 2026-08-31).

- 전제는 **지원 버전이 하나**이고 main을 배포 가능한 상태로 유지한다는 것이다. main의 최신 커밋은 배포 후보여야 하지만, 승인, 점진 배포와 롤백 때문에 언제나 실제 프로덕션 revision과 같지는 않다.
- 롤백은 브랜치가 아니라 revert 커밋과 재배포로 해결한다. 이전 버전을 유지 보수할 자리가 없다.
- 외부 승인이나 앱 스토어 심사만으로 장기 브랜치가 필요한 것은 아니다. tag, release와 deployment environment로 승인 대기 revision을 고정할 수 있다. GitHub Flow가 깨지는 지점은 고객별 고정 버전처럼 여러 릴리스 계열을 장기간 동시에 유지하고 각각에 패치를 내야 할 때다.
- 브랜치 삭제는 정리 이상의 의미가 있다. 삭제하지 않은 브랜치가 몇 주 지나면 그 자체가 사실상의 장기 브랜치가 된다.

## Git Flow, 정기 릴리스와 다중 지원 버전용

Vincent Driessen의 2010년 모델은 main과 develop을 영속 브랜치로 두고 feature는 develop에서, release는 develop에서 잘라 develop과 main 양쪽으로, hotfix는 main에서 잘라 develop과 main 양쪽으로 되돌린다.

- **develop의 통합 지연 비용**: 기능이 develop에 모였다가 릴리스 단위로 한 번에 main으로 간다. 운영에 나가기 전까지 실제 배포 환경에서 검증되지 않은 변경이 누적된다.
- **release 브랜치 동결 기간의 이중 머지**: 안정화 기간 동안 나온 수정은 release와 develop 양쪽에 반영해야 한다. 한쪽을 빠뜨리면 다음 릴리스에서 되살아나는 회귀 버그가 된다.
- 원저자는 2020년에 글 앞에 주석을 달아, 이 모델은 여러 버전을 동시에 지원하는 소프트웨어를 염두에 둔 것이며 지속 배포하는 웹앱이라면 GitHub Flow 같은 더 단순한 워크플로를 권한다고 밝혔다. 만병통치약은 없으니 각자 맥락을 보라는 문장도 함께 붙였다.
- 따라서 Git Flow를 쓰는 이유는 정기 릴리스 주기나 다중 지원 버전이어야 하고, 표준처럼 보여서는 근거가 되지 않는다.

## Trunk-Based, 전제 조건이 본체다

trunkbaseddevelopment.com은 이 모델을 trunk 하나에서 협업하고 장기 개발 브랜치 생성 압력에 저항하는 소스 관리 모델로 정의한다. 브랜치를 없애는 기법이 아니라 브랜치를 짧게 유지할 수 있게 만드는 전제들이 본체다.

- **커밋당 빠른 CI**: 빌드 서버가 커밋이 빌드를 깨지 않았는지 확인해야 한다. 파이프라인 최적화는 [[GitHub-Actions|GitHub Actions]]의 속도 절을 따른다.
- **짧은 브랜치 수명**: 같은 문서는 브랜치가 이틀을 넘기면 장기 브랜치가 될 위험이 있다고 보고, 브랜치 소유자를 1명(페어면 2명)으로 제한한다. DORA는 활성 브랜치 3개 이하와 하루 1회 이상 trunk 머지를 조건으로 제시한다.
- **미완성 코드의 안전한 머지**: feature flag 또는 branch by abstraction으로 미완성 기능을 trunk에 넣되 노출은 막는다.
- **호환 가능한 스키마 변경**: 컬럼 추가와 삭제를 분리하는 expand-contract가 없으면 배포와 롤백이 스키마에 묶인다. [[Blue-Green|Blue-Green 배포]]의 스키마 절과 함께 본다.

전제 없이 이름만 도입하면 결과는 하나다. 모두가 trunk에 밀어 넣는데 CI는 느리고 flag는 없어서 trunk가 상시로 깨진다.

## 오래 사는 변경을 다루는 4가지 수단

브랜치 수명을 늘리지 않고 배포 단위를 쪼개는 축이다. 넷 다 브랜치 문제를 배포와 설계 문제로 옮긴다.

- **feature flag**: 코드는 trunk에 있고 노출만 런타임에서 끈다. 되돌리기가 배포가 아니라 스위치가 되므로 되돌릴 수 있는 문 쪽으로 결정을 옮긴다. [[Feature-Flag|feature flag]], [[One-Way-vs-Two-Way-Door|되돌릴 수 있는 결정과 없는 결정]] 참고.
- **branch by abstraction**: 기존 구현 앞에 추상 계층을 세우고 뒤에서 새 구현을 채운 뒤 전환한다. 대규모 교체를 여러 번의 작은 머지로 나눈다.
- **API 호환 계층**: 구 계약과 신 계약을 함께 제공하다가 소비자 이전이 끝나면 구 계약을 걷는다. [[Backward-Compatibility-Design|하위 호환 설계]] 참고.
- **다크 런치**: 새 경로에 실제 트래픽을 흘리되 결과는 사용자에게 반영하지 않고 비교만 한다. [[Shadow-Traffic|섀도 트래픽]] 참고.

## hotfix 전파 규칙

전략마다 출발 브랜치와 되돌려 합칠 대상이 다르다. [[Development-Workflow#Hotfix와 오래 사는 변경|개발 워크플로]]는 판단 원칙만 두므로 전략별 구체안은 여기서 정한다.

| 전략 | 출발 | 배포 후 반영 대상 |
|---|---|---|
| GitHub Flow | main | 없음. main 하나가 원본이므로 재배포로 끝난다 |
| Git Flow | main(master) | main과 develop 양쪽, 열려 있는 release 브랜치까지 |
| Trunk-Based | trunk에서 재현하고 수정 | 검증 후 활성 release 브랜치로 cherry-pick |

Trunk-Based 문서가 강조하는 규칙은 cherry-pick 방향이 trunk에서 브랜치로만 흐른다는 것이다. release 브랜치에서 직접 고치면 trunk 반영을 빠뜨렸을 때 다음 릴리스에서 같은 버그가 되살아난다. Martin Fowler도 릴리스 브랜치 수정은 mainline에서 먼저 쓰고 cherry-pick하는 편을 권하면서, 시간 압박 때문에 반대로 하는 팀이 많다는 현실을 함께 적는다.

## 전략을 문서로 고정할 때 적는 6항목

- 브랜치 수명 상한 (예: 영업일 2일, 초과 시 분할 또는 flag 도입)
- base 동기화 방식 (merge 또는 rebase, 공유 브랜치의 force push 정책 포함)
- 통합 방식 (merge commit, squash, rebase 중 저장소 기본값)
- release cut 시점 (릴리스 브랜치를 두는지, 둔다면 자르는 조건과 삭제 시점)
- hotfix 전파 경로 (출발 브랜치와 반영 대상 목록)
- 브랜치 삭제 기준 (머지 직후 삭제인지, 보존 기간을 두는지)

## 전환 판단

**Git Flow에서 trunk로 갈 때**는 순서가 있다. 브랜치부터 지우면 깨진 trunk만 남는다.

1. CI 소요 시간을 먼저 측정한다. 커밋 하나가 수분 내에 판정되지 않으면 하루 여러 번 머지가 성립하지 않는다.
2. feature flag 인프라와 정리 규칙을 갖춘다. flag가 쌓이기만 하면 부채가 된다.
3. 그 다음에 develop을 제거하고 release 브랜치는 필요할 때만 자르는 형태로 바꾼다.

**반대로 release 브랜치를 다시 들여야 하는 신호**는 지원 버전이 실제로 늘어나는 사건들이다. 고객사별 버전 고정이나 온프레미스 배포처럼 여러 릴리스 계열에 장기간 별도 패치를 내야 하는 경우가 해당한다. 규제나 심사 승인 자체는 tag와 deployment environment로 처리하고, 그 승인 때문에 여러 계열을 동시에 유지해야 할 때만 release 브랜치 근거가 된다. 이때는 전략을 되돌리는 것이 아니라 trunk 위에 release 브랜치를 얹는 조합으로 간다.

## 흔한 실수

- **develop과 main 이중 관리 방치** — 지원 버전이 하나인데 develop만 남아 있으면 통합 지연만 남고 얻는 것이 없다.
- **release 브랜치 장기 동결** — 동결이 길수록 release와 develop 양쪽 머지 누락이 쌓인다. 동결 기간에 상한을 둔다.
- **trunk 도입하면서 CI는 20분 그대로** — 브랜치 이름만 바뀌고 통합 빈도는 그대로거나 오히려 trunk가 깨진다.
- **hotfix를 main에만 반영** — Git Flow의 develop, trunk 모델의 활성 release 브랜치를 빠뜨리면 다음 릴리스에서 회귀한다.
- **머지한 브랜치 미삭제** — 삭제 기준이 없으면 임시 브랜치가 조용히 장기 브랜치가 된다.

## 면접 체크포인트

- 세 전략의 영속 브랜치 수와 릴리스 컷 지점 차이
- Git Flow 원저자의 2020년 주석과 그 전제(다중 지원 버전 대 지속 배포)
- Trunk-Based의 전제 조건 4가지와 전제 없이 도입했을 때 나타나는 증상
- 브랜치 수명을 늘리지 않고 큰 변경을 다루는 수단(feature flag, branch by abstraction, 호환 계층, 다크 런치)
- 전략별 hotfix 출발점과 역전파 대상, cherry-pick 방향 규칙
- 전략 선택 근거를 팀 규모가 아니라 릴리스 주기와 지원 버전 수로 설명할 수 있는지

## 출처

- [A successful Git branching model — nvie, Vincent Driessen](https://nvie.com/posts/a-successful-git-branching-model/)
- [GitHub Docs, GitHub flow](https://docs.github.com/en/get-started/using-github/github-flow)
- [Trunk Based Development](https://trunkbaseddevelopment.com/), [Short-Lived Feature Branches](https://trunkbaseddevelopment.com/short-lived-feature-branches/), [Branch for Release](https://trunkbaseddevelopment.com/branch-for-release/)
- [Patterns for Managing Source Code Branches — martinfowler.com, Martin Fowler](https://martinfowler.com/articles/branching-patterns.html)
- [DORA, Trunk-based development](https://dora.dev/capabilities/trunk-based-development/)
- [인프런, 얄팍한 코딩사전, 협업을 위한 브랜치 전략들](https://www.inflearn.com/courses/lecture?courseId=328284&unitId=402881)

## 관련 문서

- [[Version-Control-Tooling|버전 관리 도구 선택]], [[Development-Workflow|개발 워크플로]], [[Git-Merge-Strategies|Git 통합 방식]], [[GitHub-Repository-Operations|GitHub 저장소 운영]], [[version-control|버전 관리 폴더 인덱스]]
- [[Blue-Green|Blue-Green 배포]], [[Zero-Downtime-Deployment|무중단 배포]], [[GitHub-Actions|GitHub Actions]], [[Code-Review-Culture|코드 리뷰 문화]], [[One-Way-vs-Two-Way-Door|되돌릴 수 있는 결정과 없는 결정]]
