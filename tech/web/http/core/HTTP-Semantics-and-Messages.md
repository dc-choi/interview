---
tags: [web, http, semantics, message, stateless]
status: done
verified_at: 2026-08-04
category: "Web - HTTP"
aliases: ["HTTP Semantics and Messages", "HTTP 의미와 메시지"]
---

# HTTP 의미와 메시지

HTTP는 분산 하이퍼미디어 시스템을 위한 무상태 애플리케이션 계층 요청, 응답 프로토콜이다. HTML뿐 아니라 이미지, JSON과 바이너리 등 표현 형식에 제한 없이 메시지를 전달한다.

## 의미와 전송 형식을 분리한다

RFC 9110은 버전에 공통인 메서드, 상태 코드, 필드와 표현 의미를 정의한다. 실제 메시지 프레이밍은 버전마다 다르다.

| 버전 | 전송과 프레이밍 |
|---|---|
| HTTP/1.1 | 보통 TCP 위의 텍스트 시작 라인, 필드 라인과 길이 또는 chunked 프레이밍 |
| HTTP/2 | TCP 연결 안의 바이너리 프레임과 다중 스트림 |
| HTTP/3 | QUIC 연결 안의 바이너리 프레임과 독립 스트림 |

HTTP/2와 HTTP/3이 단순히 성능 옵션만 추가한 것은 아니다. 전송과 프레이밍, 연결 관리가 달라졌지만 GET, 200, Content-Type 같은 핵심 의미는 버전 사이에서 유지된다.

## 역할과 표현

- Client는 요청을 보내고 응답을 받는 역할이다.
- Server는 요청을 받아 응답하는 역할이다.
- 같은 프로그램도 교환마다 Client나 Server 역할을 맡을 수 있다.
- Proxy, Gateway와 Cache 같은 Intermediary가 중간에서 전달, 변환 또는 저장할 수 있다.
- Resource는 URI로 식별되는 대상이고 Representation은 특정 시점의 상태를 표현한 바이트와 메타데이터다.

클라이언트와 서버 분리는 UI와 데이터 저장 위치를 뜻하는 고정 배치가 아니다. 요청과 응답 책임을 분리해 양쪽 구현이 계약 안에서 독립적으로 진화하게 하는 구조다.

## Stateless의 정확한 의미

각 요청 메시지의 의미를 다른 요청이나 그 요청이 실린 연결과 독립적으로 이해할 수 있다는 뜻이다. 다음을 구분한다.

- HTTP 의미가 Stateless여도 서버는 DB의 Resource 상태를 저장할 수 있다.
- 로그인 세션이나 장바구니 같은 애플리케이션 상태도 별도 식별자와 저장소로 구현할 수 있다.
- 한 TCP나 QUIC 연결에서 여러 요청을 보내도 HTTP의 무상태 의미는 바뀌지 않는다.
- 어느 서버 인스턴스든 요청을 처리하게 하려면 필요한 인증과 컨텍스트를 요청에서 복원할 수 있어야 한다.

Stateless는 상태를 전혀 저장하지 말라는 뜻도, 매 요청마다 연결을 끊으라는 뜻도 아니다.

## HTTP는 곧 비연결이라는 설명의 한계

초기 HTTP/1.0의 요청마다 연결을 닫는 동작에서 나온 설명이다. HTTP/1.1은 지속 연결이 기본이고 HTTP/2와 HTTP/3은 한 연결에서 여러 스트림을 다중화한다. 서버는 유휴 연결을 영원히 유지하지 않고 시간 제한과 자원 정책으로 회수하므로 연결 수명과 요청 상태를 별도 축으로 설계한다.

## 추상 메시지

버전에 공통인 요청은 Method, Target URI, Fields와 선택적인 Content로, 응답은 Status Code, Fields와 선택적인 Content로 이해한다.

```http
GET /orders/42 HTTP/1.1
Host: api.example.com
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 25

{"id":42,"status":"PAID"}
```

이 예시는 HTTP/1.1 wire format이다. HTTP/2와 HTTP/3에서는 같은 의미가 pseudo-header와 HEADERS/DATA frame으로 표현된다.

## 메시지 경계와 보안

HTTP/1.1에서 빈 줄은 field section의 끝을 표시하고 `Content-Length`, `Transfer-Encoding` 또는 연결 종료 등이 content 경계를 정한다. 발신자는 `Transfer-Encoding`과 `Content-Length`를 함께 보내면 안 된다. 수신자와 중개자가 모호한 길이를 다르게 해석하면 Request Smuggling로 이어질 수 있다.

## 출처

- 김영한 강사, [소개영상](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61388)
- 김영한 강사, [모든 것이 HTTP](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61359)
- 김영한 강사, [클라이언트 서버 구조](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61360)
- 김영한 강사, [Stateful, Stateless](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61361)
- 김영한 강사, [비 연결성](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61362)
- 김영한 강사, [HTTP 메시지](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61363)
- 김영한 강사, [다음으로](https://www.inflearn.com/courses/lecture?courseId=326277&unitId=61412)
- [RFC 9110, HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 9112, HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112.html)
- [RFC 9113, HTTP/2](https://httpwg.org/specs/rfc9113.html)
- [RFC 9114, HTTP/3](https://www.rfc-editor.org/rfc/rfc9114.html)

## 관련 문서

- [[HTTP-Header-Semantics|HTTP 헤더 의미와 콘텐츠 협상]]
- [[HTTP-Caching|HTTP 캐싱과 조건부 요청]]
- [[Session|Stateless HTTP 위의 세션]]
- [[HTTP-Chunked-Transfer|HTTP/1.1 분할 전송]]
