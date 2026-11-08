---
tags: [palantir, preview, runtime, spark, compute]
status: done
verified_at: 2026-11-09
category: "AI엔지니어링(AIEngineering)"
aliases: ["Code Repositories preview와 runtime 관리"]
---

# Repository preview와 runtime

Preview는 sample을 실행하며 commit/check/materialization을 수행하지 않는다. Build는 선택한 source file의 모든 output을 생성하며 output이 없는 file에서는 build가 시작되지 않는다. UI save 상태, code commit, CI publication과 실제 dataset build를 각각 확인한다.

## Sample과 실제 output을 구분한다

File preview는 사용할 sample file을 선택하고 이후 재사용한다. Foundry-trained/file-backed model asset preview는 가능하지만 container/external-hosted model은 미지원인 범위다. General guide의 모든 model preview 가능 표현보다 이 세부 조건을 따른다. Generated transform은 `__name__`을 의미 있게 설정해 올바른 대상을 선택한다.

Python debugger는 breakpoint line 실행 전에 멈춘다. Console은 선택 frame의 local/global variable을 보며 다른 frame local은 NameError가 될 수 있다. 내부 library breakpoint는 console 제약이 있고 해당 debugging을 별도 enable한다. Dataframe preview는 여전히 sample이므로 실제 build 결과 검증을 대체하지 않는다.

AIP explain/find-bugs/translate, context attachment와 error enhancer는 보조 도구다. Inline assistance는 beta, autocomplete는 해당 guide에서 Python 전용이며 고객별 가용성이 다르다. 제안 수락이나 explanation을 CI/data 검증으로 읽지 않는다.

Local VS Code 개발과 secure streaming preview는 org setting과 input Download 권한을 모두 요구한다. Preview stream이 memory로 들어가는 것과 Download operation이 허용하는 전체 dataset 반출 권한을 구분한다. External MCP는 token 사용자 권한으로 외부 AI가 data/metadata를 읽으며 이후 사용 governance와 model provider는 그 외부 시스템을 따른다.

## Template와 runtime 변경은 실제 build로 확인한다

Transform wizard는 lightweight/Spark template, input/output 이름과 Project 제약을 검증하고 필요한 dependency를 설정한다. 천만 행 기준은 권장 예시이며 query/schema에 따른 engine 선택을 대신하지 않는다. CI가 commit 시 input/output 집합을 정의하므로 job 시작마다 동적으로 선택하는 계약이 아니다.

Custom Gradle task는 language subproject의 build.gradle에서 check/test/publish 의존성이나 finalizedBy로 연결한다. Internal task를 의존하거나 upgrade가 덮어쓸 ci.yml에 넣지 않는다. Unit test helper 실행과 required CI check 여부도 구분한다.

Upgrade PR은 dedicated branch에서 default로 들어간다. 자동 merge는 required checks, 최신 affected build와 새 Spark runtime 실행 조건 등을 만족해야 한다. Upgrade branch의 사용자 변경, template file overwrite, 너무 옛 template 등은 수동 개입을 요구한다. Repository를 다른 Project로 옮기면 checks/build 전에 수동 upgrade로 reference를 갱신해야 한다.

Spark module pin은 branch/all-branch별 최대 90일의 임시 override다. Expiry 뒤 build가 실패할 수 있어 외부 운영 일정도 관리한다. CI는 pin version이 template 최소보다 높을 때 그 library를 쓰며 in-platform pin은 cdconfig보다 우선한다. Pin restore나 신규 feature 안내를 무기한 유지 보장으로 읽지 않는다.

## Custom CI job은 관리 영역 밖에서 덧붙인다

Shell 명령을 checks에 더하려면 repository root의 `ci.additions.yml`에 custom CI job을 정의한다. 2026-11-09 대조 기준 beta이며, Foundry가 관리하는 `ci.yml`과 달리 repository upgrade가 이 파일을 덮어쓰지 않는다. 최상위 key는 `env`, `jobs`, `sources`만 허용하고 다른 key가 있으면 checks가 실패한다. `ci.yml`에 이미 있는 env/job 이름을 재정의하거나 job에 `order`를 지정해도 실패하므로 관리되는 설정을 바꾸는 통로가 아니라 추가 전용 통로다.

다음 예시는 API name이 `MySource`이고 `password` secret을 가진 source를 미리 준비해 repository에 import했다고 가정한다.

```yaml
env:
  GREETING: Hello from a custom CI job
sources:
  - MySource
jobs:
  print-greeting:
    timeout: 5 minutes
    steps:
      - echo "$GREETING"
      - test -n "$MySource_password"
```

Job의 각 step은 repository root에서 별도 bash process로 실행되어 앞 step에서 export한 변수가 다음 step에 남지 않는다. 0이 아닌 exit code에서 job이 실패하고 남은 step은 실행하지 않는다. `timeout`을 생략하면 job 단위 제한은 없지만 모든 job이 공유하는 CI run 전체 timeout(platform 설정, 기본 60분)은 여전히 적용된다. 최상위 `env`는 기본 job을 포함한 모든 job에, job의 `env`는 그 job에만 적용되며 이름이 겹치면 job 값이 우선한다. Custom job은 `ci.yml` job이 모두 끝난 뒤 파일에 적힌 순서로 실행되고, `order`가 있는 `ci.yml` job 하나가 실패하면 실행되지 않는다. Checks 탭에서는 job별 상태와 log를 따로 본다.

