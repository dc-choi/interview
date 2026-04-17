---
tags: [web, network, api, rest, graphql, grpc]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["API Comparison", "REST vs GraphQL vs gRPC"]
---

# REST vs GraphQL vs gRPC

세 API 스타일의 본질적 차이를 한눈에 비교하고, 언제 무엇을 선택할지 정리.

## 본질적 차이

| 축 | REST | GraphQL | gRPC |
|---|---|---|---|
| 패러다임 | 자원 중심 | 쿼리 중심 | 함수 호출(RPC) 중심 |
| 프로토콜 | HTTP/1.1 (HTTP/2 가능) | HTTP/1.1 (POST 위주) | HTTP/2 필수 |
| 데이터 형식 | JSON·XML (텍스트) | JSON | Protobuf (바이너리) |
| 엔드포인트 | 자원별 다수 | 단일 `/graphql` | 함수별 다수 |
| 응답 모양 결정 | 서버 | 클라이언트 | 서버 (스키마 고정) |
| 통신 방향 | 단방향 | 단방향 (Subscription은 별개) | 양방향 스트리밍 |
| 스키마 | 선택 (OpenAPI) | 필수 | 필수 (`.proto`) |
| 결합도 | 느슨 | 중간 | 긴밀 |
| HTTP 캐싱 | 잘 동작 | 어려움 | 직접 구현 |
| 브라우저 직접 호출 | O | O | gRPC-Web 필요 |
| 학습 곡선 | 낮음 | 높음 | 중간 |

## 페칭 패턴 비교

같은 화면에 user 정보 + posts 목록 + 각 post의 comments를 보여줘야 한다고 할 때.

**REST**: 3번 호출
```
GET /users/1
GET /users/1/posts
GET /posts/1/comments  (게시글마다 N번)
```
→ 라운드트립 다수 + 오버페칭(쓰지 않는 필드 포함)

**GraphQL**: 1번 호출
```graphql
{
  user(id: 1) {
    name
    posts { title comments { body } }
  }
}
```
→ 한 번에 필요한 모양만. 단 서버에서 N+1 처리 필요(DataLoader)

**gRPC**: 1번 호출 (서비스 정의 시)
```proto
rpc GetUserDashboard(GetUserDashboardRequest) returns (UserDashboard);
```
→ 서비스가 "대시보드용 응답"을 미리 정의. BFF 패턴과 잘 맞음

## 성능 특성

### 메시지 크기
- **gRPC** ≪ **REST** (Protobuf 바이너리 vs JSON 텍스트). JSON 82B → Protobuf 33B 수준
- **GraphQL**: 필요 필드만 선택 → 응답은 작지만 요청(쿼리 본문)은 더 큼

### 라운드트립
- **REST**: 자원 단위로 N번
- **GraphQL**: 1번 (대신 서버 부하 증가)
- **gRPC**: 1번 (스트리밍이면 1 커넥션으로 N메시지)

### 캐싱
- **REST**: HTTP 표준 캐시(`Cache-Control`, `ETag`, CDN) 그대로 활용 → 가장 강력
- **GraphQL**: URL 캐시 무력. Apollo Client 같은 클라이언트 캐시 의존
- **gRPC**: HTTP 캐시 활용 불가. 서비스 레벨에서 직접 구현

## 선택 가이드

### REST를 고르는 경우
- 공개 API (외부 개발자가 사용)
- 단순 CRUD 위주
- HTTP 캐싱·CDN이 핵심 성능 전략
- 작은 팀 / 학습 곡선을 낮추고 싶음
- 다양한 클라이언트(브라우저·툴·curl)가 자유롭게 호출

### GraphQL을 고르는 경우
- 다양한 클라이언트가 다른 데이터 모양 요구 (웹·iOS·Android)
- 깊은 중첩 객체를 자주 다룸 (소셜·이커머스 카탈로그)
- 프론트엔드가 빠르게 진화, 백엔드 의존 줄이고 싶음
- 모바일 환경에서 데이터 절약이 중요
- DataLoader·복잡도 제한 등 운영 비용 감수 가능

### gRPC를 고르는 경우
- 마이크로서비스 간 내부 통신 (백엔드↔백엔드)
- 양방향 스트리밍 필요 (채팅·게임·실시간 데이터)
- 자원 한정적 환경 (모바일·IoT)
- 다언어 폴리글랏 백엔드 (Java + Go + Python)
- 강한 계약·자동 코드 생성이 필요한 대규모 조직

## 함께 쓰는 패턴

실무에선 단일 선택이 드물고, **계층별로 다른 스타일을 조합**하는 경우가 많다.

- **외부(브라우저·모바일) → BFF**: REST 또는 GraphQL
- **BFF → 내부 마이크로서비스**: gRPC
- **이벤트 기반 비동기 통신**: 메시지 큐 (Kafka·SQS) — 위 셋과 별개

이 패턴은 외부 인터페이스의 유연성·캐싱과 내부 통신의 성능·계약 강도를 모두 챙긴다.

## 면접 체크포인트

- 세 스타일이 해결하는 문제와 트레이드오프를 한 문장으로 설명
- "왜 GraphQL이 캐싱이 어려운가" → 단일 엔드포인트 + POST
- "왜 gRPC가 브라우저에서 직접 호출 안 되나" → HTTP/2 트레일러·바이너리
- 같은 화면 데이터를 REST 3번 vs GraphQL 1번 vs gRPC 1번으로 가져오는 차이
- BFF 계층에서 외부는 REST/GraphQL, 내부는 gRPC를 쓰는 이유

## 출처
- [AWS — gRPC와 REST의 차이](https://aws.amazon.com/ko/compare/the-difference-between-grpc-and-rest/)

## 관련 문서
- [[REST|REST · RESTful API]]
- [[GraphQL|GraphQL]]
- [[gRPC|gRPC]]
