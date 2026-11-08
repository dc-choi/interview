---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-11-08
category: "AI엔지니어링(AIEngineering)"
aliases: ["VS Code workspace와 전역 브랜치"]
---

# VS Code workspace와 전역 브랜치

## 환경 선택과 지원 범위

Code Repositories는 코드 관리와 리뷰/CI, VS Code workspace는 플랫폼에서 실행하는 개발 환경, local extension은 사용자 컴퓨터의 통합 기능이다. Java transform과 SQL 통합 같은 기능을 모든 환경에 동일하게 적용할 수 없다. Workspace의 public extension과 local의 조직 허용 third-party extension 지원도 다르다.

현재 비교 문서는 workspace 표시 결과를 최대 1,000행으로 설명하고 local security 문서는 결과 cache를 최대 10,000행으로 설명한다. 표시와 저장 및 환경 범위를 구분하며 한 값으로 통합하지 않는다. Workspace의 데이터 보호 설명을 모든 브라우저 표시와 반출 가능성이 사라진다는 절대 보장으로 바꾸지 않는다.

Continue는 enrollment AIP 활성화에 의존하며 제공 모델 사용은 AIP compute 비용을 발생시킨다. Preconfigured agent/MCP는 사용자의 workspace session과 credential의 작업/리소스 범위 안에서 실행하고 독립적으로 권한을 확장하지 않는다. 사용 가능하다는 설명을 모든 고객에게 현재 활성화되었다는 증거로 삼지 않는다.

AI 제안 수락과 preview 결과를 전체 build 검증으로 간주하지 않는다. 공식 코드 생성 GIF의 마지막 화면은 200행과 6개 열을 표시하지만, sample input으로 계산했을 수 있고 build 결과를 대표하지 않을 수 있다고 경고한다. 실제 입력 범위와 build 결과는 별도로 확인한다. (2026-10-18 [공식 Continue GIF](https://www.palantir.com/docs/resources/foundry/vs-code/continue-python-transforms-generation.gif)의 마지막 preview 화면 확인)

## Git branch와 global branch

Global branch는 여러 Foundry 리소스의 변경을 묶으며 repository 기본 branch를 기반으로 한다. 일반 Code Repositories branch와 구분한다. Python transform, TS v1/v2와 Python function, 사전 설정된 OSDK React repository가 지원 대상으로 명시된다.

Workspace taskbar와 editor/terminal branch가 동기화되며 local에서는 taskbar 대신 extension selector를 쓴다. Repository가 아직 branch에 없으면 추가를 요구하고 미커밋 변경이 있으면 checkout 전에 해결하도록 한다.

Transform preview/build와 function live/published preview/resource import는 checkout한 branch의 문맥을 사용한다. Branch에서 function을 tag하면 그 branch의 version을 발행한다. OSDK repository는 기본 branch에서 전역 분기 전제 설정을 마친 뒤 추가하고 SDK 생성과 의존성 동기화를 수행한다.

## Functions repository의 import와 발행

Functions에서 Foundry 자원을 쓰려면 먼저 repository로 import한다. Activity Bar의 Resource imports에서 Ontology SDK나 Platform 탭을 고른 뒤 Add로 object type, interface, action, query function 같은 자원 유형을 선택하고, code generation과 dependency 설치가 끝난 뒤 코드에서 참조한다. 최신 자원 유형이 보이지 않으면 repository upgrade 상태를 먼저 확인한다.

Data Connection source는 추가 전제가 있다. Source의 Connection settings에서 export를 켜고 code repository로 import하는 것을 허용해야 하며, 선택 dialog는 현재 repository에 사용이 허용된 source만 보여 준다. 목록에 없으면 dialog 하단의 External Systems 링크로 repository 설정에서 허용한 뒤 Reload Results로 다시 불러온다. 추가한 source는 Resource Imports 패널에서 alias를 정하고 코드는 그 alias로 참조한다.

Palantir 패널의 Branch 영역은 Code 탭(code repository의 Git branch)과 Global 탭(지원되는 여러 Foundry 앱과 자원의 관련 변경을 묶는 branch)을 나눈다. Global branch 지원은 functions 언어와 repository 구성에 따라 다르다. Function preview는 출력, log와 edit를 보여 주며, global branch에서 개발할 때는 패널에서 선택한 branch를 대상으로 실행한다.

Commit 뒤 code review가 필요하면 Propose changes를 쓰고, Tag version은 선택한 branch에서 version을 정해 function을 발행한다. Tag는 마지막에 고친 function만이 아니라 **repository의 모든 function을 발행한다.** 한 function만 바꿨다는 이유로 다른 function의 발행 영향을 검토에서 빼지 않는다. Upgrade는 생성된 변경을 검토하고 테스트와 function preview를 다시 돌린 뒤 commit한다.

Terminal에서 npm script는 `package.json`이 있는 `functions-typescript` 폴더에서 실행하며 TypeScript v1과 v2 repository가 같은 경로를 쓴다. Palantir MCP는 VS Code workspace에 기본 통합되어 TypeScript function repository에 context 도구를 제공하므로 Continue가 functions 코드, import한 Ontology 자원과 Foundry 문맥을 참조할 수 있다. Continue를 통한 이 참조는 위의 AIP 활성화 조건에 묶이고, MCP 도구는 사용자 session과 credential의 권한 경계 안에서 동작한다. Palantir MCP 자체의 AIP 의존 여부는 이 문서들이 명시하지 않는다.

## Workspace 상태 해석

Stopped workspace의 code viewer는 커밋된 코드를 보여 주며 세션이 뒤에서 시작한다. 코드가 보인다는 사실은 runtime 준비 완료와 다르다. Blank screen의 cache reload 안내도 workspace 서비스 오류 전체의 원인을 입증하지 않는다. 실제 workspace 시작과 branch 동기화는 시험하지 않았다.

## 출처

- [Palantir vs-code, vs-code](https://www.palantir.com/docs/foundry/vs-code)
- [Palantir vs-code, ai-development-tools](https://www.palantir.com/docs/foundry/vs-code/ai-development-tools)
- [Palantir vs-code, benefits](https://www.palantir.com/docs/foundry/vs-code/benefits)
- [Palantir vs-code, global-branching](https://www.palantir.com/docs/foundry/vs-code/global-branching)
- [Palantir vs-code, local-vs-workspace-guide](https://www.palantir.com/docs/foundry/vs-code/local-vs-workspace-guide)
- [Palantir vs-code, overview](https://www.palantir.com/docs/foundry/vs-code/overview)
- [Palantir vs-code, troubleshooting](https://www.palantir.com/docs/foundry/vs-code/troubleshooting)
- [Palantir functions, navigating-vscode](https://www.palantir.com/docs/foundry/functions/navigating-vscode)

## 관련 문서

- [[Palantir-Developer-Tools]]
- [[Palantir-Functions-Imports-and-Local-SDK|Ontology imports, 생성 SDK와 로컬 개발]]
- [[Palantir-Functions-Versioning-and-Branching|함수 version, Global branch와 API name]]

공식 본문을 대조한 지식이며 실제 Foundry 환경에서 실행 검증하지 않았다.
