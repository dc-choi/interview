---
tags: [palantir, hyperauto]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# HyperAuto V1 구성과 V2 전환

## V1의 운영 경계

V1은 검증일 기준 sunset 단계지만 full support가 남아 있고 미래 deprecation 날짜는 여기서 확정하지 않는다. SAP 신규 pipeline은 V2를 우선한다. V1은 source exploration, 자동 생성 Code Repository와 선택적 Ontology를 연결하고 derived element로 join/time series/enrichment를 제공한다.

Cockpit에서 sync, pipeline generation과 Ontology changes를 관리한다. SAP 구성은 source explorer에서, 비SAP는 Cockpit에서 다룬다. 탐색 graph의 table 추가와 shopping cart의 실제 sync 생성은 별개다. Salesforce/NetSuite의 기본 source exploration 전환 시 source overview의 raw folder와 SourceConfig 경로를 맞춘다.

## YAML 설정과 재계산

SourceConfig는 source/context, raw/metadata folder, cleaning, dedup과 table별 override를 담고 PipelineConfig는 처리 source 목록, 출력 위치, workflow와 table 역할을 담는다. OBJECT/METADATA/CUSTOMIZATION 분류는 후속 생성에 영향을 준다. Advanced 설정은 branch에서 먼저 검증한다.

전역 dedup comparison 이후 table별 comparison/삭제 changeMode 설정을 적용한다. changeMode의 D는 삭제 의미다. enforceUniquePrimaryKeys는 key당 한 행을 남겨도 tie 상황에서 비결정적 결과가 생길 수 있다.

Cleaning 함수 추가/삭제와 foreign key/enrichment/renaming stage 변경은 deploymentSemanticVersion을 올려 snapshot 재계산을 유도한다. Table 추가만으로 semantic version을 올릴 필요는 없지만 objects/links/fields/diffs metadata를 다시 빌드해야 한다. Spark profile은 설정 참조 전에 repository에 import한다.

BUILD dataset은 최종 출력을 연결하므로 upstream을 포함한 full-build schedule의 target으로 두면 새 table을 포함하기 쉽다. Smart scheduler는 변경된 raw 입력이 있는 구간을 빌드한다. MODULE_UNREACHABLE을 driver memory 단서로 조사하되 오류 이름만으로 메모리 부족을 확정하지 않는다.

## V2 전환의 호환성

V2는 pipeline당 source 하나이며 source 열과 primary/foreign key의 source 접두사가 사라진다. Source 이름 변경에 취약했던 V1 multi-source union을 그대로 옮기지 말고 필요하면 V2 하류에서 통합한다.

V2의 FK는 더 보수적으로 생성하고 더 풍부한 metadata로 열 이름도 달라질 수 있다. Custom cleaning은 하류 pipeline에, batchUnionComponents는 upstream union 후 folder 기반 입력으로 옮긴다. V1의 생성 schema와 같은 출력을 보장하지 않는다.

동일 입력에 새 V2 pipeline을 병렬 생성하고 하류 repository/analysis/application을 식별해 점진적으로 출력을 바꾼다. V1을 유지하기로 한 저장소는 template에서 sever되어 일반 Python Transforms 저장소로 남을 수 있다. 이후 자동 PR 생성은 중단되고 사용자에게 수동 변경/업데이트 책임이 넘어간다.

## 출처

- [Palantir Foundry, v1-cockpit](https://www.palantir.com/docs/foundry/hyperauto/v1-cockpit/)
- [Palantir Foundry, v1-configuration-reference](https://www.palantir.com/docs/foundry/hyperauto/v1-configuration-reference/)
- [Palantir Foundry, v1-faq](https://www.palantir.com/docs/foundry/hyperauto/v1-faq/)
- [Palantir Foundry, v1-getting-started](https://www.palantir.com/docs/foundry/hyperauto/v1-getting-started/)
- [Palantir Foundry, v1-overview](https://www.palantir.com/docs/foundry/hyperauto/v1-overview/)
- [Palantir Foundry, v1-source-exploration](https://www.palantir.com/docs/foundry/hyperauto/v1-source-exploration/)
- [Palantir Foundry, v1-to-v2-differences](https://www.palantir.com/docs/foundry/hyperauto/v1-to-v2-differences/)

## 관련 문서

- [[Palantir-Foundry-HyperAuto]]
