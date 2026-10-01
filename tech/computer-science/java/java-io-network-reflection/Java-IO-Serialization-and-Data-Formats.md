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

## NestJS와 TypeORM으로 옮길 때

NestJS DTO를 JSON representation과 domain entity로 동시에 쓰면 validation, persistence와 API evolution이 결합된다. transport DTO, use-case input과 TypeORM entity의 책임을 분리하고 mapping을 둔다. 외부 JSON은 `ValidationPipe`와 size limit을 통과시켜도 object prototype과 business invariant까지 자동으로 안전해지는 것은 아니다.

## 점검 질문

- writer와 reader가 공유하는 schema와 version은 어디에 있는가?
- process crash 중 partial write를 어떻게 감지하고 복구하는가?
- 신뢰하지 않는 byte가 native deserializer에 도달하지 않는가?
- field evolution을 양방향 호환성 test로 검증하는가?
- file이 필요한지, query/transaction이 필요한 database 문제인지 구분했는가?

## 출처

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
