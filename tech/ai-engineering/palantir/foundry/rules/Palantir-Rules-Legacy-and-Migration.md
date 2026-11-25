---
tags: [palantir, foundry, rules]
status: done
verified_at: 2026-11-26
category: "AI엔지니어링(AIEngineering)"
---

# Taurus legacy와 Foundry Rules 이전의 안전 경계

2022년7월 이전 Taurus는 inputs를 Workshop과 transform 양쪽, output을 Workshop/transform/Ontology Action 세 곳에 설정했다. legacy Rule Action은 output column 이름/타입/required 여부를 정하는 schema 역할이며 실제 object에 실행하지 않는다. optional unmapped 값은 null이다. actionReadyMergedDataset(Action RID)는 해당 Action을 쓰는 모든 rule 결과를 반환한다. 문서 간 origin column은 taurus_rule_id 또는 Foundry Rules_rule_id로 달리 적혀 있으므로 실제 schema를 확인한다.

Legacy Java runner는 모든 input을 putSources에 등록하고 many-to-many join table을 따로 연결한다. AdditionalInputs metadata 권한과 Project Ontology import/backing dataset reference가 모두 필요하다. shouldMatchContourExecutionBehavior(true)는 Rule Editor preview와 실행을 맞추며 기본 false다. runRules는 Spark lazy 평가이고 statusDataset으로 개별 실패를 확인한다. static tau-execution 의존성 거부 오류는 문서의 [0,1[ 범위 지침과 당시 배포 버전을 대조한다.

2021년1월 이전 rule Actions 전환 안내는 tau-execution-core>=0.60.4 및 logic V1을 요구한다. V0→V1은 되돌릴 수 없고 모든 rule이 Action을 설정한 후 새 transform을 쓰도록 branch에서 검사한다. 이 옛 최소 버전을 현재 신규 설치 권장 버전으로 취급하지 않는다.

## Migration

### 이전할지 먼저 판단한다

공식 문서는 Taurus의 장기 지원이 계속된다고 적으므로 이전은 선택이다. 공식 문서가 드는 이득은 단일 configuration 페이지에서 몇 분 안에 끝나는 배포, configuration 한 곳의 단일 단계 수정, streaming을 포함해 pipeline 코드를 건드리지 않는 실행, 고급 사례용 custom pipeline 코드 생성기다. Supply chain optimization, anti-money laundering, 자동차 산업용 QMOS처럼 Taurus를 더 큰 제품의 일부로 쓰면 지금은 이전할 필요가 없다고 적는다. 사용자 그룹별로 설정이 다른 rule editor widget 여러 개, Taurus package의 고급 기능(예: proposal로 영향 분석 생성)이나 rule logic을 특수한 방식으로 적용하는 repository, rule action의 optional visibility나 object locator, object set, attachment field는 refactoring이 필요하므로 이득과 변경량을 비교한다. 반대로 input dataset, object type이나 rule output을 계속 늘리는 중이면 새 configuration 화면이 유지보수에 유리할 수 있고, Java repository를 함께 써도 일부 코드 생성의 이득이 있다.

가장 적합한 workflow는 사용자가 작성할 한 종류의 rule로 하나의 use case를 겨냥한다. 사용자 그룹과 rule 작성 application이 여럿이면 migration wizard를 여러 번 실행해 workflow를 나누는 것을 검토한다.

### 절차와 복구

V2 migration은 기존 objects/Workshop을 사용하면서 parallel pipeline과 새 outputs를 만들어 기존 실행을 보존한다. time series sync/link, references, application upgrade와 필요시 unlink를 진행한 뒤 downstream을 새 output으로 전환한다. V1 object의 backing dataset 교체는 object edits를 잃을 수 있어 기존 backing에 새 결과를 직접 복사하는 경로도 검토한다.

한 configuration에는 rule editor/reviewer 각 하나가 필요하다. 같은 설정의 중복 widget은 먼저 줄였다가 이후 복제하고 다른 설정은 workflow로 나눈다. form 변환 warning은 field 동작을 확인한다. 동시 application 변경 후 cancel 실패는 이전 published version으로 manual change를 되돌리는 복구 절차가 필요하다.

성공 build만으로 개별 rule 결과가 정상임을 보장하지 않는다. writeback 재build, status dataset 및 기존 결과와의 대조 후 전환을 판단한다.

## 출처

- [Palantir, configure-rule-actions](https://www.palantir.com/docs/foundry/foundry-rules/configure-rule-actions)
- [Palantir, configure-transforms-pipeline](https://www.palantir.com/docs/foundry/foundry-rules/configure-transforms-pipeline)
- [Palantir, configure-workshop-app](https://www.palantir.com/docs/foundry/foundry-rules/configure-workshop-app)
- [Palantir, legacy-foundry-rules-setup-taurus](https://www.palantir.com/docs/foundry/foundry-rules/legacy-foundry-rules-setup-taurus)
- [Palantir, migrate-to-foundry-rules](https://www.palantir.com/docs/foundry/foundry-rules/migrate-to-foundry-rules)
- [Palantir, upgrade-to-use-rule-actions](https://www.palantir.com/docs/foundry/foundry-rules/upgrade-to-use-rule-actions)

## 관련 문서

- [[Palantir-Rules-Workflow-and-Execution]]
