---
tags: [web, network, grpc, api, http2, protobuf]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
aliases: ["gRPC"]
---

# gRPC

gRPC는 Google이 오픈소스로 공개한 **RPC(Remote Procedure Call) 프레임워크**다. 기본적으로 HTTP/2 위에서 Protocol Buffers(Protobuf)로 직렬화한 바이너리 메시지를 주고받는다. 서비스 계약과 네 가지 RPC 형태를 제공하며 실제 성능 이점은 payload, 구현과 네트워크 조건에 따라 측정한다. REST 자체가 텍스트나 단방향 통신만 허용하는 규칙은 아니다.

## 핵심 명제

- **HTTP/2 기반** — multiplexing, 헤더 압축, 스트리밍 활용
- **Protobuf 직렬화** — 스키마와 바이너리 wire format을 사용한다. 실제 크기와 속도 이점은 데이터 형태와 구현을 측정해 판단한다.
- **계약 우선(Contract-first)** — `.proto` 파일로 서비스, 메시지를 먼저 정의 → 다언어 코드 자동 생성
- **양방향 스트리밍** — 단방향 요청-응답을 넘어 4가지 통신 모드 지원
- **마이크로서비스에 최적화** — 백엔드 간 내부 통신, 자원 한정 환경에서 강함

## RPC와 gRPC

**RPC**: 원격 서버의 프로시저(함수)를 마치 로컬 함수처럼 호출하는 패러다임. 분산 컴퓨팅의 시작점.
**gRPC**: Google이 RPC 패러다임을 HTTP/2 + Protobuf 위에 현대적으로 재구성한 것. "g"는 generic, Google 등 비공식 약자 의미.

REST가 자원 중심(`GET /users/1`)이라면, gRPC는 **함수 호출 중심**(`UserService.GetUser({id: 1})`).

## HTTP/2의 이점 (gRPC가 채택한 이유)

- **한 연결의 다중 스트림** — HTTP/1.1도 지속 연결을 기본으로 사용할 수 있고 선택적 pipelining이 있지만 응답 순서를 지켜야 한다. HTTP/2는 바이너리 프레이밍과 독립적인 양방향 스트림으로 한 연결에서 여러 RPC를 multiplex한다.
- **헤더 압축(HPACK)** — 중복 헤더 중복 제거 → 작은 메시지에서 오버헤드 큰 폭 감소
- **스트리밍** — 하나의 RPC에서 서버 스트리밍, 클라이언트 스트리밍, 양방향 스트리밍 지원. HTTP/2 server push와는 다른 개념
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

- binary wire format에서는 필드 번호로 식별한다. 번호 유지만으로 모든 변경이 호환되는 것은 아니며, ProtoJSON은 필드 이름도 wire에 포함하므로 이름 변경을 따로 검토한다. 자세한 규칙은 [[Schema-Evolution|스키마 진화]] 참고.
- `.proto` 컴파일러가 Go, Java, Python, Node.js 등 클라이언트, 서버 스텁 자동 생성
- 많은 스키마형 메시지에서 JSON보다 작고 빠를 수 있지만 데이터, 구현, 압축 여부에 따라 측정값이 달라진다. 사람이 바로 읽기 어려워 전용 도구가 필요하다.

### 인코딩 비용을 계산하는 단위

2026-10-06 공식 wire format 문서를 대조한 설명이다. 메시지는 필드 번호와 wire type을 담은 tag, 값의 인코딩으로 구성된다. 문자열과 bytes에는 길이 정보도 붙는다. 바이너리라고 파싱이 없어지는 것은 아니다.

양의 정수를 varint로 저장할 때 각 바이트의 하위 7비트가 값을 담고 최상위 비트가 다음 바이트의 존재를 표시한다. `12345`의 값 부분은 2바이트지만 `123456`은 3바이트다. 필드 번호 1의 `uint32`에 저장하면 tag 1바이트가 더 필요하므로 전체는 각각 3바이트와 4바이트다. JSON 숫자의 십진 자릿수와 비교할 때도 필드 이름, 구분자와 메시지 전체 크기를 함께 센다.

고정된 용량 감소율이나 속도 배율을 포맷의 보장으로 쓰지 않는다. 같은 데이터와 압축 조건에서 직렬화, 역직렬화와 전송 시간을 측정한다. 삭제한 필드 번호는 `reserved`로 남겨 다른 의미로 재사용하지 않는다.

## 4가지 통신 방식

| 방식 | 설명 | 사용 사례 |
|---|---|---|
| Unary RPC | 1요청 → 1응답 | 일반 CRUD, REST와 유사 |
| Server Streaming | 1요청 → N응답 | 실시간 피드, 로그 스트림 |
| Client Streaming | N요청 → 1응답 | 파일 청크 업로드, 센서 데이터 수집 |
| Bidirectional Streaming | N요청 ↔ N응답 | 채팅, 실시간 협업 |

일반적인 REST API는 unary 요청, 응답이 중심이지만 HTTP streaming, SSE, WebSocket 등을 조합할 수 있다. gRPC는 네 가지 RPC 형태를 계약과 런타임에 직접 포함한다.

## 장점

- **성능 후보** — Protobuf와 HTTP/2가 직렬화와 연결 비용을 줄일 수 있다. 왕복 횟수와 비용 절감은 API 설계, 데이터와 실제 측정으로 판단한다.
- **강력한 계약** — `.proto`를 서버와 클라이언트 인터페이스의 공통 계약으로 사용한다. 생성 코드 배포, 버전 호환성과 업무 검증은 별도로 관리한다.
- **자동 코드 생성** — 다언어 환경에서 SDK를 일일이 만들 필요 없음
- **양방향 스트리밍 내장** — 별도 프로토콜 없이 실시간 통신
- **풍부한 생태계** — interceptor, load balancing, deadline, 인증(SSL/TLS)이 표준화됨

