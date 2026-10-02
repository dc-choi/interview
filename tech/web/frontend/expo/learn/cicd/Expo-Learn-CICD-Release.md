---
tags: [expo, react-native, cicd]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Release branch와 tag의 build/update 분기"]
---

# Release branch와 tag의 build/update 분기

## 의도적인 release event

main push development CI와 production release trigger를 분리한다. release/* branch push는 해당 branch의 매 commit마다 production workflow를 실행한다. tag push는 특정 commit에 version marker를 붙여 release를 요청하는 이벤트다. 어떤 trigger를 채택하든 workflow는 default branch에 먼저 존재해야 한다.

production fingerprint environment로 native config/env를 평가하고 platform별 get-build profile production을 조회한다. build_id가 없으면 새 AAB/IPA build, 있으면 compatible runtime에 OTA update를 publish하는 분기다.

```yaml
build_android:
  needs: [get_android_build]
  if: ${{ !needs.get_android_build.outputs.build_id }}
  type: build
  params: {platform: android, profile: production}
update_android:
  needs: [get_android_build]
  if: ${{ needs.get_android_build.outputs.build_id }}
  type: update
  params: {branch: production, platform: android}
submit_android:
  needs: [build_android]
  type: submit
  params:
    build_id: ${{ needs.build_android.outputs.build_id }}
```

iOS를 같은 방식으로 추가한다. branch production publish는 build의 production channel이 해당 branch로 매핑되고 runtimeVersion/platform도 compatible해야 전달된다. existing EAS build가 있다는 사실은 그 binary가 store에 제출/배포되어 사용자에게 설치되었다는 증거가 아니다. OTA 대상 runtime이 실제로 존재하는지 release 전에 확인한다.

submit job은 new build 경로에만 붙이고 JS-only 경로에서는 skip된다. store credentials를 먼저 준비한다. CI/CD production 원문은 Android first manual AAB upload를 필수라고 쓰지만 더 최근 Android production tutorial은 eas submit으로 first release 가능하다고 수정했다. 최신 Submit 계약을 우선하고 manual first release를 일률적으로 요구하지 않는다. iOS submit도 TestFlight upload와 App Review를 구분한다.

## Tag glob의 한계

```yaml
on:
  push:
    tags: ['v*.*.*', '!v*.*.*-rc.*']
```

v*.*.*는 glob이며 strict SemVer parser가 아니다. beta/rc suffix나 숫자 아닌 segment도 match할 수 있다. 원문의 strict three-part 표현을 validation guarantee로 사용하지 않는다. rc exclusion은 rc 패턴만 제외하므로 beta 등 모든 prerelease를 막으려면 정책과 추가 검증/패턴을 설계한다.

release candidate workflow는 rc-only trigger로 build/fingerprint/get-build를 재사용하되 production update/submit을 넣지 않는다. tag를 붙였다고 hash가 반드시 새로워지는 것도 아니다. 이전 production build와 hash가 같으면 첫 tag run도 update 경로를 선택할 수 있다. dashboard refs/tags/version과 commit, selected artifact/update를 확인한다.

## 출처

- [Expo Documentation, Automate production deployments with EAS Workflows](https://docs.expo.dev/tutorial/cicd/production)
- [Expo Documentation, Using Git tags to trigger production deployments](https://docs.expo.dev/tutorial/cicd/tag-based-releases)

## 관련 문서

- [[Expo-Learn-EAS-Stores]]
- [[Expo-Learn-CICD-Fingerprint]]
