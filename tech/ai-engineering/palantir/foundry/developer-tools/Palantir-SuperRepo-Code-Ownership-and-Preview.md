---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-11-14
category: "AI엔지니어링(AIEngineering)"
aliases: ["SuperRepo 코드 소유권과 로컬 preview"]
---

# SuperRepo 코드 소유권과 로컬 preview

## 코드가 관리하는 도메인 모델

SuperRepo는 beta인 Ontology 중심 monorepo다. foundry.yml이 ONTOLOGY, TYPESCRIPT_FUNCTIONS, APP 등 component의 타입/경로를 선언하고 CLI가 이를 기준으로 동작한다. Nx는 기본 orchestration 도구지만 CLI가 nx.json/project.json을 직접 계약으로 삼는 것은 아니므로 다른 build system으로 대체할 수 있다.

Ontology-as-code로 정의한 타입은 코드가 정본이다. 설치는 기본 잠겨 있고 UI 편집을 위해 unlock하더라도 다음 deploy가 그 변경을 덮어쓴다. 기존 타입 import는 재정의와 다르며 `foundry import ontology`가 쓰는 import metadata lockfile을 커밋해야 code generation이 재현된다. Import한 entity에도 OSDK와 Ontology-as-code 타입이 생성되어 다른 component에서 쓸 수 있다. UI와 code에서 만든 타입이 별도 Ontology에 고립되는 것은 아니다.

현재 지원 함수는 TypeScript v2이며 Python 함수/agent/외부 source/automation/data pipeline은 계획으로 구분된다. PySpark transform과 compute module은 현재 지원하지 않는다고 명시된다. Stream datasource와 mediaReference 지원을 전체 pipeline component 지원으로 확대하지 않는다.

## 로컬 시뮬레이션의 한계

Preview는 local server들이 실제 Foundry와의 상호작용 일부를 흉내 내는 근사 동작이다. `foundry.yml`의 최상위 `preview.ontology.mode`가 데이터 출처를 정하며 preview Ontology 전체와, 다중 product 구성이면 모든 product에 한 설정이 적용된다. 바꾼 뒤에는 preview를 재시작한다.

| Mode | 데이터 출처 | Ontology 편집 |
| --- | --- | --- |
| `SEED_ONLY`(기본) | Embedded Ontology와 선택적 seed data | Local에서 지원 |
| `REMOTE_ONLY` | `ontologyRid`로 지정한 Foundry Ontology의 실제 객체 | 거부 |

`REMOTE_ONLY`는 `foundry login` credential로 읽으므로 사용자가 접근할 수 있는 객체만 보인다. 시작할 때 ONTOLOGY component에 정의하거나 import한 타입을 대상 Ontology의 같은 API 이름 타입과 비교한다. 타입이 없거나 접근할 수 없으면 시작하지 못하고, property가 다르면 `Foundry schema mismatch`로 실패한다. 먼저 Ontology 변경을 배포하거나 import 정의를 갱신하거나 `SEED_ONLY`를 쓴다. 앱과 함수는 여전히 local에서 돌고, function-backed Action이 반환한 편집을 포함한 모든 Ontology 편집이 거부되므로 생성, 수정, 삭제 흐름은 `SEED_ONLY`에서 확인한다.

Seed는 local preview 전용이며 배포되지 않는다. `foundry start ontology`는 실행마다 빈 local database에서 seed를 다시 적용하므로 preview를 멈췄다 다시 켜면 local 편집이 사라진다. 실행 중에는 Ontology schema나 컴파일된 seed가 바뀌면 local 데이터를 초기화하고 seed를 다시 적용하며, 함수만 바뀌면 데이터를 유지한다. Seed 컴파일이 실패하면 이전 seed로 계속 돌고 파일을 고칠 때 재시도한다. 다시 컴파일한 seed를 적재하다 실패하면 다음 성공까지 일부만 적재된 상태가 남을 수 있으므로, 이상한 preview 데이터는 preview 출력부터 확인한다.

