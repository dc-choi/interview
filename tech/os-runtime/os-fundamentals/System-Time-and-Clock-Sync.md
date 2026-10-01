---
tags: [os, time, unix-time, ntp, timezone, clock]
status: done
verified_at: 2026-10-01
category: "OS&런타임(OS&Runtime)"
aliases: ["System Time and Clock Sync", "시스템 시간과 시계 동기화", "Unix Time", "NTP", "tz database"]
---

# 시스템 시간과 시계 동기화

컴퓨터의 시각은 하드웨어 시계가 기준 시점(epoch)부터 센 틱 수로 만든 값이다. 이 값을 시스템 시간, 숫자로 표현한 것을 타임스탬프라고 한다. 시간 값을 도메인에서 어떻게 나눠 저장할지는 [[Temporal-Modeling]], 경과 시간 측정과 대기는 [[Sleep-and-Timing]]에서 다룬다. 이 문서는 운영체제가 시각을 표현하고 맞추는 방식이다.

## 타임스탬프의 기준은 시스템마다 다르다

| 체계 | 기준 시점 | 단위 |
|---|---|---|
| Unix time(POSIX) | 1970-01-01 00:00:00 UTC | 초 |
| Windows FILETIME | 1601-01-01 00:00:00 UTC | 100나노초 |
| JavaScript `Date` | 1970-01-01 00:00:00 UTC | 밀리초 |

- 시스템 사이에서 타임스탬프를 주고받을 때는 기준 시점과 단위를 함께 계약한다. 초와 밀리초를 섞으면 값이 1000배 어긋난다.
- 기준 시점 이전은 음수로 표현한다. 1970년 이전 날짜가 음수 Unix time이 되는 식이다.
- 1970년에 특별한 이유는 없다. 유닉스 개발 초기에 기준을 여러 번 바꾸다 한동안 넘치지 않을 적당한 해로 골랐다는 회고가 전해진다.
- POSIX의 epoch 이후 초는 하루를 정확히 86400초로 센다. 윤초가 들어간 날에도 그 1초를 따로 세지 않으므로, Unix time은 윤초를 포함한 실제 경과 초와 다르다.
- 32비트 부호 있는 정수로 초를 저장하면 2038년 1월에 넘친다. 저장 형식과 외부 인터페이스의 타임스탬프 폭을 확인한다.
- 파일 시스템도 다르다. Windows의 FAT은 파일 시각을 현지 시각으로, NTFS는 UTC로 기록한다.

## NTP로 현재 시각을 맞춘다

하드웨어 시계는 조금씩 빠르거나 느리게 간다. 네트워크 시간 프로토콜(NTP, UDP 123번 포트)은 기준 서버와 비교해 시계를 보정한다.

- 서버는 계층(stratum)을 이룬다. 원자시계나 GPS 같은 기준 시계에 직접 연결된 서버가 stratum 1이고, 그 아래 서버는 상위 서버와 동기화하며 한 단계씩 숫자가 커진다. 계층이 내려갈수록 오차가 쌓인다. 16은 동기화되지 않은 상태를 뜻한다.
- 클라이언트는 요청 송신 시각 T1, 서버 수신 시각 T2, 서버 송신 시각 T3, 클라이언트 수신 시각 T4를 기록하고 다음을 계산한다.

```text
왕복 지연  delta = (T4 - T1) - (T3 - T2)
시계 오프셋 theta = ((T2 - T1) + (T3 - T4)) / 2
```

- 오프셋 계산은 가는 길과 오는 길의 지연이 같다고 가정한다. 경로가 비대칭이면 그 차이의 절반만큼 체계적인 오차가 남는다.
- 실제 구현은 여러 서버의 결과를 모아 틀린 서버를 걸러 내고 결합한 뒤, 작은 오차는 시계 속도를 조금씩 바꿔 흡수하고 큰 오차는 한 번에 맞춘다. 벽시계가 뒤로 가거나 건너뛸 수 있는 이유다.
- 지속적인 보정은 chrony나 systemd-timesyncd 같은 동기화 데몬이 맡는다. `rdate`처럼 한 번 시각을 가져와 맞추는 도구는 시계를 순간적으로 건너뛰게 하고 이후의 흐름은 보정하지 않는다. 클라우드 인스턴스는 대개 제공자의 시간 서비스로 이미 동기화된다.

## 분산 시스템에서 시각을 믿는 범위

NTP로 맞춰도 서버마다 수 밀리초 이상 차이가 날 수 있고, 보정 순간에 벽시계가 움직인다.

- 서로 다른 서버의 벽시계 타임스탬프로 사건의 선후를 단정하지 않는다. 순서가 중요하면 단일 기록자의 순번, 데이터베이스 시퀀스나 논리 시계 같은 명시적 순서를 쓴다.
- 경과 시간, 타임아웃, 속도 제한은 단조 증가 시계로 잰다. [[Sleep-and-Timing]]
- 로그와 감사 기록은 UTC로 남겨 여러 서버의 기록을 같은 기준으로 비교한다. 시각 차이를 감안해 요청 식별자로 이어 붙인다. [[Correlation-ID]]

## tz database와 Zone ID

국가와 지역의 시간대는 경도대로 정해지지 않고, 여러 시간대를 가진 나라도 있으며, 일광절약시간과 법 개정으로 바뀐다. IANA tz database가 이 규칙과 변경 이력을 `Asia/Seoul`, `America/New_York`처럼 대륙과 도시 이름의 Zone ID로 관리한다.

- 특정 지역의 시각을 보여 주려면 UTC 순간과 Zone ID를 저장하고, 표시할 때 최신 규칙으로 변환한다. 고정 offset(`+09:00`)만 저장하면 규칙 변경과 일광절약시간을 반영하지 못한다.
- 규칙이 바뀌면 운영체제, 런타임, 데이터베이스의 tz 데이터를 함께 갱신해야 같은 결과가 나온다.
- `Z`는 UTC offset 0을 뜻한다. UTC는 원자시에 윤초를 넣어 맞춘 시간 표준이고, GMT는 영국의 시간대 이름으로 쓰이기도 해(여름에는 BST로 바뀜) 서로 바꿔 쓰면 모호해질 수 있다.

## 체크포인트

- Unix time과 Windows FILETIME의 기준과 단위, 1970년 이전과 2038년 문제
- Unix time이 윤초를 세지 않는다는 의미
- NTP의 stratum 구조와 지연, 오프셋 계산, 비대칭 경로 오차
- 분산 시스템에서 벽시계 타임스탬프로 순서를 정하면 안 되는 이유
- UTC 순간과 Zone ID를 함께 저장해야 하는 이유

## 출처

- [시간에 대해 탐구하기 — kciter.so, kciter](https://kciter.so/posts/deep-dive-into-datetime/)
- [RFC 5905, Network Time Protocol Version 4](https://www.rfc-editor.org/rfc/rfc5905)
- [POSIX.1-2024, Base Definitions, General Concepts](https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap04.html)
- [Microsoft Learn, FILETIME structure](https://learn.microsoft.com/en-us/windows/win32/api/minwinbase/ns-minwinbase-filetime)

## 관련 문서

- [[Temporal-Modeling|시간 모델링]]
- [[Sleep-and-Timing|Sleep과 타이밍]]
- [[JavaScript-Global-JSON-Date-and-Builtins|JavaScript Date의 시간 모델]]
- [[Java-Standard-Library-Date-and-Time|Java 날짜와 시간]]
- [[Correlation-ID|Correlation ID]]
