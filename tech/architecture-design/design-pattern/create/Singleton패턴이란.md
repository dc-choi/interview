---
tags: [architecture, design-pattern, creational, singleton]
status: done
verified_at: 2026-08-04
category: "Architecture & Design"
aliases: ["Singleton Pattern", "싱글턴 패턴"]
---

# Singleton 패턴이란?

Singleton은 정해진 범위에서 클래스의 인스턴스 생성을 하나로 제한하고 그 인스턴스에 접근하는 방법을 제공하는 생성 패턴이다. 하나라는 범위가 프로세스, 모듈 그래프 또는 DI 애플리케이션 컨텍스트 중 무엇인지 먼저 정의해야 한다.

## TypeScript 구현

```typescript
class ProcessRegistry {
  private static instance?: ProcessRegistry

  private constructor() {}

  static getInstance(): ProcessRegistry {
    return this.instance ??= new ProcessRegistry()
  }
}
```

이 구현은 현재 JavaScript Realm과 로드된 클래스 사본 안에서만 하나다. Worker, Cluster 프로세스, 컨테이너와 Pod가 여러 개면 각각 별도 인스턴스가 생긴다. 중복 모듈 경로도 별도 캐시 항목이 될 수 있다.

## NestJS에서는 Provider 수명으로 관리한다

NestJS Provider의 기본 Scope는 애플리케이션 전체에서 공유되는 `DEFAULT`다. 대부분은 정적 `getInstance()`보다 Provider를 생성자 주입해 수명과 대체 가능성을 컨테이너에 맡기는 편이 낫다.

```typescript
@Injectable()
class CurrencyTable {}
```

이 역시 Nest 애플리케이션 컨텍스트마다 하나다. 같은 클래스나 토큰을 서로 다른 컨텍스트에서 만들거나 여러 프로세스를 실행하면 전역 단일 인스턴스가 아니다.

## 언제 경계해야 하는가

- 사용자별 인증 정보나 요청 상태를 공유 인스턴스의 가변 필드에 저장하면 데이터가 섞인다.
- 전역 접근점은 의존성을 숨겨 테스트 순서 의존과 초기화 경쟁을 만든다.
- DB 연결은 인스턴스 하나가 아니라 제한된 여러 연결을 관리하는 Pool인 경우가 일반적이다.
- 캐시와 이벤트 버스가 프로세스마다 분리돼도 되는지 운영 토폴로지에서 확인한다.

프로세스 간 하나의 소유권이 필요하면 DB의 유일성 제약, 분산 Lock, Leader Election 같은 분산 조정 문제로 다뤄야 한다. Singleton 객체만으로 해결되지 않는다.

## 출처

- 얄팍한 코딩사전, [Singleton 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=242682)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [NestJS 공식 문서, Injection scopes](https://docs.nestjs.com/fundamentals/injection-scopes)
- [Node.js 공식 문서, CommonJS module caching](https://nodejs.org/api/modules.html#caching)
- yongsoocho, [TypeScript로 구현하는 Singleton](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=149243)

## 관련 문서

- [[Connection-Pool|Connection Pool]]
- [[Object-Design-Principles|객체 설계 원칙과 리팩터링]]
- [[Flyweight패턴이란|Flyweight 패턴]]
