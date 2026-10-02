---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update URL override와 복구 보호"]
---

# EAS Update URL override와 복구 보호

header-only override는 [[Expo-EAS-Update-Channel-Surfing]]을 따른다. URL+headers override는 SDK52/expo-updates0.27.0 이후 특정 group/다른 update endpoint로 이동하는 고급 preview 기능이다. updates.disableAntiBrickingMeasures=true를 새 binary에 반영해야 하며 production에서 활성화하지 않는다.

## API와 restart

```ts
Updates.setUpdateURLAndRequestHeadersOverride({
  updateUrl:'https://u.expo.dev/<projectId>/group/<groupId>',
  requestHeaders:{}
});
```

setUpdateURLAndRequestHeadersOverride는 app.json/Expo.plist/AndroidManifest의 URL와 headers를 override한다. null은 해제다. 원문 example의 URL 첫 placeholder updateId는 project endpoint와 혼동되므로 projectId를 사용한다. URL override guide의 적용 절차는 완전히 kill/reopen 후 새 URL를 사용하며 그 전 checkForUpdateAsync 등이 새 URL를 사용하는 것으로 가정하지 않는다. header-only의 즉시 fetch와 구분한다.

restart 후 manifest/assets를 download하는 동안 splash에서 기다릴 수 있고 일반 background 전환은 충분하지 않다. 특정 update는 현재 binary보다 먼저 publish했어도 선택할 수 있지만 native compatibility 검토를 생략하지 않는다.

## Security와 recovery

anti-bricking 보호 해제와 URL override의 결합은 embedded update fallback을 비활성화하여 문제 update를 로드하면 자동 rollback하지 못하고 reinstall이 필요할 수 있다. 악의적인 publish 권한자가 자신의 server로 endpoint를 바꾸는 공격도 가능하다. production code signing과 key 접근 제한은 위험을 줄이지만 해제된 복구 보호를 완전히 대체하지 않는다. CodePush deployment key 변경도 유사한 위험이 있었다. preview build에서 복구 경로와 데이터 호환성을 검토한다.

## 출처

- [Expo Documentation, Override update configuration at runtime](https://docs.expo.dev/eas-update/override)

## 관련 문서

- [[Expo-EAS-Update-Channel-Surfing]]
- [[Expo-EAS-Update-Code-Signing]]
- [[Expo-EAS-Update-Recovery]]
