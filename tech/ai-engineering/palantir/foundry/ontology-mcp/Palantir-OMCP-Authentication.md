---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# OMCP OAuth, 제한과 Inspector 검증

OMCP는 Developer Console app의 OAuth2 설정을 공유한다. 별도 MCP identity 체계를 만드는 것이 아니다. 기존 application restrictions, scope, user/service-user의 원본 Object/Action/Query permission이 함께 적용된다. app scope만으로 원본 접근 권한이 생기지 않는다.

## grant와 문서 충돌

일반 인증 문서는 authorization-code grant를 사용자 위임, client-credentials grant를 비대화형 service user용으로 설명한다. client secret을 쓰는 흐름은 안전하게 보관 가능한 confidential client에서 실행한다. 같은 app에 두 grant를 켤 수 있으나 redirect/scopes/secrets 조건을 각각 맞춘다.

Copilot Studio에 대해서는 source 간 충돌이 있다. 일반 auth 문서는 client-credentials의 예시로 들지만 상세 integration 문서는 confidential client의 authorization-code만 지원한다고 명시하고 Backend service와 User's permissions를 선택하도록 안내한다. 이를 하나의 확정된 지원표로 합치지 않는다. 실제 연동 전 상세 설정 화면과 현행 지원을 확인한다.

## MCP Inspector

Developer Console MCP 페이지가 제공하는 실행/connection 설정을 사용한다. 연결 전 Authentication에 client ID를 넣고 confidential client라면 필요한 secret을 설정한다. 도구 목록이 나타나는 데 수초가 걸릴 수 있다.

Tools 목록과 app restrictions에 포함된 resource를 대조한다. 빠진 tool은 연결 성공 여부와 별도로 resource 포함 여부를 확인한다. schema의 필수 parameter/type을 채워 실행하고 Results의 성공/오류 코드와 History의 호출 순서를 확인한다.

Inspector에서 Action을 Run Tool하면 실제 endpoint를 호출한다. 단순 schema 검사가 아니므로 업무 변경이 허용된 대상에서 수행한다. 이 문서는 공개 절차를 학습한 것이며 실제 인증, Action 실행이나 외부 전송을 시험한 결과는 아니다. Prompts/Resources 빈 목록은 현행 미지원 범위와 대조한다.

## 출처

- [Palantir, authentication-and-authorization](https://www.palantir.com/docs/foundry/ontology-mcp/authentication-and-authorization)
- [Palantir, debugging-with-mcp-inspector](https://www.palantir.com/docs/foundry/ontology-mcp/debugging-with-mcp-inspector)
- [Palantir, mcp-tools-and-agent-configuration](https://www.palantir.com/docs/foundry/ontology-mcp/mcp-tools-and-agent-configuration)

## 관련 문서

- [[Palantir-Ontology-MCP]]
- [[Palantir-OMCP-Agent-Tools]]
