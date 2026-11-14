---
tags: [game, game-loop, frame-rate, delta-time, fixed-timestep, simulation]
status: done
verified_at: 2026-11-14
category: "Web - 실시간"
aliases: ["Game Loop Frame Timing", "게임 루프의 프레임 시간", "Delta Time", "델타 타임", "Fixed Timestep", "고정 시간 간격"]
---

# 게임 루프의 프레임 시간: 델타 타임과 고정 시간 간격

게임은 정지된 화면(프레임)을 연속으로 그리며 그 사이에 입력 처리, 이동, 충돌과 규칙 계산을 끝낸다. 이 갱신을 무엇을 기준으로 진행하는지에 따라 속도, 물리의 안정성과 재현성이 달라진다. 네트워크 너머 참여자와 상태를 맞추는 문제는 [[Game-State-Authority-and-Prediction|게임 상태의 판정 권한과 클라이언트 예측]]에서 다룬다.

## 프레임 레이트와 프레임 시간

- **프레임 레이트(FPS)**: 1초에 표시하는 프레임 수다.
- **프레임 시간**: 한 프레임에 쓸 수 있는 시간으로 1000ms를 FPS로 나눈 값이다. 30 FPS는 약 33.3ms, 60 FPS는 약 16.7ms, 120 FPS는 약 8.3ms다. 60 FPS를 목표로 하면 이동, 충돌, 규칙과 그리기가 모두 약 16.7ms 안에 끝나야 한다.
- **평균보다 편차**: 평균 60 FPS라도 가장 느린 1%의 프레임이 15 FPS 수준이면 끊김이 보인다. 새 효과를 처음 준비하거나 콘텐츠를 불러오는 일회성 작업이 이런 급증을 만든다. 프레임 레이트가 화면 주사율을 나누어떨어지게 하지 못하면 프레임마다 표시 시간이 달라져 고르지 않게 보이며, 120Hz에서 40 FPS는 프레임마다 정확히 3번 갱신되므로 고르게 보인다(Unity 블로그 기준).

## 프레임을 시간 단위로 쓰면 기기마다 속도가 바뀐다

프레임 의존(frame rate dependent) 방식은 프레임 하나를 시간의 단위로 삼아 "프레임당 몇 픽셀"처럼 움직인다. 같은 입력이 같은 프레임에 들어오면 결과를 재현하기 쉽지만(이 문서의 해석), 갱신 빈도가 달라지면 게임 속 시간의 흐름도 함께 달라진다. 같은 게임이 한 기기에서 300 FPS, 다른 기기에서 150 FPS로 돈다면 후자에서 모든 움직임이 절반 속도가 된다. 부하가 커져 프레임이 늦어지면 게임 전체가 느려지는 현상도 같은 원인이다.

반대로 연산 시간이 일정해야 하는 장르는 프레임을 일부러 고정한다. 대전 격투 게임은 공격 동작의 타이밍을 프레임 수로 세기 때문에 흔히 60 FPS로 고정한다(Unity 블로그 기준).

## 델타 타임: 지난 프레임에서 흐른 시간만큼 움직인다

델타 타임(delta time)은 직전 갱신 이후 흐른 실제 시간이다. 매 프레임 타이머를 읽어 그 값을 속도에 곱하면 프레임 수와 관계없이 같은 실제 시간에 같은 거리를 움직인다.

```csharp
// Unity: 초당 회전 각도에 지난 프레임의 경과 시간을 곱한다
void Update() {
    transform.Rotate(0, 0, degreesPerSecond * Time.deltaTime);
}
```

Unity의 `Time.deltaTime`은 지난 프레임에서 현재 프레임까지의 초 단위 간격이다. `Time.timeScale`의 영향을 받아 timeScale 0으로 멈추면 0이 되고, 실제 경과 시간이 필요하면 `Time.unscaledDeltaTime`을 쓴다. 첫 `Update`에서는 매우 작거나 0일 수 있고, 창이 포커스를 잃거나 백그라운드에서 돌다 돌아오면 큰 값이 들어올 수 있다. 상한은 `Time.maximumDeltaTime`으로 정한다.

가변 델타 타임을 물리 계산에 그대로 넣으면 결과가 dt에 따라 달라진다. 느낌이 조금 달라지는 정도에서 그치기도 하지만, 큰 dt에서는 스프링 시뮬레이션이 발산하거나 빠른 물체가 벽을 통과(tunneling)하고 바닥을 뚫고 떨어질 수 있다.

## 고정 시간 간격: 렌더링은 시간을 만들고 시뮬레이션은 소비한다

물리와 게임 규칙은 고정된 dt로 진행하고 렌더링만 가변 속도로 돌리는 구조가 널리 쓰인다. 프레임마다 흐른 시간을 누산기(accumulator)에 더하고, 누산기가 dt 이상인 동안 고정 dt로 시뮬레이션을 한 단계씩 진행한다. 남은 시간은 다음 프레임으로 넘긴다.

```cpp
double accumulator = 0.0;
State previous, current;
while (running) {
    double newTime = now();
    double frameTime = min(newTime - lastTime, 0.25); // 큰 멈춤 뒤 폭주 방지
    lastTime = newTime;
    accumulator += frameTime;
    while (accumulator >= dt) {
        previous = current;
        integrate(current, t, dt); // 항상 같은 dt
        t += dt;
        accumulator -= dt;
    }
    double alpha = accumulator / dt;
    render(lerp(previous, current, alpha)); // 두 상태 사이를 보간
}
```

