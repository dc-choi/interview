---
tags: [expo, eas, updates]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["EAS Update asset 최적화, selection과 verify"]
---

# EAS Update asset 최적화, selection과 verify

update는 manifest와 device에 없는 변경 asset을 다운로드한다. bundle/assets 크기는 느린 mobile network의 download 시간과 adoption에 영향을 준다. 변경 없는 이미 가진 asset은 다시 받지 않는다. 큰 asset을 많이 추가하면 새 binary에 포함하여 store release하는 전략도 비교한다.

## Export와 압축

eas update는 Expo CLI export를 실행하며 dist/bundles와 dist/assets에서 내용을 본다. 원문의 index.android.js/index.ios.js는 uncompressed 크기이고 실제 전송은 Brotli/gzip으로 줄어든다. hashed asset filename만으로 원본을 찾기 어려우므로 export asset 목록/assetmap을 사용한다.

npx expo-optimize는 sharp로 image를 최적화하고 --quality 90 등 품질을 지정한다. 원본과 시각 품질을 비교하고 이미 최적화된 파일은 건너뛴다. Metro가 알아볼 static require가 필요하며 동적으로 조합한 path를 bundler가 자동 발견하는 것으로 가정하지 않는다. 실제 literal require가 조건 분기 안에 있다는 이유만으로 무조건 제외된다고 원문의 포괄적 조건부 require 문장을 확대하지 않는다.

## Asset selection

SDK52 이후 일반 지원이며 원문 첫 문장의 experimental 표기는 뒤의 GA 설명과 충돌한다. SDK57은 updates.assetPatternsToBeBundled를 사용한다. 이전 extra.updates 경로를 새 설정으로 권장하지 않는다.

```json
{"expo":{"updates":{"assetPatternsToBeBundled":["app/images/**/*.png"]}}}
```

pattern은 source 예시의 glob 형태이며 required/resolved asset 중 OTA에 올릴 대상을 선택한다. 원문의 regular expression 표현과 glob 예시를 동일 문법으로 설명하지 않는다. 미설정이면 bundler가 resolve한 전체 assets다. selection은 OTA 대상만 바꾸고 native binary asset 포함이나 startup 시간을 줄이지 않는다. 제외된 asset도 Metro는 resolve하지만 server에 upload하지 않으므로 해당 runtime의 native binary에 반드시 있어야 한다.

## Verify contract

```sh
npx expo export --dump-assetmap
npx expo-updates assets:verify . --asset-map-path dist/assetmap.json --exported-manifest-path dist/metadata.json --build-manifest-path <app.manifest> --platform android
```

assets:verify는 expo-updates>=0.24.10 CLI이며 Expo/EAS CLI 명령이 아니다. directory 기본 current, -a는 assetmap.json, -e는 metadata.json, -b는 올바른 같은 runtime의 native build app.manifest, -p는 android/ios다. 잘못된 build manifest로 검사한 통과는 target build의 asset availability를 증명하지 않는다. 명령 예제만 기록하며 이 문서화 작업에서 앱 asset 검증을 실행한 것은 아니다.

## 출처

- [Expo Documentation, Optimize assets for EAS Update](https://docs.expo.dev/eas-update/optimize-assets)
- [Expo Documentation, Asset selection and exclusion](https://docs.expo.dev/eas-update/asset-selection)

## 관련 문서

- [[Expo-EAS-Update-Bundle-Diffs]]
- [[Expo-EAS-Update-Bandwidth]]
