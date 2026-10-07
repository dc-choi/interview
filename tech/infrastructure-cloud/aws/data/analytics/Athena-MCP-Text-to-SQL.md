---
tags: [aws, athena, mcp, text-to-sql, access-control]
status: done
verified_at: 2026-10-07
category: "Infrastructure - AWS"
aliases: ["Athena MCP Text-to-SQL", "Athena 자연어 분석의 권한 경계"]
---

# Athena MCP 기반 자연어 분석

자연어 분석은 카탈로그에서 스키마를 찾고, SQL을 생성해 실행한 뒤 결과를 설명하는 흐름이다. AWS Data Processing MCP Server는 Glue, Athena, EMR 도구를 제공한다. 분석에 필요한 도구만 노출하고, SQL 생성 품질과 실행 권한은 별도로 검증한다.

## 조회, 실행과 결과 열람

2026-10-07 공식 서버 문서 기준으로 다음 경계를 구분한다.

| 경계 | 동작 | 운영 의미 |
|---|---|---|
| 리소스 변경 | `--allow-write` 기본값은 false | 카탈로그와 워크그룹 관리 도구를 붙였다고 변경까지 허용하지 않는다 |
| Athena SQL | 쓰기 허용 없이 실행하면 서버의 읽기 SQL 허용목록을 적용 | 임의 SQL을 무제한 실행하는 모드가 아니다 |
| 결과 열람 | `get-query-results`에는 `--allow-sensitive-data-access`가 필요 | 실행 성공과 결과 반환 성공을 나눠 확인한다 |
| 실제 AWS 접근 | 호출 주체의 AWS 권한이 필요 | 서버 플래그가 IAM 권한을 부여하지 않는다 |

분석 결과를 읽으려고 쓰기까지 함께 켤 필요는 없다. 결과 접근이 막히면 빈 결과나 데이터 부재로 해석하지 말고 권한 오류로 처리한다. 프롬프트의 읽기 전용 지시는 서버의 통제와 AWS 권한을 대신하지 않는다.

## 적용 흐름

다음은 위 기능을 분석 서비스에 적용하는 설계 예시다.

1. 접근 가능한 카탈로그와 테이블을 조회한다. 컬럼명 외에 집계 단위와 조인 관계를 확인한다.
2. 질문의 기간, 지표 정의와 제외 조건을 확정한다. 불명확하면 실행을 보류한다.
3. 허용한 SQL만 지정한 워크그룹에서 실행하고 실행 상태와 오류를 기록한다.
4. 결과 열람 권한으로 반환 데이터를 읽고, 실행한 SQL과 결과를 함께 제시한다.

쓰기 차단은 조회 비용이나 민감정보 노출까지 막지 않는다. 접근 대상, 스캔 비용 한도와 결과 저장 위치는 [[Athena|Athena 운영 설정]]에서 함께 제한한다. 생성 SQL을 다시 실행해 같은 결과가 나오는 것만으로 질문의 의미와 집계 정확도가 검증되지는 않는다.

## 출처

- [AWS Labs, AWS Data Processing MCP Server](https://awslabs.github.io/mcp/servers/aws-dataprocessing-mcp-server)
- [MCP 활용하여 Text2SQL 빠르게 만들어보기 — Amazon Web Services Korea](https://www.youtube.com/watch?v=trQw7VV3EbQ)

## 관련 문서

- [[LLM-Workflow-Patterns|Text-to-SQL의 맥락 구성과 평가]]
- [[Athena|Athena]]
- [[MCP-Security-Boundaries|MCP 보안 경계]]
