---
tags: [web, network, http, streaming]
status: done
verified_at: 2026-08-04
category: "웹&네트워크(Web&Network)"
aliases: ["HTTP Chunked Transfer", "Transfer-Encoding chunked", "분할 전송"]
---

# HTTP 분할 전송 (Chunked Transfer Encoding)

메시지 content를 여러 chunk로 나누고 마지막 zero-size chunk로 경계를 표시하는 HTTP/1.1 transfer coding이다. 전체 크기를 미리 알기 어려운 동적 응답과 streaming에 흔히 사용하며 요청에도 적용할 수 있다. 발신자는 같은 메시지에 `Content-Length`를 함께 보내면 안 된다.

## 왜 필요한가

HTTP/1.1은 메시지 경계를 알아야 한다(언제 응답이 끝났는지). 일반적으로 **`Content-Length`**로 알리지만, 다음 상황에선 미리 크기를 계산할 수 없다.

- 동적 생성 콘텐츠 (DB 결과 스트리밍, 템플릿 렌더링)
- 실시간 로그, 이벤트 푸시
- 무거운 압축 후 전송 (압축된 크기를 미리 모름)
- 최종 길이를 미리 알 수 없는 변환, 생성형 대용량 stream
- 프록시, 게이트웨이가 응답을 변형해 길이가 달라짐

이때 chunked 전송은 "준비되는 대로 보내고, 끝나면 종료 신호" 방식으로 동작한다.

## 동작 방식

청크 형식:
```
[청크 크기 in hex]\r\n
[청크 데이터]\r\n
[다음 청크 크기]\r\n
[청크 데이터]\r\n
0\r\n
\r\n
```

예시:
```
HTTP/1.1 200 OK
Transfer-Encoding: chunked
Content-Type: text/plain

5\r\n
Hello\r\n
6\r\n
 World\r\n
0\r\n
\r\n
```

- 각 청크 앞에 **16진수 크기**를 명시
- 마지막은 **`0` 청크**로 종료를 알림
- (옵션) 종료 청크 뒤에 **trailer field** 추가 가능 (`Trailer` Field로 사전 선언)

## Transfer-Encoding의 다른 값

| 값 | 의미 |
|---|---|
| `chunked` | 청크 단위 분할 전송 |
| `gzip` | gzip 압축 (UNIX gzip 포맷) |
| `deflate` | deflate 알고리즘 압축 |
| `compress` | LZW (거의 미사용) |

표준 문법상 `Transfer-Encoding: gzip, chunked`처럼 여러 transfer coding을 나열할 수 있지만, 현대 Web에서는 압축을 보통 `Content-Encoding`으로 표현한다. 중개자 호환성과 실제 수신자 지원을 확인하지 않은 transfer coding을 임의로 사용하지 않는다.

## Content-Length와 함께 쓰면 안 됨

RFC 9112에 따라 발신자는 `Transfer-Encoding`과 `Content-Length`를 함께 보내면 안 된다. 수신 시 `Transfer-Encoding`이 framing에서 우선하지만 모호한 메시지로 취급해야 하며, Server는 거부하거나 규칙대로 처리한 뒤 연결을 닫는다. 중개자의 해석 차이는 HTTP Request Smuggling으로 이어질 수 있다.

## HTTP/2, HTTP/3에서는?

HTTP/2부터는 **자체 프레이밍**이 청크 역할을 한다. `Transfer-Encoding: chunked`는 HTTP/1.1 전용 메커니즘이며, HTTP/2에선 사용할 수 없다(스펙상 금지). 같은 의도(스트리밍)는 HTTP/2의 DATA 프레임이 자연스럽게 처리.

## 실무 함정

### Keep-Alive와 chunked
HTTP/1.1의 지속 연결에서 전체 길이를 모르는 동적 응답은 chunked를 선택하는 경우가 많다. 구현은 buffering으로 길이를 계산하거나 연결 종료 framing을 선택할 수도 있으므로 자동 변환을 표준 보장으로 가정하지 않는다.

### 압축 임계치와 buffering
일부 Server는 응답이 N byte 이상일 때만 압축한다. 전체 길이를 모른 채 flush를 시작한 stream에서는 임계치를 미리 판단할 수 없어 구현이 일부를 buffering하거나 압축을 생략할 수 있다. chunked 자체가 임계치를 반드시 무력화하는 것은 아니므로 Server와 Proxy의 실제 동작을 측정한다.

### 프록시, 로드밸런서 호환
대부분 정상 처리하지만, 일부 구식 프록시, LB가 chunked 응답을 버퍼링해서 스트리밍 효과를 무력화할 수 있다(전체 응답을 모은 뒤 한 번에 전달).

### Content-Length 흉내내기
"청크별 크기를 미리 알고 있으니 Content-Length를 직접 보내고 싶다"는 요구가 있을 수 있다. 하지만 chunked의 본래 의도(전체 크기를 모를 때 사용)와 어긋난다. **표준을 벗어나는 커스텀 헤더보다 표준 chunked를 그대로 쓰는 게 맞다.**

## 사용 사례

- **SSE(Server-Sent Events)** — 텍스트 기반 단방향 푸시. HTTP/1.1 연결에서는 보통 chunked 사용
- **대용량 파일 다운로드** — 파일 크기를 알면 `Content-Length`로 streaming할 수 있고, 변환 때문에 최종 길이를 모르면 chunked를 사용할 수 있음
- **JSON Streaming** — `application/x-ndjson`으로 줄 단위 결과 스트리밍 (검색 결과, 로그 조회)
- **실시간 빌드/배포 로그** — CI 도구가 진행 중인 로그를 실시간 출력
- **GraphQL Subscriptions over HTTP** — 일부 구현체가 SSE로 구현하며 HTTP/1.1에서는 chunked가 쓰일 수 있음
- **LLM 토큰 streaming** — SSE나 streaming response를 사용하며 HTTP/1.1에서는 chunked, HTTP/2와 HTTP/3에서는 각 버전의 frame으로 전달할 수 있음

## 면접 체크포인트

- chunked가 필요한 상황 3가지
- `Content-Length`와 `Transfer-Encoding: chunked`를 함께 보내면 안 되는 이유 (HTTP Request Smuggling)
- 마지막 청크는 어떻게 표시하나 (`0\r\n\r\n`)
- HTTP/2에서 chunked가 사라진 이유 (자체 프레이밍)
- HTTP/1.1의 SSE, LLM 스트리밍 응답이 chunked를 사용하는 이유

## 출처
- [RFC 9112 — HTTP/1.1 메시징 (RFC Editor)](https://www.rfc-editor.org/rfc/rfc9112)
- [imprint — HTTP 분할 전송](https://imprint.tistory.com/29)
- [bbidag — Transfer-Encoding chunked](https://bbidag.tistory.com/18)
- [sg-choi — HTTP 분할 전송](https://sg-choi.tistory.com/631)
- [Inflearn 질문 — 분할 전송 관련 Q&A](https://www.inflearn.com/questions/920767/분할전송-관련-질문)

## 관련 문서
- [[HTTP-Seminar|HTTP 버전별 진화 (HTTP/1.1, 2, 3)]]
- [[HTTP-Status-Code|HTTP Status Code, Header]]
- [[HTTP-Content-Type|Content-Type, MIME Type]]
- [[Server-Sent-Events|Server-Sent Events (SSE)]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
