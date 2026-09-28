---
tags: [architecture, design-pattern, structural, proxy]
status: done
verified_at: 2026-09-27
category: "Architecture & Design"
aliases: ["Proxy Pattern", "프록시 패턴"]
---

# Proxy 패턴이란?

GoF Proxy는 실제 Subject와 같은 계약을 제공하면서 대상에 대한 접근, 위치 또는 수명을 제어하는 대리 객체다.

## 대표 유형

- Virtual Proxy: 비용이 큰 실제 객체를 필요할 때 만든다.
- Remote Proxy: 원격 객체의 통신과 직렬화를 감춘다.
- Protection Proxy: 권한에 따라 접근을 통제한다.
- Caching Proxy: 반복 조회를 저장하고 무효화 정책을 적용한다.

```typescript
class AuthorizedReportReader implements ReportReader {
  constructor(
    private readonly target: ReportReader,
    private readonly policy: ReportPolicy,
  ) {}

  async read(actor: Actor, id: ReportId): Promise<Report> {
    if (!this.policy.canRead(actor, id)) {
      throw new ForbiddenException()
    }
    return this.target.read(actor, id)
  }
}
```

Proxy가 보안 경계라면 우회 가능한 원본 참조가 노출되지 않아야 한다. 캐시는 키, TTL과 무효화 정책이 필요하며 Remote Proxy는 부분 실패, 시간 제한과 네트워크 지연을 로컬 호출처럼 숨기지 않아야 한다.

## Virtual Proxy의 생성 책임과 시점

위 Protection Proxy처럼 추상 Subject 계약만으로 대상을 다루는 Proxy는 RealSubject 구현마다 따로 만들 필요 없이 하나로 모든 구현을 다룰 수 있다. Virtual Proxy는 RealSubject를 직접 생성하므로 어떤 구현을 만들지 알아야 한다. Proxy 안에서 구체 클래스를 `new`로 만들면 그 구현에 결합되므로, 생성 함수를 주입받아 Proxy가 Subject 계약에만 의존하게 한다.

실제 대상은 그 대상이 필요한 연산이 처음 호출될 때 만든다. 이미지의 가로세로 크기처럼 생성 전에 알 수 있는 값은 Proxy가 직접 답하고 비용이 큰 연산만 위임한다.

```typescript
interface ReportExporter {
  readonly format: string
  export(report: Readonly<Report>): Promise<Uint8Array>
}

class LazyReportExporter implements ReportExporter {
  private target: Promise<ReportExporter> | null = null

  constructor(
    readonly format: string,
    private readonly create: () => Promise<ReportExporter>,
  ) {}

  async export(report: Readonly<Report>): Promise<Uint8Array> {
    const target = await this.getTarget()
    return target.export(report)
  }

  /**
   * 실제 Exporter 생성을 한 번만 시작하고, 실패하면 다음 호출에서 다시 만든다.
   * @returns 생성 중이거나 생성을 마친 실제 Exporter
   */
  private getTarget(): Promise<ReportExporter> {
    this.target ??= this.create().catch((error: unknown) => {
      this.target = null
      throw error
    })
    return this.target
  }
}
```

생성이 비동기이면 완성된 인스턴스가 아니라 진행 중인 `Promise`를 저장한다. `await`를 만나면 제어가 호출자에게 돌아가므로 `if (!this.target) this.target = await this.create()`처럼 결과를 받은 뒤 필드를 채우면, 첫 생성이 끝나기 전에 들어온 호출마다 생성 함수가 다시 실행된다. 반대로 거부된 `Promise`를 계속 저장하면 이후 호출이 모두 같은 오류로 실패하므로, 실패하면 저장값을 비워 다음 호출에서 재시도하게 한다. 동시 호출을 합치는 원리는 [[Cache-Stampede|Single-Flight]]와 같지만, Single-Flight는 완료 뒤 진행 중 항목을 지우고 여기서는 이행된 `Promise`를 계속 보관해 실제 대상을 재사용한다. 키마다 이 방식으로 인스턴스를 공유하는 방법은 [[Flyweight패턴이란#참여 객체와 공유 강제|Flyweight 팩토리]]에서 설명한다.

NestJS는 앱 부트스트랩 중에 기본 스코프인 싱글턴 provider를 모두 인스턴스화한다. 초기화 비용이 큰 SDK 클라이언트를 첫 사용까지 미루려면 이런 Virtual Proxy를 provider로 등록할 수 있다. 모듈 전체를 미루는 `LazyModuleLoader`와의 선택은 [[NestJS-Cold-Start-Optimization|NestJS Cold Start 최적화]]에서 다룬다.

## JavaScript `Proxy`와 구분

JavaScript의 내장 `Proxy`는 프로퍼티 조회, 대입, 함수 호출 같은 내부 연산을 Trap으로 가로채는 언어 메커니즘이다. GoF Proxy를 구현하는 데 사용할 수 있지만, `new Proxy()`를 사용했다는 사실만으로 디자인 패턴의 의도와 계약이 생기지는 않는다. 명세가 요구하는 Proxy 불변식도 지켜야 한다.

## Decorator와 구분

두 패턴 모두 같은 인터페이스로 Wrapper를 만들 수 있다. Proxy는 접근 제어가 중심이고 Decorator는 책임 조합이 중심이다. Decorator가 인터페이스를 확장해야 한다는 설명은 부정확하다. 전형적인 GoF Decorator도 Component 계약을 유지한다.

## 출처

- 얄팍한 코딩사전, [Proxy 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=243747)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [ECMAScript 명세, Proxy Objects](https://tc39.es/ecma262/multipage/reflection.html#sec-proxy-objects)
- yongsoocho, [TypeScript로 구현하는 Proxy](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=150435)
- GIS DEVELOPER, [TypeScript로 보는 GoF의 디자인 패턴: 16. Proxy](https://www.youtube.com/watch?v=ruDmWhHJyR4)
- [MDN, await](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/await)
- [MDN, Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [NestJS, Injection scopes](https://docs.nestjs.com/fundamentals/injection-scopes)

## 관련 문서

- [[Decorator패턴이란|Decorator 패턴]]
- [[Adapter패턴이란|Adapter 패턴]]
- [[Cache-Basics|캐시 기본]]
- [[Cache-Stampede|Cache Stampede 방지]]
- [[NestJS-Cold-Start-Optimization|NestJS Cold Start 최적화]]
