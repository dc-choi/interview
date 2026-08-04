---
tags: [jpa, api, dto, dirty-checking, http-methods]
status: done
verified_at: 2026-08-04
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
- [Jakarta Persistence 3.2, Entity Operations](https://jakarta.ee/specifications/persistence/3.2/jakarta-persistence-spec-3.2#entity-operations)
- 강의: [회원 등록 API](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24318), [회원 수정 API](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24319), [회원 조회 API](https://www.inflearn.com/courses/lecture?courseId=324214&unitId=24320)

## 관련 문서

- [[JPA-API-Performance|JPA API 조회 성능]]
- [[JPA-Persistence-Context|JPA 영속성 컨텍스트]]
- [[DTO-Layering|DTO 레이어 스코프]]
- [[Idempotency|HTTP Method와 멱등성]]
