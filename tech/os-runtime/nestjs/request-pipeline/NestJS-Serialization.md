---
tags: [nestjs, serialization, class-transformer, response]
status: done
verified_at: 2026-10-02
category: "OS & Runtime - NestJS"
aliases: ["NestJS Serialization", "응답 직렬화", "ClassSerializerInterceptor"]
---

# NestJS 응답 직렬화 — ClassSerializerInterceptor

직렬화(serialization)는 객체가 **네트워크 응답으로 나가기 직전에 일어나는 변환 단계**다. 클라이언트에 돌려줄 데이터를 변환하고 세정(sanitize)하는 규칙을 두기에 적절한 위치 — 대표적으로 password 같은 민감 필드는 응답에서 항상 제외해야 하고, 엔티티의 일부 속성만 보내야 할 때도 있다. 이를 핸들러마다 수동으로 하면 지루하고 실수하기 쉬우며, 모든 경로를 덮었는지 확신할 수 없다. 파이프가 **입력 방향**(요청 → 핸들러)의 검증, 변환이라면 직렬화는 **출력 방향**(핸들러 → 응답)의 대칭이다.

## 동작 원리

`ClassSerializerInterceptor`(@nestjs/common)는 핸들러 반환값에 class-transformer의 `instanceToPlain()`을 적용하는 내장 인터셉터다. 엔티티/DTO 클래스에 선언된 class-transformer 데코레이터 규칙이 이때 실행된다. 인터셉터를 전역 적용하면, 해당 엔티티를 반환하는 **모든** 핸들러에서 규칙이 중앙 강제된다 — 민감 필드 제거를 비즈니스 룰로 한 곳에서 보장하는 구조.

- **StreamableFile 응답에는 적용되지 않는다.**
- HTTP 전용이 아니다 — **WebSocket과 마이크로서비스에서도 전송 방식과 무관하게 동일하게 동작**한다.

## @Exclude — 민감 필드 제거

```ts
import { Exclude } from 'class-transformer';

export class UserEntity {
  id: number;
  firstName: string;
  lastName: string;

  @Exclude()
  password: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
```

```ts
@UseInterceptors(ClassSerializerInterceptor)
@Get()
findOne(): UserEntity {
  return new UserEntity({ id: 1, firstName: 'John', lastName: 'Doe', password: 'password' });
}
```

응답에는 id, firstName, lastName만 남는다.

**클래스 인스턴스를 반환해야 동작한다** — `{ user: new UserEntity() }`처럼 plain 객체로 감싸거나 plain 객체 자체를 반환하면 직렬화되지 않는다. 엔티티에 `constructor(partial) { Object.assign(this, partial) }` 패턴을 두는 이유가 이것 (아래 `type` 옵션이 예외).

## @Expose — 별칭과 계산 속성

속성에 별칭을 주거나, getter처럼 값을 계산해 노출한다.

```ts
@Expose()
get fullName(): string {
  return `${this.firstName} ${this.lastName}`;
}
```

## @Transform — 값 변환

예: 관계 객체 전체 대신 name 필드만 내보내기.

```ts
@Transform(({ value }) => value.name)
role: RoleEntity;
```

## @SerializeOptions — 옵션 오버라이드

`@SerializeOptions()`(@nestjs/common)로 전달한 옵션은 하부 `instanceToPlain()`의 **두 번째 인자**로 들어간다.

```ts
@SerializeOptions({ excludePrefixes: ['_'] })
@Get()
findOne(): UserEntity { ... }
```

위 예시는 `_`로 시작하는 모든 속성을 제외한다.

## type 옵션 — plain 객체 자동 변환

`@SerializeOptions({ type: UserEntity })`를 걸면 핸들러가 **plain 객체를 반환해도 지정 클래스 인스턴스로 자동 변환** 후 데코레이터 규칙이 적용된다 — 분기마다 인스턴스화하거나 `plainToInstance`를 반복 호출할 필요가 없어진다.

```ts
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ type: UserEntity })
@Get()
findOne(@Query() { id }: { id: number }): UserEntity {
  if (id === 1) {
    return { id: 1, firstName: 'John', lastName: 'Doe', password: 'password' };
  }
  return { id: 2, firstName: 'Kamil', lastName: 'Mysliwiec', password: 'password2' };
}
```

