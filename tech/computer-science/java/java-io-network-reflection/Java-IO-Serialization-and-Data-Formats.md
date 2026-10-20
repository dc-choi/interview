---
tags: [java, io, serialization, json, protobuf, persistence]
status: done
verified_at: 2026-09-30
category: "CS&프로그래밍(CS&Programming)"
aliases: ["Java Serialization and Data Formats", "Java 직렬화와 데이터 형식"]
---

# Java 직렬화와 데이터 형식

memory에 있는 object를 process 밖에 보존하려면 representation contract가 필요하다. 단순 text file, typed binary, Java native serialization, JSON과 schema 기반 format은 편의성, 이식성, 안전성과 evolution 비용이 다르다.

## 저장소 interface부터 분리한다

```java
interface MemberRepository {
    void save(Member member) throws IOException;
    List<Member> findAll() throws IOException;
}
```

memory 구현과 file 구현을 같은 interface 뒤에 두면 UI와 use case가 저장 방식에 직접 의존하지 않는다. 그러나 persistence failure를 모두 `IOException`으로 노출할지 domain-oriented error로 변환할지는 application boundary가 결정해야 한다.

## file format 선택의 진화

| 형식 | 장점 | 핵심 위험 |
|---|---|---|
| delimiter text | 사람이 읽고 만들기 쉬움 | escaping, newline, charset, schema evolution |
| `DataOutputStream` | primitive를 compact하게 순서대로 기록 | field 순서와 type을 writer/reader가 암묵적으로 공유 |
| Java `ObjectOutputStream` | object graph를 적은 code로 저장 | Java 결합, versioning, gadget 기반 역직렬화 위험 |
| JSON | 언어 중립성과 tooling이 좋음 | schema, 숫자 정밀도, unknown field 정책을 별도 관리 |
| Protocol Buffers, Avro | 명시적 schema와 compact binary | schema ID, compatibility와 code generation 운영 |
| database | query, concurrency, transaction과 recovery | schema, migration, index와 운영 비용 |

`DataInputStream.readUTF()`와 `writeUTF()`는 일반 UTF-8 text file API가 아니라 length와 modified UTF-8 형식을 공유하는 쌍이다. 다른 언어나 일반 UTF-8 parser와 호환된다고 가정하지 않는다.

## DataStream이 구분자 없이 복원되는 원리

- `writeUTF(s)`는 먼저 encode된 byte 수(문자 수가 아님)를 2 byte unsigned 값으로 쓰고 이어서 modified UTF-8 byte를 쓴다. `readUTF()`는 길이를 읽은 뒤 정확히 그만큼만 읽는다. 즉 이 쌍 자체가 length-prefixed frame이다. JDK 21.0.3에서 `writeUTF("가")`는 `00 03 EA B0 80` 5 byte였다.
- `writeInt` 4 byte, `writeLong`과 `writeDouble` 8 byte, `writeBoolean` 1 byte처럼 Java 타입의 고정 크기로 기록하므로 delimiter, 줄 단위 parsing과 `Integer.parseInt` 없이 field를 복원한다. 10억을 text로 쓰면 10 byte지만 `writeInt`는 4 byte다.
- 반드시 쓴 순서와 타입 그대로 읽는다. 경계가 어긋나도 대개 예외 없이 잘못된 값이 나오고, frame 중간에서 data가 끝나면 `EOFException`이 난다.
- 길이 field가 2 byte라 encode 결과가 65,535 byte를 넘으면 쓰는 시점에 `UTFDataFormatException`이 난다. JDK 21.0.3에서 한글 음절 21,845자는 성공했고 21,846자(65,538 byte)는 실패했다.
- modified UTF-8은 표준 UTF-8과 다르다. `\u0000`은 `C0 80` 2 byte로 쓰고, emoji 같은 보충 문자는 surrogate pair를 각각 3 byte로 써서 6 byte가 된다(표준 UTF-8은 4 byte). 다른 언어의 peer가 표준 UTF-8로 해석하면 이 문자가 깨질 수 있다.
- 남은 record를 `available()`로 판단하는 반복은 local file에서는 동작할 수 있지만, Javadoc상 `available()`은 block 없이 읽을 수 있는 byte의 추정치이고 전체 길이를 반환하지 않는 구현이 많다. record 수 header나 `EOFException` 처리로 끝을 정한다.
- 한계는 object를 통째로 다루지 못하고 field를 하나씩 기록해야 한다는 점이다.

