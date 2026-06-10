---
tags: [architecture, design-pattern]
status: done
category: "Architecture & Design"
aliases: ["Adapter 패턴이란?"]
---

# Adapter 패턴이란?
호환되지 않는 인터페이스를 변환하여 함께 동작할 수 있게 하는 패턴. USB Type-C 어댑터처럼 중간에서 변환 역할을 한다.

## 왜 쓸까?

### 기존 코드 보존
기존 코드를 수정하지 않고 새로운 시스템과 통합할 수 있다.

### 인터페이스 표준화
서드파티 라이브러리의 인터페이스를 프로젝트 표준에 맞출 수 있다.

### 구현체 교체 용이
여러 구현체를 동일한 인터페이스로 사용하여 교체가 쉬워진다.

## 핵심 개념

### 구조
Client -> Adapter -> Adaptee

Client는 표준 인터페이스를 사용하는 코드이다. Adapter는 인터페이스를 변환하는 중간 객체이다. Adaptee는 실제 기능을 제공하지만 다른 인터페이스를 가진 객체이다.

### 코드 예시: LevelDB를 fs API로
```typescript
function createFSAdapter(db: any) {
  return {
    readFile(filename: string, options: any, callback: Function) {
      db.get(
        path.resolve(filename),
        { valueEncoding: options.encoding },
        (err: Error, value: any) => callback(err, value)
      )
    },
    writeFile(filename: string, contents: string, options: any, callback: Function) {
      db.put(
        path.resolve(filename),
        contents,
        { valueEncoding: options.encoding },
        callback
      )
    }
  }
}
```

LevelDB의 get/put 인터페이스를 fs 모듈의 readFile/writeFile 인터페이스로 변환한다. 클라이언트는 파일 시스템 API를 사용한다고 생각하지만 실제로는 LevelDB에 데이터가 저장된다.

```typescript
const fsAdapter = createFSAdapter(db)

fsAdapter.writeFile('file.txt', 'Hello!', { encoding: 'utf8' }, (err: Error) => {
  fsAdapter.readFile('file.txt', { encoding: 'utf8' }, (err: Error, data: string) => {
    console.log(data) // 'Hello!'
  })
})
```

## 실 사용 사례
1. LevelDB 어댑터: LevelDOWN, MemDOWN 등 다양한 백엔드를 동일 API로
2. 데이터베이스 어댑터: TypeORM의 드라이버 추상화
3. 로깅 어댑터: winston/pino 등 다른 로거를 통일된 인터페이스로
4. 파일 스토리지 어댑터: 로컬/S3/GCS를 동일 API로
