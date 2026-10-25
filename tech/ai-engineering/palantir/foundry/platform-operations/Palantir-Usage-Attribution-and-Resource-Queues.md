---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-26
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 사용량 귀속과 compute queue"]
---

# Foundry 사용량 귀속과 compute queue

Resource Management는 공유 Foundry compute의 사용량, 비용과 청구를 보여 준다. Usage visibility는 Project별 사용량을, Foundry usage and limits는 enrollment 수준 한도 대비 사용량과 기여 organization을 보고, resource allocation은 관리자가 Project의 공유 resource 소비 방식과 선택적 한도를 정한다. Usage account는 Project의 회계 묶음이며 resource queue는 동시에 허용할 CPU/GPU 요청의 실행 경계다. 두 개념을 예산 상한으로 혼동하지 않는다.

## 귀속, 시간과 집계

Discretionary resource를 쓸 수 있는 item은 모두 Project 안에서 만들어지고 그 사용량은 상위 Project에 쌓인다. Project는 정확히 한 usage account에 속하고 Project label은 여러 개 가능하다. Account는 한 enrollment에 속하며 Project가 남아 있으면 삭제할 수 없다. Default/user-folders account가 기본이며 user-folders는 수정 불가다. 관리자는 부서, business unit, Organization처럼 분석에 맞는 account를 새로 만들 수 있고, Project의 account는 생성 때 정하지만 나중에 관리자가 바꿀 수 있다.

Ontology object의 사용량은 이 Project 규칙과 별도로 다음 기준을 따른다. Ontology volume 사용량은 주로 각 object의 input datasource가 있는 Project에 귀속한다. 한 Project로 귀속할 수 없는 object의 사용량은 Ontology 자체로 귀속한다. Input datasource가 여러 Project에 걸친 object가 그 예다.

모든 timestamp/date range는 UTC이고 job 사용량은 종료 날짜에 귀속된다. 며칠 걸린 job도 종료일 한 곳에 잡히므로 달력별 spike를 실행 시작일의 증가로 해석하지 않는다. Analysis는 complete time bucket만 돌려주므로 weekly/monthly bucket과 date range를 맞추지 않으면 총계가 빠질 수 있다.

Compute-second는 elapsed second가 아니라 platform이 실행한 작업량 단위다. 사용량이 쌓이는 방식은 workload와 application마다 다르다. 예를 들어 data transformation 실행에는 분산 계산을 하는 서버의 compute 비용과 결과 데이터를 오래 보관하는 storage 비용이 함께 생긴다. Parallel batch는 resource를 provisioning한 때부터 job이 반납할 때까지 측정하며, core의 utilization이 아니라 할당한 vCPU core와 memory를 기준으로 한다. Core-second는 `(driver core 수 + executor core 수 × executor 수) × job 시간`이다. Compute-second는 executor의 메모리 비중을 반영해 core 수 대신 `max(vCPU, GiB RAM / 7.5)`를 곱하며, usage-types 문서는 driver의 환산을 따로 정하지 않는다. Driver 항을 뺀 예시에서 1core/12GiB executor 2개를 5초 쓰면 core-second는 10, compute-second는 16이다.

Interactive는 always-on backend의 query별 fair share, continuous는 job이 message를 받아 처리할 준비가 된 시간 전체를 측정한다. Streaming은 흐르는 데이터가 없어도 compute-second를 쓴다. Query-specific compute는 개별 Ontology/time-series 문서를 따르며 이 식을 모든 서비스의 직접 청구 공식으로 확대하지 않는다.

## Storage와 숨은 copy

Ontology volume과 일반 Foundry storage는 별도이고 같은 source라도 index layout/compression 때문에 크기가 다를 수 있다. Dataset의 branch/old transaction도 file을 보존한다. DELETE transaction이나 branch 변경은 underlying file을 지우지 않아 storage 사용량을 줄이지 않으며 Retention의 실제 transaction 정리가 필요하다.

Gigabyte-month는 시간에 따른 allocated volume을 hourly measurement로 적분한 값이다. 같은 volume을 하루 저장해도 월의 일수에 따라 day usage 값이 달라진다(90GB를 하루 저장하면 30일 월에 3, 31일 월에 약 2.90 gigabyte-month). Workshop application의 사용량에는 embedded module에서 생긴 사용량도 포함되고, Notepad와 Reports의 compute는 그 안에 embed한 다른 application(예: Notepad 문서의 Contour board)이 낸 사용량이다. 그래서 UI 위치만으로 실행 주체를 추정하지 않는다.

## 접근과 notification

전체 app 접근에는 enrollment Resource Management Viewer/Admin role과 workspace app access가 모두 필요하다. Project usage는 `usage-aggregator:view-project-usage` operation이며 기본 Owner에 부여되지만 custom role로 바꿀 수 있다. 이 제한된 화면에는 cost/billing insight가 없다.

Budget와 anomaly detection은 active usage-based contract가 필요하다. Budget은 all-usage/account 범위의 월/분기/연/일회 금액과 threshold 알림이다. Anomaly는 현재 enrollment 전체 usage의 moving-average deviation 또는 near-zero를 감시한다. Measurement latency는 드물게 26시간까지라 알림 전에 비용이 초과할 수 있고 workload를 자동 중단하는 cap이 아니다.

