---
tags: [ai, agent, acp, protocol, editor]
status: done
verified_at: 2026-10-06
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

## 적용 확인

- 상대가 광고한 capability와 실제 지원 메서드가 일치하는가
- 알림, 도구 상태와 최종 응답을 구분하는가
- 취소된 승인 요청이 나중에 허용으로 처리되지 않는가
- 실행 권한과 격리를 클라이언트/에이전트 구현에서 별도로 확인했는가

## 출처

- [Agent Client Protocol, Protocol v1 Overview](https://agentclientprotocol.com/protocol/v1/overview)
- [Agent Client Protocol, Tool Calls](https://agentclientprotocol.com/protocol/v1/tool-calls)

## 관련 문서

- [[MCP|MCP와 도구 연결]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
- [[tools|AI 엔지니어링 실천 도구]]
