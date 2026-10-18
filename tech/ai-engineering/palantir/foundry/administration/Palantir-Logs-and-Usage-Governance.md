---
tags: [palantir, logging, telemetry, privacy, usage]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 로그와 사용량 관리"]
---

# Foundry 로그와 사용량 데이터의 보호

실행 로그, 감사 로그, 사용자 활동과 비용 데이터는 서로 다른 증거다. App/function/transform/build가 내보내는 운영 로그에는 **100% 전달 보장이 없고 내용도 예고 없이 바뀔 수 있다**. 이를 audit log로 사용해 모든 사건의 부재나 완전한 이력을 입증하지 않는다.

## Export 권한과 platform 열람 권한을 구분한다

Log export는 beta이며 Organization Administrator가 조직 단위로 streaming dataset을 만든다. 설정 시점부터 기록하고 시작까지 최대 5분 걸릴 수 있다. 최대 50 configs/organization, project당 최대 3 configs(조직 전체 export 포함), config당 선택 project 최대 100개다.

Dataset에는 적어도 하나의 organization marking이 필요하다. Dataset의 모든 organization marking이 해당 source executor에도 있어야 그 executor 로그가 들어간다. 예를 들어 executor가 A/B면 dataset A 또는 A/B는 가능하지만 A/C는 안 된다. 판정은 dataset 하나의 상태가 아니라 로그 발생 function/action/automation 자원별이다. Legacy Ontology Action의 project-level export는 project-based permissions로 migration해야 한다.

내부 JSON payload 또는 OTel protobuf binary schema를 고른다. User ID는 기본 redacted이며 선택적으로 해제한다. Markings, 보존 기간, 분석 목적과 독자를 정하고 특정 project 범위부터 구성한다. Export config를 삭제해도 dataset은 남고 새 기록만 중단된다. Dataset trash/permanent delete도 export를 중단시킨다.

## 로그에 입력 데이터의 marking이 자동 전파되지 않는다

Service/trace log는 prompt/completion, object property와 사용자 입력을 담을 수 있다. 원천 데이터나 executor resource의 marking이 자동 전파되지 않으며 **log access 설정에서 선택한 markings가 열람 경계를 정한다**. Workflow가 접근할 수 있는 최대 민감도를 고려해 설정한다.

타인 실행 로그(30일 retention)를 읽으려면 project/resource override의 log reading, 설정 marking 접근과 source executor의 execution-history operation(기본 Editor)이 필요하다. 사용자 자신의 최근 24시간 실행 로그도 execution-history operation은 필요하며, log policy 예외는 CBAC stack에 적용하지 않는다. Export dataset의 sharing을 바꾸는 일과 platform log reading을 켜는 일은 독립이다.

Project-level 정책 설정은 project Edit와 Information Security Officer 또는 Enrollment Administrator 권한이 필요하다. Executor를 옮기면 처음 telemetry를 쓴 attributed project와 current project 양쪽을 적용하므로 단순 이동만으로 log 경계가 전환됐다고 판단하지 않는다. 관리자가 attribution을 clear/inherit할 수 있다.

Legacy Ontology Action은 migration 전 resource override를 사용할 수 있다. Override marking도 실제 접근 데이터의 보호를 자동 상속하지 않으므로 필요한 marking을 직접 선택한다. Disabled override는 deprecated이며 제거하고 project 정책을 사용한다. Resource의 log history 삭제는 irreversible이다.

## 사용자 활동 수치는 이용 가치를 직접 측정하지 않는다

Platform usage는 일별 unique user count와 앱 View/Modify를 분석한다. Modify 사용자는 View에도 포함되고 모든 앱에 Edit event가 있는 것은 아니다. 그룹은 최소 10명과 기간 내 10 interactions 조건이 있으며 부족한 그룹 집계는 suppress된다. 빈 그래프를 이용자 부재로 확정하지 않는다.

조직 집계는 View usage metrics workflow가 필요하다. 개별 resource 지표는 해당 조직 workflow와 resource의 usage-metrics permission(기본 Owner)을 둘 다 요구한다. 대시보드는 기본 aggregate이며 개인별 raw event를 보려면 internal export를 별도 구성한다. 자주 열리는 dashboard가 가치가 있다는 해석은 후보이지 인과 효과 측정이 아니다.

## Internal export는 분석 책임도 이전한다

| Dataset | 내용 | Export 권한 |
|---|---|---|
| Granular Usage Data | Compute/storage | Resource Management Administrator |
| AIP Token Usage | Resource/day/model별 input/output/cache와 compute/currency | Resource Management Administrator |
| Processed user activity | 일별 app/interaction, project/user organization RID | Enrollment Administrator |
| Raw event logs | 세부 사용자 활동 | Enrollment Administrator |

Export dataset은 새 데이터로 갱신되며 생성 build 비용은 usage에 포함하지 않지만 이후 분석/파이프라인/Ontology 사용은 일반 비용이 발생한다. Resource/project 이름은 민감 정보일 수 있어 resource usage export에서 제외한다. 생성 직후 비어 있을 수 있고 30분 뒤에도 안 나오면 지원 경로를 사용한다. 식별자, 활동과 모델 사용 데이터 자체를 민감한 운영 데이터로 다룬다.

## 출처

- [Palantir, Configure logging](https://www.palantir.com/docs/foundry/administration/configure-logging)
- [Palantir, Analyze user activity metrics](https://www.palantir.com/docs/foundry/administration/analyze-user-activity-metrics)
- [Palantir, Internal dataset export](https://www.palantir.com/docs/foundry/administration/internal-dataset-export)
- [Palantir, Log permissions](https://www.palantir.com/docs/foundry/aip-observability/log-permissioning)

## 관련 문서

- [[Palantir-Security-and-Governance|보안 전파와 읽기 필터]]
- [[Palantir-Action-Observability-and-Recovery|Action 감사와 복구]]
- [[Palantir-AIP-Logic-and-Evaluation|AI 실행 관측과 평가]]
