---
tags: [palantir, foundry, pipeline-builder, data-engineering]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Pipeline Builder 스키마, 품질과 안정적인 식별자"]
---

# Pipeline Builder 스키마, 품질과 안정적인 식별자

타입 검사는 표현식과 output schema의 호환성을 확인하지만 실제 값의 정확성은 expectation과 검토가 필요하다. Row expression은 column, aggregate는 group, generator는 한 row에서 여러 값, transform은 table 전체의 행수와 schema를 바꾼다. Logical type cast는 base representation을 변환하지 않고 제약을 검증한다.

## 입력과 행수의 계약

Schema가 있는 dataset은 tabular로 읽으므로 Excel/raw-file parser가 검색에 나타나지 않을 수 있다. Schema-less file input을 사용하고 parser의 형식/오류 모드를 확인한다. PB 안의 source 생성은 mandatory field만 필요한 Foundry-worker source와 batch sync의 제한된 경로다. Optional/고급 설정과 반복 ingest는 Data Connection에서 관리한다.

Manually entered table은 batch용이며 Faster 입력은 지원하지 않는다고 명시한다. Notional data는 1~1,000 row, LLM preview는 최대 10 row이며 Generate table은 lock하지 않은 기존 값을 덮어쓴다. Synthetic 예시를 실제 관측값이나 품질의 근거로 쓰지 않는다.

일반 Union board는 같은 schema를 요구하고 duplicates를 보존한다. Reference의 narrow/first/wide union은 각각 교집합/첫 dataset/합집합 column 규칙을 가진 별도 함수다. Join은 중복 key에서 행을 늘릴 수 있고 KNN reference 예시는 tie로 k보다 많은 row를 반환한다. 함수별 cardinality를 확인한다. Split은 Spark/Faster의 단일 table에만 지원하며 overview는 만족하지 않는 모든 row를 False로 보낸다고 설명하지만 상세는 true/false만 언급해 null 결과를 따로 확인해야 한다.

FP-Growth의 minimum support는 pattern이 포함된 transaction 비율이다. 예시의 0.6은 5건 중 최소 3건이며 pattern occurrence/total count를 준다. 단순 빈발 itemset은 인과관계나 미래 구매의 확률 보장이 아니다.

## Null, NaN과 표현식 차이

Filter/Case/join condition은 True만 만족하고 False/null은 만족하지 않는다. Case는 첫 만족 branch를 고른다. Null-safe equality는 null끼리 match할 수 있고 not-null-safe equality는 null을 전파한다. 다만 null-handling 원문은 is-not-equal까지 equality와 같은 truth table로 묶는 부정확한 표현이 있어 부등식의 null truth table을 그 문장만으로 보장하지 않는다.

빈 문자열, null과 NaN은 다르다. Is-null/coalesce의 empty-string 취급은 옵션이고 not-null expectation은 빈 문자열/NaN을 잡지 않는다. ANSI 설정은 And/Or/Not-any의 null 동작을 바꾼다. Regex extract의 no-match는 empty string이며 find는 부분, match는 전체 문자열을 검사한다. Regex index는 0-based Unicode code point, array/substring 계열은 대체로 1-based이므로 공통 index 기준을 가정하지 않는다.

Map keys/values의 array 순서는 비결정적이다. Null map key는 runtime error가 될 수 있다. First/Last의 unordered aggregate, random 계열은 seed가 있어도 build 간 같은 결과를 보장하지 않는다. Source function index의 잘린 `...` 예시는 원문 자체의 생략이며 완전한 output schema 예제가 아니다. 지원 engine 표기가 빈 항목도 지원을 추정하지 않는다.

## 품질 gate와 시험의 범위

Primary-key expectation은 각 column non-null과 조합의 uniqueness를 함께 본다. Row count는 min/max, enum은 허용 값, row-level은 모든 row의 boolean True를 요구한다. 실패하면 build가 fail한다. NaN expectation은 별도로 필요하고 OSv2는 NaN/±infinity를 허용하지 않아 batch indexing fail 또는 streaming violating record drop으로 이어질 수 있다.