Monitors는 anomaly detection으로 대체된 deprecated 경로다. Detector/budget 삭제는 과거 anomaly/notification과 subscription도 제거할 수 있어 보고 이력의 보존과 구분한다.

## Foundry usage and limits

Foundry usage & limits 화면은 enrollment 수준 한도에 가까워지거나 넘는 시점과 그 사용량에 기여한 organization을 보는 관측 전용 화면이다. 여기서는 한도를 설정하거나 바꿀 수 없고, 상향은 Request limit increase나 Palantir Support로 요청한다. Resource Management 접근과 `limitsservice:read-usage-metrics` operation이 필요하며, 이 권한은 enrollment의 Resource management viewer와 organization의 Organization administrator에 기본 부여된다.

보고 대상은 Ontology Reads, Platform APIs, Function Compute 같은 서비스이고, 환경에 enrollment 수준 한도가 설정된 서비스만 목록에 나타난다. Enrollment utilization 차트는 선택한 서비스의 요청 사용량을 그 한도와 비교한다. 100%는 그 구간에 한도에 도달했다는 뜻이고 100% 초과는 보고된 사용량이 한도를 넘었다는 뜻이다. Organizations 표의 Max/Avg enrollment quota usage는 선택 기간에 그 organization의 요청 사용량이 공유 한도에서 차지한 최고/평균 비율이며 organization별 한도가 아니다. Organization을 고르면 같은 서비스와 기간으로 user별 분해를 본다.

사용량은 시간 구간으로 집계돼 최근 요청은 늦게 나타날 수 있다. 이 화면은 표시된 한도에 포함되는 요청만 보여 주며 전체 compute, storage나 청구 사용량이 아니므로, 그 분석은 Overview와 Analysis 화면에서 한다. 그래서 이 비율을 budget 금액이나 queue utilization으로 바꿔 읽지 않는다. LLM의 minute별 token/request 한도를 보는 AIP usage & limits는 별개 화면이며 [[Palantir-LLM-Capacity-and-Cost|LLM 용량과 비용]]이 다룬다.

## Queue와 전용 compute

Queue는 FIFO resource 요청을 수용하고 가득 차면 신규 workload가 대기한다. Enrollment의 전체 queue CPU/GPU limit 합은 enrollment 한도 이하여야 한다. Default queue는 삭제 불가이고 Space default를 Project에 적용한다.

각 Project는 vCPU queue가 필수이고 vGPU queue를 선택적으로 갖는다. GPU는 enrollment GPU 한도, GPU queue, Project 할당과 적절한 imported profile이 필요하며 GPU 종류는 연결 compute group의 homogeneous hardware가 정한다. Source의 일부 GPU 설명은 Project가 GPU queue에 backing되어야 한다고 단순 표현하지만 CPU/GPU queue를 별도로 갖는 상세 모델을 함께 읽는다.

Priority branch는 그 branch 전용 queue로 route하고 나머지 branch는 Project queue를 쓴다. Job/continuous/session compute를 구분하며 queue utilization의 7일 history와 Data Health monitor로 용량 압박을 볼 수 있다. Streaming queue 지원은 enrollment에 따라 다르다.

Queue utilization은 모든 Foundry compute가 아니다. Queue 밖의 Ontology indexing(Funnel)은 utilization에 없지만 Analysis에 남는다. Queue 제한을 총 spending cap으로 사용하지 않는다. 실제 청구서, queue 변경, Foundry usage & limits 화면과 사용량 측정은 확인하지 않았다.

## 출처

- [Palantir resource-management, resource-management](https://www.palantir.com/docs/foundry/resource-management)
- [Palantir resource-management, analysis](https://www.palantir.com/docs/foundry/resource-management/analysis)
- [Palantir resource-management, anomaly-detection](https://www.palantir.com/docs/foundry/resource-management/anomaly-detection)
- [Palantir resource-management, budgets](https://www.palantir.com/docs/foundry/resource-management/budgets)
- [Palantir resource-management, configure-access](https://www.palantir.com/docs/foundry/resource-management/configure-access)
- [Palantir resource-management, ecosystem](https://www.palantir.com/docs/foundry/resource-management/ecosystem)
- [Palantir resource-management, foundry-usage-and-limits](https://www.palantir.com/docs/foundry/resource-management/foundry-usage-and-limits)
- [Palantir resource-management, monitors](https://www.palantir.com/docs/foundry/resource-management/monitors)
- [Palantir resource-management, overview](https://www.palantir.com/docs/foundry/resource-management/overview)
- [Palantir resource-management, overview-tab](https://www.palantir.com/docs/foundry/resource-management/overview-tab)
- [Palantir resource-management, project-usage](https://www.palantir.com/docs/foundry/resource-management/project-usage)
- [Palantir resource-management, resource-queues](https://www.palantir.com/docs/foundry/resource-management/resource-queues)
- [Palantir resource-management, usage-types](https://www.palantir.com/docs/foundry/resource-management/usage-types)
- [Palantir building-pipelines, streaming-compute-usage](https://www.palantir.com/docs/foundry/building-pipelines/streaming-compute-usage)

## 관련 문서

- [[Palantir-Platform-Operations]]
- [[Palantir-LLM-Capacity-and-Cost|LLM 용량과 비용]]