- **보간**: 렌더링 주기와 시뮬레이션 주기가 다르면(예: 60 FPS 렌더링, 50Hz 물리) 남은 시간 때문에 움직임이 끊겨 보인다. `alpha = accumulator / dt`로 직전 상태와 현재 상태를 섞어 그리고, 회전은 slerp로 섞는다. 이 방식은 화면을 최대 한 단계 과거 상태로 보여 준다(이 문서의 해석).
- **죽음의 소용돌이(spiral of death)**: X초 분량의 시뮬레이션에 X초 넘게 걸리면 따라잡으려 더 많은 단계를 돌리고 더 뒤처진다. 시뮬레이션 비용에 여유를 두거나 한 프레임의 단계 수, 프레임 시간을 제한한다. 제한에 걸리면 게임이 느려지는 것으로 보인다.
- **재현성**: 프레임 시간을 dt 이하의 단계로 나눠 소비하는 절충(semi-fixed)은 대부분 충분하지만 부동소수점 정밀도 때문에 같은 입력에서 정확히 같은 결과를 보장하지 않는다. 같은 명령으로 같은 상태를 만들어야 하는 결정적 시뮬레이션과 lockstep 동기화에는 완전히 고정된 dt가 필요하다.

Unity는 이 구조를 엔진에 넣어 두었다. `FixedUpdate`와 물리는 `Time.fixedDeltaTime` 간격으로 실행된다. 이 간격은 timeScale이 적용된 게임 시간 기준이라, timeScale 0.5에서 fixedDeltaTime 1초는 실제 시간 2초마다 실행되며 값 자체는 바뀌지 않는다. `FixedUpdate` 안에서 `Time.deltaTime`을 읽으면 `Time.fixedDeltaTime`이 돌아온다.

## 소수 픽셀 이동: 나머지를 누적해 정수로 움직인다

픽셀 좌표가 정수인 게임에서 속도가 프레임당 2.5픽셀이면 매 프레임 소수 위치를 표시할 수 없다. Celeste와 TowerFall의 방식은 위치와 충돌 박스를 모두 정수로 두고, 이동량을 나머지 변수에 누적한 뒤 반올림한 정수만큼만 움직인다.

```csharp
public void MoveX(float amount, Action onCollide) {
    xRemainder += amount;
    int move = Round(xRemainder);
    if (move != 0) {
        xRemainder -= move;
        // 한 픽셀씩 이동하며 매 단계 충돌을 검사한다
    }
}
```

플레이어, 화살, 몬스터 같은 Actor는 한 픽셀씩 옮기며 충돌을 검사하므로 충돌 시 정확히 맞닿은 위치에서 멈추고, 빠른 물체가 얇은 벽을 건너뛰는 일도 막힌다(뒤쪽은 이 문서의 해석). 충돌하는 지형(Solid, 움직이는 발판 포함)도 같은 나머지 누적을 쓰지만 반올림한 이동량을 한 번에 옮긴다. 움직이는 Solid는 위에 탄 Actor를 함께 옮기는 것보다 밀어내는 판정을 우선한다.

## 선택할 때 확인할 조건

다음은 위 원리에서 도출한 점검 제안이다.

| 질문 | 확인할 경계 |
|---|---|
| 시간의 단위가 무엇인가 | 프레임 수, 가변 델타 타임, 고정 dt 중 어느 것을 게임 규칙의 기준으로 삼는가 |
| 물리가 dt에 민감한가 | 스프링, 고속 충돌과 터널링, 큰 dt가 들어오는 일시정지와 포커스 복귀 |
| 같은 입력이 같은 결과를 만들어야 하는가 | 리플레이, 결정적 lockstep, 서버와 클라이언트의 재시뮬레이션 |
| 화면이 고르게 보이는가 | 프레임 시간 편차, 주사율과의 배수 관계, 렌더링 보간 |
| 느린 기기에서 어떻게 무너지는가 | 단계 수 상한, 프레임 시간 상한, 느려짐과 끊김 중 무엇을 허용하는가 |

## 출처

- [Fix Your Timestep! — Gaffer On Games, Glenn Fiedler](https://gafferongames.com/post/fix_your_timestep/) — 2004-06-10 게시, 2026-11-14 누산기, 보간, 죽음의 소용돌이와 부동소수점 재현성 대조
- [Celeste & TowerFall Physics — Maddy Makes Games, Maddy Thorson](https://www.mattmakesgames.com/articles/celeste_and_towerfall_physics/index.html) — 2026-11-14 정수 좌표와 나머지 누적 이동 대조
- [비디오 게임의 프레임 레이트 설명 — Unity 블로그](https://unity.com/kr/blog/frame-rate-in-video-games-explained) — 2026-10-27 게시 기계 번역본, 2026-11-14 프레임 시간 표, 편차와 주사율, 격투 게임의 고정 프레임 대조
- [Frame rate in video games explained — Unity Blog](https://unity.com/blog/frame-rate-in-video-games-explained) — 영어 원문, 격투 게임의 60 FPS 고정 대조
- [Unity, Time.deltaTime](https://docs.unity.com/en-us/engine/current/script-reference/unityengine/time/deltatime) — 2026-11-14 현재 버전 6000.6 기준 대조
- [Unity, Time.fixedDeltaTime](https://docs.unity.com/en-us/engine/current/script-reference/unityengine/time/fixeddeltatime) — 2026-11-14 현재 버전 6000.6 기준 대조
- [Delta timing — Wikipedia](https://en.wikipedia.org/wiki/Delta_timing) — 용어 정의와 프레임 의존 예시
- [게임 프레임에 숨겨진 게임의 시간 계산법 — 저세상개발자](https://www.youtube.com/watch?v=Nx4pdJ2lDas) — 2026-11-01 공개 쇼츠, 작성 계기이며 내용은 위 자료로 대조

## 관련 문서

- [[Game-State-Authority-and-Prediction|게임 상태의 판정 권한과 클라이언트 예측]]
- [[실시간(Realtime)|실시간 통신]]
