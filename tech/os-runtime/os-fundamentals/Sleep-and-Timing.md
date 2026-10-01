---
tags: [os, thread, scheduling, sleep, timer, race-condition, randomness]
status: done
verified_at: 2026-09-27
category: "OS&런타임(OS&Runtime)"
aliases: ["Sleep and Timing", "Sleep 함수", "sleep", "타이머 해상도", "Timer Resolution", "고해상도 타이머", "QueryPerformanceCounter", "타이밍 의존 버그"]
---

# Sleep과 타이밍: 쉬는 게 아니라 스케줄링에서 빠지는 것

`sleep` 계열 함수는 호출한 스레드를 지정한 시간 동안 실행할 수 없는 대기 상태로 두라는 요청이다. 시간이 지나면 스레드는 곧바로 실행된다는 보장 없이 준비 상태가 되어 CPU 배정을 기다린다. 그래서 실제로 멈춘 시간은 요청값과 다르고, 그 차이는 타이머 해상도, OS 설정, 다른 스레드의 부하에 따라 매번 달라진다.

한 줄 요약: **sleep이 약속하는 것은 대략 그 시간 동안 실행하지 않는다는 것뿐이다. 정확히 그 시각에 깨어난다는 것도, 다른 스레드의 작업이 끝났다는 것도 보장하지 않는다.**

## 동작 원리: 대기, 준비, 실행

1. 스레드가 sleep을 호출하면 남은 time slice를 내놓고 대기 상태가 된다. 스케줄러는 대기 중인 스레드에 CPU를 배정하지 않는다.
2. 지정한 시간이 지나면 스레드는 준비 상태가 된다. CPU를 받을 자격이 생긴 것일 뿐이다.
3. 스케줄러가 우선순위와 다른 준비 스레드를 보고 CPU를 배정해야 다시 실행된다.

