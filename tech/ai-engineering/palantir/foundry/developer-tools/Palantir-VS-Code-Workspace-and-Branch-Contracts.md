---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["VS Code workspace와 전역 브랜치"]
---

# VS Code workspace와 전역 브랜치

## 환경 선택과 지원 범위

Code Repositories는 코드 관리와 리뷰/CI, VS Code workspace는 플랫폼에서 실행하는 개발 환경, local extension은 사용자 컴퓨터의 통합 기능이다. Java transform과 SQL 통합 같은 기능을 모든 환경에 동일하게 적용할 수 없다. Workspace의 public extension과 local의 조직 허용 third-party extension 지원도 다르다.

현재 비교 문서는 workspace 표시 결과를 최대 1,000행으로 설명하고 local security 문서는 결과 cache를 최대 10,000행으로 설명한다. 표시와 저장 및 환경 범위를 구분하며 한 값으로 통합하지 않는다. Workspace의 데이터 보호 설명을 모든 브라우저 표시와 반출 가능성이 사라진다는 절대 보장으로 바꾸지 않는다.

Continue는 enrollment AIP 활성화에 의존하며 제공 모델 사용은 AIP compute 비용을 발생시킨다. Preconfigured agent/MCP는 사용자의 workspace session과 credential의 작업/리소스 범위 안에서 실행하고 독립적으로 권한을 확장하지 않는다. 사용 가능하다는 설명을 모든 고객에게 현재 활성화되었다는 증거로 삼지 않는다.

## Git branch와 global branch

Global branch는 여러 Foundry 리소스의 변경을 묶으며 repository 기본 branch를 기반으로 한다. 일반 Code Repositories branch와 구분한다. Python transform, TS v1/v2와 Python function, 사전 설정된 OSDK React repository가 지원 대상으로 명시된다.

Workspace taskbar와 editor/terminal branch가 동기화되며 local에서는 taskbar 대신 extension selector를 쓴다. Repository가 아직 branch에 없으면 추가를 요구하고 미커밋 변경이 있으면 checkout 전에 해결하도록 한다.

Transform preview/build와 function live/published preview/resource import는 checkout한 branch의 문맥을 사용한다. Branch에서 function을 tag하면 그 branch의 version을 발행한다. OSDK repository는 기본 branch에서 전역 분기 전제 설정을 마친 뒤 추가하고 SDK 생성과 의존성 동기화를 수행한다.

Stopped workspace의 code viewer는 커밋된 코드를 보여 주며 세션이 뒤에서 시작한다. 코드가 보인다는 사실은 runtime 준비 완료와 다르다. Blank screen의 cache reload 안내도 workspace 서비스 오류 전체의 원인을 입증하지 않는다. 실제 workspace 시작과 branch 동기화는 시험하지 않았다.

## 출처

- [Palantir vs-code, vs-code](https://www.palantir.com/docs/foundry/vs-code)
- [Palantir vs-code, ai-development-tools](https://www.palantir.com/docs/foundry/vs-code/ai-development-tools)
- [Palantir vs-code, benefits](https://www.palantir.com/docs/foundry/vs-code/benefits)
- [Palantir vs-code, global-branching](https://www.palantir.com/docs/foundry/vs-code/global-branching)
- [Palantir vs-code, local-vs-workspace-guide](https://www.palantir.com/docs/foundry/vs-code/local-vs-workspace-guide)
- [Palantir vs-code, overview](https://www.palantir.com/docs/foundry/vs-code/overview)
- [Palantir vs-code, troubleshooting](https://www.palantir.com/docs/foundry/vs-code/troubleshooting)

## 관련 문서

- [[Palantir-Developer-Tools]]
