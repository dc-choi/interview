---
tags: [database, redis, cache]
status: done
category: "Data & Storage - Cache & KV"
aliases: ["Redis 자료구조", "Redis Data Structures"]
---

# Redis 자료구조

## string
```
제일 기본적인 데이터 타입, set 형태로 저장되는 데이터는 모두 string 형태로 저장된다.
```

## bitmaps
```
string의 변형이라고 볼 수 있고 bit 연산이 가능함.
```

## lists
```
데이터를 순서대로 저장함. 큐로 사용하기 적합함.
```

## hashes
```
키안에 여러개의 키-값 형태의 데이터
```

## sets
```
중복되지 않은 문자열의 집합
```

## sorted sets
```
set과 비슷하지만 score라는 숫자 값으로 정렬됩니다.

데이터가 저장될 때 부터 score 순으로 정렬됨.

스코어가 같은 경우 사전 순으로 정렬되어 저장됨.
```

## hyperloglogs
```
굉장히 많은 데이터를 다룰 때 주로 쓰며 중복되지 않는 값의 개수를 카운트할 때 사용합니다.

저장되는 용량이 매우 적지만 다시 확인할 수 없음.
```

## stream
```
log를 저장하기 가장 좋은 자료구조.
```

## Sorted Set score는 double(부동소수점)

Sorted Set의 score는 정수처럼 보여도 내부적으로 IEEE 754 배정밀도 부동소수점(double)이다. 정확히 표현되는 정수 범위는 약 2^53까지이고, 그 이상의 큰 정수(스노우플레이크 ID, 나노초 타임스탬프 등)를 score로 넣으면 정밀도 손실로 값이 뭉개질 수 있다.

- JavaScript처럼 숫자를 double로 다루는 클라이언트에서는 큰 Long 값을 주고받을 때 특히 위험하다.
- 정확한 ID나 큰 정수는 score가 아니라 member 문자열로 전달한다. 큰 정수를 굳이 넘길 때는 숫자 대신 문자열로 주고받는 편이 안전하다.
- 랭킹, 시간 범위 검색(`ZRANGEBYSCORE`), 이벤트 정렬처럼 score 정확도가 중요한 기능에서 반드시 확인한다.

## 자료구조 선택과 O(N)

용도별 적합 구조: String은 단순 값, List는 양끝 삽입, 삭제 큐, Set은 중복 없는 집합(팔로워, 친구 ID), Sorted Set은 점수 정렬(랭킹), Hash는 한 키 아래 여러 필드(사용자 프로필의 name, email, age). 선택의 핵심은 명령의 시간복잡도다. 데이터가 적을 때는 O(1)과 O(N) 차이가 안 보이지만, 수십만을 넘으면 O(N) 명령 하나가 싱글 스레드를 오래 점유해 장애가 된다. 큰 컬렉션 전체 조회, 삭제, `KEYS` 회피 등 운영 주의는 [[Operations|운영 팁]] 참고.

## 출처
- [우아한테크 — Redis 운영, 자료구조, 분산 설계](https://www.youtube.com/watch?v=mPB2CZiAkKM)

## 관련 문서
- [[Cache-Basics|캐시란?]]
- [[Redis-Architecture|Redis architecture]]
- [[Redis-Internal-Encoding|내부 인코딩 (skiplist, listpack)]]
- [[Operations|운영 팁 (O(N) 명령 회피)]]
- [[Use-Cases|Use cases]]
