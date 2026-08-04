---
tags: [architecture, design-pattern]
status: done
category: "Architecture & Design"
aliases: ["Template Method 패턴이란?"]
---

# Template Method 패턴이란?
상위 클래스가 알고리즘의 골격과 실행 순서를 정의하고 일부 단계나 Hook을 하위 클래스에 위임하는 행동 패턴이다.

## 왜 쓸까?

### 알고리즘의 구조는 고정하면서 세부 단계만 변경
전체 흐름은 부모 클래스가 제어하고, 가변적인 부분만 하위 클래스에서 오버라이드한다.

### 코드 중복 제거
공통 로직은 부모 클래스에, 가변 로직은 하위 클래스에 둔다.

### 변형 지점을 제한
하위 클래스가 보호된 단계만 재정의하게 설계하면 전체 흐름을 한곳에서 관리할 수 있다. 다만 TypeScript에는 Java의 `final` 메서드와 같은 강제 수단이 없으므로 상속 계약, 가시성과 테스트로 골격을 보호해야 한다.

## 핵심 개념

### Strategy와의 비교
| 항목 | Template Method | Strategy |
|------|----------------|----------|
| 관계 | is-a (상속) | has-a (합성) |
| 변경 단위 | 알고리즘의 일부 단계 | 전체 알고리즘 |
| 선택 방식 | 하위 타입을 생성해 골격에 결합 | 객체나 함수를 주입하고 필요하면 교체 |
| 확장 방법 | 서브클래싱 | 전략 객체 주입 |

### Node.js에서의 활용
Node.js 스트림이 Template Method의 대표적 예시:
- Readable: _read() 구현 → read() 알고리즘이 호출
- Writable: _write() 구현 → write() 알고리즘이 호출
- Transform: _transform() 구현 → 변환 파이프라인이 호출

### 코드 예시
```typescript
abstract class DataProcessor {
  // Template Method: 알고리즘 골격
  async process(input: string): Promise<string> {
    const data = await this.read(input)
    const validated = this.validate(data)
    const result = this.transform(validated)
    await this.save(result)
    return result
  }

  // 하위 클래스에서 구현할 단계들
  protected abstract read(input: string): Promise<any>
  protected abstract validate(data: any): any
  protected abstract transform(data: any): string
  protected abstract save(result: string): Promise<void>
}
```

## 실 사용 사례
1. Node.js 스트림: _read, _write, _transform
2. HTTP 프레임워크: 요청 처리 파이프라인
3. 테스트 프레임워크: setup → test → teardown
4. 데이터 파이프라인: extract → transform → load

상속 결합이 부담스럽거나 단계 조합이 독립적으로 바뀐다면 Strategy와 함수 합성을 먼저 검토한다. 하위 클래스가 골격을 통째로 재정의하거나 상위 클래스 내부 상태를 과도하게 알아야 한다면 패턴의 이점이 약해진다.

## 출처

- 얄팍한 코딩사전, [Template Method 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=242681)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994
- yongsoocho, [TypeScript로 구현하는 Template Method](https://www.inflearn.com/courses/lecture?courseId=329966&unitId=227028)

## 관련 문서

- [[Strategy패턴이란|Strategy 패턴]]
- [[OOP|객체지향 프로그래밍]]
