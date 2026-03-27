---
tags: [architecture, design-pattern]
status: done
category: "Architecture & Design"
aliases: ["Builder 패턴이란?"]
---

# Builder 패턴이란?
복잡한 객체를 단계별로 생성할 수 있게 해주는 패턴. 많은 매개변수를 가진 생성자의 가독성 문제를 해결한다.

## 왜 쓸까?

### 생성자 매개변수 폭발 문제 해결
생성자에 매개변수가 많아지면 가독성이 급격히 저하된다. `new Boat(true, 2, 'motor', ...)` 같은 코드는 각 인자가 무엇을 의미하는지 알 수 없다.

### 의도가 명확한 코드
`new BoatBuilder().withMotors(2).withSails(1).build()`는 각 설정이 무엇을 의미하는지 코드만 봐도 알 수 있다.

### 유효성 검증 집중
build() 메서드에서 모든 유효성 검증을 수행할 수 있어 불완전한 객체 생성을 방지한다.

### 다양한 설정 조합
같은 빌더를 사용하여 서로 다른 설정을 가진 다양한 객체를 생성할 수 있다.

## 핵심 개념

### 구현 규칙
1. 복잡한 생성을 읽기 쉬운 단계로 분리
2. setter 메서드에서 return this로 메서드 체이닝 지원
3. setter 이름으로 의도를 전달 (setX보다 withX)
4. build() 메서드에서 일관성 검증

### 코드 예시
```typescript
class UrlBuilder {
  private protocol: string = 'https'
  private hostname: string = ''
  private port?: number
  private pathname: string = '/'

  setProtocol(protocol: string) { this.protocol = protocol; return this }
  setHostname(hostname: string) { this.hostname = hostname; return this }
  setPort(port: number) { this.port = port; return this }
  setPathname(pathname: string) { this.pathname = pathname; return this }

  build(): URL {
    if (!this.hostname) throw new Error('hostname is required')
    const portStr = this.port ? `:${this.port}` : ''
    return new URL(`${this.protocol}://${this.hostname}${portStr}${this.pathname}`)
  }
}
```

사용 시 각 단계가 명확하게 드러난다.

```typescript
const url = new UrlBuilder()
  .setProtocol('https')
  .setHostname('example.com')
  .setPort(443)
  .setPathname('/api/users')
  .build()
```

## 실 사용 사례
1. Knex 쿼리 빌더: knex('users').where('age', '>', 18).select('name')
2. superagent HTTP 클라이언트: superagent.get(url).set('Accept', 'json').query({page: 1})
3. Elasticsearch 쿼리 빌더
