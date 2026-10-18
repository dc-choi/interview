---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Slate Ontology 접근과 쓰기 일관성"]
---

# Slate Ontology 접근과 쓰기 일관성

## 식별자와 결과 형태

Object Context는 단일 object RID를 받아 속성을 노출한다. Object Set은 builder의 타입별 AND/OR 필터 또는 object set RID/versioned RID로 구성하고 data와 objectRids를 내놓는다. Sort는 limit보다 먼저 적용된다. Limit보다 결과가 많으면 pagination이 필요하다. Aggregation preview가 집계만 보여도 granular object는 다른 참조로 접근할 수 있다.

OSDK는 선택 엔티티로 생성한 bundle이며 현재 Slate 문서는 OSDK v1 JavaScript를 명시한다. 전체 집합의 link traversal은 pivotTo, 단일 객체는 해당 link 접근이라는 차이가 있다. API 이름 없는 함수나 Ontology edit function은 선택할 수 없다. 구성을 바꾼 뒤 Generate와 앱 저장이 필요하고 Ontology 전환은 삭제/재구성을 요구한다.

Foundry Function 패널은 접근 가능한 함수의 버전과 typed input/output을 선택한다. 이를 브라우저의 Slate JavaScript 함수와 구분한다. 재사용할 업무 로직과 복잡한 집계는 backend Function에 둘 수 있다.

## Actions가 정하는 변경

현재 권장 writeback은 Ontology Action이다. Action widget의 object locator는 대상만 식별하고 속성 변경 자체를 지정하지 않는다. typeId와 primaryKey의 property ID/값, 별도 Action parameter와 rule의 매핑이 필요하다. Widget 기본값은 Action type 기본값보다 우선한다. 다중 object 입력은 locator 목록이며 Date/Timestamp는 ISO 8601 형식이다.

폼 표시 여부, validation success와 submission success/failure는 별개다. 폼을 숨기고 이벤트로 제출해도 서버 Action의 접근/검증 계약을 우회하지 않는다.

## Phonograph legacy의 다른 상태

기존 Phonograph writeback은 원본 dataset, 수동 편집 cache, writeback dataset이 분리된다. Cache의 성공적인 수정이 writeback dataset의 즉시 갱신을 뜻하지 않으며 dataset build가 필요하다. 신규 흐름은 지원하지 않는 legacy로 명시되어 있다.

- Primary key는 행을 고유하게 식별한다. 같은 키 추가는 실패하며 bulk 요청에서 같은 키는 한 번만 등장할 수 있다.
- Search index는 write 직후 지연될 수 있다. Storage의 primary-key lookup 보장과 Search의 가시성을 구분한다. 3~5초 toast 지연 예제는 일관성 SLA가 아니다.
- 앞부분의 Storage 보장과 뒤의 동기화 개선 예정 설명은 문서 안에서 섞인다. 이후 개선이 실제 적용되었다고 추가 추정하지 않는다.
- null 값 누락을 설명하는 문장은 행과 컬럼을 혼용하고 예제에도 오기가 있다. 결과 키가 모두 존재한다는 가정을 피한다.
- Unregister table은 cache 데이터를 영구 삭제할 수 있다. 입력/출력 dataset 보존과 cache 편집 보존은 다르다.

문서 계약 대조만 수행했으며 실제 bundle 생성, Action 제출과 read-after-write 시험은 수행하지 않았다.

## 출처