## ObjectStream은 전체 snapshot을 다시 쓴다

- `ObjectOutputStream.writeObject(members)`는 collection 전체 graph를 한 번에 직렬화한다. 원소 class가 `Serializable`이 아니면 `NotSerializableException`이 나고, `readObject()`는 `Object`를 반환하므로 저장한 타입으로 cast한다.
- 저장할 때마다 collection 전체를 다시 쓰는 snapshot 방식이다. 기존 file 끝에 새 `ObjectOutputStream`으로 이어 쓰면 stream header가 중간에 한 번 더 기록되어, JDK 21.0.3에서는 두 번째 `readObject()`가 `StreamCorruptedException: invalid type code: AC`로 실패했다.
- file에는 data와 함께 class 정보가 들어가 크기가 커지고, class 구조가 바뀌면 아래의 호환성 문제가 생긴다.

## Java native serialization의 안전 경계

`Serializable`은 marker interface이고 object graph의 호환성에는 `serialVersionUID`, field 변화와 custom `readObject` 동작이 영향을 준다. 편리하다는 이유로 network protocol이나 장기 저장 format에 사용하면 배포 version과 Java type에 강하게 결합된다.

Oracle API는 신뢰하지 않는 data의 deserialization이 본질적으로 위험하다고 경고한다.

- 외부 입력에는 Java native deserialization을 피한다.
- 불가피한 내부 legacy 경계에는 허용 class, array length, graph depth와 byte 수를 제한하는 `ObjectInputFilter`를 둔다.
- filter가 모든 gadget과 business-level abuse를 막는다고 보지 않는다.
- 입력 크기, authentication, integrity와 replay policy를 serialization 밖에서도 적용한다.

## format보다 evolution contract가 중요하다

- field 추가, 제거와 rename 때 old reader/new writer 조합을 테스트한다.
- unknown field를 무시할지 거부할지 명시한다.
- money, time, identifier와 binary의 의미를 type과 schema로 고정한다.
- snapshot file을 transaction log처럼 사용하지 않는다. crash 중 partial write와 concurrent writer를 처리해야 한다.
- file을 교체할 때 temp file, sync, atomic move 가능 여부와 recovery sequence를 설계한다.

## JSON 파싱 성공과 상호운용성은 다르다

부분 검증(2026-10-13): 이 절은 RFC 8259의 문법, 객체, 숫자와 파서 규칙을 대조했다. 기존 Java API 설명의 검증 날짜는 유지한다.

- **중복 키:** 객체 이름의 유일성은 RFC의 `SHOULD`다. 중복을 모든 파서가 거부해야 한다는 뜻은 아니다. 마지막 값만 남기거나 오류를 내는 등 구현이 달라질 수 있으므로 입력 계약에서 거부 정책을 정한다.
- **문법 확장:** 주석과 trailing comma는 표준 JSON 문법에 없다. 파서는 확장을 허용할 수 있지만, 생성기는 표준 문법을 따라야 한다. 개발 도구가 읽었다는 사실만으로 다른 소비자와 호환된다고 보지 않는다.
- **숫자:** 구현은 범위와 정밀도를 제한할 수 있다. binary64 기반 소비자 간 정수값 일치 범위는 `[-(2^53)+1, (2^53)-1]`다. 이를 넘는 식별자는 문자열 등 손실 없는 표현을 계약으로 정하고 실제 소비자의 변환을 확인한다.
- **순서와 크기:** 객체 필드 순서에 의미를 의존하지 않는다. 입력 크기와 중첩 깊이 제한은 파서마다 달라질 수 있으므로 수신 경계에서 확인한다.

