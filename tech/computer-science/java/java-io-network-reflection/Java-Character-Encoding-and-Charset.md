---
tags: [java, charset, unicode, utf-8, encoding]
status: done
verified_at: 2026-08-04
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Charset", "Java 문자 인코딩"]
---

# Java 문자 인코딩과 Charset

문자열은 곧 byte가 아니다. Unicode code point를 어떤 byte sequence로 표현할지 정한 규칙이 charset이고, 문자를 byte로 바꾸는 과정이 encoding, 반대가 decoding이다. 저장소, network, source code가 같은 charset contract를 공유하지 않으면 글자가 깨진다.

## 단위를 분리한다

| 단위 | 의미 | Java에서 보는 예 |
|---|---|---|
| byte | 저장과 전송의 8-bit 단위 | `byte`, `byte[]`, `ByteBuffer` |
| code point | Unicode가 문자에 부여한 값 | `String.codePoints()` |
| UTF-16 code unit | Java `char`와 `String.length()`의 단위 | supplementary 문자는 두 `char` 사용 가능 |
| encoded byte | UTF-8, EUC-KR 같은 charset 결과 | `text.getBytes(charset)` |

`String.length()`를 사용자에게 보이는 글자 수로 해석하면 emoji, 결합 문자와 grapheme cluster에서 틀릴 수 있다.

## 호환성은 부분적이다

- US-ASCII는 7-bit 문자 집합이고 UTF-8은 그 byte 표현을 보존한다.
- EUC-KR, windows-949와 UTF-8은 같은 한글도 다른 byte sequence를 만든다. windows-949는 EUC-KR과 겹치는 영역이 있지만 동일한 charset은 아니다.
- UTF-16BE와 UTF-16LE는 byte order가 다르다. 이름에 endian이 없는 UTF-16은 byte order mark 규칙까지 함께 확인해야 한다.
- 잘못된 charset으로 decode한 뒤 다시 encode하면 원본 byte를 복원하지 못할 수 있다.

## Java에서는 경계마다 명시한다

```java
byte[] payload = text.getBytes(StandardCharsets.UTF_8);
String decoded = new String(payload, StandardCharsets.UTF_8);
```

`Charset.forName()`은 설정에서 받은 동적 이름에, `StandardCharsets.UTF_8` 같은 constant는 고정 protocol에 적합하다. 지원 목록은 `Charset.availableCharsets()`, 현재 기본값은 `Charset.defaultCharset()`으로 확인한다.

JEP 400에 따라 JDK 18부터 표준 API의 기본 charset은 UTF-8이 원칙이다. 하지만 다음 이유로 외부 경계에는 여전히 charset을 명시한다.

- JDK 17 이하와의 data 교환 또는 `-Dfile.encoding=COMPAT` 호환 모드
- 기존 file과 외부 system이 정한 legacy encoding
- console의 `stdin.encoding`, `stdout.encoding`처럼 별도 규칙을 쓰는 I/O
- protocol의 `Content-Type`, database column과 file format이 가진 독립 contract

## decoder 오류 정책도 contract다

`new String(bytes, charset)` 같은 편의 API는 malformed 또는 unmappable input을 replacement 문자로 바꿀 수 있다. 손실을 허용하면 안 되는 import, signature 검증과 protocol parser에서는 `CharsetDecoder`의 `CodingErrorAction.REPORT`를 고려한다.

```java
var decoder = StandardCharsets.UTF_8.newDecoder()
    .onMalformedInput(CodingErrorAction.REPORT)
    .onUnmappableCharacter(CodingErrorAction.REPORT);
```

## URL encoding과 혼동하지 않는다

percent encoding은 URI component에서 허용되지 않는 byte를 `%HH`로 표현하는 규칙이다. Java의 `URLEncoder`와 `URLDecoder`는 이름과 달리 HTML form의 `application/x-www-form-urlencoded` 형식용이며, space를 `+`로 처리한다. 전체 URL을 통째로 넣지 말고 path segment, query value처럼 component별 규칙을 적용한다.

## Node.js와 NestJS로 옮길 때

| Java | Node.js |
|---|---|
| `byte[]` | `Buffer`, `Uint8Array` |
| `new String(bytes, UTF_8)` | `buffer.toString('utf8')`, `TextDecoder` |
| `text.getBytes(UTF_8)` | `Buffer.from(text, 'utf8')`, `TextEncoder` |

request body를 이미 framework가 decode했다면 임의로 다시 decode하지 않는다. raw signature 검증이 필요하면 middleware와 parser가 변환하기 전 byte를 보존한다.

## 점검 질문

- 이 field의 단위가 byte, code point, UTF-16 code unit 중 무엇인가?
- encoding 이름은 file, HTTP header, database schema 중 어디서 합의되는가?
- invalid byte를 거부할지 replacement로 복구할지 정했는가?
- form encoding과 일반 URI percent encoding을 구분했는가?

## 출처

- [Java SE 26, java.nio.charset](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/nio/charset/package-summary.html)
- [OpenJDK, JEP 400 UTF-8 by Default](https://openjdk.org/jeps/400)
- [Java SE 26, URLEncoder](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/URLEncoder.html)
- 김영한 강사, [프로젝트 환경 구성](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244408), [컴퓨터와 데이터](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244409)
- 김영한 강사, [문자 인코딩 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244410), [문자 인코딩 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244411)
- 김영한 강사, [문자 집합 조회](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244412), [인코딩 예제 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244413), [인코딩 예제 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244414), [정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244415)

## 관련 문서

- [[Java-Byte-and-Character-Streams|Java byte stream과 character stream]]
- [[MySQL-Charset-Migration|MySQL Charset 마이그레이션]]
- [[HTTP-Content-Type|HTTP Content-Type]]
