---
tags: [runtime, nodejs, v8]
status: done
category: "OS & Runtime"
aliases: ["Inline Cache", "IC", "Monomorphic", "Polymorphic", "Megamorphic", "Transition State"]
---

# V8 인라인 캐시 (Inline Cache)

동일한 **프로퍼티 접근**이 반복 호출될 때, 매번 Hidden Class 조회를 하지 않도록 **호출 지점(call site)에 조회 결과를 캐싱**하는 V8의 핵심 최적화 기법. [[V8-Hidden-Class|히든 클래스]]와 짝으로 동작한다.

## 동작 원리

1. Ignition이 특정 프로퍼티 접근 패턴을 반복 감지하면, 호출 지점에 **IC 슬롯** 생성
2. 슬롯에는:
   - **IC 상태** (아래 5단계)
   - 직전에 관찰한 **Hidden Class 주소**
   - 해당 프로퍼티의 **Offset**
3. 다음 접근 시, 들어온 객체의 Hidden Class와 슬롯의 값을 비교 → 같으면 Offset으로 **바로 조회** (사전 탐색 생략)
4. 다른 Hidden Class가 들어오면 슬롯에 추가하거나 상태를 전이

## IC Transition State (5단계)

| 상태 | 표기 | 설명 |
|---|---|---|
| UNINITIALIZED | `0` | 최초 상태. 아직 접근이 한 번도 실행되지 않음 |
| PREMONOMORPHIC | `.` | 개념상의 중간 상태. 한 번 실행됐고, 다음에 MONO로 전환될 가능성이 높음 |
| MONOMORPHIC | `1` | 항상 **같은 Hidden Class**로 접근. **가장 빠름** (1회 비교 후 캐시 히트) |
| POLYMORPHIC | `P` | 2~4개의 다른 Hidden Class 관찰. 여러 캐시를 순차 비교 |
| MEGAMORPHIC | `N` | 5개 이상의 Hidden Class 관찰. 캐시 포기, **전역 해시 테이블 조회** (가장 느림) |

상태는 **단방향으로만 전이**한다: UNINIT → PREMONO → MONO → POLY → MEGA. 한 번 MEGA로 가면 되돌아오지 않는다.

## 왜 MEGA여도 캐싱을 유지하나

MEGAMORPHIC은 속도가 가장 느리지만, 캐싱 자체를 포기하는 것보단 여전히 낫다. 캐시 엔트리가 없으면 **매번 동적 사전 탐색**이 필요하므로 해시 테이블 조회보다 더 비싸다.

## 예시: IC 상태 전이

```js
function read(p) { return p.x; }

const a = { x: 1, y: 2 };
const b = { x: 3, y: 4 };           // a와 같은 Hidden Class
const c = { y: 5, x: 6 };           // 순서 다름 → 다른 Hidden Class
const d = { x: 7, y: 8, z: 9 };     // 프로퍼티 추가 → 다른 Hidden Class

read(a);  // UNINIT → PREMONO → MONO (HC_ab 관찰)
read(b);  // MONO 유지 (HC_ab 재사용)
read(c);  // MONO → POLY (HC_ab + HC_c)
read(d);  // POLY (HC_ab + HC_c + HC_d)
// 5개 이상 누적되면 MEGA
```

## 최적화 원칙

### 1. MONOMORPHIC 상태 유지
IC가 MONO일 때 TurboFan이 가장 공격적인 최적화를 수행한다. POLY·MEGA는 Deopt 가능성이 높아진다.

### 2. 동일 Hidden Class 공유
같은 구조의 객체를 **동일한 생성자**, **동일한 순서**로 생성 → 같은 Hidden Class 재사용. 상세는 [[V8-Hidden-Class|V8 히든 클래스]] 참조.

### 3. 함수 인자 타입 일관성

```js
function sum(p) { return p.x + p.y; }

// 좋음: 같은 Hidden Class만 들어감 → MONO 유지
sum({ x: 1, y: 2 });
sum({ x: 3, y: 4 });

// 나쁨: 다른 Hidden Class → POLY·MEGA로 전락
sum({ x: 1, y: 2 });
sum({ y: 1, x: 2 });     // 순서 다름 → 다른 HC
sum({ x: 1, y: 2, z: 3 });// 프로퍼티 추가 → 다른 HC
```

### 4. 동적 유연함의 대가
JS의 "어떤 모양의 객체든 받을 수 있다"는 유연성은 IC 관점에서 비용이다. **동적·유연한 코드는 성능 대가가 따른다**는 사실을 인지하고, hot path일수록 정적 언어처럼 작성한다.

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-Hidden-Class|V8 히든 클래스]]
- [[V8-Ignition-TurboFan|V8 컴파일 파이프라인]]
