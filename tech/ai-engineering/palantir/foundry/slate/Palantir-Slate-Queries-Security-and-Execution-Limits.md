---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Slate 쿼리 보안과 실행 한계"]
---

# Slate 쿼리 보안과 실행 한계

## 데이터 경로별 계약

현재 권장 읽기 경로는 Ontology의 Object Set/Context 또는 OSDK다. Dataset을 Postgres에 sync해 읽는 Foundry SQL은 legacy이며 enrollment에서 활성화되어야 한다. 이 동기화 경로는 읽기 전용과 dataset 권한을 적용한다. 외부 SQL/HTTP source는 별도 관리자 설정과 보안 규칙을 갖는다.

외부 SQL 식별자는 schema/table/column helper, 값은 param helper로 구분한다. schema/table의 허용 이름은 정적 목록이며 동적으로 템플릿화할 수 없다. alias는 정적 이름 등록이다. param은 실행 시 prepared-statement placeholder를 만들고, preview에서는 실제 값이 보여 같은 렌더링이라고 가정하지 않는다. null/undefined와 null을 포함한 배열은 param에서 실패할 수 있다.

HTTP JSON은 Handlebars를 jsonStringify로 감싸고 path의 `..`를 허용하지 않는다. queryParams가 있으면 path에 query를 중복 넣지 않는다. JSONPath extractor가 반환 형태를 정하며 인증 헤더는 설정 헤더 위에 추가된다. API Gateway는 다른 보호 경로이므로 같은 helper 요구가 없고 extractor 없이 전체 응답을 반환한다. Body Text/JSON 선택도 실제 전송 타입을 바꾼다.

## 결과 크기와 실행 시점

SQL/Foundry 쿼리는 기본 5,000,000 bytes 결과 한도가 있으며 초과하면 부분 결과 대신 실패한다. 10,000행 미만, 쿼리 500 ms 목표, 5초 왕복 같은 값은 문서의 서로 다른 휴리스틱이며 바이트 한도나 SLA가 아니다. 구체적인 FAQ의 20초 Slate timeout과 Postgate의 사용자별 10연결/대기 5초 설명도 실제 enrollment 설정을 대체하지 않는다.

페이지 로드 시 독립 root query가 동시에 시작하면 단독 Test에서는 빠른 쿼리도 큐에서 실패할 수 있다. 무거운 조회는 수동 실행과 명시적 입력 완료로 제어한다. Writeback query는 입력마다 자동 재실행되지 않도록 수동 실행을 사용한다. Not-null 조건은 빈 문자열/잘못된 범위까지 유효하다고 보장하지 않는다.

## 진단의 근거

API Gateway 목록은 전체 API 카탈로그가 아니라 source/enrollment에 허용된 일부다. Public preview endpoint는 preview=true 없이 ApiFeaturePreviewUsageOnly로 실패할 수 있다. 400/500 요약만 보지 말고 rendered request와 raw errorName/parameters/errorInstanceId를 확인한다. NOT_FOUND는 권한 때문에 숨겨진 리소스도 포함할 수 있다.

Dependency time-in-node에는 서버, 네트워크와 큐 대기가 포함되며 server time과 구분한다. 조건이 거짓인 query는 초기 health check에서 실행되지 않을 수 있다. EXPLAIN의 cost는 시간 측정치가 아니며 EXPLAIN ANALYZE는 실제 실행한다. 원문의 일반 SQL 튜닝 순위나 DISTINCT 회피를 모든 버전의 최적화 법칙으로 확대하지 않는다.

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
