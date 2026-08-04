---
tags: [architecture, design-pattern, structural, proxy]
status: done
verified_at: 2026-08-04
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

## JavaScript `Proxy`와 구분

JavaScript의 내장 `Proxy`는 프로퍼티 조회, 대입, 함수 호출 같은 내부 연산을 Trap으로 가로채는 언어 메커니즘이다. GoF Proxy를 구현하는 데 사용할 수 있지만, `new Proxy()`를 사용했다는 사실만으로 디자인 패턴의 의도와 계약이 생기지는 않는다. 명세가 요구하는 Proxy 불변식도 지켜야 한다.

## Decorator와 구분

두 패턴 모두 같은 인터페이스로 Wrapper를 만들 수 있다. Proxy는 접근 제어가 중심이고 Decorator는 책임 조합이 중심이다. Decorator가 인터페이스를 확장해야 한다는 설명은 부정확하다. 전형적인 GoF Decorator도 Component 계약을 유지한다.

## 출처

- 얄팍한 코딩사전, [Proxy 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=243747)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- [ECMAScript 명세, Proxy Objects](https://tc39.es/ecma262/multipage/reflection.html#sec-proxy-objects)
- yongsoocho, [TypeScript로 구현하는 Proxy](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=150435)

## 관련 문서

- [[Decorator패턴이란|Decorator 패턴]]
- [[Adapter패턴이란|Adapter 패턴]]
- [[Cache-Basics|캐시 기본]]
