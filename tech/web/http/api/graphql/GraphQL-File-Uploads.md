---
tags: [web, graphql, api, file-upload, security]
status: done
verified_at: 2026-07-20
category: "웹&네트워크(Web&Network)"
aliases: ["GraphQL File Uploads", "GraphQL 파일 업로드", "graphql multipart request", "signed URL upload"]
---

# GraphQL 파일 업로드

GraphQL은 파일 업로드를 염두에 두고 설계되지 않았다. 스펙은 전송과 직렬화에 중립이지만 실무 주류인 JSON은 바이너리를 직접 담지 못하고, base64로 감싸는 우회는 비효율적이며 스트리밍 처리가 어렵다. 그래서 업로드를 지원하려면 전송 계층을 확장해야 하고, 그 과정에 보안과 신뢰성 리스크가 따라온다. 공식 권장은 업로드를 GraphQL 밖으로 빼는 signed URL 패턴이다.

## multipart 관례와 그 위치

- 바이너리 전송엔 multipart/form-data가 흔한 선택이고, GraphQL에서는 커뮤니티 관례인 **GraphQL multipart request specification**이 가장 널리 쓰인다. 여러 언어와 프레임워크에 구현체가 있다.
- 스펙(언어 명세)의 일부가 아니라 커뮤니티 관례라서, 도입하는 쪽이 아래 리스크를 직접 막아야 한다.

## 리스크 5가지

### 1. 변수 재사용으로 메모리 고갈
GraphQL 연산은 같은 변수를 여러 번 참조할 수 있다. 업로드 변수가 재사용되면 밑단의 스트림이 여러 번 읽히거나 조기에 소진되어 오동작이나 메모리 고갈로 이어진다. 완화: trusted document나 validation 규칙으로 업로드 변수를 정확히 1회만 참조하게 강제한다.

### 2. 실패한 연산의 스트림 누수
validation 실패나 인가 중단으로 실행이 일찍 끝나면 업로드 스트림이 소비되지 않은 채 남는다. 서버가 이걸 버퍼링하거나 붙들고 있으면 메모리 누수다. 완화: 요청이 끝나면 소비 여부와 무관하게 모든 스트림을 종료한다. 대안으로 수신 즉시 임시 저장소에 쓰고 resolver에는 참조(파일명)만 넘긴 뒤, 성공이든 실패든 요청 완료 후 정리한다.

### 3. CSRF
multipart/form-data는 CORS 분류상 simple request라, 비허용 헤더가 따로 없는 요청은 preflight를 태우지 않는다. 명시적 CSRF 보호가 없으면 악성 origin의 업로드를 그대로 수용하게 된다.

### 4. 과대, 잉여 페이로드
아주 큰 파일이나, 쓰이지 않는 변수 이름에 매달린 잉여 파일이 서버 버퍼를 채울 수 있다. 완화: 요청 크기 상한을 걸고, multipart payload의 map 필드에서 참조되지 않는 파일은 거부한다.

### 5. 신뢰할 수 없는 메타데이터
파일명, MIME 타입, 내용 어느 것도 신뢰하지 않는다. 파일명은 path traversal, 주입 방지를 위해 sanitize하고, 선언된 MIME과 독립적으로 타입을 sniff해 불일치를 거부하며, 내용을 검증한다(zip bomb, 조작된 PDF 같은 포맷별 익스플로잇 존재).

## 권장: signed URL 패턴

가장 안전하고 확장성 있는 접근은 GraphQL로 파일을 아예 흘리지 않는 것이다.

1. mutation으로 스토리지 제공자(예: Amazon S3)의 signed upload URL을 발급받는다.
2. 클라이언트가 그 URL로 파일을 직접 업로드한다.
3. 두 번째 mutation으로 업로드된 파일을 앱 데이터와 연결한다 (또는 Lambda 같은 자동 트리거 프로세스가 대신 한다).

1, 2단계만 수행하는 공격자가 스토리지를 채우지 못하게 업로드는 단기 보존만 하고, 3단계 처리 시점에 영구 저장소로 옮긴다. 서버가 바이너리를 만지지 않아 책임이 깨끗이 분리된다.

## 그래도 GraphQL로 받아야 한다면

- 관리가 잘 되는 multipart request spec 구현체를 쓴다.
- 업로드 변수 1회 참조 규칙을 강제한다.
- 메모리에 버퍼링하지 말고 디스크나 클라우드 스토리지로 스트리밍한다.
- 요청 종료 시 모든 스트림을 종료한다 (소비 여부 무관).
- 엄격한 요청 크기 제한을 걸고 모든 필드를 검증한다.
- 파일명, 타입, 내용을 신뢰하지 않는 데이터로 다룬다.

## 흔한 실수

- base64-in-JSON으로 큰 파일을 보냄 (비효율, 스트리밍 불가).
- 업로드 변수의 중복 참조를 막지 않음.
- multipart가 CORS preflight를 태울 거라 가정 (simple request라 안 탄다).
- map 필드에 참조되지 않은 파일을 수용.
- 선언된 MIME 타입을 그대로 신뢰.

## 면접 체크포인트

- GraphQL이 파일 업로드에 부적합한 이유 (JSON 바이너리 한계, 스트리밍)
- signed URL 3단계 패턴과 책임 분리, 고아 업로드의 단기 보존
- multipart가 simple request라 생기는 CSRF 표면
- 스트림 누수 시나리오 (validation 실패, 인가 중단)와 종료 보장

## 관련 문서

- [[GraphQL|GraphQL 개념 (단점: 파일 업로드 제한)]]
- [[GraphQL-Security|보안 (trusted document, demand control)]]
- [[GraphQL-Caching|캐싱과 HTTP 전송 (전송 규약)]]
- [[S3-File-Upload|S3 Presigned URL 업로드 정본 (발급 흐름, Lambda 후처리)]]
- [[S3-Security-Patterns|S3 보안 패턴 (단기 TTL, 고아 업로드 정리)]]

## 출처

- [graphql.org — Handling File Uploads in GraphQL](https://graphql.org/learn/file-uploads/)
- [GraphQL multipart request specification — jaydenseric](https://github.com/jaydenseric/graphql-multipart-request-spec)
