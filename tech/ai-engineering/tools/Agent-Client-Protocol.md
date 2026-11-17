---
tags: [ai, agent, acp, protocol, editor]
status: done
verified_at: 2026-11-17
category: "AI엔지니어링(AIEngineering)"
aliases: ["Agent Client Protocol", "ACP", "에이전트 클라이언트 프로토콜"]
---

# Agent Client Protocol

ACP는 에디터 같은 클라이언트와 코딩 에이전트 사이의 대화를 표준화하는 프로토콜이다. 클라이언트는 사용자 화면과 자원 접근을 관리하고, 에이전트는 요청을 처리하며 진행 상태와 도구 작업을 알린다. 에디터마다 에이전트별 전용 연동을 만드는 부담을 줄이는 데 목적이 있다.

[[MCP]]가 다루는 도구와 데이터 연결과는 연결 대상이 다르다. ACP를 구현했다고 모든 에이전트가 같은 도구, 모델이나 실행 권한을 제공하는 것은 아니다.

## 요청과 알림의 흐름

ACP v1은 JSON-RPC 2.0의 요청/응답과 응답을 요구하지 않는 알림을 사용한다.

| 단계 | 메시지 | 역할 |
|---|---|---|
| 초기화 | `initialize` | 프로토콜 버전과 capability 협상 |
| 인증 | `authenticate` | 에이전트가 요구하는 경우 인증 |
| 세션 | `session/new` | 새 대화 생성 |
| 입력 | `session/prompt` | 사용자 메시지 전달 |
| 진행 | `session/update` | 메시지 조각, 도구 상태 등을 알림 |
| 승인 | `session/request_permission` | 에이전트가 클라이언트에 도구 실행 권한 요청 |
| 중단 | `session/cancel` | 처리 취소 알림 |
| 턴 종료 | `session/prompt` 응답 | 종료 이유와 함께 턴 완료 |

`session/load`는 `loadSession` capability가 있을 때 사용한다. 파일 읽기/쓰기와 터미널 기능도 협상한 capability를 확인해야 한다. 진행 알림 수신과 최종 턴 완료를 같은 사건으로 취급하지 않는다.

## 승인과 실행의 경계

에이전트는 도구 호출 정보와 선택지를 담아 승인을 요청하고, 클라이언트는 선택한 `optionId` 또는 `cancelled`를 응답한다. 클라이언트가 사용자 설정에 따라 자동 허용하거나 거절할 수도 있다. 진행 중인 턴이 취소됐다면 대기 중인 승인 요청에는 `cancelled`를 반환해야 한다.

운영 설계에서는 승인 UI와 OS 수준의 격리를 별도로 점검한다. 프로토콜에 승인 메시지가 있다는 사실만으로 에이전트 프로세스의 직접 파일 접근이나 네트워크 접근이 차단됐다고 판단하지 않는다.

## 애플리케이션에서 에이전트 런타임 교체

ACP 클라이언트가 에디터만 있는 것은 아니다. 서버 애플리케이션이 ACP 클라이언트가 되어 Goose, Codex, OpenCode 같은 에이전트 런타임에 작업을 맡길 수 있다. 에이전트 루프, 컨텍스트 관리와 도구 선택은 런타임에 두고, 애플리케이션은 지침 파일, 제공할 MCP 서버, skill과 권한 정책 같은 업무 구성에 집중하는 구조다.

ACP가 표준화하는 것은 wire protocol이다. 런타임마다 설정 방식은 여전히 다르므로 런타임을 바꾸려면 설정을 옮기는 계층이 따로 필요하다. Spring AI ACP Harness Client(Spring AI Community 프로젝트)가 이런 계층의 예다. 아래 설정 키는 0.7.0(2026-11-07 릴리스) 기준이며, 0.6.0 이전에는 접두사가 `spring.acp.*`였고 옛 키는 경고 없이 무시된다. 설정은 세 층으로 나뉜다.

