---
tags: [architecture, design-pattern, structural, flyweight]
status: done
category: "Architecture & Design"
aliases: ["Flyweight Pattern", "플라이웨이트 패턴"]
---

# Flyweight 패턴이란?

Flyweight는 많은 객체가 공유할 수 있는 불변 상태를 재사용하고, 객체마다 다른 상태는 외부에서 전달해 메모리 사용을 줄이는 구조 패턴이다.

## 상태를 나누는 기준

- 내재 상태: 여러 객체가 공유해도 되는 값이다. Flyweight 내부에 둔다.
- 외재 상태: 위치, 사용자, 요청처럼 사용 맥락마다 달라지는 값이다. 호출 시 전달한다.

```typescript
type TextStyle = Readonly<{
  font: string
  size: number
  color: string
}>

class TextStyleFactory {
  private readonly cache = new Map<string, TextStyle>()

  get(font: string, size: number, color: string): TextStyle {
    const key = `${font}:${size}:${color}`
    const cached = this.cache.get(key)
    if (cached) return cached

    const style = Object.freeze({ font, size, color })
    this.cache.set(key, style)
    return style
  }
}
```

문자마다 스타일 객체를 새로 만들지 않고 같은 스타일을 공유한다. 문자의 값과 위치는 외재 상태로 별도 보관한다.

## 적용 판단

다음 조건을 측정으로 확인할 때 유용하다.

- 같은 값 객체가 매우 많이 중복된다.
- 공유 대상이 사실상 불변이다.
- 객체 수나 중복 데이터가 실제 메모리 병목이다.

캐시 키 생성, 조회와 수명 관리 비용이 추가된다. 공유 객체가 가변이면 한 사용자의 변경이 다른 사용자에게 전파되는 심각한 버그가 생긴다. 일반 캐시는 계산 결과의 재사용이 목적일 수 있지만 Flyweight는 객체의 공유 표현 자체가 핵심이다.

## 출처

- 얄팍한 코딩사전, [Flyweight 패턴](https://www.inflearn.com/courses/lecture?courseId=334495&unitId=243749)
- Gamma, Helm, Johnson, Vlissides, Design Patterns: Elements of Reusable Object-Oriented Software, 1994

## 관련 문서

- [[Defensive-Copy-Immutable-Practice|방어적 복사와 불변 객체]]
- [[Singleton패턴이란|Singleton 패턴]]
- [[Prototype패턴이란|Prototype 패턴]]
