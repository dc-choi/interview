---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Android App Links 도메인 검증"]
---

# Expo Android App Links 도메인 검증

## 두 방향 연결

native 앱은 어떤 HTTPS URL을 처리할지 선언하고 웹 도메인은 어떤 package/signing certificate가 자신의 링크를 열 수 있는지 선언한다. 이 둘과 앱 내부 routing이 함께 맞아야 한다.

```json
{
  "expo": { "android": { "intentFilters": [{
    "action": "VIEW",
    "autoVerify": true,
    "category": ["BROWSABLE", "DEFAULT"],
    "data": [{ "scheme": "https", "host": "example.com", "pathPrefix": "/product" }]
  }] } }
}
```

`autoVerify:true`가 검증을 요청한다. host/pathPrefix가 URL 범위를 정하며 설정 변경 뒤 native 재빌드가 필요하다. domain association이 실패하면 filter만으로 검증된 직접 실행을 보장하지 못한다.

## assetlinks.json

Expo Router 웹 프로젝트는 `public/.well-known/assetlinks.json`을 만들어 `https://example.com/.well-known/assetlinks.json`에서 제공한다. JSON의 `relation`은 `delegate_permission/common.handle_all_urls`, target의 `namespace`는 `android_app`, `package_name`은 앱의 `android.package`, `sha256_cert_fingerprints`는 실제 설치 binary를 서명한 인증서의 SHA256 배열이다.

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.example.store",
    "sha256_cert_fingerprints": ["<ACTUAL_SHA256_CERTIFICATE_FINGERPRINT>"]
  }
}]
```

fingerprint placeholder는 실제 값으로 교체한다. EAS 관리 key는 `eas credentials -p android`, Google Play signing은 Play Console App Signing에서 확인한다. upload key와 Play가 설치 앱을 서명하는 key를 혼동하지 않는다. 여러 variant/key를 허용하려면 필요한 fingerprint를 추가한다.

파일은 HTTPS로 접근 가능하고 `application/json`이어야 한다. legacy webpack의 `web/` 경로와 현재 Metro 프로젝트의 `public/` 경로를 섞지 않는다.

## 확인과 디버깅

설치가 OS domain verification을 유발하며 반영에 20초 이상 걸릴 수 있다. development tunnel을 쓰려면 `EXPO_TUNNEL_SUBDOMAIN`으로 주소를 고정하고 해당 host를 native filter와 웹 검증 파일에 함께 맞춘다.

```sh
npx expo start --tunnel
adb shell am start -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d 'https://example.com/product/42' com.example.store
```

링크가 앱을 열어도 올바른 콘텐츠로 이동하는지 별도 확인한다. 웹 파일 변경 직후 모든 기기의 검증 cache가 즉시 갱신된다고 가정하지 않는다. HTTPS/content-type, package, certificate, native filter와 OS verification 상태를 순서대로 대조한다.

## 출처

- [Expo Documentation, Android App Links](https://docs.expo.dev/linking/android-app-links)

## 관련 문서

- [[Expo-Development|Expo 개발 과정]]
