---
tags: [web, graphql, api, schema, type-system, query-language]
status: index
category: "웹&네트워크(Web&Network)"
aliases: ["GraphQL Schema and Query", "GraphQL 스키마와 쿼리 언어"]
---

# GraphQL 스키마와 쿼리 언어

GraphQL 스키마를 무엇으로 짜는가(타입 시스템), 어떻게 설계 판단을 내리는가(nullability, 진화, mutation), 그리고 그 스키마를 어떻게 질의하는가(쿼리 언어와 introspection)를 묶는다. 타입 kind 문법과 SDL은 타입 시스템, 판단 기준은 스키마 설계, fragment와 variable, directive는 쿼리 언어에 있다. 실행 구조와 운영 관심사(캐싱, 보안, 페이지네이션, 파일 업로드, Federation)는 상위 인덱스 [[GraphQL]]에 남는다.

- [[GraphQL-Schema-Types|GraphQL 타입 시스템]]: 타입 6종(Object, Scalar, Enum, Interface, Union, Input Object)과 List, Non-Null 수식자, SDL과 schema-first vs code-first, root 타입과 directive 정의
- [[GraphQL-Schema-Design|GraphQL 스키마 설계]]: nullability 전략, 버전 없는 진화, mutation 모양과 에러 채널, 네이밍 컨벤션, input 부분 업데이트 3상 문제, 규칙은 비즈니스 로직 계층
- [[GraphQL-Query-Language|GraphQL 쿼리 언어]]: 필드 선택과 인자, alias, fragment, operation과 variable, 실행 directive(@include, @skip), `__typename`, introspection

## 함께 볼 문서

- [[GraphQL]]