Unit test는 수동 input/expected table로 선택한 transform을 비교하며 proposal merge 전 성공을 확인한다. 선택 구간 사이에 새 node를 넣으면 test에 자동 포함한다. Streaming test는 모든 input source를 통틀어 유일한 Long ordering metadata로 emission 순서를 정한다. 이는 데이터 schema 자체의 field가 아니고 production 도착 순서를 보장하지 않는다.

Health check는 job/build status, duration과 freshness 등을 관찰하고 severity/escalation/issue를 설정한다. 이는 output expectation의 build gate와 다른 감시 계약이다. 이 문서는 실제 unit test나 build를 실행하지 않았다.

## 안정적인 ID

Source는 고유한 자연 key column 조합을 정해 문자열로 직렬화하고 SHA-256 또는 namespace+name UUID v5를 만드는 패턴을 권한다. 같은 입력의 재현성은 원래 key의 uniqueness, null/형식과 구분자의 모호성을 해결했을 때 성립한다. Hash 자체가 고유하지 않은 입력을 고유하게 만들거나 익명성을 보장하지 않는다. 이 전제는 원문 패턴의 적용 조건을 명시한 해석이다.

Random UUID/number를 hash해도 build와 preview 사이에서 ID는 달라진다. Spark의 monotonic ID도 partition/task 실행에 따라 바뀔 수 있어 object PK에 쓰면 재index가 필요할 수 있다. 원문의 sequential 예시는 Spark ID가 연속 정수임을 보장하는 계약으로 사용하지 않는다.

## 출처

- [Palantir Pipeline Builder, dataexpectations-configure-health-check](https://www.palantir.com/docs/foundry/pipeline-builder/dataexpectations-configure-health-check)
- [Palantir Pipeline Builder, dataexpectations-overview](https://www.palantir.com/docs/foundry/pipeline-builder/dataexpectations-overview)
- [Palantir Pipeline Builder, dataexpectations-unit-tests](https://www.palantir.com/docs/foundry/pipeline-builder/dataexpectations-unit-tests)
- [Palantir Pipeline Builder, datasets-add](https://www.palantir.com/docs/foundry/pipeline-builder/datasets-add)
- [Palantir Pipeline Builder, datasets-generated](https://www.palantir.com/docs/foundry/pipeline-builder/datasets-generated)
- [Palantir Pipeline Builder, datasets-overview](https://www.palantir.com/docs/foundry/pipeline-builder/datasets-overview)
- [Palantir Pipeline Builder, datasets-sources](https://www.palantir.com/docs/foundry/pipeline-builder/datasets-sources)
- [Palantir Pipeline Builder, functions-index](https://www.palantir.com/docs/foundry/pipeline-builder/functions-index)
- [Palantir Pipeline Builder, null-handling](https://www.palantir.com/docs/foundry/pipeline-builder/null-handling)
- [Palantir Pipeline Builder, transforms-join-data](https://www.palantir.com/docs/foundry/pipeline-builder/transforms-join-data)
- [Palantir Pipeline Builder, transforms-overview](https://www.palantir.com/docs/foundry/pipeline-builder/transforms-overview)
- [Palantir Pipeline Builder, transforms-pattern-mining](https://www.palantir.com/docs/foundry/pipeline-builder/transforms-pattern-mining)
- [Palantir Pipeline Builder, transforms-split](https://www.palantir.com/docs/foundry/pipeline-builder/transforms-split)
- [Palantir Pipeline Builder, transforms-transform-data](https://www.palantir.com/docs/foundry/pipeline-builder/transforms-transform-data)
- [Palantir Pipeline Builder, transforms-union-data](https://www.palantir.com/docs/foundry/pipeline-builder/transforms-union-data)
- [Palantir Pipeline Builder, unique-id-creation](https://www.palantir.com/docs/foundry/pipeline-builder/unique-id-creation)

## 관련 문서

- [[Palantir-Pipeline-Builder]]
- [[Palantir-Pipeline-Transforms]]
- [[Palantir-Pipeline-Expressions]]
