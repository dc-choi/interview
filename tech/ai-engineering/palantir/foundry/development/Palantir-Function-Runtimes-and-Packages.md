---
tags: [palantir, functions, nodejs, python, marketplace]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 함수 runtime과 package 계약"]
---

# 함수 runtime과 package 계약

함수 언어, runtime, backend mode와 OSDK version은 별개로 선택한다. GA는 feature parity를 뜻하지 않는다. 아래는 2025년 7월 Python/TypeScript v2 GA에서 확인한 계약이며 현재 숫자와 지원 조합은 feature matrix/실제 enrollment에서 확인한다.

## TypeScript v1과 v2의 환경은 다르다

V1의 제한된 V8과 달리 v2는 Node.js의 `fs`, `child_process`, `crypto` 등 core module을 사용한다. Node-compatible library를 쓸 수 있지만 외부 network는 source와 egress 계약을 따른다. 당시 v2는 최대 5GB/8CPU, v1은 128MB/1CPU로 설명했다. 이 비교를 모든 current backend의 고정 quota로 확대하지 않는다.

V2와 Python은 OSDK 기반 query와 property sub-selection, repository별 generated docs를 사용한다. Query에 필요한 property만 읽는 것은 payload/latency를 줄이는 선택이며 omitted property를 실제 null로 해석하지 않는다. API 호출은 Python `functions.sources`, TS `@palantir/functions-sources`가 제공하는 preconfigured client/HTTP agent를 사용해 networking 환경을 맞춘다.

## Serverless와 deployed mode의 설정 단위

Python은 serverless/deployed를 선택하고 deployed에는 CPU/GPU/memory request/limit, min/max replica와 startup environment를 정한다. GPU는 project queue의 availability 조건을 따른다. Timeout은 다른 deployment 설정과 달리 function version별로 정하는 값이었다.

Deployed cache는 restart와 replica마다 다른 상태를 견뎌야 한다. Autoscaling과 zero-downtime upgrade를 곧바로 shared state의 일관성 보장으로 사용하지 않는다. Function의 serverless/default 전환도 backend feature matrix와 external source 지원을 함께 확인한다.

## SDK와 library version을 함께 묶는다

Python OSDK 2.x는 새 app/function generator 기본값이 됐고 derived property/media 등 새 기능은 2.x에 집중됐다. 기존 syntax 유지 안내와 향후 지원 기간은 별도 정책이다. NPM library는 TypeScript v2 repository의 package name/exports로 publish해 다른 repository에서 소비한다.

Marketplace에 OSDK 기반 Python/TSv2 function을 넣으면 SDK도 포함되고 Ontology entity는 input으로 추가된다. Install 때 target entity로 remap하는 것은 웹 asset 안의 임의 문자열까지 다시 작성하는 보장과 다르다. Function package, generated SDK와 target schema를 함께 시험한다.

2025년 DevOps packaging 개편은 기존 draft를 새 workflow에서 재사용하지 못해 recreate를 요구했다. Rollout의 Prior frontend 사용은 일시적 편집 경로였으며 영구 호환성을 보장하지 않았다. Draft, published product version과 설치된 version을 구분한다.

Stable version tag는 runtime 자동 upgrade가 신뢰하는 배포 경계다. 2025년 8월에는 stable tag를 protected branch에서만 발행하도록 제한하는 설정이 추가됐다. Feature branch에서 `1.2.3`은 막아도 `1.2.3-rc1` 같은 prerelease는 허용하는 계약이었다. Semver range를 사용하는 소비자와 branch protection을 함께 정한다.

DevOps store의 Modify는 project Edit, Install은 View 권한을 따르는 구조로 안내됐다. 자동 dependency packaging이 resource별 접근권한이나 설치 target의 input mapping을 대체하지 않는다. Version channel과 개별 installation upgrade 시점을 나눠 관리한다.

Function repository의 VS Code Workspace는 live preview/resource import/SDK generation/tag release를 모은 편집 환경이다. 2026년 3월 공지는 Code Repositories function UI의 6월경 legacy 전환을 예상했으며 현재 지원 종료를 확정한 날짜가 아니다. 편집 환경 이전과 언어 runtime/version upgrade는 분리해 확인한다.

Code viewer는 branch/tag/commit의 committed/synchronized source를 읽고 diff/permalink를 만든다. 2026년 9월 workspace editor의 미커밋 변경은 표시하지 않으며 VS Code background startup과 read-only view를 나눴다. Function preview와 Resources/Libraries/release UI의 확대도 source가 commit됐다는 것과 runtime tag가 publish됐다는 것을 하나로 만들지 않는다.

## 출처

- [Palantir, July 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-07)
- [Palantir, August 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-08)
- [Palantir, March 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-03)
- [Palantir, September 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-09)

## 관련 문서

- [[Palantir-Actions-and-Functions|Action과 Function 실행]]
- [[Palantir-Branching-and-Packaging-Boundaries|배포와 API-name mapping]]
- [[Palantir-Compute-Profiles-and-Container-Governance|Compute와 container 통제]]