컨트롤러 반환 타입을 명시하면 plain 객체가 DTO/엔티티 형태를 따르는지 **TS 타입 체크**를 받을 수 있다 — 직접 `plainToInstance`를 부르는 방식은 이 수준의 타입 힌트가 없어 구조 불일치 버그를 놓칠 수 있다.

## v12의 schema 기반 직렬화

`StandardSchemaSerializerInterceptor`와 `@SerializeOptions({ schema })`는 handler 반환값을 schema로 검증, 변환한 뒤 출력한다. 응답 allowlist를 가진 schema로 DB row의 비밀 필드를 제거할 수 있다. 클래스를 만들어야 하는 경로와 별도로 사용한다.

- 배열 응답은 **각 element에 item schema를 적용**한다. array schema 자체를 지정하는 입력 검증 방식과 혼동하지 않는다.
- null, undefined, primitive, StreamableFile과 schema 없는 handler는 그대로 전달한다. 이 경로까지 응답 allowlist가 검증한다고 가정하지 않는다.
- method의 SerializeOptions가 controller 설정보다 우선한다. interceptor 생성자의 기본 schema와 validateOptions는 해당 설정이 없을 때 적용된다.
- global로 등록하려면 Reflector를 전달하거나 APP_INTERCEPTOR로 DI 등록한다.
- 응답이 schema를 위반하면 client 입력 오류가 아닌 서버 계약 오류로 500이 반환된다. 기본 filter의 오류 로그에 validation issue가 담기므로 비밀값을 issue에 포함하지 않는지도 확인한다.
- 직접 native response로 전송하는 경로는 Nest 반환값 pipeline을 우회할 수 있다. 선언한 schema와 실제 handler 응답 전략을 함께 확인한다.

## 면접 체크포인트

- 직렬화 단계에서 민감 필드를 제거하는 이유 — 핸들러별 수동 처리의 누락 위험 vs 인터셉터 + 데코레이터의 중앙 강제
- ClassSerializerInterceptor의 동작 — 반환값에 instanceToPlain() 적용
- plain 객체 반환 시 직렬화가 안 되는 함정과 두 해법 (partial 생성자 패턴, `@SerializeOptions({ type })`)
- @Exclude / @Expose / @Transform 각각의 용도
- StreamableFile 미적용, WS/마이크로서비스 동일 적용

## 응답 계약을 확인하는 테스트

class-transformer의 class metadata와 Standard Schema의 출력 schema는 다른 경로지만, 테스트는 최종 HTTP 응답에서 허용 field와 금지 field를 함께 단언한다. 공식 class serializer와 Valibot sample은 password 부재, computed fullName, nested role의 문자열 변환을 확인한다. controller 메서드를 직접 호출한 객체만 비교하면 실제 interceptor 실행을 시험하지 못한다.

Standard Schema의 `~standard.validate`는 비동기 결과도 허용한다. 응답 interceptor는 이를 기다리지만 DB 조회나 외부 호출을 schema 변환에 숨기면 응답 지연과 실패 경계가 복잡해진다. handler가 반환한 전체 객체를 소비자에게 그대로 보내는 방식과 명시적 출력 allowlist를 구분한다.

## 관련 문서

- [[NestJS-AOP-Interceptor-Patterns|Interceptor 패턴 (인터셉터 계층에서의 위치)]]
- [[NestJS-Pipes|Pipes (입력 방향 검증, 변환 — 직렬화의 대칭)]]
- [[NestJS-File-Upload|File Upload (StreamableFile 응답)]]

## 출처
- [NestJS — Serialization](https://docs.nestjs.com/application/serialization)
- [NestJS API, StandardSchemaSerializerInterceptor](https://api-references-nestjs.netlify.app/api/common/StandardSchemaSerializerInterceptor)
- [NestJS sample, class response serialization](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/21-serializer/e2e/app/app.e2e-spec.ts)
- [NestJS sample, schema response serialization](https://github.com/nestjs/nest/blob/7fb52e7f4f7314fbc117e369a09297bc2ecadf6b/sample/36-valibot-serializer/src/schemas/user-response.schema.ts)