- [Palantir slate, slate](https://www.palantir.com/docs/foundry/slate)
- [Palantir slate, applications-create](https://www.palantir.com/docs/foundry/slate/applications-create)
- [Palantir slate, applications-debug-problems](https://www.palantir.com/docs/foundry/slate/applications-debug-problems)
- [Palantir slate, applications-dependencies](https://www.palantir.com/docs/foundry/slate/applications-dependencies)
- [Palantir slate, applications-import-export](https://www.palantir.com/docs/foundry/slate/applications-import-export)
- [Palantir slate, applications-merging](https://www.palantir.com/docs/foundry/slate/applications-merging)
- [Palantir slate, applications-pages](https://www.palantir.com/docs/foundry/slate/applications-pages)
- [Palantir slate, applications-style-text](https://www.palantir.com/docs/foundry/slate/applications-style-text)
- [Palantir slate, applications-types](https://www.palantir.com/docs/foundry/slate/applications-types)
- [Palantir slate, applications-versioning](https://www.palantir.com/docs/foundry/slate/applications-versioning)
- [Palantir slate, applications-writeback](https://www.palantir.com/docs/foundry/slate/applications-writeback)
- [Palantir slate, best-practices-app-functionality](https://www.palantir.com/docs/foundry/slate/best-practices-app-functionality)
- [Palantir slate, best-practices-complex-layouts](https://www.palantir.com/docs/foundry/slate/best-practices-complex-layouts)
- [Palantir slate, best-practices-user-interaction](https://www.palantir.com/docs/foundry/slate/best-practices-user-interaction)
- [Palantir slate, concepts-events](https://www.palantir.com/docs/foundry/slate/concepts-events)
- [Palantir slate, concepts-events-and-actions-index](https://www.palantir.com/docs/foundry/slate/concepts-events-and-actions-index)
- [Palantir slate, concepts-foundry-functions](https://www.palantir.com/docs/foundry/slate/concepts-foundry-functions)
- [Palantir slate, concepts-functions](https://www.palantir.com/docs/foundry/slate/concepts-functions)
- [Palantir slate, concepts-handlebars](https://www.palantir.com/docs/foundry/slate/concepts-handlebars)
- [Palantir slate, concepts-object-context](https://www.palantir.com/docs/foundry/slate/concepts-object-context)
- [Palantir slate, concepts-object-sets](https://www.palantir.com/docs/foundry/slate/concepts-object-sets)
- [Palantir slate, concepts-osdk](https://www.palantir.com/docs/foundry/slate/concepts-osdk)
- [Palantir slate, concepts-queries](https://www.palantir.com/docs/foundry/slate/concepts-queries)
- [Palantir slate, concepts-styles](https://www.palantir.com/docs/foundry/slate/concepts-styles)
- [Palantir slate, concepts-variables](https://www.palantir.com/docs/foundry/slate/concepts-variables)
- [Palantir slate, faq](https://www.palantir.com/docs/foundry/slate/faq)
- [Palantir slate, logic-overview](https://www.palantir.com/docs/foundry/slate/logic-overview)
- [Palantir slate, marketplace-slate](https://www.palantir.com/docs/foundry/slate/marketplace-slate)
- [Palantir slate, navigation](https://www.palantir.com/docs/foundry/slate/navigation)
- [Palantir slate, overview](https://www.palantir.com/docs/foundry/slate/overview)
- [Palantir slate, public-applications-data-upload](https://www.palantir.com/docs/foundry/slate/public-applications-data-upload)
- [Palantir slate, read-write-overview](https://www.palantir.com/docs/foundry/slate/read-write-overview)
- [Palantir slate, references-convert-rows-columns](https://www.palantir.com/docs/foundry/slate/references-convert-rows-columns)
- [Palantir slate, references-helpers](https://www.palantir.com/docs/foundry/slate/references-helpers)
- [Palantir slate, references-indexes](https://www.palantir.com/docs/foundry/slate/references-indexes)
- [Palantir slate, references-query-perf](https://www.palantir.com/docs/foundry/slate/references-query-perf)
- [Palantir slate, references-writeback](https://www.palantir.com/docs/foundry/slate/references-writeback)
- [Palantir slate, style-overview](https://www.palantir.com/docs/foundry/slate/style-overview)
- [Palantir slate, styles-global-stylesheet](https://www.palantir.com/docs/foundry/slate/styles-global-stylesheet)
- [Palantir slate, widgets-advanced](https://www.palantir.com/docs/foundry/slate/widgets-advanced)
- [Palantir slate, widgets-chart](https://www.palantir.com/docs/foundry/slate/widgets-chart)
- [Palantir slate, widgets-container](https://www.palantir.com/docs/foundry/slate/widgets-container)
- [Palantir slate, widgets-control](https://www.palantir.com/docs/foundry/slate/widgets-control)
- [Palantir slate, widgets-platform](https://www.palantir.com/docs/foundry/slate/widgets-platform)
- [Palantir slate, widgets-text](https://www.palantir.com/docs/foundry/slate/widgets-text)
- [Palantir slate, widgets-time](https://www.palantir.com/docs/foundry/slate/widgets-time)
- [Palantir slate, widgets-visualization](https://www.palantir.com/docs/foundry/slate/widgets-visualization)

## 관련 문서

- [[Palantir-Slate]]
