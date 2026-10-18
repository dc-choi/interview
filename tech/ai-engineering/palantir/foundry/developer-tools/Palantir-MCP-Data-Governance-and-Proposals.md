---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Palantir MCP 데이터 경계와 변경 제안"]
---

# Palantir MCP 데이터 경계와 변경 제안

## 인증과 데이터 흐름

Local Palantir MCP는 기본 비활성화이며 Control Panel에서 관리자 허용이 필요하다. Foundry Git repository에서는 Git token으로 인증을 bootstrap할 수 있어 별도 FOUNDRY_TOKEN 입력이 필요하지 않을 수 있다. Repository 밖에서는 user token 경로를 사용한다. 예제 토큰을 설정 파일에 그대로 넣은 형태가 비밀 저장의 권장 방식이라는 뜻은 아니다.

플랫폼 VS Code/Continue 경로는 Palantir 제공 third-party model과 조직의 Palantir 계약 경계를 따른다. Local agent는 연결한 인터페이스의 모델 제공자에게 tool output을 전달할 수 있다. Palantir MCP 사용만으로 Palantir 모델을 사용한다고 보장하지 않으며 데이터가 외부 시스템에 전달된 뒤의 이용은 해당 시스템과의 계약/정책을 따른다.

권한은 설정 token과 사용자/workspace credential의 operation/resource scope에 제한된다. Context 문서가 자동 포함되거나 도구가 발견되었다는 사실이 데이터 접근 권한 상승을 뜻하지 않는다.

## 어떤 대상을 수정하는가

Palantir MCP는 Ontology builder용 schema/type 도구와 새 dataset 생성 등을 제공한다. 현재 보안 문서는 기존 dataset 갱신/삭제를 허용하지 않으며 Ontology 변경과 삭제도 branch의 proposal review를 거쳐 인간 승인 후 main에 merge한다고 명시한다.

Available tools에는 object/link/action type delete, health check delete, branch/proposal close 등의 이름이 실제로 있다. 따라서 파괴적 도구가 없다는 일반 소개를 아무 상태도 삭제할 수 없다는 뜻으로 확대하지 않는다. 어떤 리소스를 어떤 branch에서 바꾸고 어떤 review를 거치는지 개별 계약을 확인한다.

Ontology MCP(OMCP)는 별도다. Consumer가 앱의 object/action/query function을 외부 agent에서 사용하도록 노출하고 앱 제한 안에서 데이터를 읽고 Action으로 쓸 수 있다. Palantir MCP가 Ontology 데이터 쓰기를 제공하지 않는다는 설명을 OMCP에도 적용하지 않는다.

## 개발 루프와 승인 경계

Transform preview/fix 반복은 샘플과 실행 환경의 범위 안에서 오류를 줄이는 개발 루프다. Ontology type을 만들고 SDK를 생성하는 루프도 branch에서 검토 가능한 변경을 만드는 것과 main 적용을 나눠야 한다. 모델이 만든 notional dataset은 실제 운영 데이터의 대표성이나 primary key 적합성 검증이 아니다.

이 기록은 문서의 보안/제안 절차와 도구 목록을 대조한 것이다. 실제 token scope, proposal 승인 enforcement와 외부 모델의 데이터 처리를 시험하지 않았다.

## 출처

- [Palantir palantir-mcp, palantir-mcp](https://www.palantir.com/docs/foundry/palantir-mcp)
- [Palantir palantir-mcp, available-tools](https://www.palantir.com/docs/foundry/palantir-mcp/available-tools)
- [Palantir palantir-mcp, example-mcp-workflows](https://www.palantir.com/docs/foundry/palantir-mcp/example-mcp-workflows)
- [Palantir palantir-mcp, getting-started](https://www.palantir.com/docs/foundry/palantir-mcp/getting-started)
- [Palantir palantir-mcp, installation](https://www.palantir.com/docs/foundry/palantir-mcp/installation)
- [Palantir palantir-mcp, overview](https://www.palantir.com/docs/foundry/palantir-mcp/overview)
- [Palantir palantir-mcp, security](https://www.palantir.com/docs/foundry/palantir-mcp/security)
- [Palantir palantir-mcp, tool-search](https://www.palantir.com/docs/foundry/palantir-mcp/tool-search)

## 관련 문서

- [[Palantir-Developer-Tools]]