적용 점검: 중복 키, 주석, trailing comma, 큰 정수와 깊은 중첩을 각각 입력해 생산자와 소비자의 결과를 비교한다. 관대한 파싱을 켜는 것과 업무상 허용할 데이터를 검증하는 것은 별도 결정이다.

## JDK 내장 JSON API (JEP 540, incubator)

부분 검증(2026-10-21): JEP 540과 JEP 11 본문, JDK 28 프로젝트 페이지, early access API 문서와 JDK 팀 발표를 대조했다. 이번 대조는 이 절에 한정하므로 frontmatter 검증일(2026-09-30)은 유지한다.

외부 라이브러리를 들이기에는 작은 일을 겨냥한 API다. JEP는 네트워크로 받은 응답 body 읽기와 JDK 자체의 JSON 처리를 예로 들고, 발표는 설정 파일에서 값 몇 개 읽기, HTTP 요청 body 만들기, 테스트에서 응답 확인과 JShell 탐색을 더한다. 데이터 바인딩, streaming, 여러 parsing 설정과 문법 확장은 목표에서 뺐고, Jackson 같은 기존 라이브러리를 대체하려는 API가 아니다.

- **상태:** 2026-10-21 확인 기준 JEP 540 `Simple JSON API (Incubator)`는 Status Integrated, Release 28이다. JDK 28은 GA 전이라 early access build로 시험한다. incubator module `jdk.incubator.json`은 class path 애플리케이션에서 기본으로 resolve되지 않아 `--add-modules jdk.incubator.json`이 필요하고, resolve되면 compile, link와 run 시점에 경고가 난다. incubator API는 이후 릴리스에서 바뀌거나 제거될 수 있고, 정식 API로 승격되면 패키지 이름이 바뀌어 incubator가 아닌 module에서 export된다.
- **모델:** `JsonValue`는 `JsonString`, `JsonNumber`, `JsonBoolean`, `JsonNull`, `JsonObject`, `JsonArray`만 허용하는 sealed interface이고, 인스턴스는 불변이며 thread safe하다. `Json.parse`는 `String`과 `char[]`를 받아 tree를 만든다. `toString()`은 공백 없는 compact JSON을, `Json.toDisplayString(value, indent)`는 들여쓴 출력을 만든다.
- **탐색:** `get(String)`과 `get(int)`는 대상 타입이 아니거나 member, element가 없으면 `JsonValueException`을 던진다. 선택 필드는 `tryGet(String)`이 `Optional`로 돌려주며, 객체가 아닌 값에서 호출하면 예외다. `tryValue()`는 `JsonNull`이면 빈 `Optional`을 돌려준다. 발표 시연에서는 철자가 다른 key를 따라간 `get` 체인이 첫 누락 지점에서 바로 실패하고 메시지에 찾던 이름, 경로와 문서 offset이 담겼다. API 문서는 `JsonValueException`의 메시지 형식을 정하지 않는다.
- **변환과 숫자:** `asString`, `asInt`, `asLong`, `asDouble`, `asBoolean`, `asMap`, `asList`는 타입이 맞을 때만 값을 주며, 타입이 맞지 않으면 `JsonValueException`을 던진다. 문자열을 숫자로 parse하는 식의 강제 변환은 하지 않는다. `asInt`와 `asLong`은 정확히 표현되는 정수만 받는다. `123.0`과 `234.56E2`의 `asInt`는 성공하고 `345.6`과 int 범위를 넘는 `2147483648`은 실패한다. `asDouble`은 가장 가까운 double로 반올림하고 범위를 벗어나면 예외다. `asBigDecimal`은 없으므로 임의 정밀도는 `new BigDecimal(number.toString())`으로 얻는다. `asMap`과 `asList`는 수정할 수 없는 collection을 돌려준다.
- **엄격한 입력:** 주석과 trailing comma를 받지 않는다. RFC 8259가 `SHOULD`로 둔 이름 유일성을 parse 단계에서 강제해, 중복 member name은 값과 관계없이 모두 거부한다. JEP는 중복 이름을 가진 객체의 해석이 본질적으로 모호하다는 이유를 든다. 실패는 unchecked `JsonParseException`이다. JEP는 이 예외가 문서 root부터의 경로와 문서 안 위치를 알려 준다고 설명하고, API 문서는 0부터 세는 `getErrorLine()`과 `getErrorPosition()`(줄 안의 UTF-16 code unit 기준)으로 위치를 제공한다.
- **위 절과의 관계:** 위 절의 문제 중 중복 이름과 문법 확장은 입력 거부로 처리한다. 숫자는 parse 때 원문 표현을 그대로 보존한다. `asInt`와 `asLong`은 정확히 표현되지 않으면 예외를 내지만 `asDouble`은 예외 없이 반올림하고, `asLong`이 그대로 받는 2^53 초과 정수는 binary64 소비자에서 값이 달라질 수 있으므로 숫자 계약은 따로 정한다. RFC 8259는 객체를 순서 없는 모음으로 정의한다. `asMap`의 구현 노트는 JDK 구현의 `JsonObject`가 member의 등장 순서를 보존한다고 적지만 명세 보장은 아니다. JEP와 API 문서에서 입력 크기와 중첩 깊이 제한은 찾지 못했으므로 수신 경계에서 별도로 확인한다.
- **범위:** 입력 문서가 `String`이나 `char[]`로 메모리에 들어간다고 가정한다. 생성은 `JsonObject.of(Map)`, `JsonArray.of(List)`, `JsonString.of(String)`처럼 값을 조립한다. JEP는 incubation 동안 JSON 문서의 생성과 변형(transforming) 사용 사례를 더 모으겠다고 밝혔고, 발표자는 생성 쪽이 parsing보다 덜 다듬어졌다고 말했다.

