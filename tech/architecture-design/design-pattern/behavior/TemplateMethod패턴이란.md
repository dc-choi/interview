---
tags: [architecture, design-pattern]
status: done
category: "Architecture & Design"
aliases: ["Template Method 패턴이란?"]
---

# Template Method 패턴이란?
알고리즘의 골격을 정의하고, 일부 단계를 하위 클래스에서 구현하도록 위임하는 패턴

## 왜 쓸까?

### 알고리즘의 구조는 고정하면서 세부 단계만 변경
전체 흐름은 부모 클래스가 제어하고, 가변적인 부분만 하위 클래스에서 오버라이드한다.

### 코드 중복 제거
공통 로직은 부모 클래스에, 가변 로직은 하위 클래스에 둔다.

### 하위 클래스가 전체 알고리즘을 변경할 수 없도록 제어
하위 클래스는 특정 단계만 재정의할 수 있으므로 알고리즘의 구조가 보호된다.

## 핵심 개념

### Strategy와의 비교
| 항목 | Template Method | Strategy |
|------|----------------|----------|
| 관계 | is-a (상속) | has-a (합성) |
| 변경 단위 | 알고리즘의 일부 단계 | 전체 알고리즘 |
| 바인딩 시점 | 컴파일타임 (클래스 정의 시) | 런타임 (객체 생성/교체 시) |
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
