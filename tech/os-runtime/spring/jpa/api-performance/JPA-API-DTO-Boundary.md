---
tags: [jpa, api, dto, dirty-checking, http-methods]
status: done
verified_at: 2026-09-30
category: "OS & Runtime"
aliases: ["JPA API DTO", "JPA Entity API Boundary"]
---

# JPA DTO와 API 경계

JPA entity는 persistence model이고 request/response DTO는 외부 계약이다. 둘을 분리해야 table과 연관관계 변경이 API에 번지지 않고, 입력 규칙과 출력 필드를 use case별로 통제할 수 있다.

## Entity를 직접 받지 않는다

Request body를 entity에 바로 bind하면 client가 수정하면 안 되는 field까지 바인딩되는 mass assignment, entity 전체에 섞이는 API validation, persistence 구조 노출이 생긴다. Endpoint별 request DTO에 허용할 field와 validation을 선언하고 application layer에서 명시적으로 변환한다.

```java
public record UpdateMemberRequest(
    @NotBlank String name
) {}

@Transactional
public void updateMember(long id, UpdateMemberRequest request) {
    Member member = memberRepository.findById(id).orElseThrow();
    member.changeName(request.name());
}
```

Managed entity는 transaction 안에서 상태를 바꾸면 flush 때 dirty checking으로 `UPDATE`된다. Update method가 entity를 다시 반환하도록 강제할 필요는 없고, 변경 후 표현이 필요하면 response 목적에 맞춰 다시 읽거나 같은 transaction에서 DTO를 만든다.

## Entity를 직접 반환하지 않는다

직접 직렬화에는 다음 문제가 겹친다.

- 새 field나 민감 field가 의도치 않게 API에 노출된다.
- Lazy association 접근이 serializer에서 N+1을 만든다.
- 양방향 관계가 순환하거나 payload를 과도하게 키운다.
- Persistence graph 변경이 public API의 breaking change가 된다.

`@JsonIgnore`나 Hibernate 전용 Jackson module은 증상을 일부 가릴 뿐 계약 경계를 만들지 않는다. 필요한 값을 transaction/query service 안에서 response DTO로 변환한다. Nested 응답도 entity가 아니라 nested DTO를 사용한다.

```java
public record MemberResponse(long id, String name) {
    static MemberResponse from(Member member) {
        return new MemberResponse(member.getId(), member.getName());
    }
}
```

목록 자체를 JSON array로 반환할지 `items`, `count`, `nextCursor` 같은 envelope로 감쌀지는 API의 진화 계획에 따른다. Envelope는 metadata 확장에 유리하지만 모든 응답의 의무는 아니다.

## 직접 직렬화가 단계별로 실패하는 방식

주문 entity를 그대로 반환하면 실패가 순서대로 드러나고, 증상 하나를 막는 설정이 다음 실패로 이어진다.

1. 순환 참조: `Order`에서 `Member`로, `Member.orders`에서 다시 `Order`로 가는 양방향 연관을 serializer가 따라가 무한 루프에 빠진다. 양방향 관계마다 한쪽에 `@JsonIgnore`를 달아야 멈춘다.
2. Proxy 직렬화 오류: 순환을 끊으면 LAZY to-one field에 들어 있는 Hibernate proxy를 serializer가 일반 bean으로 다루지 못해 type definition 오류가 난다.
3. Hibernate 전용 Jackson module: 기본 설정(`FORCE_LAZY_LOADING` false)은 초기화되지 않은 lazy 연관을 `null`로 직렬화한다. 응답에 무엇이 담기는지가 앞선 코드가 어떤 proxy를 건드렸는지에 좌우된다. `FORCE_LAZY_LOADING`을 켜면 도달 가능한 lazy 연관을 모두 읽어 이 API에 필요 없는 collection까지 query가 나간다. Serializer가 fetch plan을 정하는 셈이다.
4. EAGER 전환: 모든 use case에서 항상 과조회하고 예측하기 어려운 추가 query를 만든다.

Module은 Hibernate major마다 다르다(`Hibernate5JakartaModule`, `Hibernate6Module`, Jackson 2.20부터 `Hibernate7Module`, Jackson 3용은 `tools.jackson.datatype` group). 어느 module을 써도 결론은 같다. 응답에 필요한 graph를 transaction 안에서 명시적으로 읽고 DTO로 변환한다. 다른 ORM과 serializer 조합에서도 순환, 미초기화 proxy, 강제 로딩에 의한 과조회를 같은 점검 항목으로 쓴다.

## PUT, PATCH와 command 의미

HTTP method는 controller annotation 이름이 아니라 resource semantics로 정한다.

| Method | 의도 | DTO 설계 |
|---|---|---|
| `POST` | Target resource가 요청을 자체 semantics로 처리 | Create 또는 action command |
| `PUT` | Target resource의 현재 상태를 representation으로 생성하거나 교체 | 완전한 replacement 표현 |
| `PATCH` | Patch document에 적힌 부분 변경 적용 | 변경 형식과 충돌 규칙 명시 |

일부 field만 받아 기존 entity 일부를 바꾸는 endpoint를 관습적으로 `PUT`이라 부르면 client와 intermediary가 기대하는 교체 의미와 어긋난다. Partial update라면 PATCH document format, null과 누락의 차이, optimistic concurrency를 함께 설계한다.

## DTO 종류를 구분한다

- Request DTO는 입력 허용 목록과 validation을 표현한다.
- Response DTO는 공개 contract와 serialization shape를 표현한다.
- Application command/query는 HTTP와 독립적인 use case 입력과 출력을 표현할 수 있다.
- Projection DTO는 특정 query 결과의 모양이며 domain entity가 아니다.

단순 서비스는 request를 application layer까지 전달할 수 있다. REST, message, batch처럼 진입점이 늘어나면 request를 내부 command로 변환해 transport 의존성을 끊는다. 더 넓은 계층 선택은 [[DTO-Layering]]에 둔다.

## 출처

- [RFC 9110, PUT](https://www.rfc-editor.org/rfc/rfc9110.html#name-put)
- [RFC 5789, PATCH](https://www.rfc-editor.org/rfc/rfc5789.html)
- [Jakarta Persistence 3.2, Entity Operations](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#a1060)
- [jackson-datatype-hibernate, README](https://github.com/FasterXML/jackson-datatype-hibernate/blob/2.x/README.md)
- [jackson-datatype-hibernate 2.x, `Hibernate7Module` source](https://github.com/FasterXML/jackson-datatype-hibernate/blob/2.x/hibernate7/src/main/java/com/fasterxml/jackson/datatype/hibernate7/Hibernate7Module.java)
- 강의: [회원 등록 API](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24318), [회원 수정 API](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24319), [회원 조회 API](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24320)
- 강의: [간단한 주문 조회 V1, 엔티티 직접 노출](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24325), [V2, 엔티티를 DTO로 변환](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24326), [주문 조회 V1, 엔티티 직접 노출](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24330), [수업 자료](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24108)

## 관련 문서

- [[JPA-API-Performance|JPA API 조회 성능]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
- [[DTO-Layering|DTO 레이어 스코프]]
- [[Idempotency|HTTP Method와 멱등성]]
