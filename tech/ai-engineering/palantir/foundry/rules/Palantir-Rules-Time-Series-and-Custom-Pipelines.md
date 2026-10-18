---
tags: [palantir, foundry, rules]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 시계열 Rules의 sunset과 custom pipeline 범위

시계열 Rules 기능은 sunset 단계지만 문서는 아직 full support를 제공한다고 명시하며 미래 deprecation 날짜를 확정하지 않는다. 새 요구에는 time series alerting automations로의 이전을 권한다. sunset을 즉시 지원 종료로 기록하지 않는다.

현행 workflow는 root object input에서 Enable time series를 켠다. TSP 기반은 추가 설정이 없지만 measures 기반은 series→root link와 해당 measures의 모든 sync를 추가한다. Add Timeseries board는 변환 series를 만들고 Timeseries Search는 root별 조건에 맞는 start/end/duration interval row를 출력한다. 기존 measure는 @, 앞 board에서 만든 series는 $ prefix로 구별한다.

2022년7월 이전 legacy는 Workshop의 time-series flag/root object 허용 목록과 transform 양쪽을 설정한다. AdditionalInputs에는 root/sensor object, link, sync RID와 tick/backing dataset을 선언하고 object/link의 Ontology import 및 cross-project dataset/sync references도 추가한다.

Custom pipeline은 rule subset 실행 시점 제어나 전처리, incremental transform에 적합하지만 규칙 자체가 incremental data와 호환돼야 한다. 단순 결과 후처리는 downstream transform을 쓴다. self-managed transforms를 켜고 custom repository를 선택한 뒤 workflow를 저장하고 generated code를 rules.transforms의 FoundryRulesTransform에 반영한다. streaming workflow에는 custom pipeline을 지원하지 않는다. 자동 생성의 편의와 직접 유지보수 책임을 구분한다.

## 출처

- [Palantir, configure-timeseries-foundry-rules](https://www.palantir.com/docs/foundry/foundry-rules/configure-timeseries-foundry-rules)
- [Palantir, customize-foundry-rules-pipeline](https://www.palantir.com/docs/foundry/foundry-rules/customize-foundry-rules-pipeline)
- [Palantir, deploy-timeseries-foundry-rules](https://www.palantir.com/docs/foundry/foundry-rules/deploy-timeseries-foundry-rules)
- [Palantir, timeseries-concepts](https://www.palantir.com/docs/foundry/foundry-rules/timeseries-concepts)

## 관련 문서

- [[Palantir-Rules-Legacy-and-Migration]]
- [[Palantir-FoundryTS]]