상태 전이는 [[Process-Lifecycle#프로세스 상태|프로세스 상태]], 준비 상태의 스레드에 CPU를 배정하는 방식은 [[Context-Switching|CPU 스케줄링]]에서 다룬다. 대기 중인 스레드는 CPU를 쓰지 않으므로, 조건을 계속 확인하며 CPU를 태우는 busy-wait와 달리 다른 스레드에 CPU를 넘겨준다.

## 실제 대기 시간이 달라지는 이유

- **타이머 해상도**: 요청 시간은 클록 눈금 단위로 처리된다. Linux `nanosleep()`은 요청 시간을 클록 단위의 다음 배수로 올리고, POSIX도 해상도 단위의 올림과 다른 작업의 스케줄링 때문에 요청보다 길어질 수 있다고 정한다. 고해상도 타이머를 쓰는 Linux에서는 눈금이 아니라 하드웨어 정밀도(보통 마이크로초)가 한계다.
- **Linux timer slack**: 커널은 여러 깨우기를 한데 모아 전력을 아끼려고 제한 시간이 있는 일부 시스템 콜의 깨우기를 timer slack만큼 늦출 수 있다. init의 기본값은 50µs이고 자식 프로세스가 물려받으며 `prctl(PR_SET_TIMERSLACK)`으로 바꾼다.
- **스케줄링 지연**: 대기 시간이 끝나도 스케줄러가 CPU를 다시 배정해야 실행된다. Linux 매뉴얼과 Microsoft 문서 모두 준비 상태가 된 뒤 실행까지 지연이 있을 수 있다고 적는다.
- **시그널**: POSIX `nanosleep()`은 시그널 핸들러 때문에 중단되면 -1을 반환하고 `errno`를 `EINTR`로 설정하며, `rmtp`가 NULL이 아니면 그 포인터가 가리키는 구조체에 남은 시간을 적는다. 이 경우를 빼면 POSIX는 `CLOCK_REALTIME`으로 잰 대기 시간이 요청보다 짧지 않다고 정한다. Linux는 `CLOCK_MONOTONIC`으로 잰다.
- **Windows `Sleep`의 틱 단위 동작**: 시스템 클록 틱 단위로 동작하므로, 요청값이 클록 해상도보다 작으면 요청보다 짧게 잘 수 있고, 한 틱과 두 틱 사이 값이면 한 틱에서 두 틱 사이 어디서든 깰 수 있다. `timeBeginPeriod`로 해상도를 높일 수 있지만 자주 호출하면 시스템 클록, 전력 사용과 스케줄러에 크게 영향을 줄 수 있다. Windows 10 버전 2004부터는 전역 설정을 바꾸지 않는다. 호출한 프로세스에는 어느 프로세스든 요청한 가장 높은 해상도를 쓰고, 호출하지 않은 프로세스에는 기본보다 높은 해상도를 보장하지 않는다. Windows 11부터는 창을 가진 프로세스의 창이 전부 가려지거나 최소화되어 사용자에게 보이지도 들리지도 않으면 기본보다 높은 해상도를 보장하지 않으며, `SetProcessInformation`으로 이 동작을 바꿀 수 있다. `Sleep(0)`은 남은 time slice만 내놓고 준비 상태로 남는다.

요청 시간이 짧을수록 오차의 비율이 커진다. 1ms를 요청하고 여러 번 재면 매번 다른 값이 나오며, 어느 쪽으로 얼마나 벗어나는지는 플랫폼과 부하에 달려 있다.

### Node.js 타이머

`setTimeout()`도 같은 성질을 가진다. Node.js 문서는 콜백이 정확히 delay 뒤에 실행된다고 보장하지 않고 실행 순서도 보장하지 않으며, delay가 1보다 작거나 2147483647보다 크거나 NaN이면 1로 바꾼다([[Event-Loop-Phases-Timers|타이머 심화]]). Node.js는 타이머의 시작 시각과 만료 판정을 libuv 루프 시각의 밀리초 정수로 처리한다. 타이머를 걸 때 루프 시각을 갱신하므로 오래된 시각을 쓰는 것은 아니지만, 1ms 미만의 나머지가 버려져, 정수 delay도 고해상도 시계로 재면 요청보다 최대 1ms 가까이 짧게 측정될 수 있다. 1 이상 2147483647 이하의 정수가 아닌 delay는 소수점 아래까지 버리므로(1.7은 1) 1ms 넘게 짧아질 수도 있다. 아래 예제를 macOS(Darwin 25.6)와 Node.js 26.7.0에서 반복 실행하면 1ms 요청은 대개 1.1~1.5ms로 측정되지만, 드물게 1ms보다 짧게(수십~수백µs) 측정됐다. 예제와 별도로 50ms 동안 CPU를 붙잡은 직후 건 10ms 타이머도 곧바로 실행되지 않고 대개 약 11~12.5ms 뒤에 실행됐으며, 드물게 10ms 안팎으로 측정됐다.

```ts
import { setTimeout as sleep } from 'node:timers/promises';

/**
 * 요청한 지연과 실제로 흐른 시간을 마이크로초 단위로 잰다.
 * @param delayMs 요청할 지연(ms)
 * @returns 실제 경과 시간(µs)
 */
const measureSleep = async (delayMs: number): Promise<bigint> => {
  const start = process.hrtime.bigint();
  await sleep(delayMs);
  return (process.hrtime.bigint() - start) / 1_000n;
};

const samples: bigint[] = [];
for (let i = 0; i < 5; i++) {
  samples.push(await measureSleep(1));
}
console.log(samples); // 실행 예: [ 1446n, 1284n, 1316n, 1326n, 1359n ] (드물게 1000n 미만 값이 섞인다)
```

## 경과 시간 재기: 단조 증가 카운터

실제로 흐른 시간은 벽시계가 아니라 단조 증가 카운터로 잰다. 벽시계는 NTP 보정이나 관리자의 시각 변경으로 건너뛰거나 뒤로 갈 수 있다.

- **Windows QPC**: `QueryPerformanceCounter`로 틱 수를 읽고 `QueryPerformanceFrequency`로 초당 틱 수를 얻어, 틱 차이를 주파수로 나눈다. 주파수는 부팅 때 정해져 바뀌지 않으므로 한 번 읽어 캐시한다. 해상도는 주파수의 역수라 10MHz면 100ns이고, 측정 정밀도는 해상도와 카운터를 읽는 데 드는 시간 중 큰 값이다. QPC는 UTC나 시스템 시각 변경과 무관하고 뒤로 가지 않는다.
- **단위 변환**: 정수 나눗셈은 나머지를 버리므로 마이크로초로 바꿀 때는 먼저 1,000,000을 곱하고 주파수로 나눈다. 64비트 곱셈의 오버플로와 double 변환의 정밀도 손실도 함께 본다.
- **TSC 직접 읽기**: `RDTSC`로 CPU 카운터를 직접 읽는 방식은 Microsoft가 강하게 말린다. 불변 TSC가 없는 하드웨어, 코어 간 비동기화, 가상 머신 이동에서 결과를 믿을 수 없다.
- **Linux와 Node.js**: Linux는 `clock_gettime(CLOCK_MONOTONIC)`을 쓴다. 이 시계는 관리자의 시각 변경 같은 불연속 점프의 영향을 받지 않고 뒤로 가지 않는다. 다만 NTP의 주파수 조정은 받고, 시스템이 일시 중지된 시간은 세지 않는다. 일시 중지 시간까지 포함하려면 `CLOCK_BOOTTIME`을 쓴다. Node.js는 `process.hrtime.bigint()`나 `performance.now()`를 쓴다([[Application-Performance-Monitoring|APM 측정 기본기]]).

## sleep으로 순서를 맞추는 코드

다른 스레드나 비동기 작업이 끝날 시간을 짐작해 sleep을 넣는 코드는 대부분의 실행에서 통과하다가, 부하가 높거나 느린 머신과 CI에서 가끔 깨진다. 결과가 실행 순서와 타이밍에 달린 경쟁 상태(race condition)이기 때문이다. 우연히 맞아떨어진 타이밍에 정확성을 맡긴 셈이다.

- **sleep은 동기화가 아니다**: Java 명세(JLS 17.3)는 `Thread.sleep`과 `Thread.yield`에 동기화 의미가 없다고 명시한다. 깨어난 뒤 다른 스레드가 쓴 값이 보인다는 보장도 없다([[Java-Threads-Lifecycle-and-Cancellation|Java 스레드 생명 주기]]).
- **완료는 신호로 기다린다**: 스레드는 `join`, 조건 변수, 세마포어, 이벤트 객체로, 비동기 코드는 작업의 Promise를 `await`해서 기다린다.
- **외부 상태는 조건과 제한 시간으로 기다린다**: 끝났는지 확인하는 조건을 두고 제한 시간과 백오프를 둔 폴링을 쓴다([[Retry-Backoff-Jitter|재시도, 백오프와 지터]]).
- **테스트는 고정 시간을 기다리지 않는다**: 시간은 fake timer로 진행시키고, 외부 상태는 최대 대기 시간을 둔 조건 대기로 기다린다([[Deterministic-Test|결정적 테스트]]).
- **교착 위험**: Win32에서 창을 직접 또는 간접(DDE, COM `CoInitialize`)으로 만드는 스레드가 무한 `Sleep`을 쓰면 메시지 브로드캐스트를 처리하지 못해 시스템이 교착된다(Microsoft Sleep 문서). I/O 완료 포트나 스레드 풀처럼 동시 실행 수가 제한된 곳에서 `Sleep(0)`으로 다른 스레드의 작업을 기다리면 프로세스가 교착될 수 있다. 이런 경우에는 `MsgWaitForMultipleObjects(Ex)`를 쓴다.

## 타이밍 지터를 난수로 쓸 수 있는가

sleep 전후를 고해상도 카운터로 재면 매번 값이 달라지고, 그 값을 나머지 연산으로 줄이면 뽑기 번호처럼 쓸 수 있다. 이런 흔들림은 엔트로피원이 될 수 있지만 그대로 난수로 쓰기에는 한계가 있다.

- **분포가 고르지 않다**: 측정값은 요청 시간 근처에 몰리고 부하, 전원 설정, 가상화에 따라 치우친다. 치우친 값에 `% N`을 해도 균등해진다는 보장이 없고, 원래 분포를 모르면 편향의 크기도 알 수 없다. 균등한 원천이라도 가능한 값의 개수가 N의 배수가 아니면 나머지 연산은 일부 값을 더 자주 낸다(모듈로 편향).
- **엔트로피원은 설계와 검증 대상이다**: NIST SP 800-90B는 난수 비트 생성기에 쓰는 엔트로피원의 설계 원칙과 검증 시험을 정한다. 엔트로피원은 SP 800-90A의 결정적 난수 비트 생성기(DRBG)와 결합해 SP 800-90C가 정한 난수 비트 생성기를 이루고, 응용이 받는 난수는 이 생성기의 출력이다.

실무에서는 용도로 고른다.

- **예측되면 안 되는 값**(토큰, 키, 당첨 번호): OS나 런타임이 제공하는 암호학적 난수 생성기(CSPRNG)를 쓴다. Linux는 플래그 없는 `getrandom()`(엔트로피 풀이 초기화될 때까지 기다린다)이나 `/dev/urandom`(부팅 초기 풀 초기화 전에는 엔트로피가 낮은 값을 낼 수 있다), Node.js는 `crypto.randomInt()`와 `crypto.randomBytes()`, 브라우저는 `crypto.getRandomValues()`다. 브라우저에서 암호화 키를 만들 때는 보안 컨텍스트가 보장되는 `crypto.subtle.generateKey()`를 쓴다. `crypto.randomInt(min, max)`는 min 이상 max 미만의 정수를 모듈로 편향 없이 내며 범위(max - min)가 2^48보다 작아야 한다.
- **공정성을 보여야 하는 추첨**: 어떤 난수원을 쓰든 값 하나만으로는 조작되지 않았다는 근거가 되지 않는다. 참가 명단과 절차가 정해진 뒤라면 운영자가 정한 시드의 해시를 미리 공개하는 것도 부족하다. 해시를 공개하기 전에 원하는 결과가 나오는 시드를 골라 둘 수 있기 때문이다. RFC 3797은 참가 명단, 계산 절차, 앞으로 공개될 난수원(지정한 날의 공개 추첨 번호 등)을 먼저 발표하고, 그 값이 나온 뒤 누구나 같은 결과를 다시 계산하게 하는 공개 검증 절차를 제시한다. 결과를 정하는 난수를 절차를 정한 사람도 미리 알거나 바꿀 수 없어야 한다.
- **예측돼도 괜찮은 값**(시뮬레이션, 샘플링): Linux `random(7)`은 이런 용도에 암호학적 난수가 필요 없고, 적은 양의 난수로 사용자 공간 PRNG를 시드하라고 안내한다. `Math.random()`은 암호학적으로 안전하지 않으므로 보안 용도에 쓰지 않는다.

## 면접 체크포인트

- sleep이 끝나도 바로 실행되지 않는 이유(대기, 준비, 실행의 전이)
- 실제 대기 시간이 요청과 달라지는 요인(타이머 해상도, timer slack, 스케줄링 지연, 시그널)과 Windows `Sleep`이 요청보다 짧게 잘 수 있는 조건
- sleep으로 순서를 맞춘 코드가 경쟁 상태인 이유와 대체 수단(join, 조건 변수, await, 조건 폴링, fake timer)
- 경과 시간을 벽시계가 아니라 단조 증가 카운터로 재는 이유, QPC의 해상도와 정밀도 차이
- 타이밍 지터를 그대로 난수로 쓰기 어려운 이유와 CSPRNG, 모듈로 편향

## 출처

- [Sleep 함수와 우연 그리고 CPU로 랜덤뽑기 — 널널한 개발자 TV](https://www.youtube.com/watch?v=Js1HSwUurpw)
- [Microsoft Learn, Sleep function (synchapi.h)](https://learn.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-sleep)
- [Microsoft Learn, timeBeginPeriod function (timeapi.h)](https://learn.microsoft.com/en-us/windows/win32/api/timeapi/nf-timeapi-timebeginperiod)
- [Microsoft Learn, SetProcessInformation function (processthreadsapi.h)](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-setprocessinformation)
- [Microsoft Learn, Acquiring high-resolution time stamps](https://learn.microsoft.com/en-us/windows/win32/sysinfo/acquiring-high-resolution-time-stamps)
- [Linux man-pages, nanosleep(2)](https://man7.org/linux/man-pages/man2/nanosleep.2.html)
- [The Open Group, POSIX.1-2024: nanosleep](https://pubs.opengroup.org/onlinepubs/9799919799/functions/nanosleep.html)
- [Linux man-pages, clock_gettime(2)](https://man7.org/linux/man-pages/man2/clock_gettime.2.html)
- [Linux man-pages, time(7)](https://man7.org/linux/man-pages/man7/time.7.html)
- [Linux man-pages, PR_SET_TIMERSLACK(2const)](https://man7.org/linux/man-pages/man2/PR_SET_TIMERSLACK.2const.html)
- [Node.js Documentation, Timers](https://nodejs.org/api/timers.html)
- [libuv Documentation, Event loop: uv_now](https://docs.libuv.org/en/v1.x/loop.html)
- [Node.js v26.7.0 lib/internal/timers.js — Node.js](https://github.com/nodejs/node/blob/v26.7.0/lib/internal/timers.js)
- [Node.js v26.7.0 src/env.cc — Node.js](https://github.com/nodejs/node/blob/v26.7.0/src/env.cc)
- [Node.js v26.7.0 src/timers.cc — Node.js](https://github.com/nodejs/node/blob/v26.7.0/src/timers.cc)
- [Node.js Documentation, Crypto: crypto.randomInt](https://nodejs.org/api/crypto.html#cryptorandomintmin-max-callback)
- [MDN, Math.random()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random)
- [MDN, Crypto: getRandomValues() method](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues)
- [Linux man-pages, random(7)](https://man7.org/linux/man-pages/man7/random.7.html)
- [NIST, SP 800-90A Rev. 1: Recommendation for Random Number Generation Using Deterministic Random Bit Generators](https://csrc.nist.gov/pubs/sp/800/90/a/r1/final)
- [NIST, SP 800-90B: Recommendation for the Entropy Sources Used for Random Bit Generation](https://csrc.nist.gov/pubs/sp/800/90/b/final)
- [NIST, SP 800-90C: Recommendation for Random Bit Generator (RBG) Constructions](https://csrc.nist.gov/pubs/sp/800/90/c/final)
- [IETF, RFC 3797: Publicly Verifiable Nominations Committee (NomCom) Random Selection](https://www.rfc-editor.org/rfc/rfc3797.html)
- [Oracle, The Java Language Specification SE 26, 17.3 Sleep and Yield](https://docs.oracle.com/javase/specs/jls/se26/html/jls-17.html#jls-17.3)

## 관련 문서

- [[System-Time-and-Clock-Sync|시스템 시간과 시계 동기화 (NTP 보정과 벽시계)]]
- [[Process-Lifecycle|프로세스 상태 (대기, 준비, 실행)]]
- [[Context-Switching|컨텍스트 스위칭과 CPU 스케줄링]]
- [[Event-Loop-Phases|이벤트 루프 페이즈]]
- [[Event-Loop-Phases-Timers|이벤트 루프 타이머 심화]]
- [[Java-Threads-Lifecycle-and-Cancellation|Java 스레드 생명 주기 (sleep, join, interrupt)]]
- [[Deterministic-Test|결정적 테스트 (fake timer)]]
- [[Retry-Backoff-Jitter|재시도, 백오프와 지터]]
- [[Application-Performance-Monitoring|APM (단조 증가 시계로 측정)]]
- [[OS기초(OSFundamentals)|OS 기초 인덱스]]