| 층 | 예 | 의미 |
|---|---|---|
| 이식 가능 | `workspace`, `mcp-servers`, `skills`, `permissions`, `timeout` | 프로젝트 설명 기준, 지원 어댑터에서 같은 뜻으로 옮긴다 |
| 협상 | `model`, `mode`, `provider.id` | 런타임에 요청할 뿐 보장되지 않는다 |
| 런타임 전용 | `runtimes.<id>.*` | 해당 런타임에서만 의미가 있다 |

대상 런타임의 starter(어댑터)가 classpath에 있으면 `spring.ai.acp.harness.runtime` 값만 바꿔 런타임을 교체한다. 없는 런타임은 의존성부터 바꿔야 하고, 어댑터가 여럿이거나 registry starter만 쓰면 이 값을 반드시 지정해야 한다. `model`은 할당이 아니라 요청이다. 런타임이 지원하지 않을 때의 처리(`on-unsupported`)는 fail, warn, ignore 중 기본값이 warn이라, 로그만 남기고 에이전트의 기본 모델로 계속 진행한다. 운영에서는 fail을 검토하고 세션 configuration으로 실제 적용값을 확인한다. 런타임을 바꿔도 동작이 같다고 가정하지 말고, 모델, 권한 정책과 도구 호출 결과를 런타임별로 다시 확인한다.

`mcp-servers`에 선언한 서버는 세션에 제공될 뿐이고, 실제 호출 허용은 권한 정책(기본 deny)이 따로 정한다. 한 에이전트에 제공하는 MCP 서버와 skill을 좁히면 목적이 분명해지고 문제를 진단하기 쉽다는 것이 이 프로젝트 발표자의 설명이다. MCP 서버에 최종 사용자의 OAuth로 접속하고 서버가 그 사용자의 권한을 검사하면, 그 MCP 서버를 거치는 도구 호출은 사용자 권한 범위로 제한된다. 런타임 내장 도구(파일 편집, 셸)는 이 범위 밖이며, 에이전트 프로세스 자체의 파일 접근은 OS 수준에서 제한해야 한다. Git skill은 ref 없이 참조하면 기본 branch를 쓰므로 다음 기동 때 설치되는 내용이 바뀔 수 있다. 운영에서는 ref를 전체 commit으로 고정한다.

## 적용 확인

- 상대가 광고한 capability와 실제 지원 메서드가 일치하는가
- 런타임을 교체할 때 협상 설정(model 등)이 실제로 적용됐는지 확인하는가
- 알림, 도구 상태와 최종 응답을 구분하는가
- 취소된 승인 요청이 나중에 허용으로 처리되지 않는가
- 실행 권한과 격리를 클라이언트/에이전트 구현에서 별도로 확인했는가

## 출처

- [Agent Client Protocol, Protocol v1 Overview](https://agentclientprotocol.com/protocol/v1/overview)
- [Agent Client Protocol, Tool Calls](https://agentclientprotocol.com/protocol/v1/tool-calls)
- [spring-ai-acp-harness-client — Spring AI Community (GitHub)](https://github.com/spring-ai-community/spring-ai-acp-harness-client)
- [Spring AI ACP Harness Client, Harness Runtimes](https://spring-ai-community.github.io/spring-ai-acp-harness-client/latest/runtimes/)
- [Spring AI ACP Harness Client, Models](https://spring-ai-community.github.io/spring-ai-acp-harness-client/latest/configuration/models/)
- [Spring AI ACP Harness Client, Permissions](https://spring-ai-community.github.io/spring-ai-acp-harness-client/latest/configuration/permissions/)
- [Spring AI ACP Harness Client, MCP Servers](https://spring-ai-community.github.io/spring-ai-acp-harness-client/latest/configuration/mcp-servers/)
- [Spring AI ACP Harness Client, Skills](https://spring-ai-community.github.io/spring-ai-acp-harness-client/latest/configuration/skills/)
- [Spring AI ACP Harness Client, Changes](https://spring-ai-community.github.io/spring-ai-acp-harness-client/latest/changes/)
- [Spring Office Hours S5E29, Spring AI ACP Harness Client — SpringDeveloper (YouTube)](https://www.youtube.com/watch?v=VJm515IAZlA)

## 관련 문서

- [[MCP|MCP와 도구 연결]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[tools|AI 엔지니어링 실천 도구]]
