---
tags: [senior, ai, mcp, tool-use, protocol]
status: done
category: "Senior - AI 엔지니어링"
aliases: ["MCP", "Model Context Protocol", "모델 컨텍스트 프로토콜"]
---

# MCP (Model Context Protocol)

## 정의

LLM이나 AI 에이전트를 외부 도구와 데이터 소스에 연결하는 표준 프로토콜. 모델은 기본적으로 텍스트로 답할 뿐이지만, MCP로 도구에 연결되면 파일을 읽고, 명령을 실행하고, DB나 API를 조회하는 실제 행동을 한다. 말만 하던 컨설턴트에게 노트북과 접근 권한을 주는 셈이다.

핵심 가치는 표준화다. 모델과 도구를 1회성으로 직접 엮는 대신, 표준 인터페이스 하나로 여러 모델과 도구를 조합한다(AI 주변기기의 USB-C에 비유된다).

## 구성: Host, Client, Server

| 구성 | 역할 | 예시 |
|---|---|---|
| Host | 사용자가 쓰는 AI 애플리케이션 | IDE 확장, 채팅 클라이언트 |
| Client | Host 안에서 특정 서버와 1:1 연결을 맺는 커넥터 | Host 내부 |
| Server | 실제 기능을 노출하는 프로세스 | 파일시스템, GitHub, DB, 브라우저 자동화 |

서버가 노출하는 3종 원시(primitive):

- Tools: 모델이 호출하는 함수. 부수효과가 있음(파일 쓰기, 쿼리 실행)
- Resources: 모델이 읽는 데이터(파일 내용, 레코드)
- Prompts: 재사용 가능한 프롬프트 템플릿

전송 계층은 로컬이면 stdio, 원격이면 HTTP 기반을 쓴다.

## 왜 쓰나: tool-use의 N×M 문제

- 표준이 없으면 모델 ↔ 도구 연동을 모델 수 × 도구 수만큼 개별 구현해야 한다(N×M)
- 도구를 MCP 서버로 한 번 노출하면, MCP를 지원하는 어떤 모델이나 Host에서도 재사용된다 → 통합 비용이 N+M으로 줄어든다

이게 자동완성 수준의 AI와 작업에 참여하는 AI를 가르는 경계다. 도구가 붙어야 모델이 환경을 읽고 바꾸는 작업자가 된다.

## 통제와 보안: 권한이 생긴 만큼

도구 실행 권한은 곧 부수효과이자 위험이다. 그래서 연결만큼 통제가 중요하다.

- 사람 승인(Human-in-the-loop): 위험한 도구 호출 전 사람이 확인 → [[Harness-Engineering|HITL]]
- 권한 최소화: 서버가 접근할 수 있는 범위(디렉토리, 스코프)를 제한
- 프롬프트 인젝션 경계: 서버가 반환한 데이터가 모델의 지시를 오염시킬 수 있으므로 신뢰 경계를 설정
- 감사: 어떤 도구가 무엇을 실행했는지 로깅

## 하네스와 컨텍스트에서의 위치

MCP는 하네스의 Inform(맥락 주입)과 도구 실행 축을 표준화한 수단이다. 다만 서버가 너무 많은 도구와 리소스를 노출하면 선택 비용과 [[Context-Engineering|Context Rot]]가 늘어난다. 필요한 서버만 켜고, 도구 스키마를 필요할 때만 로드하는 JIT 원칙이 그대로 적용된다.

## 면접 체크포인트

- MCP를 한 줄로: 모델을 외부 도구와 데이터에 연결하는 표준(USB-C 비유), tool-use를 N×M에서 N+M으로
- Host/Client/Server 구조와 Tools/Resources/Prompts 원시 구분
- 도구 권한 = 위험 → HITL, 권한 최소화, 프롬프트 인젝션 경계, 감사
- 도구를 많이 붙일수록 컨텍스트 비용이 오른다 → 필요한 서버만(JIT, Select)

## 출처

- [비개발자가 한 달 동안 풀스택으로 개발하면서 배운 것 — NAVER D2](https://d2.naver.com/helloworld/0107009)

## 관련 문서

- [[Harness-Engineering]] — MCP는 Inform과 도구 실행 축, 권한은 HITL로 통제
- [[Context-Engineering]] — 도구 과다 노출 = Context Rot, 필요한 서버만(JIT, Select)
- [[Tool-Output-Filtering]] — MCP 응답이 컨텍스트를 채우는 주범, 프록시 계층에서 필드만 추출
- [[Production-Agent-Architecture]] — 도구를 가진 에이전트의 Defense in Depth
- [[AI엔지니어링(AIEngineering)]] — 카테고리 인덱스
