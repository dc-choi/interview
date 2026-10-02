---
tags: [expo, react-native, eas]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS remote build version 관리"]
---

# EAS remote build version 관리

## Version의 두 층

user-facing version은 expo.version이고 developer-facing 값은 Android versionCode, iOS buildNumber다. store는 uploaded build를 developer-facing 값으로 식별하므로 같은 제출 범위에서 중복 build 값을 재사용하면 거절될 수 있다. versionCode는 integer, buildNumber는 config/reference가 요구하는 string 형식을 따른다. tutorial의 iOS numeric example을 타입 계약으로 복사하지 않는다.

```json
{"cli":{"appVersionSource":"remote"},"build":{"production":{"autoIncrement":true}}}
```

remote source와 autoIncrement를 사용하면 production build 시 EAS가 developer-facing value를 관리하고 증가시킨다. user-facing release version을 자동 관리하는 설정은 아니다. app config version과 store listing/release version은 개발자가 맞춘다.

이미 published app을 EAS로 이전할 때 `eas build:version:set`으로 platform을 선택하고 remote source를 활성화하며 store에서 사용한 마지막 build value로 초기화한다. 이후 autoIncrement가 그 값에서 증가하도록 한다. 값을 단순히 1로 초기화하면 기존 store history와 충돌할 수 있다.

build detail에서 remote result와 uploaded artifact의 build number/code를 확인한다. local config에 안 보이는 remote 값과 local source 값은 구분한다. tutorial 목적은 native build 제출 uniqueness이며 runtimeVersion의 update compatibility와 같은 개념이 아니다.

## 출처

- [Expo Documentation, Manage different app versions](https://docs.expo.dev/tutorial/eas/manage-app-versions)

## 관련 문서

- [[Expo-Learn-EAS-Stores]]
- [[Expo-Learn-EAS-Updates]]
