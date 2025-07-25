# Singleton 패턴이란?
클래스의 인스턴스가 오직 하나만 존재하도록 보장하고 해당 인스턴스에 대한 전역 접근점은 하나이며 인스턴스 생성은 클래스가 제어하도록 하는 디자인패턴

## 왜 쓰을까?

### 리소스 제약
데이터베이스 연결의 경우 초기에 한번만 연결하고 해당 Pool 재사용

### 상태 일관성
앱 전체에서 같은 설정을 봐야 하는 경우

### 순서 제어
로그의 경우 순서대로 작성되는 것이 중요함.

### 프로세스에서 하나만 존재해야 하는 것
프린트 스풀러, 파일 시스템, 캐싱

### 전역 접근이 필요한 것
사용자 인증 정보, 애플리케이션 설정, 이벤트 버스, 국제화 관리자

## 핵심 개념

### Private Constructor
```typescript
class Singleton {
    private constructor() {
        console.log("Singleton instance created");
    }
}

// 컴파일 에러 발생.
const instance = new Singleton();
```

### Static Method && Instance Control Logic
```typescript
class Singleton {
    private static instance: Singleton | null = null;
    
    private constructor() {}
    
    public static getInstance(): Singleton {
        if (!Singleton.instance) {
            Singleton.instance = new Singleton();
        }
        return Singleton.instance;
    }
}
```

## 생성 전략

### Eager Initialization
```typescript
// 클래스 로딩과 동시에 생성
class EagerSingleton {
    private static readonly instance = new EagerSingleton();

    private constructor() {}

    public static getInstance(): EagerSingleton {
        return EagerSingleton.instance;
    }
}
```

장점: 스레드 안전, 구현 간단

단점: 메모리 낭비 가능, 초기화 에러 처리 어려움

### Lazy Initialization
```typescript
// static method로 인스턴스 생성
class LazySingleton {
    private static instance: LazySingleton | null = null;
    
    private constructor() {}
    
    public static getInstance(): LazySingleton {
        if (!LazySingleton.instance) {
            LazySingleton.instance = new LazySingleton();
        }
        return LazySingleton.instance;
    }
}
```
장점: 메모리 효율적, 필요시에만 생성

단점: 멀티스레드 환경에서 문제 가능

## 변형 패턴

### Multiton Pattern
예제 참고

### Registry Singleton
예제 참고

## 실 사용 사례
1. 프론트엔드 상태 관리
2. API 클라이언트
3. 데이터베이스 커넥션 풀
4. 캐시 매니저
5. 로깅 시스템
