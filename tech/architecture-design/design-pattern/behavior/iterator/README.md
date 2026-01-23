# Iterator 패턴이란?
컬렉션의 요소들을 순차적으로 접근할 수 있게 해주는 디자인 패턴

## 왜 쓰을까?

### 캡슐화
자세한 내용은 구현 코드 참고

### 메모리 효율성
```typescript
// 일반적인 방법 - 모든 데이터를 한 번에 메모리에 로드
const allNumbers = [1, 2, 3, ... 1000000]; // 메모리 많이 사용

// 이터레이터 방법 - 필요할 때만 하나씩 생성
const numberIterator = new RangeIterator(1, 1000000); // 메모리 적게 사용
```

### 다형성 (통일된 인터페이스)
```typescript
// 배열, 문자열, 맵, 셋... 모두 같은 방식으로 순회 가능
for (const item of [1, 2, 3]) {} // 배열
for (const char of "hello") {} // 문자열  
for (const [k, v] of new Map()) {} // 맵
```

### 지연 실행
```typescript
// 실제로 사용할 때까지 계산을 미룸
const fibonacci = infiniteFibonacci(); // 아직 계산 안함
const first10 = fibonacci.take(10); // 이때 처음 10개만 계산
```

## 핵심 개념

### 상태를 가짐
```typescript
const iter = [1, 2, 3][Symbol.iterator]();
console.log(iter.next()); // {value: 1, done: false}
console.log(iter.next()); // {value: 2, done: false} - 상태가 변함
console.log(iter.next()); // {value: 3, done: false}
console.log(iter.next()); // {value: undefined, done: true}
```

### 한 방향으로만 진행
```typescript
// 이터레이터는 보통 앞으로만 갈 수 있어요
// 뒤로 가려면 새로운 이터레이터를 만들어야 해요
const iter1 = [1, 2, 3][Symbol.iterator]();
iter1.next(); // 1
iter1.next(); // 2
// iter1에서 다시 1로 돌아갈 수 없음

const iter2 = [1, 2, 3][Symbol.iterator](); // 새로 만들어야 함
```

## 실 사용 사례
1. 큰 데이터셋 처리: 파일, 데이터베이스 결과 
2. 무한 시퀀스: 수학적 수열, 스트림 데이터 
3. 메모리 제약: 제한된 메모리 환경 
4. 순차 처리: 데이터를 순서대로만 처리하면 되는 경우

## TypeScript의 이터레이터

### 내장 이터러블
```typescript
// 1. 
// 이미 이터레이터를 지원하는 것들
Array, String, Map, Set, NodeList, Arguments
```

### Symbol.iterator
```typescript
const arr = [1, 2, 3];
const iterator = arr[Symbol.iterator]();
```

### for...of 루프
```typescript
// 내부적으로 이터레이터를 사용
for (const item of [1, 2, 3]) {
    console.log(item);
}

// 위 코드는 실제로 이렇게 동작:
const iterator = [1, 2, 3][Symbol.iterator]();
let result = iterator.next();
while (!result.done) {
    const item = result.value;
    console.log(item);
    result = iterator.next();
}
```