`ontology.mts`가 바뀔 때마다 local OSDK package가 다시 생성되고 `pnpm run dev` 상태 화면에서 재생성 진행을 볼 수 있다. 앱은 이 local OSDK를 `@osdk/react`의 `useOsdkObjects`, `useOsdkAction`, `useLinks` 같은 hook으로 바로 쓰므로 Ontology, 함수와 앱 변경을 SDK 재게시 없이 한 루프에서 확인한다. 이 루프의 성공은 local preview에서의 동작이며 배포된 enrollment의 동작은 아니다.

Seed는 정렬된 최상위 .mts 파일을 컴파일하며 타입별 primary key가 전체 디렉터리에서 고유해야 한다. 비nullable property와 primary key를 제공하고 seed.link 양 끝은 같은 createSeed 호출에 등록해야 한다. API 이름이 SDK export를 정하며 코드의 constant 이름과 같다고 가정하지 않는다.

Function이 edit batch를 반환하는 것과 실제 데이터 변경은 다르다. Function-backed Action을 통해 적용해야 한다. 이미 완료한 항목의 중복 완료 방지 예제는 읽은 상태에 대한 검증이며 모든 경쟁 갱신의 원자성을 입증하지 않는다.

## CI에서 검사하는 대상

SuperRepo는 플랫폼 밖에서 호스팅, 빌드, 배포할 수 있다는 원칙을 둔다. CLI에 embedded Ontology가 포함되어 있어 워크플로 전반을 거치는 integration test를 CI에서 돌릴 수 있다. Ontology 소유자가 style과 설계 패턴 지침을 강제하려고 코드의 entity 정의를 배포 전에 검사하는 linter를 쓰는 것도 정착된 패턴이다. Embedded Ontology는 실제 Ontology 동작의 근사이므로, 이 test의 통과를 enrollment 권한과 실제 데이터 동작의 검증으로 해석하지 않는다.

## 원격 호출이 섞이는 경계

platformApiProxy는 명시한 path/method만 enrollment로 전달하며 preview에만 적용된다. 단 `REMOTE_ONLY`에서는 함수가 추가 `platformApiProxy` route 없이 platform API proxy로 Foundry 데이터를 읽을 수 있다. Local preview가 항상 외부 부작용 없는 simulation이라는 뜻은 아니다. Proxy는 설치 token이 아니라 foundry login 저장 credential을 쓰고 만료 시 refresh가 필요하다. 실제 preview, seed와 Action 실행은 수행하지 않았다.

## 출처

- [Palantir superrepo, superrepo](https://www.palantir.com/docs/foundry/superrepo)
- [Palantir superrepo, advanced-workflows](https://www.palantir.com/docs/foundry/superrepo/advanced-workflows)
- [Palantir superrepo, core-concepts](https://www.palantir.com/docs/foundry/superrepo/core-concepts)
- [Palantir superrepo, create-a-superrepo](https://www.palantir.com/docs/foundry/superrepo/create-a-superrepo)
- [Palantir superrepo, faq](https://www.palantir.com/docs/foundry/superrepo/faq)
- [Palantir superrepo, foundry-cli](https://www.palantir.com/docs/foundry/superrepo/foundry-cli)
- [Palantir superrepo, in-development](https://www.palantir.com/docs/foundry/superrepo/in-development)
- [Palantir superrepo, overview](https://www.palantir.com/docs/foundry/superrepo/overview)
- [Palantir superrepo, prepare-first-deploy](https://www.palantir.com/docs/foundry/superrepo/prepare-first-deploy)
- [Palantir superrepo, tutorial-develop-with-a-superrepo](https://www.palantir.com/docs/foundry/superrepo/tutorial-develop-with-a-superrepo)

## 관련 문서

- [[Palantir-Developer-Tools]]
