---
tags: [runtime, nodejs, v8]
status: done
verified_at: 2026-08-04
category: "OS & Runtime"
aliases: ["Inline Cache", "IC", "Monomorphic", "Polymorphic", "Megamorphic", "Transition State"]
---

# V8 인라인 캐시 (Inline Cache)

동일한 **프로퍼티 접근**이 반복 호출될 때, 매번 Hidden Class 조회를 하지 않도록 **호출 지점(call site)에 조회 결과를 캐싱**하는 V8의 핵심 최적화 기법. [[V8-Hidden-Class|히든 클래스]]와 짝으로 동작한다.

## 동작 원리

1. V8이 프로퍼티 접근 같은 연산의 호출 지점에 feedback slot을 두고 실행 중 관찰값을 기록
2. 피드백에는 구현 버전에 따라 다음 정보가 들어갈 수 있다:
   - **IC 상태** (아래 5단계)
   - 직전에 관찰한 **Hidden Class 주소**
   - 해당 프로퍼티의 **Offset**
3. 다음 접근 시, 들어온 객체의 Hidden Class와 슬롯의 값을 비교 → 같으면 Offset으로 **바로 조회** (사전 탐색 생략)
4. 다른 Hidden Class가 들어오면 슬롯에 추가하거나 상태를 전이

## IC transition state

다음 이름은 V8 진단 로그와 내부 코드에서 관찰되는 대표 상태다. `POLYMORPHIC`이 몇 개까지인지, `MEGAMORPHIC`에서 어떤 stub과 cache를 쓰는지는 버전과 IC 종류에 따라 달라질 수 있다. 2에서 4개, 5개 이상 같은 숫자를 애플리케이션 계약으로 고정하지 않는다.

| 상태 | 표기 | 설명 |
|---|---|---|
| UNINITIALIZED | `0` | 최초 상태. 아직 접근이 한 번도 실행되지 않음 |
| PREMONOMORPHIC | `.` | 일부 버전과 IC에서 보이는 준비 상태 |
| MONOMORPHIC | `1` | 항상 **같은 Hidden Class**로 접근. **가장 빠름** (1회 비교 후 캐시 히트) |
| POLYMORPHIC | `P` | 소수의 다른 Hidden Class를 관찰해 여러 handler를 보관 |
| MEGAMORPHIC | `N` | 매우 다양한 Hidden Class를 관찰해 더 일반적인 조회 경로 사용 |

한 feedback slot의 정상적인 학습 과정은 보통 UNINIT → MONO → POLY → MEGA 방향으로 일반화된다. 코드 교체, feedback 초기화 같은 수명주기까지 포함해 절대 되돌아오지 않는 공개 규칙은 아니다.

## 왜 MEGA에도 일반화된 cache가 필요한가

MEGAMORPHIC은 call site에 몇 개의 Map과 handler를 직접 나열하는 전략을 포기한다. 그렇다고 모든 정보를 버리는 것은 아니다. 구현은 공유 stub이나 megamorphic cache 같은 일반화된 경로를 사용할 수 있다. 핵심은 MONO보다 확인할 가정이 약해져 최적화 여지가 줄어든다는 점이다.

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
IC가 MONO일 때 TurboFan이 가장 공격적인 최적화를 수행한다. POLY, MEGA는 Deopt 가능성이 높아진다.

### 2. 동일 Hidden Class 공유
같은 구조의 객체를 **동일한 생성자**, **동일한 순서**로 생성 → 같은 Hidden Class 재사용. 상세는 [[V8-Hidden-Class|V8 히든 클래스]] 참조.

### 3. 함수 인자 타입 일관성

```js
function sum(p) { return p.x + p.y; }

// 좋음: 같은 Hidden Class만 들어감 → MONO 유지
sum({ x: 1, y: 2 });
sum({ x: 3, y: 4 });

// 나쁨: 다른 Hidden Class → POLY, MEGA로 전락
sum({ x: 1, y: 2 });
sum({ y: 1, x: 2 });     // 순서 다름 → 다른 HC
sum({ x: 1, y: 2, z: 3 });// 프로퍼티 추가 → 다른 HC
```

### 4. 동적 유연함의 대가
JS의 "어떤 모양의 객체든 받을 수 있다"는 유연성은 IC 관점에서 비용이다. **동적, 유연한 코드는 성능 대가가 따른다**는 사실을 인지하고, hot path일수록 정적 언어처럼 작성한다.

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-Hidden-Class|V8 히든 클래스]]
- [[V8-Ignition-TurboFan|V8 컴파일 파이프라인]]

## 출처

- [V8 — Maps (Hidden Classes) in V8](https://v8.dev/docs/hidden-classes)
- [V8 — Fast properties in V8](https://v8.dev/blog/fast-properties)
- [하정훈 강사 — 인라인 캐싱 동작방식](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196072)
- [하정훈 강사 — 인라인 캐싱 상태](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196073)
- [하정훈 강사 — 최적화 팁과 마무리](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196066)
