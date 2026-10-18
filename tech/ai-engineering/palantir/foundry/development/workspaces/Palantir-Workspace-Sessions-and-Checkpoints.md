---
tags: [palantir, workspace, checkpoint, git]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Code Workspace session과 checkpoint 수명"]
---

# Workspace session과 checkpoint 수명

Code Workspaces는 JupyterLab/RStudio/VS Code를 Foundry resource와 연결하는 single-node authoring 환경이다. Local PySpark도 container CPU/memory만 사용하며 분산 Spark cluster가 아니다. 큰 pipeline/streaming은 별도 Builder/Repositories/Streaming을 검토한다.

## 공유 code와 개인 session

새 workspace는 backing repository와 단일 resource를 사용하지만 예전 생성본은 별개 resource일 수 있다. 예전 구조에서는 둘 다 공유해야 한다. Viewer는 launch, Editor/Owner는 설정을 변경하는 기본 role이며 input의 실제 권한도 충족해야 한다.

사용자마다 격리된 session을 시작하며 Git sync로 code를 공유한다. 동료와 같은 workspace를 열어도 memory/package/data state를 공유하지 않는다. Independent branch와 sync/PR로 조율한다. Sync는 CI를 실행하고 등록된 모든 application의 새 version을 publish할 수 있어 한 workspace에 독립 업무를 과도하게 섞지 않는다.

Code viewer는 commit하고 synchronize한 상태만 읽고 editor 없이 사용할 수 있다. Branch link는 움직이므로 exact commit/line permalink로 근거를 공유한다. Stopped VS Code를 열면 viewer가 보이면서 session이 background start될 수 있다. Viewer만 사용한다고 session이 안 떴다고 추정하지 않는다.

## Sync와 checkpoint는 다른 저장이다

| 경로 | 보존 내용과 수명 |
|---|---|
| Code sync | Repo code/환경 정의의 Git history, memory/data/cell output은 제외 |
| Data checkpoint | Repo 미커밋 내용, libs/envs/data와 R .RData 등, 개인별, 최대 30일 |
| Code checkpoint | Shutdown 때 code 중심 best-effort filter, data 제외 의도, 별도 retention 없음 |

Data checkpoint는 기본 10분마다와 shutdown 전에 생성한다. Inactive 상태는 새 checkpoint가 없어 30일 넘게 방치하면 data state를 복원하지 못할 수 있다. Code에 데이터를 직접 넣으면 extension/size filter로 막지 못하므로 code checkpoint도 민감정보 저장 통로가 될 수 있다.

Lifecycle shutdown 뒤 다음 진입은 checkpoint를 복원할 수 있지만 manual restart는 초기 state로 시작하며 자동 이전 restore가 아니다. Restore checkpoint를 명시적으로 선택하면 다시 restart한다. 반복 재현은 Git code와 명시한 package/data 입력에 의존한다.

`data-checkpoint`는 session 간 필요한 자료를 background 복원하고 sync에서 제외한다. `data-tmp`는 session 종료 시 버리는 자료다. 다른 사용자/application/transform이 소비할 자료는 dataset에 저장한다. Ignore/filter가 있다는 사실을 code 내부의 data 제거 보장으로 쓰지 않는다.

## 시간 제한과 compute

기본 inactivity auto-shutdown은 30분, 설정 최대 6시간이며 session 최대 24시간이다. Jupyter `%%keep_alive`도 실행 cell을 최대 24시간 유지한다. 닫힌 browser의 cell output 표시/저장은 중단될 수 있어 capture와 durable output을 별도로 구성한다.

Usage guide의 상세 상태 목록은 INITIALIZING/RUNNING에 compute가 발생한다고 명시한다. 포괄적인 starting 표현보다 실제 상태와 usage metric을 확인한다. CPU는 sidecar(0.25vCPU/3GiB) overhead를 포함한 `max(vCPU, GiB/7.5) * rate * duration`, GPU는 수/type rate/기간으로 계산한다.

VS Code default 0.75CPU/6GB profile은 해당 가이드의 기본 UBP 0이며 증설 또는 GPU는 다른 rate다. 일반 CPU workspace rate 0.1, GPU는 종류별로 다르고 enterprise 계약을 확인한다. 무료 profile 설명을 transform/model 실행과 모든 저장 비용으로 확대하지 않는다. Project queue/managed profile이 실제 선택 가능 resource를 제한한다.

## 출처

- [Palantir, Code Workspaces](https://www.palantir.com/docs/foundry/code-workspaces)
- [Palantir, Getting started](https://www.palantir.com/docs/foundry/code-workspaces/getting-started)
- [Palantir, Code viewer](https://www.palantir.com/docs/foundry/code-workspaces/code-viewer)
- [Palantir, Workspace FAQ](https://www.palantir.com/docs/foundry/code-workspaces/code-workspaces-faq)
- [Palantir, Compute usage](https://www.palantir.com/docs/foundry/code-workspaces/compute-usage)

## 관련 문서

- [[Palantir-Workspace-Security-and-Egress|Credential와 data lineage]]
- [[Palantir-Workspace-Applications-and-Environments|Publish와 managed 환경]]
