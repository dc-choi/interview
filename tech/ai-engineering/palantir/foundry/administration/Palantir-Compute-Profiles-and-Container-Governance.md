---
tags: [palantir, compute, container, governance, profile]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Foundry 실행 환경과 컨테이너 통제"]
---

# Foundry 실행 환경과 컨테이너 통제

공통 profile은 패키지/compute 기본값과 공유 경계를 제공한다. Profile을 import한 사용자 한 명의 권한과 해당 project에서 환경을 사용할 수 있는 범위가 달라질 수 있으므로 import를 실제 실행 권한 위임으로 검토한다.

## Code Workbook profile은 패키지와 Spark 기본값이다

새 Control Panel profile은 Artifacts 기반이며 backing repository를 모두 workbook project에 import해야 한다. Python에는 `vector-spark-module-py`, R에는 `vector-spark-module-r`가 필요하고 SQL은 추가 패키지 없이 쓸 수 있다. Python/R 기본 분석 패키지 버전을 바꾸려면 명시적으로 고른다. R self-service는 기본 제공되지 않아 enablement를 확인한다.

Conda 변경은 먼저 실제 workbook에서 resolve되는지 확인한다. Legacy Spark 설정을 수정하면 Spark Configuration Service profile로 override를 재구성해야 한다. Profile에 Spark profile을 붙이려면 해당 import 권한이 필요하다.

Interactive/batch module을 별도로 prewarm하며 미설정이면 사용자가 초기화를 기다린다. Owner는 수정, Importer는 project import를 한다. Import가 끝나면 project의 누구나 해당 profile을 쓸 수 있으며 organization 제한은 marking을 적용한다. 생성에는 Manage Code Workbook profiles workflow, 수정에는 Owner, warm queue 관리에는 추가 warm queue workflow가 필요하다. 이름 `default`가 기본 환경이다.

## Code Workspaces compute profile은 resource queue와 함께 제한한다

기본 비관리 상태에서는 project resource queue 최대치 안에서 CPU/memory를 고른다. Management를 켜면 project에 import한 profile이 추가 상한이 된다. 사용자는 profile 안의 일부를 할당하고 queue 상한도 계속 적용된다.

기본 Medium은 최대 2CPU/16GB이며 enrollment default로 일반 사용자에게 import 가능하게 할 수 있다. 더 큰 profile은 resource administrator가 project에 import하고, 이후 그 project의 모든 workspace가 사용할 수 있다. 사용 중단은 project External references에서 import를 제거한다. Management 활성화, default 선택과 큰 profile import는 Resource Management Administrator 권한이 필요하다.

## Container scan과 자동 차단을 구분한다

Pipeline Builder warm pool은 지속 실행 VM pool로 startup latency를 줄이는 별도 profile 옵션이다. 2025년 10월에는 extra small만 지원하고 VM당 최대 3개 job을 공유했으며 extra small에서 30분 안에 끝나는 작은 build에 적합하다고 안내했다. Cold start 감소를 전체 계산시간 보장으로 읽지 않고 공유 자원/queue와 실제 비용을 확인한다.

Container workflow는 기본 disabled이고 Rubix infrastructure가 필요하다. Image는 numeric non-root UID로 실행하고 kernel privileges를 갖지 않아야 한다. 외부 작성 image의 취약점 관리와 supply-chain 통제는 관리자 책임에 남는다.

Foundry는 active user-uploaded container를 주기적으로 scan하지만 **취약점을 찾았다고 기본 자동 조치하지 않는다**. 관리자가 vulnerability를 recall하면 영향을 받는 container를 사용하는 job을 강제 중단한다. Un-recall도 가능하다. Scan 목록과 실제 차단 정책을 같은 통제로 판단하지 않는다.

Seccomp는 syscall을 LOG/KILL/ERRNO 등으로 처리할 수 있지만 이 일반 설명이 차단목록의 운영 모드를 선택할 수 있다는 뜻은 아니다. 공식 blocked 목록의 syscall 사용은 process 종료와 incident response 통지를 유발한다고 명시한다. Mount/namespace, module/BPF, keyring, NUMA와 perf, clock, session/system 관리 등 runtime 가정이 이 제한과 맞는지 실제 image를 확인한다. 필요한 syscall이 있으면 지원 경로로 검토한다.

## RStudio license는 기존 설정을 갱신한다

RStudio Workbench는 Posit의 적합성 확인과 Palantir allowlist 후 활성화된다. Renewal/upgrade 때 기존 license를 update하면 검증된 이전 license가 다음 검증까지 유지된다. 새 항목 생성이 무중단 갱신을 대신하지 않는다. Seat가 차면 새 사용자가 시작할 수 없고 offboarding seat 회수는 지원 요청이 필요하다. License 사용 group도 제한할 수 있다.

Builder managed profile은 최근 5 build의 usage로 선택한 profile보다 작게 조정하며 원래 선택보다 크게 확장하지 않는다. 2026년 4월 native acceleration은 제외했다. 과거 작은 데이터에 맞춰 줄인 profile은 급격한 workload 증가에서 실패할 수 있으므로 autoscale-up이나 OOM 방지 보장으로 사용하지 않는다.

Spark standard batch Builder의 large/extra-large는 2026년 8월 project import가 필요해졌다. Project Editor/Owner와 Resource Management Administrator를 모두 요구하며 기존 사용 profile은 보존하고 small/medium은 자동 import했다. Streaming/Faster는 이 정책의 대상이 아니었다. 기존 project도 적용 대상이라는 사실과 기존 pipeline의 무변경 지속 조건을 나눠 본다.

Faster custom profile은 CPU/memory를 독립 지정하고 DataFusion partition/metadata concurrency/output file layout을 별도로 튜닝한다. 당시 최대 32CPU, soft max rows는 근사 output 크기였으며 unset engine parameter는 DataFusion default를 유지했다. Resource 증량과 query concurrency/output layout을 같은 설정으로 취급하지 않는다.

## 출처

- [Palantir, Configure Code Workbook profiles](https://www.palantir.com/docs/foundry/administration/configure-code-workbook-profiles)
- [Palantir, Configure Code Workspaces compute profiles](https://www.palantir.com/docs/foundry/administration/configure-code-workspaces-profiles)
- [Palantir, Container governance](https://www.palantir.com/docs/foundry/administration/container-governance)
- [Palantir, Container restrictions](https://www.palantir.com/docs/foundry/administration/container-restrictions)
- [Palantir, Configure RStudio license](https://www.palantir.com/docs/foundry/administration/configure-rstudio-license)
- [Palantir, October 2025 announcements](https://www.palantir.com/docs/foundry/announcements/2025-10)
- [Palantir, April 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-04)
- [Palantir, August 2026 announcements](https://www.palantir.com/docs/foundry/announcements/2026-08)

## 관련 문서

- [[Palantir-Security-and-Governance|공유 책임]]
- [[Palantir-Network-Egress-and-Private-Connectivity|환경의 외부 통신]]
- [[Palantir-Data-Pipeline-Operations|Build와 운영 확인]]