## 단점

- **native gRPC의 브라우저 제한** — 브라우저 HTTP API에서 native gRPC에 필요한 제어를 그대로 사용할 수 없다. gRPC-Web이나 Connect 같은 브라우저용 프로토콜이 필요하다. 서버가 이를 직접 지원하면 변환 게이트웨이는 필수가 아니다. 바이너리 payload 자체가 브라우저의 금지 대상인 것은 아니다.
- **가독성 낮음** — 바이너리 메시지 → 디버깅 시 도구 의존(grpcurl 등)
- **HTTP 캐싱 활용 불가** — REST 같은 표준 캐시 인프라(CDN, 프록시)를 그대로 쓸 수 없음
- **외부 소비자 비용** — 사용 언어의 gRPC SDK와 계약 배포 방식에 따라 적응 비용이 생긴다. 공개 여부만으로 부적합을 판정하지 않는다.
- **방화벽, 로드밸런서 호환성** — 일부 인프라가 HTTP/2 양방향 스트림을 제대로 처리 못 함

## 언제 쓸까

**적합한 경우**:
- 마이크로서비스 간 내부 통신 (백엔드↔백엔드)
- 자원이 한정된 모바일, IoT 환경
- 실시간 양방향 통신(채팅, 게임)
- 다언어 폴리글랏 백엔드 (Java + Go + Python 혼재)
- 네트워크 장비, 인프라 자동화 (시스코, 주니퍼도 gRPC 지원)

**추가 조건을 확인할 경우**:
- 브라우저가 주 클라이언트인 API: native gRPC 대신 gRPC-Web 또는 [[Connect-RPC|Connect RPC]]의 서버와 transport 지원 확인
- HTTP 캐싱, CDN이 필수인 콘텐츠 API
- 디버깅, 관찰성 도구가 부족한 작은 조직
- 외부 파트너에게 노출하는 통합 API: 지원 SDK, 계약 공유와 일반 HTTP 도구 접근성 확인

## REST와의 차이

| 항목 | REST | gRPC |
|---|---|---|
| 주된 전송 | HTTP/1.1 또는 HTTP/2 등 | HTTP/2 |
| 데이터 형식 | JSON (텍스트) | Protobuf (바이너리) |
| 상호작용 | 일반적으로 요청-응답, 실시간 전송 별도 설계 | 네 가지 RPC 형태 내장 |
| 결합도 | 느슨 (스키마 선택) | 긴밀 (`.proto` 공유 필수) |
| 브라우저 지원 | HTTP API로 호출 | gRPC-Web 또는 Connect 지원 endpoint 필요 |
| 학습 곡선 | 낮음 | 중간 |
| 캐싱 | HTTP 표준 활용 | 직접 구현 |
| 적합한 곳 | 공개 API, 웹 | 내부 마이크로서비스 |

## 면접 체크포인트

- gRPC가 HTTP/2를 채택해서 얻는 구체적 이점 3가지
- Protobuf binary와 JSON의 직렬화 차이, 성능 이점을 측정할 조건
- 네 가지 RPC 형태와 일반 HTTP API의 실시간 전송 설계 차이
- gRPC-Web이 왜 필요한가 (브라우저 한계)
- REST/GraphQL과 gRPC를 나누는 패턴과, Connect로 단일 RPC 계약을 제공하는 패턴의 선택 조건
- `.proto` 파일의 필드 번호가 바뀌면 안 되는 이유 (호환성)

## 출처
- [Protocol Buffers, Encoding](https://protobuf.dev/programming-guides/encoding/)
- [Protocol Buffers, Proto Best Practices](https://protobuf.dev/best-practices/dos-donts/)
- [Connect, gRPC compatibility](https://connectrpc.com/docs/go/grpc-compatibility/)
- [Connect, Choosing a protocol](https://connectrpc.com/docs/web/choosing-a-protocol/)
- [Protocol Buffers, Language Guide (proto 3)](https://protobuf.dev/programming-guides/proto3/)
- [Protocol Buffers, ProtoJSON Format](https://protobuf.dev/programming-guides/json/)
- [RFC 9112, HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112)
- [gRPC Core concepts](https://grpc.io/docs/what-is-grpc/core-concepts/)
- [AWS — gRPC와 REST의 차이](https://aws.amazon.com/ko/compare/the-difference-between-grpc-and-rest/)
- [ITWorld — gRPC 설명](https://www.itworld.co.kr/t/61023/개발자/305065)
- [Naver Cloud — gRPC 깊게 파고들기 1편](https://medium.com/naver-cloud-platform/nbp-기술-경험-시대의-흐름-grpc-깊게-파고들기-1-39e97cb3460)
- [Naver Cloud — gRPC 깊게 파고들기 2편](https://medium.com/naver-cloud-platform/nbp-기술-경험-시대의-흐름-grpc-깊게-파고들기-2-b01d390a7190)

## 관련 문서
- [[REST|REST, RESTful API]]
- [[GraphQL|GraphQL]]
- [[API-Comparison|REST vs GraphQL vs gRPC 비교]]
- [[Connect-RPC|Connect RPC, 단일 Protobuf 계약과 브라우저 지원]]
- [[HTTP-Seminar|HTTP 버전별 진화 (HTTP/2 포함)]]
