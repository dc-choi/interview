---
tags: [web, network, http, streaming]
status: done
category: "웹&네트워크(Web&Network)"
aliases: ["HTTP Chunked Transfer", "Transfer-Encoding chunked", "분할 전송"]
---

# HTTP 분할 전송 (Chunked Transfer Encoding)

응답 본문을 여러 청크(chunk)로 나누어 순차적으로 전송하는 HTTP/1.1 기능. 응답 전체 크기를 미리 알 수 없는 동적·스트리밍 콘텐츠에 사용한다. 헤더는 `Transfer-Encoding: chunked`, **`Content-Length`는 없다**.

## 왜 필요한가

HTTP/1.1은 메시지 경계를 알아야 한다(언제 응답이 끝났는지). 일반적으로 **`Content-Length`**로 알리지만, 다음 상황에선 미리 크기를 계산할 수 없다.

- 동적 생성 콘텐츠 (DB 결과 스트리밍, 템플릿 렌더링)
- 실시간 로그·이벤트 푸시
- 무거운 압축 후 전송 (압축된 크기를 미리 모름)
- 대용량 파일 다운로드 (전체를 메모리에 적재하지 않고 흘려보냄)
- 프록시·게이트웨이가 응답을 변형해 길이가 달라짐

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
- (옵션) 종료 청크 뒤에 **트레일러 헤더** 추가 가능 (`Trailer:` 헤더로 사전 선언)

## Transfer-Encoding의 다른 값

| 값 | 의미 |
|---|---|
| `chunked` | 청크 단위 분할 전송 |
| `gzip` | gzip 압축 (UNIX gzip 포맷) |
| `deflate` | deflate 알고리즘 압축 |
| `compress` | LZW (거의 미사용) |
| `identity` | 인코딩 없음 (기본값) |

`chunked`와 압축을 함께 쓸 수 있다: `Transfer-Encoding: gzip, chunked`.

## Content-Length와 함께 쓰면 안 됨

RFC 7230에 따라 **`Transfer-Encoding`이 있으면 `Content-Length`는 무시·금지**된다. 둘 다 보내면 일부 서버·프록시는 보안 취약점(HTTP Request Smuggling)으로 이어질 수 있다.

## HTTP/2·HTTP/3에서는?

HTTP/2부터는 **자체 프레이밍**이 청크 역할을 한다. `Transfer-Encoding: chunked`는 HTTP/1.1 전용 메커니즘이며, HTTP/2에선 사용할 수 없다(스펙상 금지). 같은 의도(스트리밍)는 HTTP/2의 DATA 프레임이 자연스럽게 처리.

## 실무 함정

### Keep-Alive와 chunked
HTTP/1.1 `keep-alive`(기본 동작)에서 동적 응답은 자동으로 chunked로 전환되는 경우가 많다. 응답 헤더에 `Content-Length`가 안 보이고 `Transfer-Encoding: chunked`만 보이는 게 정상.

### 압축 임계치(min-response-size) 무력화
일부 서버 설정에 "응답이 N바이트 이상일 때만 압축"하는 옵션이 있다. 그러나 chunked로 흘려보낼 땐 **전체 크기를 모르므로 임계치 검사가 불가능** → 모든 응답이 압축되거나, 모든 응답이 압축되지 않거나로 갈린다. 설정이 의도대로 동작하지 않을 수 있음.

### 프록시·로드밸런서 호환
대부분 정상 처리하지만, 일부 구식 프록시·LB가 chunked 응답을 버퍼링해서 스트리밍 효과를 무력화할 수 있다(전체 응답을 모은 뒤 한 번에 전달).

### Content-Length 흉내내기
"청크별 크기를 미리 알고 있으니 Content-Length를 직접 보내고 싶다"는 요구가 있을 수 있다. 하지만 chunked의 본래 의도(전체 크기를 모를 때 사용)와 어긋난다. **표준을 벗어나는 커스텀 헤더보다 표준 chunked를 그대로 쓰는 게 맞다.**

## 사용 사례

- **SSE(Server-Sent Events)** — 텍스트 기반 단방향 푸시. 내부적으로 chunked 사용
- **대용량 파일 다운로드** — 메모리에 전체 적재 없이 디스크에서 흘려보냄
- **JSON Streaming** — `application/x-ndjson`으로 줄 단위 결과 스트리밍 (검색 결과, 로그 조회)
- **실시간 빌드/배포 로그** — CI 도구가 진행 중인 로그를 실시간 출력
- **GraphQL Subscriptions over HTTP** — 일부 구현체가 SSE/chunked로 구현
- **LLM 토큰 스트리밍** — ChatGPT 같은 LLM API가 응답 토큰을 chunked로 흘려보냄

## 면접 체크포인트

- chunked가 필요한 상황 3가지
- `Content-Length`와 `Transfer-Encoding: chunked`를 함께 보내면 안 되는 이유 (HTTP Request Smuggling)
- 마지막 청크는 어떻게 표시하나 (`0\r\n\r\n`)
- HTTP/2에서 chunked가 사라진 이유 (자체 프레이밍)
- SSE·LLM 스트리밍 응답이 chunked인 이유

## 출처
- [imprint — HTTP 분할 전송](https://imprint.tistory.com/29)
- [bbidag — Transfer-Encoding chunked](https://bbidag.tistory.com/18)
- [sg-choi — HTTP 분할 전송](https://sg-choi.tistory.com/631)
- [Inflearn 질문 — 분할 전송 관련 Q&A](https://www.inflearn.com/questions/920767/분할전송-관련-질문)

## 관련 문서
- [[HTTP-Seminar|HTTP 버전별 진화 (HTTP/1.1·2·3)]]
- [[HTTP-Status-Code|HTTP Status Code · Header]]
- [[HTTP-Content-Type|Content-Type · MIME Type]]
- [[Realtime-Chat-Architecture|실시간 채팅 아키텍처]]
