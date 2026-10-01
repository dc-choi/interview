---
tags: [java, charset, unicode, utf-8, encoding]
status: done
verified_at: 2026-09-30
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

## charset별 byte 수와 한글 수용 범위

JDK 21.0.3에서 `getBytes(charset)`로 확인한 결과다. Java에서 `MS949`는 `x-windows-949`의 alias다.

| 문자 | US-ASCII | ISO-8859-1 | EUC-KR | MS949 | UTF-8 | UTF-16BE |
|---|---|---|---|---|---|---|
| `A` | 1 byte | 1 byte | 1 byte | 1 byte | 1 byte | 2 byte |
| `가` | 표현 불가 | 표현 불가 | 2 byte `B0 A1` | 2 byte `B0 A1` | 3 byte `EA B0 80` | 2 byte `AC 00` |
| `뷁` | 표현 불가 | 표현 불가 | 표현 불가 | 2 byte `94 EE` | 3 byte | 2 byte |

- ASCII는 7-bit 128자, ISO-8859-1은 ASCII에 서유럽 문자를 더한 8-bit 256자다. 둘 다 한글이 없다.
- EUC-KR은 자주 쓰는 완성형 한글 2,350자를 담고, MS949는 EUC-KR을 확장해 현대 한글 음절 11,172자 전체를 표현한다. JDK 21.0.3에서 U+AC00~U+D7A3 음절 중 EUC-KR encoder가 표현한 것은 2,350자, MS949는 11,172자였다.
- UTF-8은 code point 범위에 따라 1~4 byte를 쓴다(RFC 3629). ASCII 영역을 1 byte 그대로 보존해 기존 ASCII data와 호환되고, 영문 위주 data는 UTF-16의 절반 크기다. WHATWG Encoding Standard는 새 protocol과 format에 UTF-8을 요구한다.
- 한글만 보면 UTF-8(3 byte)이 EUC-KR, MS949, UTF-16(2 byte)보다 크다. 한글 위주 column이나 payload의 byte 상한을 추정할 때 반영한다.
- endian이 없는 `UTF-16`으로 encode하면 JDK는 BOM 2 byte를 앞에 붙여 `A`도 4 byte가 된다.
- Java `byte`는 부호가 있어 0x80 이상은 `Arrays.toString()`에서 음수로 보인다. EUC-KR `가`는 `[-80, -95]`로 출력되며 부호 없는 값은 `Byte.toUnsignedInt(b)`나 `b & 0xFF`로 확인한다.

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

## 글자가 깨지는 두 지점

encode 단계의 손실은 되돌릴 수 없다. `String.getBytes(Charset)`은 malformed input과 unmappable character를 charset의 기본 replacement byte로 항상 바꾼다. EUC-KR과 US-ASCII의 replacement는 `?`(0x3F)라서 `뷁`을 EUC-KR로 encode하면 예외 없이 `3F` 1 byte가 저장된다. 이미 `?`가 된 byte는 나중에 올바른 charset으로 decode해도 복구되지 않는다. 손실을 거부하려면 `CharsetEncoder`에 `CodingErrorAction.REPORT`를 설정해 `UnmappableCharacterException`으로 받는다.

decode 단계의 불일치는 원본 byte가 남아 있으면 charset만 맞춰 복구할 수 있다. 호환에는 방향이 있다.

- ASCII 영문은 UTF-16 계열을 제외한 대부분의 charset에서 같은 byte다. UTF-8로 encode한 `A`를 UTF-16BE로 decode하면 replacement 문자가 된다.
- EUC-KR로 encode한 한글은 MS949로 decode된다. 반대로 MS949에만 있는 `뷁`의 byte를 EUC-KR로 decode하면 replacement 문자가 된다.
- EUC-KR이나 MS949 byte를 UTF-8로 decode하거나 그 반대로 하면 깨진다.
- ISO-8859-1은 256개 byte 값을 모두 문자에 대응시켜 decode가 실패하지 않는다. `REPORT`로 설정한 decoder도 256 byte를 모두 받아들였다. 기본 charset이 ISO-8859-1인 도구나 설정을 거치면 오류 없이 한글이 깨진다.

실무에서 한글이 깨지는 대표 원인은 legacy EUC-KR, MS949 file을 UTF-8 환경에서 열거나 그 반대로 여는 경우와 ISO-8859-1로 decode하는 경우다. 진단할 때는 문제 위치의 hex dump를 본다. 원래 `?`가 아닌 글자 자리가 `3F`라면 encode 단계에서 이미 손실된 것이고, 원본 multi-byte sequence가 남아 있으면 decode charset 문제다.

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
- encode 단계에서 `?`로 바뀌는 손실을 저장 전에 거부하는가?
- form encoding과 일반 URI percent encoding을 구분했는가?

## 출처

- [Java SE 26, java.nio.charset](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/nio/charset/package-summary.html)
- [Java SE 26, String](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/lang/String.html)
- [OpenJDK, JEP 400 UTF-8 by Default](https://openjdk.org/jeps/400)
- [Java SE 26, URLEncoder](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/net/URLEncoder.html)
- [RFC 3629, UTF-8, a transformation format of ISO 10646](https://www.rfc-editor.org/rfc/rfc3629)
- [WHATWG, Encoding Standard](https://encoding.spec.whatwg.org/)
- 김영한 강사, [프로젝트 환경 구성](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244408), [컴퓨터와 데이터](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244409)
- 김영한 강사, [문자 인코딩 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244410), [문자 인코딩 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244411)
- 김영한 강사, [문자 집합 조회](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244412), [인코딩 예제 1](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244413), [인코딩 예제 2](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244414), [정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244415)

## 관련 문서

- [[Java-Byte-and-Character-Streams|Java byte stream과 character stream]]
- [[MySQL-Charset-Migration|MySQL Charset 마이그레이션]]
- [[HTTP-Content-Type|HTTP Content-Type]]
