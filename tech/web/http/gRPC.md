---
tags: [web, network, grpc, api, http2, protobuf]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["gRPC"]
---

# gRPC

gRPC는 Google이 오픈소스로 공개한 **고성능 RPC(Remote Procedure Call) 프레임워크**다. HTTP/2 위에서 Protocol Buffers(Protobuf)로 직렬화한 바이너리 메시지를 주고받는다. REST의 텍스트 기반·요청-응답 단방향 한계를 넘어, 양방향 스트리밍·낮은 오버헤드를 제공한다.

## 핵심 명제

- **HTTP/2 기반** — multiplexing·헤더 압축·서버 푸시 활용
- **Protobuf 직렬화** — JSON보다 작고 빠름. JSON 82바이트 → Protobuf 33바이트 수준
- **계약 우선(Contract-first)** — `.proto` 파일로 서비스·메시지를 먼저 정의 → 다언어 코드 자동 생성
- **양방향 스트리밍** — 단방향 요청-응답을 넘어 4가지 통신 모드 지원
- **마이크로서비스에 최적화** — 백엔드 간 내부 통신·자원 한정 환경에서 강함

## RPC와 gRPC

**RPC**: 원격 서버의 프로시저(함수)를 마치 로컬 함수처럼 호출하는 패러다임. 분산 컴퓨팅의 시작점.
**gRPC**: Google이 RPC 패러다임을 HTTP/2 + Protobuf 위에 현대적으로 재구성한 것. "g"는 generic·Google 등 비공식 약자 의미.

REST가 자원 중심(`GET /users/1`)이라면, gRPC는 **함수 호출 중심**(`UserService.GetUser({id: 1})`).

## HTTP/2의 이점 (gRPC가 채택한 이유)

- **단일 연결로 다중 메시지** — HTTP/1.1은 요청마다 새 커넥션(또는 head-of-line blocking). HTTP/2는 한 커넥션에서 여러 스트림 동시 처리
- **헤더 압축(HPACK)** — 중복 헤더 중복 제거 → 작은 메시지에서 오버헤드 큰 폭 감소
- **서버 푸시** — 클라이언트 요청 없이 서버가 데이터 전달
- **바이너리 프레이밍** — 텍스트 파싱 비용 제거

## Protocol Buffers (Protobuf)

스키마 기반 직렬화 포맷.
```proto
syntax = "proto3";

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
}

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
}
```

- 필드 번호로 식별 → 이름이 바뀌어도 호환 유지(필드 번호만 안 바뀌면)
- `.proto` 컴파일러가 Go·Java·Python·Node.js 등 클라이언트·서버 스텁 자동 생성
- JSON 대비 직렬화 결과 크기·속도 모두 우월. 사람이 읽긴 어려움(바이너리)

## 4가지 통신 방식

| 방식 | 설명 | 사용 사례 |
|---|---|---|
| Unary RPC | 1요청 → 1응답 | 일반 CRUD, REST와 유사 |
| Server Streaming | 1요청 → N응답 | 실시간 피드, 로그 스트림 |
| Client Streaming | N요청 → 1응답 | 파일 청크 업로드, 센서 데이터 수집 |
| Bidirectional Streaming | N요청 ↔ N응답 | 채팅, 실시간 협업 |

REST는 1번(Unary)만 자연스럽게 지원. 나머지는 WebSocket이나 SSE를 별도 도입해야 함.

## 장점

- **성능** — Protobuf + HTTP/2로 메시지 크기·왕복 비용 모두 작음. 클라우드에서 byte/CPU 단위 과금 시 비용 절감 효과
- **강력한 계약** — `.proto`가 서버-클라이언트 인터페이스 단일 출처 → 명세 누락·불일치 차단
- **자동 코드 생성** — 다언어 환경에서 SDK를 일일이 만들 필요 없음
- **양방향 스트리밍 내장** — 별도 프로토콜 없이 실시간 통신
- **풍부한 생태계** — interceptor·load balancing·deadline·인증(SSL/TLS)이 표준화됨