```java
// 조각: import는 파일 맨 위에 두고 나머지는 main 안의 문장이다(compact source file 기준).
// event는 다른 문서를 parse한 JsonValue다. 실행 예(JDK 28 EA): java --add-modules jdk.incubator.json Config.java
import jdk.incubator.json.*;

JsonValue config = Json.parse(Files.readString(Path.of("config.json")));
Charset charset = Charset.forName(config.get("charset").asString());
// port가 없거나 JSON null이면 8080, 문자열 "8080"이면 JsonValueException
int port = config.tryGet("port").flatMap(JsonValue::tryValue).map(JsonValue::asInt).orElse(8080);

// 예전 문자열 ID와 새 숫자 ID를 함께 받는 경우
long id = switch (event.get("id")) {
    case JsonNumber n -> n.asLong();
    case JsonString s -> Long.parseLong(s.asString());
    default -> throw new IllegalArgumentException("id는 숫자나 문자열이어야 한다");
};
```

선택 기준은 다음과 같다(적용 판단).

- 단발성 도구, JShell 탐색과 incubator 변경을 감수할 수 있는 일회성 검증처럼 의존성 추가가 부담인 일은 이 API로 충분한지 먼저 본다. JDK 진단 도구가 내는 [[Java-Threads-Lifecycle-and-Cancellation#Thread dump로 멈춘 서버 읽기|JSON 스레드 덤프]]를 읽는 작은 도구도 같은 범주다.
- 객체 매핑, streaming, 큰 문서, 주석이 필요한 설정과 관대한 입력 수용은 외부 라이브러리나 다른 설정 형식의 영역이다.
- 제품 코드와 그 저장소의 테스트는 `--add-modules` 빌드 설정, 경고와 다음 릴리스의 API 변경을 함께 떠안는다. 이를 감수할 수 없으면 정식 API가 될 때까지 기존 라이브러리를 유지한다.

## NestJS와 TypeORM으로 옮길 때

NestJS DTO를 JSON representation과 domain entity로 동시에 쓰면 validation, persistence와 API evolution이 결합된다. transport DTO, use-case input과 TypeORM entity의 책임을 분리하고 mapping을 둔다. 외부 JSON은 `ValidationPipe`와 size limit을 통과시켜도 object prototype과 business invariant까지 자동으로 안전해지는 것은 아니다.

## 점검 질문

- writer와 reader가 공유하는 schema와 version은 어디에 있는가?
- process crash 중 partial write를 어떻게 감지하고 복구하는가?
- 신뢰하지 않는 byte가 native deserializer에 도달하지 않는가?
- field evolution을 양방향 호환성 test로 검증하는가?
- file이 필요한지, query/transaction이 필요한 database 문제인지 구분했는가?

## 출처

- [IETF, RFC 8259: The JavaScript Object Notation (JSON) Data Interchange Format](https://www.rfc-editor.org/rfc/rfc8259)
- [OpenJDK, JEP 540: Simple JSON API (Incubator)](https://openjdk.org/jeps/540) — 2026-10-21 상태, 목표와 비목표, 탐색과 숫자 변환 규칙, 중복 이름 거부
- [OpenJDK, JEP 11: Incubator Modules](https://openjdk.org/jeps/11) — 기본 미resolve, 경고, 이후 변경 또는 제거 가능성과 승격 시 패키지 이름 변경
- [OpenJDK, JDK 28](https://openjdk.org/projects/jdk/28/) — 2026-10-21 targeted JEP 목록
- [JDK 28 Early Access API, JsonValue](https://download.java.net/java/early_access/jdk28/docs/api/jdk.incubator.json/jdk/incubator/json/JsonValue.html) — 불변성, thread safety와 변환 메서드
- [JDK 28 Early Access API, jdk.incubator.json 패키지](https://download.java.net/java/early_access/jdk28/docs/api/jdk.incubator.json/jdk/incubator/json/package-summary.html) — `Json.parse`, `toDisplayString`과 `of` 팩터리
- [JDK 28 Early Access API, JsonNumber](https://download.java.net/java/early_access/jdk28/docs/api/jdk.incubator.json/jdk/incubator/json/JsonNumber.html) — 원문 표현 보존과 `asDouble`의 반올림, 범위 초과 예외
- [JDK 28 Early Access API, JsonValueException](https://download.java.net/java/early_access/jdk28/docs/api/jdk.incubator.json/jdk/incubator/json/JsonValueException.html) — 타입 불일치, 부재 값과 손실 변환에서 던지는 조건, 메시지 형식 미지정
- [JDK 28 Early Access API, JsonParseException](https://download.java.net/java/early_access/jdk28/docs/api/jdk.incubator.json/jdk/incubator/json/JsonParseException.html) — 문법 오류와 중복 이름, 0부터 세는 줄과 위치
- [Everyday JSON in Java — Devoxx Belgium 2026, Viktor Klang, Alan Bateman](https://www.youtube.com/watch?v=Ws_t0rxnv4Y) — 사용 사례, 탐색 실패 시연, 생성 API 성숙도와 엄격한 입력 정책에 대한 발표자 설명(개인 견해 포함)
- [Java SE 26, ObjectInputFilter](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/ObjectInputFilter.html)
- [Java SE 26, Serializable](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/Serializable.html)
- [Java SE 26, DataOutputStream](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/DataOutputStream.html)
- [Java SE 26, DataInput](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/DataInput.html)
- [Java SE 26, InputStream](https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/io/InputStream.html)
- 김영한 강사, [기타 stream](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244431)
- 김영한 강사, [memory 회원 저장소](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244434), [file 회원 저장소](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244435)
- 김영한 강사, [DataStream](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244436), [ObjectStream](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244437), [XML, JSON과 database](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244438), [정리](https://www.inflearn.com/courses/lecture?courseId=334977&unitId=244439)

## 관련 문서

- [[Domain-ORM-Mapper|Domain과 ORM Mapper]]
- [[API-Conventions|API Contract와 Convention]]
- [[NestJS-Database|NestJS와 TypeORM database 경계]]
