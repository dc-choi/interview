---
tags: [expo, expo-sdk, widgets]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Live Activity와 APNs 업데이트"]
---

# Expo SDK Live Activity와 APNs 업데이트

createLiveActivity(name, component)→LiveActivityFactory<Props>는 runtime에 layout을 등록한다. component는 'widget' directive와 isolated runtime 제약을 따르며 props/environment로 만 값을 받는다. 원문의 method table은 config widgets[] name과 같아야 한다고 적지만 상세 prerequisite는 Live Activity를 widgets[]에 추가하지 말라고 명시한다. library built-in target을 쓰고 별도 widgets[] entry를 만들지 않는다.

## Layout와 lifecycle

layout은 banner(required), bannerSmall(CarPlay/watchOS, 생략시 banner), compactLeading/compactTrailing/minimal, expandedLeading/Trailing/Center/Bottom으로 Lock Screen/Dynamic Island presentation을 나눈다. environment는 colorScheme, isLuminanceReduced(iOS16+), isActivityFullscreen(iOS16.1+), activityFamily/isActivityUpdateReduced(iOS18+), levelOfDetail(iOS26+)를 제공한다.

factory.start(props, url?):LiveActivity는 synchronous instance를 반환하고 tap URL은 앱 deeplink를 연다. getInstances():LiveActivity[]는 앱 relaunch 이후 살아있는 같은 type activity를 복구한다. instance.update(props):Promise<void>, end(dismissalPolicy?, finalProps?, contentDate?):Promise<void>를 제공한다. contentDate가 이전 update/push보다 오래되면 system이 무시한다. dismissal은 default/immediate/after(Date)이며 after는 종료 뒤 4시간 window 안이다. activity가 앱 process보다 오래 살아있을 수 있어 process-local reference만 보관하지 않는다.

```ts
const activity = Delivery.start({etaMinutes:15}, 'myapp://delivery/123');
await activity.update({etaMinutes:2});
await activity.end('immediate', {etaMinutes:0}, new Date());
```

## Push tokens와 remote payload

plugin enablePushNotifications=false를 true로 바꾸면 aps-environment entitlement와 ExpoLiveActivity_EnablePushNotifications를 설정하고 rebuild한다. NSSupportsLiveActivitiesFrequentUpdates=true는 update budget을 높이지만 OS throttle/사용자 settings를 우회하지 않는다.

addPushToStartTokenListener는 activityPushToStartToken(app-wide, iOS17.2+), instance.getPushToken():Promise<string|null>과 addPushTokenListener는 activityId/pushToken(per-activity)을 제공한다. token은 미지원/아직 준비 안 됨이면 null이고 변경될 수 있어 listener를 구독/해제한다. tokens를 public log나 knowledge document에 저장하지 않는다.

APNs header는 apns-push-type:liveactivity, apns-topic:<bundleID>.push-type.liveactivity, priority10 immediate/5 lower-priority다. aps.timestamp/dismissal-date 등 date는 Unix seconds이며 JS Date milliseconds와 다르다. content-state는 {name:factoryName, props:JSON.stringify(actualProps)}로 library internal shape를 맞춘다. 일반 props object를 content-state로 그대로 넣으면 계약이 다르다.

start event는 push-to-start token에 보내고 attributes-type:'LiveActivityAttributes', attributes:{}, alert, content-state를 포함한다. iOS18+ input-push-token:1은 이후 update용 token 제공을 요청한다. update/end event는 per-activity token에 보내고 end는 final content-state와 dismissal-date를 설정할 수 있다. 서버/APNs 결과와 system 실제 표시/빈번한 update 보장은 구분한다.

## 출처

- [Expo Documentation, Widgets](https://docs.expo.dev/versions/latest/sdk/widgets)

## 관련 문서

- [[Expo-SDK-Widgets]]
- [[Expo-SDK-Linking-Intent]]
