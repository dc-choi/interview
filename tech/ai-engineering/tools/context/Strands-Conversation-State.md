---
tags: [ai, strands, context, session, concurrency]
status: done
verified_at: 2026-10-07
category: "AI엔지니어링(AIEngineering)"
aliases: ["Strands Conversation State", "Strands 대화와 세션 상태"]
---

# Strands의 대화 문맥과 세션 상태

에이전트가 지금 모델에 전달할 메시지를 고르는 일과, 프로세스가 끝난 뒤 대화를 복원하는 일은 다르다. Strands의 conversation manager는 문맥 크기를 관리하고, session manager는 메시지와 상태를 저장한다. 하나를 설정했다고 다른 책임까지 해결되지는 않는다.

## 메시지 개수는 토큰 예산이 아니다

`SlidingWindowConversationManager`는 최근 메시지를 유지하고 오래된 메시지와 불완전한 도구 호출 시퀀스를 정리한다. 메시지 하나의 도구 결과가 크면 개수 제한 안에서도 모델의 문맥 한도를 넘을 수 있다.

현재 공식 문서의 도구 결과 축약은 텍스트의 앞뒤를 남기거나, 이미지와 큰 JSON 등을 대체 표기로 줄이는 방식이다. 원래 `status`와 `error` 필드는 보존한다. 축약된 결과를 원본 전체로 취급하지 않는다. `SummarizingConversationManager`는 오래된 대화를 요약하는 선택지지만, 요약도 원문의 모든 조건을 보존한다는 보장은 아니다.

## 영속 저장은 동시 쓰기 제어가 아니다

세션 저장은 대화당 하나의 활성 작성자를 전제로 한다. 같은 세션 ID와 agent ID를 사용하는 서로 다른 프로세스가 동시에 쓰면 턴을 덮어쓸 수 있다. 내장 session manager는 분산 잠금을 제공하지 않으며, 한 인스턴스의 중복 호출 방지는 다른 프로세스까지 막지 못한다.

운영 설계에서는 대화별 식별자를 분리하고 같은 대화의 요청을 직렬화하거나 외부 동시성 제어를 둔다. 저장 위치의 접근 권한과 보존 기간도 별도로 정한다.

## 적용 확인

다음은 문서의 동작 경계에서 도출한 점검 항목이다.

- 큰 도구 결과를 축약한 뒤에도 답변에 필요한 근거를 재조회할 수 있는가
- 초기 대화의 조건이 잘리거나 요약돼도 중요한 업무 제약은 별도로 유지되는가
- 같은 대화에 요청 두 개가 겹쳐도 메시지가 덮어써지지 않는가
- 프로세스를 다시 띄운 뒤 필요한 상태를 복원하며, 사용자 간 대화가 섞이지 않는가

SDK를 설치하거나 동작을 재현한 문서는 아니다. 사용 중인 SDK 버전의 축약과 저장 동작은 배포 전에 확인한다.

## 출처

- [Strands Agents, Conversation Management](https://strandsagents.com/docs/user-guide/sdk/agents/conversation-management/)
- [Strands Agents, Persist state across sessions](https://strandsagents.com/docs/user-guide/sdk/agents/session-management/)

## 관련 문서

- [[Context-Engineering|컨텍스트 엔지니어링]]
- [[Agent-Memory-Retain-Recall-Reflect|에이전트 기억의 저장, 검색과 추론]]
- [[Bedrock-AgentCore-Operations|Bedrock AgentCore 운영 경계]]
