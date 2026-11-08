---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-11-08
category: "AI엔지니어링(AIEngineering)"
---

# OMCP OAuth, 제한과 Inspector 검증

OMCP는 Developer Console app의 OAuth2 설정을 공유한다. 별도 MCP identity 체계를 만드는 것이 아니다. 기존 application restrictions, scope, user/service-user의 원본 Object/Action/Query permission이 함께 적용된다. app scope만으로 원본 접근 권한이 생기지 않는다.

## grant 선택과 Copilot Studio

일반 인증 문서는 authorization-code grant를 사용자 위임, client-credentials grant를 비대화형 service user용으로 설명한다. client secret을 쓰는 흐름은 안전하게 보관 가능한 confidential client에서 실행한다. 같은 app에 두 grant를 켤 수 있으나 redirect/scopes/secrets 조건을 각 grant에 맞게 Developer Console의 OAuth & restrictions 페이지에서 구성한다.

2026-11-08 확인한 인증 문서와 integration 문서는 모두 같은 confidential client에 authorization-code와 client-credentials grant를 함께 켜라고 안내하고, Copilot Studio가 authorization-code 흐름으로 로그인한 사용자마다 token을 받는다고 적는다. 따라서 요청은 그 사용자의 Foundry 권한으로 실행된다. app 생성 시 Backend service와 User's permissions를 고르라는 안내는 integration 문서에만 있다. client-credentials grant를 켜야 한다는 조건이 Copilot Studio 요청을 service user 권한으로 바꾼다는 뜻은 아니다. 현행 문서는 그 grant가 연동에 필요한 이유를 설명하지 않는다. 2026년 3월 공지와 이전 integration 문서는 사용자 대신 token을 발급하는 service user가 필요하다고 설명했으나 현행 문서에서는 그 문장이 빠졌으므로, 두 조건의 관계는 미확인 후보로 둔다.

이전 확인(2026-10-16)에서는 인증 문서와 integration 문서의 Copilot Studio 설명이 서로 달랐다. 현재 문서로 그 차이는 해소됐지만, 실제 연동 전에는 Copilot Studio와 Developer Console 설정 화면의 현행 조건을 다시 확인한다.

## MCP Inspector

Developer Console MCP 페이지가 제공하는 실행/connection 설정을 사용한다. 연결 전 Authentication에 client ID를 넣고 confidential client라면 필요한 secret을 설정한다. 도구 목록이 나타나는 데 수초가 걸릴 수 있다.

Tools 목록과 app restrictions에 포함된 resource를 대조한다. 빠진 tool은 연결 성공 여부와 별도로 resource 포함 여부를 확인한다. schema의 필수 parameter/type을 채워 실행하고 Results의 성공/오류 코드와 History의 호출 순서를 확인한다.

Inspector에서 Action을 Run Tool하면 실제 endpoint를 호출한다. 단순 schema 검사가 아니므로 업무 변경이 허용된 대상에서 수행한다. 이 문서는 공개 절차를 학습한 것이며 실제 인증, Action 실행이나 외부 전송을 시험한 결과는 아니다. Prompts/Resources 빈 목록은 현행 미지원 범위와 대조한다.

## 출처

- [Palantir, authentication-and-authorization](https://www.palantir.com/docs/foundry/ontology-mcp/authentication-and-authorization)
- [Palantir, debugging-with-mcp-inspector](https://www.palantir.com/docs/foundry/ontology-mcp/debugging-with-mcp-inspector)
- [Palantir, mcp-tools-and-agent-configuration](https://www.palantir.com/docs/foundry/ontology-mcp/mcp-tools-and-agent-configuration)
- [Palantir, announcements 2026-03](https://www.palantir.com/docs/foundry/announcements/2026-03)

## 관련 문서

- [[Palantir-Ontology-MCP]]
- [[Palantir-OMCP-Agent-Tools]]
