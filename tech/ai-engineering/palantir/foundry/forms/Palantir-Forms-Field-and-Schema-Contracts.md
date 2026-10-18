---
tags: [palantir, foundry, forms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Forms field schema, 계산과 시간

YAML form은 name/fields/sheets로 구성하고 sheet도 fields/sheets를 가진다. field uri는 고유하며 writeback 대상 column/property ID와 같아야 한다. 비저장 field는 display. prefix를 쓴다. tag는 field 간 참조용 고유 식별자이고 uri의 제약과 다르다. urlParam은 embed prefill, disabled는 읽기 전용, hidden은 숨겨도 값을 기록한다. noLabel은 code-only다.

Simple field는 Text/TextArea/Numeric, Slider, DatePicker, Checkboxes/Dropdown/Radio, Resource/Geocode/Map picker, URL과 Markdown Callout이다. callout은 writeback하지 않는다. option의 label과 실제 value를 구별한다. Numeric의 clamp/min/max/step, Slider 초기값/label precision과 Map latlng/mgrs 및 styles 같은 고급 설정은 code에서 구성한다.

Date picker는 사용자 timezone으로 고르지만 backing에는 UTC를 쓴다. 기본 최소/최대는 현재에서25년이고 범위를 확장할 수 있다. Created/Modified at는 open time 또는 submit time을 기록할 수 있다. Record as local date/timestamp를 켜면 서로 다른 timezone의 기록을 실제 발생 순서로 정렬할 수 없다. format의 z로 zone을 포함한다. Created/Modified by는 사용자 ID를 기록한다.

Calculation은 expr-eval formula와 single-value inputs를 쓰고 Number/Date/Timestamp output, missing/error value와 precision을 정한다. Template도 single-value tag를 참조해 문자열을 만든다. multi-values는 ListAggregate를 사용한다. code-only Hidden은 고정값, List는 같은 field의 반복이며 allowZeroItems 기본 false, Composite는 여러 field를 stringified JSON으로 저장한다. Composite 내부에 Hidden 또는 multiple-value field는 허용하지 않는다. ListAggregate는 concatenate/sum/min/max/mean/count, listTag, concatenate의 joinWith 및 composite nested URI displayItem을 받는다. 문서의 errorValue 예제와 errorText 설명은 실제 schema에서 확인한다.

Data-backed User dropdown은 이름을 표시하고 user ID, Object dropdown은 title을 표시하고 primary key를 저장한다. Object filter property는 Low cardinality render hint가 필요하다. Dataset value dropdown은 Lime index가 필요하다. property/value dropdown은 configuration에 따라 새로운 임의값도 허용한다. read-only Objects Provider는 maxObjects를, property/user display는 missing과 request failure 시 message/동작을 설정한다. missing은 부재와 권한 부족 둘 다 포함한다.

Fusion multi-value는 한 cell array다. object destination은 source/writeback column 모두 Array<X>이며 Ontology property의 base type X와 Allow multiple values를 맞춰야 한다. 이를 scalar String과 연결하면 PhonographEntryParseError가 난다. Console의 Submitting failed/parameters/PropertyId로 원인 field를 찾는다. 여러 row가 필요하면 downstream explode로 별도 변환한다.

## 출처

- [Palantir, auto-populating-fields](https://www.palantir.com/docs/foundry/forms/auto-populating-fields)
- [Palantir, code-editor](https://www.palantir.com/docs/foundry/forms/code-editor)
- [Palantir, data-backed-fields](https://www.palantir.com/docs/foundry/forms/data-backed-fields)
- [Palantir, faqs](https://www.palantir.com/docs/foundry/forms/faqs)
- [Palantir, simple-fields](https://www.palantir.com/docs/foundry/forms/simple-fields)

## 관련 문서

- [[Palantir-Forms-Multiplicity-and-Transforms]]
