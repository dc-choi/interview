---
tags: [runtime, nodejs, v8]
status: done
verified_at: 2026-10-01
category: "OS & Runtime"
aliases: ["Inline Cache", "IC", "Monomorphic", "Polymorphic", "Megamorphic", "Transition State"]
---

# V8 인라인 캐시 (Inline Cache)

동일한 **프로퍼티 접근**이 반복될 때 **호출 지점(call site)에 관찰한 Map과 접근 handler를 캐싱**하는 V8의 핵심 최적화 기법. Map 확인 자체를 없애기보다 이름과 prototype을 따라 다시 찾는 비용을 줄인다. [[V8-Hidden-Class|히든 클래스]]와 짝으로 동작한다.

## 동작 원리

1. V8이 프로퍼티 접근 같은 연산의 호출 지점에 feedback slot을 두고 실행 중 관찰값을 기록
2. 피드백에는 구현 버전에 따라 다음 정보가 들어갈 수 있다:
   - **IC 상태** (아래 대표 상태)
   - 직전에 관찰한 **Hidden Class 주소**
   - 해당 프로퍼티의 **Offset**
3. 다음 접근 시, 들어온 객체의 Hidden Class와 슬롯의 값을 비교 → 같으면 Offset으로 **바로 조회** (사전 탐색 생략)
4. 다른 Hidden Class가 들어오면 슬롯에 추가하거나 상태를 전이

## IC transition state

다음 이름은 V8 진단 로그와 내부 코드에서 관찰되는 대표 상태다. `POLYMORPHIC`이 몇 개까지인지, `MEGAMORPHIC`에서 어떤 stub과 cache를 쓰는지는 버전과 IC 종류에 따라 달라질 수 있다. 2에서 4개, 5개 이상 같은 숫자를 애플리케이션 계약으로 고정하지 않는다.

| 상태 | 표기 | 설명 |
|---|---|---|
| UNINITIALIZED | `0` | 초기 feedback 상태. 접근 실행과 feedback 지연 할당은 구분 |
| MONOMORPHIC | `1` | 해당 slot이 한 Map에 특화된 handler를 유지 |
| POLYMORPHIC | `P` | 소수의 다른 Hidden Class를 관찰해 여러 handler를 보관 |
| MEGAMORPHIC | `N` | 매우 다양한 Hidden Class를 관찰해 더 일반적인 조회 경로 사용 |

한 feedback slot의 정상적인 학습 과정은 보통 UNINIT → MONO → POLY → MEGA 방향으로 일반화된다. 코드 교체, feedback 초기화 같은 수명주기까지 포함해 절대 되돌아오지 않는 공개 규칙은 아니다. 옛 자료의 PREMONOMORPHIC(`.`) 상태는 현재 V8의 `InlineCacheState`에 없다.

### 상태를 직접 관찰하기

`node --log-ic --logfile=v8.log --no-logfile-per-isolate app.js`로 IC 상태 전이를 로그로 남긴다(V8 플래그 설명: tools/ic-processor용 IC 상태 전이 로그). `LoadIC` 행은 `LoadIC,<pc>,<time>,<line>,<column>,<이전 상태>,<새 상태>,<map>,<key>,<modifier>,<slow stub 사유>` 형태이고 상태 칸에 위 표의 표기가 찍힌다. 대표 네 상태 외에 `X`(NO_FEEDBACK), `^`(RECOMPUTE_HANDLER), `D`(MEGADOM), `G`(GENERIC)도 나온다. V8 main 소스(2026-10-01 확인)에는 여러 map이 같은 handler를 쓰는 HOMOMORPHIC(`H`) 상태가 더 있어, 상태 목록과 로그 기호도 버전마다 달라진다.

배열을 돌며 `u.name`을 읽는 함수 세 개에 각각 모양 1개, 2개, 5개 객체를 넣고 반복 호출하면 다음 전이가 기록됐다(Node.js 26.7.0, V8 14.6.202.34).

| 넣은 모양 수 | 기록된 전이 |
|---|---|
| 1개 | `0→1` |
| 2개 | `0→1`, `1→P` |
| 5개 | `0→1`, `1→P`, `P→P`, `P→P`, `P→N` |

- 다섯 번째 map에서 MEGA가 된 것은 같은 버전의 `--max-valid-polymorphic-map-count` 기본값 4와 맞는다. 이 숫자는 버전 기준의 관찰이지 계약이 아니다.
- 함수를 한 번만 호출하면 `name` 접근의 전이가 찍히지 않았다. feedback vector를 지연 할당하므로(`--lazy-feedback-allocation`, 할당 기준 호출 수 기본 8) 그 전에는 IC가 `X` 상태로 피드백을 모으지 않는다.

## 왜 MEGA에도 일반화된 cache가 필요한가

MEGAMORPHIC은 call site에 몇 개의 Map과 handler를 직접 나열하는 전략을 포기한다. 그렇다고 모든 정보를 버리는 것은 아니다. 구현은 공유 stub이나 megamorphic cache 같은 일반화된 경로를 사용할 수 있다. MONO보다 확인할 가정이 약해져 최적화 여지가 줄어든다.

