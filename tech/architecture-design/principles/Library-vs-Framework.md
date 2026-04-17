---
tags: [architecture, design, library, framework, ioc, hollywood-principle]
status: done
category: "아키텍처&설계(Architecture&Design)"
aliases: ["Library vs Framework", "라이브러리 vs 프레임워크", "제어의 역전"]
---

# 라이브러리 vs 프레임워크

"누가 누구를 호출하는가"로 갈린다. **라이브러리는 내가 불러 쓰는 것**, **프레임워크는 내 코드를 자기가 부르는 것**. 코드가 흐름을 주도하면 라이브러리, 프레임워크가 흐름을 주도하면 프레임워크다. 이 뒤집힘이 **제어의 역전(Inversion of Control, IoC)** 이며 "Don't call us, we'll call you"(할리우드 원칙)라는 격언으로 요약된다.

## 본질 차이

| 축 | 라이브러리 | 프레임워크 |
|---|---|---|
| 제어권 | **개발자** | **프레임워크** |
| 호출 방향 | 내 코드 → 라이브러리 함수 | 프레임워크 → 내 코드 |
| 흐름 정의 | 개발자가 작성 | 프레임워크가 정한 수명주기·훅 |
| 교체 비용 | 낮음(호출부만 바꿈) | 높음(구조 전체가 종속) |
| 진입 비용 | 낮음(필요한 함수만 학습) | 높음(전체 규약·컨벤션 학습) |
| 예시 | Lodash, Axios, jQuery, date-fns | Spring, NestJS, Django, Rails, React |

## 호출 방향의 예시

### 라이브러리

```js
import axios from "axios";
const res = await axios.get("/api");   // 내가 호출
render(res.data);
```

흐름은 개발자가 쓴다. axios는 **도구**.

### 프레임워크

```ts
@Controller("users")
class UserController {
  @Get(":id")                           // 프레임워크가 호출
  findOne(@Param("id") id: string) { ... }
}
```

NestJS가 라우팅·의존성 주입·요청 수명주기를 **대신 돌린다**. 개발자 코드는 **프레임워크의 빈자리를 채우는 역할**.

## IoC (제어의 역전)

"내가 필요한 것을 찾지 말고, 필요한 것을 주입받아라." 라이브러리는 내가 필요한 라이브러리를 **임포트**해서 쓰고, 프레임워크는 **내 클래스를 등록**해두면 컨테이너가 알아서 연결·호출.

- **DI(Dependency Injection)** — IoC의 구체 구현. Spring·NestJS·Angular의 핵심
- **Hook / Lifecycle 메서드** — React `useEffect`, Spring `@PostConstruct`
- **Event / Callback 기반** — Express 미들웨어 체인

## Framework가 되는 조건

어떤 코드가 "프레임워크"인지는 **흐름을 강제하는가**로 판별한다.

- 반드시 지켜야 할 **진입점 규약**이 있는가 (`main()` 대신 `@SpringBootApplication`·Controller 스캔)
- **수명주기 콜백** 제공 (`init`/`destroy`, React 마운트/언마운트)
- **확장 포인트**로만 커스터마이즈 허용 (Filter·Interceptor·Middleware)
- **반전된 의존성** — 프레임워크 인터페이스를 개발자가 구현

예: jQuery는 라이브러리, Angular는 프레임워크. axios는 라이브러리, NestJS는 프레임워크.

## 회색지대

순수 분류가 어려운 경우가 많다.

- **React** — 공식적으로 "라이브러리"를 표방하지만, 렌더링 수명주기·Hook 규칙·Fiber 스케줄러가 흐름을 주도해 **사실상 프레임워크**에 가까움
- **Express** — 핵심은 라이브러리지만 미들웨어 체인 규약을 채택하는 순간 소형 프레임워크화
- **Next.js/Nuxt** — React/Vue 위에 얹힌 명확한 풀스택 프레임워크
- **tRPC·Prisma** — 개발 도구·런타임·DSL이 섞여 경계 모호

## 트레이드오프

### 라이브러리의 장점

- **선택의 자유** — 필요한 것만 골라 조합
- **학습곡선 낮음** — 단위 API 이해로 시작 가능
- **교체 용이** — 구현체를 감싸는 얇은 래퍼를 두면 1:1 교체

### 프레임워크의 장점

- **생산성** — 보일러플레이트·인프라 코드를 프레임워크가 해결
- **컨벤션** — 팀원 간 코드 구조 통일
- **검증된 패턴** — 베스트 프랙티스를 기본 제공

### 프레임워크의 단점

- **종속성** — 떠나려면 큰 마이그레이션
- **블랙박스** — 내부 동작을 이해하지 못하면 "마법"처럼 느껴짐
- **규약 위반 시 싸움** — 프레임워크 철학과 다른 요구는 워크어라운드로 귀결

## 선택 지침

- **제품의 수명이 짧고 스코프가 좁음** → 라이브러리 조합이 유리
- **수명이 길고 팀이 여럿** → 프레임워크의 컨벤션 이점
- **성능·메모리가 극단적으로 중요** → 프레임워크 오버헤드 재평가
- **도메인 특화 규칙이 강함** → 프레임워크가 발목 잡을 수 있음. 핵심 도메인은 프레임워크 없이, 경계(HTTP·DB)에만 적용

## 아키텍처 관점

[[Layered-Clean-Hexagonal|Clean/Hexagonal Architecture]]의 목적은 결국 **프레임워크에 과도히 종속되지 않게** 하는 것. 프레임워크는 "바깥쪽 원"에만 있고, 도메인 로직은 라이브러리·순수 코드로 유지 → 교체 가능성·테스트 용이성 확보.

## 흔한 오해

- **"프레임워크 = 무거움"** — 크기·무게가 아니라 **제어권 방향**으로 구분
- **"모든 것을 프레임워크로"** — 도메인 코드까지 프레임워크에 맞추면 교체·테스트 지옥. Framework-agnostic 영역을 유지
- **"라이브러리는 조합하면 프레임워크"** — 조합만으로는 아님. 흐름을 강제해야 프레임워크

## 면접 체크포인트

- 라이브러리와 프레임워크의 **호출 방향** 차이 한 문장
- 할리우드 원칙과 IoC의 관계
- DI가 IoC를 구현하는 방식
- React가 "라이브러리지만 실질적으로 프레임워크"라 불리는 이유
- Clean/Hexagonal 아키텍처가 프레임워크 종속을 낮추는 메커니즘

## 출처
- [daddyprogrammer — 기술 용어 및 개념 정리](https://daddyprogrammer.org/post/2058/tech-terms-concept/)

## 관련 문서
- [[Layered-Clean-Hexagonal|Layered / Clean / Hexagonal]]
- [[Hexagonal-In-Practice|Hexagonal 실전 적용]]
- [[SOLID-In-Practice|SOLID 원칙 실전 적용]]
- [[Spring|Spring 개요 (IoC·DI·AOP)]]
- [[Clean-Architecture-NestJS|NestJS Clean Architecture]]