## 단점

- **브라우저에서 직접 호출 불가** — HTTP/2 트레일러·바이너리 프레이밍을 브라우저가 노출하지 않음. **gRPC-Web** 게이트웨이를 거쳐야 함
- **가독성 낮음** — 바이너리 메시지 → 디버깅 시 도구 의존(grpcurl 등)
- **HTTP 캐싱 활용 불가** — REST 같은 표준 캐시 인프라(CDN·프록시)를 그대로 쓸 수 없음
- **공개 API에 부적합** — 외부 개발자가 적응 비용 큼. 내부·B2B 통신에 적합
- **방화벽·로드밸런서 호환성** — 일부 인프라가 HTTP/2 양방향 스트림을 제대로 처리 못 함

## 언제 쓸까

**적합한 경우**:
- 마이크로서비스 간 내부 통신 (백엔드↔백엔드)
- 자원이 한정된 모바일·IoT 환경
- 실시간 양방향 통신(채팅·게임)
- 다언어 폴리글랏 백엔드 (Java + Go + Python 혼재)
- 네트워크 장비·인프라 자동화 (시스코·주니퍼도 gRPC 지원)

**부적합한 경우**:
- 브라우저가 주 클라이언트인 공개 API
- HTTP 캐싱·CDN이 필수인 콘텐츠 API
- 디버깅·관찰성 도구가 부족한 작은 조직
- 외부 파트너에게 노출하는 통합 API

## REST와의 차이

| 항목 | REST | gRPC |
|---|---|---|
| 프로토콜 | HTTP/1.1 | HTTP/2 |
| 데이터 형식 | JSON (텍스트) | Protobuf (바이너리) |
| 통신 방향 | 단방향 (요청-응답) | 양방향 스트리밍 가능 |
| 결합도 | 느슨 (스키마 선택) | 긴밀 (`.proto` 공유 필수) |
| 브라우저 지원 | 네이티브 | gRPC-Web 게이트웨이 필요 |
| 학습 곡선 | 낮음 | 중간 |
| 캐싱 | HTTP 표준 활용 | 직접 구현 |
| 적합한 곳 | 공개 API, 웹 | 내부 마이크로서비스 |

## 면접 체크포인트

- gRPC가 HTTP/2를 채택해서 얻는 구체적 이점 3가지
- Protobuf가 JSON보다 빠른 이유 (스키마·바이너리·필드 번호)
- 4가지 통신 방식 중 양방향 스트리밍이 REST에서 어려운 이유
- gRPC-Web이 왜 필요한가 (브라우저 한계)
- 마이크로서비스 내부 통신에 gRPC, 외부 공개에 REST를 함께 쓰는 패턴
- `.proto` 파일의 필드 번호가 바뀌면 안 되는 이유 (호환성)

## 출처
- [AWS — gRPC와 REST의 차이](https://aws.amazon.com/ko/compare/the-difference-between-grpc-and-rest/)
- [ITWorld — gRPC 설명](https://www.itworld.co.kr/t/61023/개발자/305065)
- [Naver Cloud — gRPC 깊게 파고들기 1편](https://medium.com/naver-cloud-platform/nbp-기술-경험-시대의-흐름-grpc-깊게-파고들기-1-39e97cb3460)
- [Naver Cloud — gRPC 깊게 파고들기 2편](https://medium.com/naver-cloud-platform/nbp-기술-경험-시대의-흐름-grpc-깊게-파고들기-2-b01d390a7190)

## 관련 문서
- [[REST|REST · RESTful API]]
- [[GraphQL|GraphQL]]
- [[API-Comparison|REST vs GraphQL vs gRPC 비교]]
- [[HTTP-Seminar|HTTP 버전별 진화 (HTTP/2 포함)]]
