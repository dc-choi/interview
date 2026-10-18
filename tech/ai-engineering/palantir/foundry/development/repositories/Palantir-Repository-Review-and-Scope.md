---
tags: [palantir, repository, review, scope]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Code Repositories review와 Project scope"]
---

# Repository review와 Project scope

Code Repositories는 transforms, Functions와 model code의 Git/PR/CI authoring 환경이다. Python transforms editor는 legacy 단계지만 계속 지원되며 VS Code workspaces가 권장된다. Enrollment에서 workspace를 사용할 수 없으면 기존 editor가 권장 경로다. Java/SQL 등의 repository까지 즉시 지원 종료로 해석하지 않는다.

## Protected branch의 정책을 개별로 설정한다

Default branch는 PR/commit의 기본 target이며 merge mode는 squash/merge/fast-forward를 선택한다. Protected branch는 PR과 정책을 거쳐야 한다. 기본적으로 Owner는 정책 변경, Owner/Editor는 merge 권한을 갖지만 정책은 모두에게 적용된다.

`ci/foundry-publish` 성공을 요구해야 데이터에 반영될 code publication을 확인할 수 있다. CI 끝나기 전 merge하면 반영이 보장되지 않는다. Require approval과 no rejection은 별개다. 특정 group의 한 명 승인이 다른 한 명의 rejection을 상쇄할 수 있으므로 no-rejections 정책이 필요한지 정한다. Required reviewer 지정은 repository 접근을 부여하지 않는다.

Advanced approval은 파일 regex에 따라 ALL/ANY rule을 적용한다. Security 변경을 활성화한 branch는 security check/필요 승인을 요구하며 활성 unmarking 변경을 PR로 제거하기 전에는 unprotect할 수 없다. Functions의 stable tag를 protected branch에서만 허용하면 range consumer의 예기치 않은 feature 배포를 줄인다. Prerelease는 range에서 제외되는 경로와 직접 지정 시험을 구분한다.

`repoSettings.json`의 tag regex는 errorMessage도 함께 필요하다. PR validation은 head가 아닌 base branch의 설정으로 title/branchName/description을 검사한다. Description template은 안내이고 validation rule은 강제 조건이다. outputPathPrefix는 새 template의 기본 output 위치이지 기존 dataset 일괄 이동이 아니다.

## Branch fallback의 범위를 확인한다

입력이 현재 branch에서 build되지 않았을 때 설정한 fallback을 순서대로 찾는다. 이 설정은 해당 repository에서 실행한 build/action에만 적용하며 외부 schedule 등 다른 app에는 적용하지 않는다. 같은 이름의 Builder branch와 연결해도 각 app의 fallback과 실제 data branch를 각각 확인한다.

Global branch는 지원하는 Python transforms, TSv1/TSv2/Python Functions와 설정된 OSDK React app 등에서 여러 app 변경을 묶는다. Repository default branch에서만 시작할 수 있다. 일반 code branch는 임의 branch를 base로 할 수 있다. Tag는 특정 commit을 지칭하며 branch의 미커밋 상태까지 포함하지 않는다.

## Impact analysis는 완전한 의존성 검토가 아니다

Head와 base를 최신 code로 build해야 output을 비교할 수 있다. PR stale warning은 repository 내부 affected dataset만 보고 외부 parent와 미커밋 변경은 경고하지 않는다. 기본 affected 목록은 직접 영향만이며 derived dataset을 추가해야 intermediate까지 검토한다.

Python은 TLLV, Java는 source file 변경을 기준으로 direct affected를 정한다. Code diff는 해당 source만 표시할 수 있어 helper/library 변화도 별도로 읽는다. Schema/Marking/expectation, trash와 inaccessible 상태를 검토한다. 접근 불가한 dataset은 검증 완료가 아니다.

## Project reference는 명시적인 경계다

Input은 외부 Project resource를 reference로 가져올 수 있지만 output은 repository와 같은 Project여야 한다. 외부 output은 `AccessOutsideProjectDenied`가 된다. Wizard의 same-project 검증은 reference를 거친 입력 사용과 구분한다.

Reference에는 source import-resource-from, destination import-resource-to 권한이 필요하며 library 자동 reference에는 추가 discovery/import 권한도 요구된다. Repository code를 수정할 사용자는 참조한 dataset의 관련 Marking 자격도 필요하다. RID 사용은 resource 이동에 강하지만 reference와 권한을 생략하지 않는다.

External systems는 높은 신뢰의 developer와 export 가능한 mandatory marking을 통제해 enable한다. 외부 API로 나간 자료가 Foundry lineage/access governance 안에서 계속 통제된다고 보장하지 않는다.

## 출처

- [Palantir, Code Repositories](https://www.palantir.com/docs/foundry/code-repositories)
- [Palantir, Administer repositories](https://www.palantir.com/docs/foundry/code-repositories/admin-overview)
- [Palantir, Branch settings](https://www.palantir.com/docs/foundry/code-repositories/branch-settings)
- [Palantir, Advanced settings](https://www.palantir.com/docs/foundry/code-repositories/advanced-settings)
- [Palantir, Analyze impact](https://www.palantir.com/docs/foundry/code-repositories/analyze-impact)
- [Palantir, Navigation](https://www.palantir.com/docs/foundry/code-repositories/navigation)
- [Palantir, Use Project references](https://www.palantir.com/docs/foundry/code-repositories/use-project-references)
- [Palantir, Repository settings](https://www.palantir.com/docs/foundry/code-repositories/repository-settings)
- [Palantir, Legacy editing](https://www.palantir.com/docs/foundry/code-repositories/legacy-editing)
- [Palantir, Ontology imports](https://www.palantir.com/docs/foundry/code-repositories/ontology-imports)

## 관련 문서

- [[Palantir-Pipeline-Projects-and-Releases|출력 API와 release]]
- [[Palantir-Pipeline-Markings-and-Declassification|보안 승인]]
- [[Palantir-Repository-Preview-and-Runtime|Preview와 runtime]]
