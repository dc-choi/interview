---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 사용량 귀속과 compute queue"]
---

# Foundry 사용량 귀속과 compute queue

Resource Management는 사용량/비용/청구의 관측과 shared resource 할당을 나눈다. Usage account는 Project의 회계 묶음이며 resource queue는 동시에 허용할 CPU/GPU 요청의 실행 경계다. 두 개념을 예산 상한으로 혼동하지 않는다.

## 귀속, 시간과 집계

Project는 정확히 한 usage account에 속하고 Project label은 여러 개 가능하다. Account는 한 enrollment에 속하며 Project가 남아 있으면 삭제할 수 없다. Default/user-folders account가 기본이며 user-folders는 수정 불가다. Ontology usage는 input datasource Project에 주로 귀속하지만 여러 Project에 걸친 object는 Ontology 자체로 귀속될 수 있다.

모든 timestamp/date range는 UTC이고 job 사용량은 종료 날짜에 귀속된다. 며칠 걸린 job도 종료일 한 곳에 잡히므로 달력별 spike를 실행 시작일의 증가로 해석하지 않는다. Analysis는 complete time bucket만 돌려주므로 weekly/monthly bucket과 date range를 맞추지 않으면 총계가 빠질 수 있다.

Compute-second는 elapsed second와 다르다. Parallel batch는 provisioning부터 cleanup/release까지 allocated core/memory를 측정하고 CPU utilization만 재지 않는다. Source의 parallel 계산은 task별 `max(vCPU, GiB RAM / 7.5) × duration`이며 driver/executor의 할당과 수를 합산한다. 1core/12GiB executor 2개를 5초 쓰면 16 compute-seconds라는 예시다.

Interactive는 always-on backend의 query별 fair share, continuous는 message를 받을 준비가 된 시간 전체를 측정한다. Idle streaming/model도 비용이 생길 수 있다. Query-specific compute는 개별 Ontology/time-series 문서를 따르며 이 식을 모든 서비스의 직접 청구 공식으로 확대하지 않는다.

## Storage와 숨은 copy

Ontology volume과 일반 Foundry storage는 별도이고 같은 source라도 index layout/compression 때문에 크기가 다르다. Dataset의 branch/old transaction도 file을 보존한다. DELETE transaction이나 branch 변경은 underlying file을 지우지 않아 storage 사용량을 줄이지 않으며 Retention의 실제 transaction 정리가 필요하다.

Gigabyte-month는 시간에 따른 allocated volume을 hourly measurement로 적분한 값이다. 같은 volume을 하루 저장해도 월의 일수에 따라 day usage 값이 달라진다. Embedded app이 내는 usage는 host 문서/Workshop 경로에 나타날 수 있어 UI 위치만으로 실행 주체를 추정하지 않는다.

## 접근과 notification

전체 app 접근에는 enrollment Resource Management Viewer/Admin role과 workspace app access가 모두 필요하다. Project usage는 `usage-aggregator:view-project-usage` operation이며 기본 Owner에 부여되지만 custom role로 바꿀 수 있다. 이 제한된 화면에는 cost/billing insight가 없다.

Budget와 anomaly detection은 active usage-based contract가 필요하다. Budget은 all-usage/account 범위의 월/분기/연/일회 금액과 threshold 알림이다. Anomaly는 현재 enrollment 전체 usage의 moving-average deviation 또는 near-zero를 감시한다. Measurement latency는 드물게 26시간까지라 알림 전에 비용이 초과할 수 있고 workload를 자동 중단하는 cap이 아니다.

Monitors는 anomaly detection으로 대체된 deprecated 경로다. Detector/budget 삭제는 과거 anomaly/notification과 subscription도 제거할 수 있어 보고 이력의 보존과 구분한다.

## Queue와 전용 compute

Queue는 FIFO resource 요청을 수용하고 가득 차면 신규 workload가 대기한다. Enrollment의 전체 queue CPU/GPU limit 합은 enrollment 한도 이하여야 한다. Default queue는 삭제 불가이고 Space default를 Project에 적용한다.

각 Project는 vCPU queue가 필수이고 vGPU queue를 선택적으로 갖는다. GPU는 enrollment GPU 한도, GPU queue, Project 할당과 적절한 imported profile이 필요하며 GPU 종류는 연결 compute group의 homogeneous hardware가 정한다. Source의 일부 GPU 설명은 Project가 GPU queue에 backing되어야 한다고 단순 표현하지만 CPU/GPU queue를 별도로 갖는 상세 모델을 함께 읽는다.

Priority branch는 그 branch 전용 queue로 route하고 나머지 branch는 Project queue를 쓴다. Job/continuous/session compute를 구분하며 queue utilization의 7일 history와 Data Health monitor로 용량 압박을 볼 수 있다. Streaming queue 지원은 enrollment에 따라 다르다.

Queue utilization은 모든 Foundry compute가 아니다. Queue 밖의 Ontology indexing(Funnel)은 utilization에 없지만 Analysis에 남는다. Queue 제한을 총 spending cap으로 사용하지 않는다. 실제 청구서, queue 변경과 사용량 측정은 확인하지 않았다.

## 출처

- [Palantir resource-management, resource-management](https://www.palantir.com/docs/foundry/resource-management)
- [Palantir resource-management, analysis](https://www.palantir.com/docs/foundry/resource-management/analysis)
- [Palantir resource-management, anomaly-detection](https://www.palantir.com/docs/foundry/resource-management/anomaly-detection)
- [Palantir resource-management, budgets](https://www.palantir.com/docs/foundry/resource-management/budgets)
- [Palantir resource-management, configure-access](https://www.palantir.com/docs/foundry/resource-management/configure-access)
- [Palantir resource-management, ecosystem](https://www.palantir.com/docs/foundry/resource-management/ecosystem)
- [Palantir resource-management, monitors](https://www.palantir.com/docs/foundry/resource-management/monitors)
- [Palantir resource-management, overview](https://www.palantir.com/docs/foundry/resource-management/overview)
- [Palantir resource-management, overview-tab](https://www.palantir.com/docs/foundry/resource-management/overview-tab)
- [Palantir resource-management, project-usage](https://www.palantir.com/docs/foundry/resource-management/project-usage)
- [Palantir resource-management, resource-queues](https://www.palantir.com/docs/foundry/resource-management/resource-queues)
- [Palantir resource-management, usage-types](https://www.palantir.com/docs/foundry/resource-management/usage-types)

## 관련 문서

- [[Palantir-Platform-Operations]]
