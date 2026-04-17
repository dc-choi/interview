---
tags: [architecture, design, dto, entity, layered]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["DTO Layering", "DTO 레이어 스코프", "DTO Entity 변환 위치"]
---

# DTO 레이어 스코프 · Entity 변환 위치

DTO(Data Transfer Object)를 어느 레이어까지 내리고, Entity로의 변환을 어디서 수행할지는 레이어드 아키텍처의 반복되는 논쟁이다. 정답은 없지만 **"DTO는 경계에서 도메인을 보호하는 장치"** 라는 원칙에서 트레이드오프가 나온다.

## 핵심 명제

- **DTO = 경계 객체** — 외부 세계(HTTP·gRPC·Message)와 내부 도메인 사이를 가르는 평면 데이터 구조
- **Entity = 불변조건 · 행위를 가진 도메인 모델** — 생명주기·영속성·비즈니스 규칙의 주체
- **Entity를 그대로 응답하면 안 된다** — 스키마 유출·민감 필드 노출·테이블 결합도 문제
- **변환 위치는 Controller vs Service vs 별도 Mapper** 중 선택이며, 규모에 따라 다르다
- **Repository에는 DTO를 내리지 않는다** — Repository는 Entity 영속성만 책임진다

## Entity 직접 반환의 문제

- **민감 필드 노출**: `password_hash`, `internal_flag` 같은 필드가 응답에 섞임
- **API 명세가 테이블에 의존**: 컬럼을 추가/삭제하면 API 계약이 깨짐 → 프런트엔드·모바일·외부 연동 동반 변경
- **지연 로딩 폭발**: JPA/Hibernate에서 직렬화 시점에 프록시가 풀리며 N+1 쿼리 발생
- **양방향 순환 참조**: 연관 엔티티끼리 서로 참조하면 JSON 직렬화 중 무한 루프

## 변환 위치 3안 비교

### 1. Controller에서 변환

- **장점**: Service가 DTO를 모름 → Service 재사용성·단위 테스트 용이
- **단점**: Controller가 두꺼워지고, DTO → Entity 변환에 필요한 데이터(연관 엔티티 조회 결과)가 부족해 비즈니스 로직이 Controller로 샘
- **어울리는 경우**: 단순 조회·업데이트 같은 얇은 CRUD

### 2. Service에서 변환 (가장 흔한 기본값)

- **장점**: Entity 조립에 필요한 레포지토리 접근이 같은 레이어 안에 있으므로 자연스러움
- **단점**: Service가 DTO에 의존 → Controller-Service 결합도 증가. 동일 유즈케이스를 다른 진입점(배치·메시지)에서 재사용하려면 DTO 분리 필요
- **어울리는 경우**: 중소 규모 Spring/NestJS 애플리케이션 대부분

### 3. Mapper + Service DTO (Command/Query)

- **구조**: `Request DTO(외부) → Command/Query DTO(내부) → Entity`. 매퍼가 경계 변환, Service는 내부 DTO로만 통신
- **장점**: Controller·Service가 서로 다른 DTO에 의존 → 진정한 분리. Command/Query 모델 도입(CQRS)과 궁합 좋음
- **단점**: 클래스 수 증가(최소 Request/Response/Command/Query 4종), 보일러플레이트. MapStruct 같은 자동 매퍼 필요
- **어울리는 경우**: 여러 진입점·여러 바운디드 컨텍스트·헥사고날/DDD 적용

## 레이어별 책임 표

| 레이어 | 취급 객체 | 책임 |
|---|---|---|
| Controller | Request DTO ↔ Response DTO | 직렬화·입력 검증·인증·HTTP 계약 |
| Application/Service | Command/Query(내부 DTO) · Entity | 유즈케이스 오케스트레이션, 트랜잭션 경계 |
| Domain | Entity · VO | 불변조건·비즈니스 규칙 |
| Repository | Entity | 영속성 · 쿼리. DTO 변환 금지 |

## 선택 가이드

- **Controller만 얇게 두고 Service에서 변환** — 기본값. 단일 앱·단일 진입점
- **여러 진입점(REST + gRPC + Kafka)** → 외부 DTO와 내부 Command/Query 분리
- **하나의 유즈케이스가 여러 응답 형식을 가진다** → 응답 전용 Mapper
- **쿼리 최적화를 위해 필드 선택적 조회** → Repository에서 "Projection DTO"를 직접 조회 (단, 도메인 Entity와 혼동하지 않도록 별도 타입)

## DTO 클래스 관리 패턴

API 하나당 Request/Response DTO를 파일 단위로 쪼개면 수백 개의 얇은 클래스가 생긴다. 관리를 위한 두 가지 관례.

### Inner Class(Nested Class) 구조화

한 도메인의 DTO를 **바깥 클래스 안에 static inner class**로 묶는다. 호출 시 `User.Request.Create` 형태로 네임스페이스가 자연스럽게 형성됨.

