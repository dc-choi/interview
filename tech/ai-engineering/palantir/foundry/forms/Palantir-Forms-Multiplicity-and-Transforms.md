---
tags: [palantir, foundry, forms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Forms 반복 입력과 동적 validation

Sheet는 field 묶음이며 header/columns/label/description/disable과 multiplicity를 설정한다. sub-sheet는 form 끝에만 추가하고 중간 삽입이나 sheet 아래 개별 field는 지원하지 않는다. Multiple Entries는 shared header와 반복 unique fields를 하나의 submit으로 여러 rows/objects에 쓴다. Free는 사용자가 반복 수를 정하고 Parameterized는 shared field 값이나 Objects Provider로 반복 항목과 고유값을 채운다. Multiple-entry form은 Default Value와 UrlParams를 지원하지 않는다.

Parameterized uri에는 반복 sheet 내 수신 field URI를 지정하고 source는 shared field의 Tag에 연결한다. prefilled 고유값 변경을 막으려면 수신 field를 read-only로 설정한다. shared data와 unique data의 저장 row 의미를 먼저 결정한다.

Transforms는 조건부 show/hide/disable, update configuration, change field type이다. 정의 순서대로 적용하며 충돌 시 마지막 값이 우선한다. show와 hide를 같이 두지 말고 기본 visibility에 맞는 하나로 표현한다. AND/OR/NOT condition tree의 grouping을 확인한다. configuration update는 tag,uri,defaultValue,transforms 자체 및 attachment destination/upload mode처럼 고정이어야 하는 설정을 바꾸지 못한다.

Validators는 Regex/Required/Range 등의 모든 조건을 만족해야 submit을 허용한다. 조건부 required도 configuration transform으로 구성할 수 있다. 숨김과 read-only를 별도 보안 경계로 취급하지 않고 저장값과 origin 권한을 검증한다.

Fusion-backed form의 PK는 비편집 자동 생성값이 적절하다. PK field가 비면 unique value를 자동 생성하지만 **이미 존재하는 key를 입력해도 새 row가 생성되어 key가 중복된다.** Fusion submit_to_region의 upsert 의미와 Forms 생성 동작을 혼동하지 않는다.

## 출처

- [Palantir, generate-primary-key](https://www.palantir.com/docs/foundry/forms/generate-primary-key)
- [Palantir, multiplicity](https://www.palantir.com/docs/foundry/forms/multiplicity)
- [Palantir, sheets](https://www.palantir.com/docs/foundry/forms/sheets)
- [Palantir, transforms](https://www.palantir.com/docs/foundry/forms/transforms)
- [Palantir, validators](https://www.palantir.com/docs/foundry/forms/validators)

## 관련 문서

- [[Palantir-Forms-Lifecycle-and-Permissions]]
- [[Palantir-Forms-Embedding-and-Attachments]]
