---
tags: [palantir, workbook, conda, session]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Code Workbook environment와 session"]
---

# Workbook environment와 session

Environment는 Conda package와 Spark 설정이다. Interactive module은 사용자별로 분리되지만 같은 user/Project/environment의 여러 workbook이 공유한다. Python은 같은 module에서 최대 5개 job, R은 하나가 실행되는 범위다. 다른 workbook의 job 때문에 대기할 수 있다.

Batch build는 environment별 module을 따로 사용하고 interactive와 공유하지 않는다. Long-running/정기 저장 output은 batch schedule로 실행해 interactive를 점유하지 않게 한다. Builds의 module RID와 `isInteractive`로 실제 mode를 확인한다.

## Profile과 backing repository의 공유 경계

Profile Viewer는 Project로 import할 수 있고 import 후에는 그 Project의 Workbook 사용자가 이용할 수 있다. 사용자는 package를 customize하되 Spark 설정은 profile 관리자 경로를 따른다. Control Panel profile 변경은 모든 consumer, Workbook customize는 해당 workbook 범위다.

Artifacts profile은 모든 backing repository의 Project import가 필요하다. Customized profile은 profile 목록 대신 Workbook의 backing repository 목록을 사용하며 모든 사용자/branch가 같은 목록을 더하고 사용한다. Branch 하나에서 추가한 repository 때문에 다른 branch environment도 import를 요구할 수 있다.

2026년 10월 languages 가이드는 Python 3.10/3.12, R 3.6/4.0/4.1/4.2를 명시한다. R은 enrollment enable과 `vector-spark-module-r`, Python은 `vector-spark-module-py`가 필요하다. SQL은 추가 package가 없다. 옛 예제의 Python 3.6 pin을 현재 유효한 설정으로 복사하지 않는다.

## Solve, install과 cache를 나눠 조사한다

Mamba solve는 channel repodata, transitive dependency 후보 축소와 SAT 제약 해결을 수행한다. Install은 artifact 다운로드/해제/검증/link다. Package 수와 dependency/버전 선택지가 초기화를 늘리며 작은 특화 environment가 유리하다. Version pin은 검색을 줄이지만 과도하면 unsatisfiable이 된다.

성공 solve의 spec file과 Kubernetes Conda Docker image는 기본 24시간 cache로 안내한다. Custom/새 환경은 최적화가 덜 적용된다. Prewarm 부족도 wait를 늘릴 수 있다. Pre/post-link script 문제가 있으면 Conda Docker를 profile+Workbook branch 단위로 끌 수 있다. 캐시 시간은 재현 가능한 장기 lock을 의미하지 않는다.

Exit 1은 missing package/dependency, version conflict, recalled package 또는 권한을 구분한다. Exit 137은 초기화 memory 부족 후보이며 package 최소화/적절한 pin과 log로 확인한다. Conda package와 JVM JAR가 함께 필요한 graphframes류는 profile Advanced JAR도 확인한다. Retryer error와 Pandas OOM은 Spark→driver collect 규모를 먼저 본다.

## Requested와 resolved는 다르다

같은 requested constraint도 시점에 따라 다른 package로 resolve된다. Resolved Dependencies에서 direct/transitive version을 본다. Session history의 compute/profile/JAR/resources, requested packages/channels와 resolved version을 나눠 비교한다. 같은 요청에서 장애가 시작되면 resolved drift나 외부 repository 변화를 확인한다.

Session pin은 성공한 Artifacts-profile session의 resolved 설정으로 새 module을 시작하는 interactive-only 임시 복구다. 최대 24시간이며 scheduled build에는 적용되지 않는다. Re-pin도 새 module이므로 local state를 잃는다. Initialization mode 등 모든 metadata가 복제되는 것은 아니며 incompatible/blacklisted version은 pin을 막을 수 있다.

Pin으로 잠시 풀렸다면 원인을 찾고 profile/package 정의를 수정한다. 장기 production 환경 고정이나 오래된 package의 보안 지원을 보장하는 기능으로 쓰지 않는다. 평균 초기화 시간과 inactivity timeout 예시는 실제 profile/환경에서 확인한다.

## 출처

- [Palantir, Environments](https://www.palantir.com/docs/foundry/code-workbook/environment-overview)
- [Palantir, Workbook profiles](https://www.palantir.com/docs/foundry/code-workbook/environment-profiles)
- [Palantir, Environment creation](https://www.palantir.com/docs/foundry/code-workbook/environment-creation-overview)
- [Palantir, Environment troubleshooting](https://www.palantir.com/docs/foundry/code-workbook/environment-troubleshooting)
- [Palantir, Resolved environment](https://www.palantir.com/docs/foundry/code-workbook/environment-view-resolved)
- [Palantir, Session history and pinning](https://www.palantir.com/docs/foundry/code-workbook/session-history-pinning)
- [Palantir, Batch and interactive builds](https://www.palantir.com/docs/foundry/code-workbook/environment-batch-interactive)
- [Palantir, Languages](https://www.palantir.com/docs/foundry/code-workbook/workbooks-languages)
- [Palantir, Workbook FAQ](https://www.palantir.com/docs/foundry/code-workbook/faq)

## 관련 문서

- [[Palantir-Artifacts-and-Package-Lifecycle|Package 수명과 license]]
- [[Palantir-Workbook-Execution-and-Persistence|실행과 저장]]