`sources`에 선언한 Data Connection source는 그 egress policy를 custom job만이 아니라 기본 job 전체에 적용한다. Source secret은 `<source API name>_<secret name>` 환경 변수로 주어지며 같은 이름의 `env`보다 우선한다. 두 source가 같은 변수 이름을 만들면 한 값만 남으므로 조합이 겹치지 않게 이름을 정한다. Secret 존재는 `test -n`처럼 값을 출력하지 않는 방식으로 확인한다.

Source를 쓰려면 code import 허용과 API name, repository import(source의 `Editor` 권한 필요), `ci.additions.yml` 선언이 모두 필요하다. Import만 하고 선언하지 않은 source는 job이 쓰지 못한다. 또한 source에 marking 검증 없는 export를 켜야 하는데 checks는 repository data의 marking을 검증하지 않으므로, job이 marking이 붙은 data를 외부로 보낼 수 있다. 이 설정은 CI 편의가 아니라 반출 권한 결정으로 검토한다.

공식 문서가 나열한 실행 환경 도구는 bash와 grep/sed/find/tar 등 기본 유틸리티, git, python3 표준 라이브러리, `$JAVA_HOME`의 JDK다. curl과 ssh는 없으므로 HTTP 호출은 Python `urllib.request` 등으로 작성한다. Marketplace product에 포함한 repository의 custom job은 설치 뒤 실행이 보장되지 않고 checks를 실패시킬 수 있다.

## Compute는 wall time과 allocation을 함께 본다

해당 compute guide는 code 작성 자체와 dataset build 사용량을 구분한다. Build는 read/실행/I/O wait/write 전체 allocation 시간으로 계산한다. Driver와 각 executor에 `max(vCPU, GiB/7.5) * duration`을 합하며 dynamic executor는 구간별 적분한다. GPU는 driver와 executor마다 GPU 수, model별 rate와 기간을 곱해 더한다.

2026-11-08 대조한 default rate는 vCPU 1, T4 1.2, V100 3, A100 1.3, A10G 1.5, L4 2.1, H100/H200 4.7, RTX PRO 6000 3.5, B200 5.7, B300 7.1이다. 배율은 GPU마다 따로 정해져 있으므로(V100 3, A100 1.3, B300 7.1) 이름이나 출시 순서로 짐작하지 않고 GPU 종류를 바꿀 때마다 표를 다시 확인한다. Enterprise 계약은 다를 수 있고 rate는 금액이 아니다. Multi-output compute는 행 수와 무관하게 output 사이 균등 배분된다. 작은 결과 dataset에 큰 사용량이 표시되는 이유를 output size만으로 추정하지 않는다.

Spark profile은 먼저 Project에 import해야 checks가 통과한다. Restricted profile은 Resource Management administrator 등 권한자가 import한다. 한 repository에서 import한 profile은 Project reference로 다른 repository에도 enabled가 된다. Partition 128MB 같은 지침은 schema/content와 skew를 측정해 조정한다.

## Export용 단일 파일은 병목을 만든다

직접 UI export가 불가능할 때만 고급 transform 경로로 필요한 row/column을 최소화하고 type/timestamp 표현을 정해 CSV를 생성한다. Repartition(1)은 단일 출력 파일에 유리하지만 하나의 executor에 처리 부담이 모인다. Filter와 같은 transform의 coalesce(1)은 upstream parallelism까지 줄일 수 있다.

128MB 미만은 guide의 성능 권장값이며 보편적 hard limit이 아니다. Sampling은 목표 row 수를 정확히 보장하지 않고 0행 분모도 처리한다. 더 큰 자료는 여러 partition/file 또는 적절한 profile을 검토한다. Export 권한과 목적은 partition 변경으로 우회하지 않는다.

## 출처

- [Palantir, Preview transforms](https://www.palantir.com/docs/foundry/code-repositories/preview-transforms)
- [Palantir, Debug transforms](https://www.palantir.com/docs/foundry/code-repositories/debug-transforms)
- [Palantir, Create transforms](https://www.palantir.com/docs/foundry/code-repositories/create-transforms)
- [Palantir, AIP features](https://www.palantir.com/docs/foundry/code-repositories/aip-features)
- [Palantir, Control Panel repository settings](https://www.palantir.com/docs/foundry/code-repositories/configure-repositories-in-control-panel)
- [Palantir, Custom CI](https://www.palantir.com/docs/foundry/code-repositories/custom-ci)
- [Palantir, Unit tests](https://www.palantir.com/docs/foundry/code-repositories/unit-tests)
- [Palantir, Repository upgrades](https://www.palantir.com/docs/foundry/code-repositories/repository-upgrades)
- [Palantir, Module pinning](https://www.palantir.com/docs/foundry/code-repositories/module-pinning)
- [Palantir, Compute usage](https://www.palantir.com/docs/foundry/code-repositories/compute-usage)
- [Palantir, Spark profiles](https://www.palantir.com/docs/foundry/code-repositories/spark-profiles)
- [Palantir, Prepare datasets for download](https://www.palantir.com/docs/foundry/code-repositories/prepare-datasets-download)

## 관련 문서

- [[Palantir-Pipeline-Engine-and-Authoring|Engine과 실제 결과]]
- [[Palantir-Repository-Review-and-Scope|Review 경계]]
