---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["SuperRepo 코드 소유권과 로컬 preview"]
---

# SuperRepo 코드 소유권과 로컬 preview

## 코드가 관리하는 도메인 모델

SuperRepo는 beta인 Ontology 중심 monorepo다. foundry.yml이 ONTOLOGY, TYPESCRIPT_FUNCTIONS, APP 등 component의 타입/경로를 선언하고 CLI가 이를 기준으로 동작한다. Nx는 기본 orchestration 도구지만 CLI가 nx.json/project.json을 직접 계약으로 삼는 것은 아니므로 다른 build system으로 대체할 수 있다.

Ontology-as-code로 정의한 타입은 코드가 정본이다. 설치는 기본 잠겨 있고 UI 편집을 위해 unlock하더라도 다음 deploy가 그 변경을 덮어쓴다. 기존 타입 import는 재정의와 다르며 import metadata lockfile을 커밋해야 code generation이 재현된다. UI와 code에서 만든 타입이 별도 Ontology에 고립되는 것은 아니다.

현재 지원 함수는 TypeScript v2이며 Python 함수/agent/외부 source/automation/data pipeline은 계획으로 구분된다. PySpark transform과 compute module은 현재 지원하지 않는다고 명시된다. Stream datasource와 mediaReference 지원을 전체 pipeline component 지원으로 확대하지 않는다.

## 로컬 시뮬레이션의 한계

Preview는 embedded Ontology와 언어별 함수 runtime, local frontend server의 근사 동작이다. Enrollment Ontology의 실제 객체 데이터와 연결되지 않는다. Seed는 local preview 전용이며 배포되지 않는다. 재시작이나 seed 수정은 preview에서 만든/수정한 객체를 버릴 수 있다.

Seed는 정렬된 최상위 .mts 파일을 컴파일하며 타입별 primary key가 전체 디렉터리에서 고유해야 한다. 비nullable property와 primary key를 제공하고 seed.link 양 끝은 같은 createSeed 호출에 등록해야 한다. API 이름이 SDK export를 정하며 코드의 constant 이름과 같다고 가정하지 않는다.

Function이 edit batch를 반환하는 것과 실제 데이터 변경은 다르다. Function-backed Action을 통해 적용해야 한다. 이미 완료한 항목의 중복 완료 방지 예제는 읽은 상태에 대한 검증이며 모든 경쟁 갱신의 원자성을 입증하지 않는다.

## 원격 호출이 섞이는 경계

platformApiProxy는 명시한 path/method만 enrollment로 전달하며 preview에만 적용된다. Local preview가 항상 외부 부작용 없는 simulation이라는 뜻은 아니다. Proxy는 설치 token이 아니라 foundry login 저장 credential을 쓰고 만료 시 refresh가 필요하다. 실제 preview, seed와 Action 실행은 수행하지 않았다.

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
