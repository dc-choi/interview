---
tags: [palantir, artifacts, packages, conda, marketplace]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry artifact와 package 수명"]
---

# Artifact와 package 수명

Artifact repository는 Conda/Docker/Maven 등 library 배포물을 저장한다. Source repository, compiled artifact와 runtime dependency를 구분한다. Local에서 작성한 package를 넣을 수 있고 Code Repositories Libraries에서 발견해 소비한다.

## Backing repository와 접근 범위

Artifact 사용은 repository View, publish/recall은 Edit를 요구한다. Artifact settings view/manage에는 별도 operation이 필요하다. Backing repository를 추가하면 그 repository가 참조한 dependency도 더해질 수 있고 모든 dependency의 접근 권한이 필요하다.

다른 Project의 local shared library는 Project reference도 추가한다. Backing repository 순서/삭제는 package resolution과 build를 깨뜨릴 수 있다. Conda/Maven/PyPI version과 channel의 재현성을 별도로 검토한다.

공식 Libraries 설정 화면은 같은 library를 두 backing repository가 제공하면 목록의 최상단 repository를 우선한다고 설명한다. 순서 변경도 dependency resolution 변경으로 검토한다. (2026-10-18 [공식 설정 화면](https://www.palantir.com/docs/resources/foundry/code-repositories/repository-artifact-settings-tab.png) 확인)

Publish UI에서 artifact type, 유효기간이 표시된 token과 instructions를 얻어 업로드한다. Token을 source나 README에 넣지 않는다. Consumer tracking은 Conda artifact에만 제공되므로 Docker/Maven의 목록이 없다는 사실을 소비자 없음으로 읽지 않는다.

## Recall, 삭제와 version의 의미

Conda recall은 해당 version으로 downstream compile하는 것을 막는다. 먼저 patch version을 제공하고 영향을 확인한다. Unrecall로 복구할 수 있지만 기존 실행 중 job이나 이미 생성된 데이터가 소급 취소된다는 뜻은 아니다.

개별 artifact는 삭제할 수 없다. Repository를 trash하면 모든 artifact 소비자에게 breaking change가 되고 permanent delete는 복구 불가다. Trash 복원 경로가 있더라도 개별 version recall과 전체 repository 삭제를 섞지 않는다.

Python library는 tag 없이 branch latest commit을 publish하도록 Gradle 조건을 구성할 수도 있다. 이는 편의와 재현성의 tradeoff이며 critical consumer는 version pin과 review를 고려한다.

## Marketplace의 source/history 범위

Dataset transformation packaging은 Python/Java/SQL과 dependency를 포함하며 recent template이 필요하다. Multi-output transform이면 output을 모두 product에 넣는다. Installation input은 실제 로직에서 안 쓰는 column까지 source input 전체의 이름/type을 일치시켜야 한다.

| Repository packaging mode | 설치본 성격 |
|---|---|
| Source 제외 | Compiled user code와 transitive dependency를 보유 |
| Latest source만 | 읽기용 문서 제공, Git history/tag 제외 |
| Source와 full history | Checks와 repository 내 rebuild가 가능한 경로 |

Dependency self-contained packaging의 설명을 실제 입력 값, external system, 권한과 runtime 오류까지 없다는 보장으로 확대하지 않는다. 설치 시 schema와 환경을 검증한다.

## Environment 변경과 복구

Anaconda는 해당 guide 기준 2027-06-29까지 license cost 없이 일반 제공하며 이후 사용에는 고객이 별도 조달한 license를 요구한다. EULA가 적용되고 Palantir는 사용 enrollment 수와 cloud/on-prem deployment type을 Anaconda에 공유한다. 영구 무료나 package 포함 자체가 모든 license 준수라는 뜻으로 읽지 않는다.

Workbook Conda environment는 저장 전에 실제 dependency resolve를 시험해야 한다. Repository beta OSDK generator는 default branch의 `allowBetaGeneratorVersions` commit과 Libraries 설정 toggle 두 단계를 요구한다. UI toggle만 켜고 설정 commit을 빠뜨리지 않는다.

FAQ는 missing package/MD5 mismatch의 cache 문제에 새 commit, 지속되면 lockfile 삭제 후 재생성과 support를 제시한다. 먼저 실제 dependency 부재/권한/recall인지 구분하고 lockfile 재생성의 version 변화도 검토한다. Workbook code 이식은 decorator, 선언 input, branch, 반환과 library를 맞춰야 한다.

Built dataset의 당시 code는 Dataset Preview Compare 또는 Git branch history에서 찾을 수 있다. Repository 복제의 local clone/push 예시는 새 Project의 input reference까지 옮겨 주지 않는다. README는 `repo://` file link, RID resource link, image와 syntax highlight를 지원한다. 문서 부족은 custom docs로 확장하되 token과 민감 payload를 넣지 않는다.

## 출처

- [Palantir, Artifact repositories](https://www.palantir.com/docs/foundry/code-repositories/artifact-repositories-overview)
- [Palantir, Artifact navigation](https://www.palantir.com/docs/foundry/code-repositories/artifact-repositories-nav)
- [Palantir, Create artifact repository](https://www.palantir.com/docs/foundry/code-repositories/create-artifact-repository)
- [Palantir, Artifact permissions](https://www.palantir.com/docs/foundry/code-repositories/manage-permissions)
- [Palantir, Publish artifact](https://www.palantir.com/docs/foundry/code-repositories/publish-artifact)
- [Palantir, Recall artifact](https://www.palantir.com/docs/foundry/code-repositories/recall-artifact)
- [Palantir, Delete artifact repository](https://www.palantir.com/docs/foundry/code-repositories/delete-artifact-repository)
- [Palantir, Artifact settings](https://www.palantir.com/docs/foundry/code-repositories/artifact-settings)
- [Palantir, Libraries](https://www.palantir.com/docs/foundry/code-repositories/libraries)
- [Palantir, Dataset transformation Marketplace](https://www.palantir.com/docs/foundry/code-repositories/marketplace-dataset-transformation)
- [Palantir, Anaconda in Foundry](https://www.palantir.com/docs/foundry/code-repositories/anaconda)
- [Palantir, Code Repositories FAQ](https://www.palantir.com/docs/foundry/code-repositories/faq)
- [Palantir, Repository documentation](https://www.palantir.com/docs/foundry/code-repositories/readme)

## 관련 문서

- [[Palantir-Repository-Review-and-Scope|Project reference와 정책]]
- [[Palantir-Repository-Preview-and-Runtime|환경 변경과 검증]]
- [[Palantir-Branching-and-Packaging-Boundaries|Packaging 경계]]