```java
public class User {
    public static class Info { private Long id; private String email; ... }
    public static class Request {
        public static class Create { private String email; private String password; }
        public static class Update { private String nickname; }
    }
    public static class Response {
        public static class Detail { ... }
        public static class Summary { ... }
    }
}
```

- **장점**: 도메인 응집도↑, 파일 수 감소, 클래스명 충돌 회피(`Create`가 도메인별로 중복 가능)
- **단점**: 한 파일이 비대해지면 IDE 탐색이 느려짐 → 도메인별 디렉토리 분리로 절충
- **권장 규모**: 한 도메인 DTO가 10개 이하면 Inner Class, 그 이상이면 패키지 분리

### Static Factory Method로 변환 로직 캡슐화

DTO 안에 `of()`(Entity → DTO)와 `toEntity()`(DTO → Entity)를 제공해 변환을 DTO 자체에 국한.

```java
public class UserDto {
    private String email;
    private String nickname;

    public static UserDto of(User user) {
        return new UserDto(user.getEmail(), user.getNickname());
    }
    public User toEntity() {
        return new User(email, nickname);
    }
}
```

- **장점**: Mapper 파일 폭증 방지, 호출부가 `UserDto.of(user)`로 읽힘
- **단점**: DTO가 Entity를 알게 됨 → 두 방향 결합. 도메인 보호가 최우선이라면 외부 Mapper 유지
- **선택 기준**: 단일 진입점·단일 표현이면 정적 팩토리 OK. 여러 표현·진입점이면 별도 Mapper

## 응답 필드 설계: 명확성 > 중복 회피

하나의 DTO에 모든 필드를 넣고 **상황에 따라 null로 남기는 방식**은 유혹적이지만 실무에서 가장 위험한 안티패턴이다.

- **모호해지는 계약**: 응답 JSON의 필드가 null일 때 "없음"인지 "권한 없음"인지 "아직 안 옴"인지 구분 불가
- **프런트 조건 분기 폭증**: 서버는 한 DTO로 단순하지만, 클라이언트는 필드마다 null 체크로 방어
- **변경 파급**: null 허용 필드 하나가 추가될 때마다 모든 소비자가 영향

원칙: **애매함이 중복보다 비싸다.** 공통 DTO로 묶을 수 있는 경우라도, 두세 개의 명시적 Response DTO로 분리하는 편이 장기 유지보수에 유리하다. 중복이 체감되기 시작하면 공통 슈퍼 클래스·제네릭·Projection으로 리팩터.

## 흔한 실수

- Repository에서 Entity 대신 Response DTO를 반환 → 도메인 보호 막이 사라짐
- Entity에 `@JsonIgnore`로 민감 필드 숨기기 → 도메인이 직렬화 포맷을 알게 되는 역전된 의존성
- DTO에 비즈니스 로직(계산·분기) 추가 → DTO가 앱 서비스화. 변환은 단순 매핑만
- 하나의 DTO를 Request와 Response에 재사용 → 입력 검증·응답 필드가 뒤섞임. Request/Response 분리 권장
- Mapper를 수동 작성 후 필드 추가 시 누락 → MapStruct·ModelMapper로 컴파일 타임 보장

## 면접 체크포인트

- Entity를 그대로 반환할 때 생기는 문제 3가지 이상
- 변환 위치 3안의 트레이드오프
- CQRS/헥사고날에서 Command·Query DTO를 따로 두는 이유
- Repository가 DTO를 반환하면 안 되는 이유(Projection DTO는 예외)
- Request DTO와 Response DTO를 분리해야 하는 이유

## 출처
- [Tecoble — DTO의 사용 범위에 대하여](https://tecoble.techcourse.co.kr/post/2021-04-25-dto-layer-scope/)
- [세당당 — DTO를 Entity로 변환하는 최적의 계층](https://sedangdang.tistory.com/296)
- [aidenshin — DTO에 관한 고찰](https://velog.io/@aidenshin/DTO%EC%97%90-%EA%B4%80%ED%95%9C-%EA%B3%A0%EC%B0%B0)
- [p4rksh — Spring Boot에서 깔끔하게 DTO 관리하기](https://velog.io/@p4rksh/Spring-Boot%EC%97%90%EC%84%9C-%EA%B9%94%EB%81%94%ED%95%98%EA%B2%8C-DTO-%EA%B4%80%EB%A6%AC%ED%95%98%EA%B8%B0)
- [Inflearn QnA — 엔티티별 DTO 설계](https://www.inflearn.com/community/questions/72423/dto)

## 관련 문서
- [[VO-DTO|VO와 DTO]]
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal]]
- [[Hexagonal-In-Practice|Hexagonal 실전 적용]]
- [[DDD|DDD (Aggregate, CQRS)]]
- [[App-Architecture-OOP|애플리케이션 아키텍처와 객체지향]]
