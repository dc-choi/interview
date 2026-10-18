---
tags: [palantir, workspace, maestro, applications, environment]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Workspace application publish와 Maestro"]
---

# Workspace application과 managed environment

Interactive notebook에서 설치한 package/변수가 published app, transform이나 model에서 자동 재현된다고 가정하지 않는다. Legacy script-top install과 managed environment를 구분하고 실제 publish mode를 확인한다.

## Maestro는 요청과 resolve를 추적한다

Managed Conda/PyPI는 `.envs/maestro/meta.yaml`에 requested libraries, `hawk.lock`에 resolved version/channel을 기록한다. Deprecated conda.lock이나 직접 pip/mamba 설치 대신 Maestro 경로를 사용한다. 실행 환경은 `/home/user/envs/default`에 설치하며 workspace/app/transform/model 시작 전에 복원한다.

Libraries panel 설치는 notebook code가 아니라 terminal/console에서 실행되며 manifest/lock을 갱신한다. Branch checkout/pull 뒤 `maestro env install`로 실제 environment를 맞춘다. Conflict는 manifest를 해결하고 lock을 재생성한다. 수동 lock 편집을 routine 관리로 삼지 않는다. Upgrade는 기존 env/lock 재생성으로 새 version을 resolve하므로 재현과 upgrade를 같은 작업으로 보지 않는다.

R의 CRAN managed mode는 별도 experimental toggle일 수 있다. Conda R package는 `r-`/`bioconductor-` 이름, CRAN은 일반 package/Bioconductor 원래 대소문자를 사용한다. CRAN version 지정은 `name@version`, Conda/PyPI는 해당 CLI 형식을 따른다. RStudio operational license도 admin 설정이 선행돼야 한다.

## App publication과 preview

Dash는 dotted module과 server variable, Streamlit은 repo-relative Python file, Shiny는 repo-relative directory/app.R를 지정한다. `/home/user` 기본 위치의 Shiny를 `/home/user/repo` 밖에 두면 sync/publish되지 않을 수 있다. 세 app 모두 해당 guide는 startup 30초 제한을 명시한다. 무거운 초기 데이터 로딩을 app ready 전 동기 처리할지 검토한다.

Publish and sync 후 CI 완료와 실제 published app startup을 확인한다. Feature branch publish는 그 branch version이며 master merge로 production branch를 바꾼다. Jupyter Applications panel은 선택한 type만 보여주고 TensorBoard는 preview-only다.

Managed 환경의 Dash/Streamlit publish에는 app library가 Conda로 설치돼야 하며 PyPI 설치만으로 publish 조건을 충족하지 않는다. UI Open preview는 terminal에서 실제 app process를 먼저 실행한 뒤 사용한다. Shiny network reconnect는 `session$allowReconnect("force")`로 이전 UI input 재전달을 구성할 수 있지만 backend side effect의 재실행 안전성도 검토한다.

## Transform과 report의 재현

Jupyter/R script는 Data panel에서 output/inputs/script/resource를 검토하고 Sync and run으로 CI/JobSpec을 등록한다. Backing repository 자체는 workspace 기반 구조라 그 안에서 직접 transform publish하는 경로와 다르다. Published notebook/R transform은 interactive source/network가 있어도 외부 API를 지원하지 않는다.

Unmanaged 환경은 script에 runtime install을 명시해야 할 수 있다. Managed 환경은 추적한 manifest/lock을 복원한다. 오래된 inline mamba/renv 예시를 managed 문서와 구분한다. Build output이 sandbox가 아닌 정한 branch에 생성됐는지도 확인한다.

R Markdown/Quarto report는 HTML을 담은 dataset이며 transform/schedule로 만든다. 자동 추론한 dataset input과 실제 읽는 자료를 맞춘다. Latest link는 갱신되며 historical version selector의 link는 특정 과거 결과를 공유한다. Report 생성 resource와 render build 완료는 별도다.

## 장애와 AI 지원

AIP agent는 code 작성/실행, package 설치와 terminal tool을 제공하므로 필요한 tool만 enable한다. Experimental이고 model별 동작이 다르며 workspace restart/shutdown 뒤 chat history는 남지 않는다. Code/model output을 sync/publish해 보존한다.

PySpark local은 PySpark<4에 OpenJDK8/11/17, 4 이상에17/21을 해당 FAQ가 제시한다. CPU/memory를 container에 맞춰 설정하며 예시8CPU/64GB를 enrollment hard cap으로 고정하지 않는다. Package shared-library/wheel 오류는 system dependency/Conda package를 조사한다.

큰 data를 code Git에 넣어 sync가 실패하면 dataset으로 옮기고 ignore를 설정한다. 공식 troubleshooting의 filter-repo/force push는 history를 바꾸는 복구 예시이므로 동료 branch/원본/복구 계획 없이 일반 처방으로 실행하지 않는다. Notebook output clear도 chart 포함 모든 cell output을 지운다. Editor/browser 문제, policy 문제와 data access 철회를 분리해 진단한다.

## 출처

- [Palantir, JupyterLab](https://www.palantir.com/docs/foundry/code-workspaces/jupyterlab)
- [Palantir, RStudio Workbench](https://www.palantir.com/docs/foundry/code-workspaces/rstudio)
- [Palantir, Getting started](https://www.palantir.com/docs/foundry/code-workspaces/getting-started)
- [Palantir, Workspace FAQ](https://www.palantir.com/docs/foundry/code-workspaces/code-workspaces-faq)
- [Palantir, Troubleshooting](https://www.palantir.com/docs/foundry/code-workspaces/troubleshooting)

## 관련 문서

- [[Palantir-Workspace-Sessions-and-Checkpoints|Sync와 checkpoint]]
- [[Palantir-Workspace-Data-and-Model-Integration|Dataset/model output]]