## 예시: IC 상태 전이

```js
function read(p) { return p.x; }

const a = { x: 1, y: 2 };
const b = { x: 3, y: 4 };           // a와 같은 Hidden Class
const c = { y: 5, x: 6 };           // 순서 다름 → 다른 Hidden Class
const d = { x: 7, y: 8, z: 9 };     // 프로퍼티 추가 → 다른 Hidden Class

// 아래는 충분히 피드백을 모으는 상태 전이의 개념 예시다.
// 실제 최초 호출 몇 회는 feedback vector가 없어 기록되지 않을 수 있다.
read(a);  // HC_ab 관찰
read(b);  // MONO 유지 (HC_ab 재사용)
read(c);  // MONO → POLY (HC_ab + HC_c)
read(d);  // POLY (HC_ab + HC_c + HC_d)
// 충분히 다양한 shape가 누적되면 MEGA
```

## 최적화 원칙

### 1. 접근 지점이 보는 모양을 적고 안정되게 유지
MONO는 특화한 검사를 줄이기 쉽고 POLY는 여러 Map의 handler를 다룬다. MEGA는 더 일반적인 조회를 한다. 실제 속도의 절대 순서는 접근 종류, handler 공유, CPU와 데이터 분포에 따라 달라지므로 상태만으로 성능을 확정하지 않는다.

- MONO, POLY feedback을 받은 Maglev와 TurboFan은 관찰한 map을 확인하는 검사와 offset 접근을 코드에 넣는다. 처음 보는 모양이 오면 이 가정이 깨져 `wrong map` 사유로 역최적화된다.
- MEGA 접근은 map별 특화 대신 feedback을 모으지 않는 megamorphic 조회 builtin을 호출한다. 그 버전에서 map별 가정에 의한 `wrong map` 역최적화는 피하지만 특화 이점은 줄어든다. 다른 연산의 가정 실패까지 없어지는 것은 아니다.
- Node.js 26.7(V8 14.6)에서 `u.name`을 읽는 함수 세 개를 모양 1개, 2개, 5개로 달궈 TurboFan으로 최적화한 뒤 처음 보는 모양을 넣자, MONO와 POLY 함수는 `bailout (kind: deopt-eager, reason: wrong map)`으로 역최적화됐고 MEGA 함수는 최적화 상태를 유지했다.

따라서 POLY와 MEGA가 역최적화를 부른다고 단정하지 않는다. 특화된 코드는 새 모양에 역최적화될 수 있고, 일반화된 코드는 처음부터 느리다. 목표는 hot path의 접근 지점이 적은 수의 안정된 모양만 보게 하는 것이다.

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

## 일반 접근과 다른 의미

`super.x`는 현재 receiver를 값의 소유자처럼 찾아가는 접근이 아니다. HomeObject의 prototype에서 lookup을 시작하고 getter 등의 `this`는 receiver로 유지한다. 이 때문에 lookup 시작 객체와 receiver를 나눈 IC 설계가 필요하다.

Class field의 초기화도 일반 assignment와 다르다. Own property를 정의하므로 상속한 setter를 호출하는 대입과 같은 의미로 바꿀 수 없다. 엔진이 field용 IC를 도입해 빨라져도 이 언어 의미는 유지한다.

## 관련 문서

- [[V8|V8 엔진]]
- [[V8-Hidden-Class|V8 히든 클래스]]
- [[V8-Ignition-TurboFan|V8 컴파일 파이프라인]]

## 출처

- [V8 — Maps (Hidden Classes) in V8](https://v8.dev/docs/hidden-classes)
- [V8 — Fast properties in V8](https://v8.dev/blog/fast-properties)
- [V8 — Super fast super property access](https://v8.dev/blog/fast-super)
- [V8 — Faster initialization of instances with new class features](https://v8.dev/blog/faster-class-features)
- [V8 — InlineCacheState source](https://raw.githubusercontent.com/v8/v8/main/src/common/globals.h)
- [V8 — Maglev, V8's fastest optimizing JIT](https://v8.dev/blog/maglev)
- [V8 — IC transition mark source (14.6.202.34)](https://raw.githubusercontent.com/v8/v8/14.6.202.34/src/ic/ic.cc)
- [V8 — IC transition mark source (main)](https://raw.githubusercontent.com/v8/v8/main/src/ic/ic.cc)
- [V8 — IC log event format source (14.6.202.34)](https://raw.githubusercontent.com/v8/v8/14.6.202.34/src/logging/log.cc)
- [V8 — Flag definitions source (14.6.202.34)](https://raw.githubusercontent.com/v8/v8/14.6.202.34/src/flags/flag-definitions.h)
- [V8 — Generic lowering source, megamorphic access builtin (14.6.202.34)](https://raw.githubusercontent.com/v8/v8/14.6.202.34/src/compiler/js-generic-lowering.cc)
- [하정훈 강사 — 인라인 캐싱 동작방식](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196072)
- [하정훈 강사 — 인라인 캐싱 상태](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196073)
- [하정훈 강사 — 최적화 팁과 마무리](https://www.inflearn.com/courses/lecture?courseId=332466&unitId=196066)
