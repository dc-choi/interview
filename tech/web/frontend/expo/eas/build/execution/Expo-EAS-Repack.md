---
tags: [expo, eas, build]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Repack의 native 재사용 조건"]
---

# Expo Repack의 native 재사용 조건

## Repack

`@expo/repack-app`은 기존 APK/IPA/Simulator .app에 새 JS bundle, asset과 일부 앱 metadata를 넣어 새 artifact를 만든다. native compile을 생략하므로 반복 QA에 유용하다. 이미 설치된 앱에 update를 전달하는 EAS Update와는 다르다.

입력 native 구성이 현재 프로젝트와 같아야 한다. native dependency, config plugin 또는 SDK가 바뀌면 full build가 필요하다. fingerprint 비교는 이 경계를 판단하는 도구이며 임의로 입력을 제외한 hash 일치까지 무조건 안전하다고 해석하지 않는다.

## 실행과 출력

```sh
npx @expo/repack-app --platform android --source-app base.apk --output preview.apk
```

project root에서 실행하며 platform/source-app은 필수다. 출력 format은 입력과 같고 내부적으로 expo export:embed를 사용한다. 기본은 JS/asset/metadata를 갱신하며 `--js-bundle-only`는 native config 변경을 생략한다.

`--embed-bundle-assets`는 debug build에도 bundle을 강제로 넣으며 `--bundle-assets-sourcemap-output`에는 이 옵션이 필요하다. `--working-directory`, `--skip-working-dir-cleanup`, `--verbose`는 진단용이다.

## 서명과 제한

실기기에 설치하려면 새 artifact를 서명해야 한다. Android는 `--ks`, `--ks-key-alias`, 암호 옵션을 제공하며 암호는 env/file 참조를 사용할 수 있다. iOS는 signing identity와 provisioning profile을 제공하며 ad hoc/development signing만 지원한다. Simulator .app은 실기기 서명이 필요하지 않다.

서명이 없으면 Android 출력은 unsigned이고 iOS IPA는 기기에 설치할 수 없다. production 스토어 제출에는 Repack을 권장하지 않는다. 올바른 symbolication과 서명을 위해 전체 production build 경로를 사용한다. Workflows의 repack job은 서명/build 관리를 통합하지만 동일한 native 호환성 조건은 남는다.

## 출처

- [Expo Documentation, Repack app](https://docs.expo.dev/build-reference/repack)

## 관련 문서

- [[Expo-EAS-Build-Execution]]

- [[Expo]]
