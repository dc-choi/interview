---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update rollback과 embedded 복귀"]
---

# EAS Update rollback과 embedded 복귀

eas update:rollback은 대화형으로 이전 published update 또는 binary에 embedded된 update를 선택한다. 이전 published update는 내용을 새 update로 republish해 branch의 최신으로 제공한다. embedded 복귀는 client에게 downloaded update 대신 binary bundle을 실행하라는 directive다. 별도 eas update:roll-back-to-embedded 명령도 있다.

## Rollback의 적용 범위

client의 check/download/restart 시점에 따라 적용된다. offline client가 즉시 바뀌는 것으로 설명하지 않는다. 기존 embedded/native code와 persistent 데이터가 호환하는지 확인한다. schema migration과 backend side effect는 update rollback만으로 취소되지 않는다. URL override로 anti-bricking을 해제한 preview는 embedded fallback이 불가능할 수 있다.

rollback 뒤 다시 publish하면 호환하는 client에 새 update가 제공된다. 현재 문제 코드를 유지한 채 새 download만 멈추려면 pause를 사용한다. Updates API의 rollback check/fetch flag는 [[Expo-SDK-Updates-API]]처럼 일반 new update와 구분한다.

## 출처

- [Expo Documentation, Rollbacks](https://docs.expo.dev/eas-update/rollbacks)

## 관련 문서

- [[Expo-EAS-Update-Rollouts]]
- [[Expo-EAS-Update-Recovery]]
- [[Expo-EAS-Update-Channels]]
