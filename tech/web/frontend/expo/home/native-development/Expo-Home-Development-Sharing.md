---
tags: [expo, react-native, native-development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo development build 공유와 업데이트 실행"]
---

# Expo development build 공유와 업데이트 실행

## 팀에 binary 배포

EAS build마다 고유 install URL과 dashboard artifact가 생긴다. 팀원은 링크/QR 또는 EAS dashboard에서 설치한다. EAS CLI로는 해당 build 접근 계정으로 로그인해 다음 명령을 사용할 수 있다.

```sh
eas build:run --profile development
# 등록된 새 iOS 기기 포함 provisioning으로 재서명
eas build:resign
```

iOS ad hoc binary는 provisioning profile의 등록 기기에만 설치된다. 새 기기를 등록하면 새 build 또는 기존 IPA re-sign이 필요하다. 새 기기 등록 자체가 설치된 artifact를 수정하지 않는다. iOS16 이상은 일반 development 설치에 Developer Mode가 필요하며 enterprise provisioning은 해당 안내의 예외다.

development/preview/production을 동시에 설치하려면 app identifiers와 schemes를 variant별로 구성한다. display name만 바꾸는 것으로 설치 충돌이 해결되지 않는다.

## 서버와 published update

`tunnel`은 LAN 제한을 우회해 개발 서버를 public URL로 노출하며 reload가 느려질 수 있다. 지속 실행되는 개발 머신 없이 리뷰하려면 `eas update`로 JS/assets의 optimized update를 발행한다. installed development binary와 compatible runtime이어야 한다.

launcher의 수동 URL은 다음 형식이다. project ID는 `expo.updates.url`, channels는 `eas channel:list`로 확인한다.

```text
https://u.expo.dev/[project-id]?channel-name=[channel-name]
```

## SDK57 launcher deep link

```text
{scheme}://expo-development-client/?url={encodedManifestUrl}
```

기본 scheme은 `exp+{slug}`이며 manifest URL을 URL-encode한다. SDK57 이하 legacy 옵션은 `url` 옆에 `disableOnboarding=1`, `disableFab=1`, `disableAutoLaunch=1`로 둔다. 이 옵션 중 메뉴 관련 legacy 설정은 저장 상태를 바꿀 수 있으므로 automation 종료 이후 개발자 경험도 확인한다.

SDK58 이후는 `{scheme}://?__expo_url={manifestUrl}`와 `__expo_disable_onboarding`, `__expo_disable_fab`, `__expo_disable_auto_launch` 형식을 제공한다. `__expo_*`는 launcher가 앱 전달 전에 제거하고 menu/FAB 옵션은 해당 process launch에 한정된다. SDK57에 이 새 query 계약을 지원한다고 가정하지 않는다.

SDK58 CLI automation 안내의 `EXPO_NO_DEV_MENU=1`과 비대화형 default behavior도 현재 설치 SDK/CLI에서 확인한다. `EXPO_NO_DEV_MENU=0`은 새 CLI의 opt-out이다.

## 앱 자체 deep link와 QR

앱 화면/인증 callback은 standalone 앱과 같은 `myscheme://path/to/screen`으로 테스트한다. 프로젝트가 launcher에서 이미 열려 있어야 하며 development build의 app-specific deep link cold launch는 현재 가이드에서 지원하지 않는다. `expo-development-client` path는 launcher 예약 경로이므로 app route에 쓰지 않는다.

`https://qr.expo.dev/development-client`는 encoded `appScheme`과 `url` query를 받아 SVG QR을 반환한다. generated QR과 실제 binary scheme/runtime이 맞아야 앱을 열 수 있다. CI는 PR별 EAS Update를 발행하고 compatible build로 열 QR을 review에 제공할 수 있다.

## Dev menu와 Update 확장

```tsx
import { registerDevMenuItems } from 'expo-dev-menu';

registerDevMenuItems([{ name: '진단 상태', callback: () => console.log('diagnostics') }]);
```

후속 `registerDevMenuItems` 호출은 이전 항목을 전부 덮어쓴다. 여러 기능에서 독립 등록하면 누락될 수 있어 최종 항목 배열을 함께 관리한다.

`expo-dev-client`와 `expo-updates`를 설치하고 EAS Update를 구성하면 Extensions에서 published updates를 조회/실행할 수 있다. app config의 `runtimeVersion`은 JS와 native API 계약을 나타내며 build에 포함된 version과 같은 update만 로드한다. native configuration/package/SDK 변화는 새 binary와 호환 runtime 처리가 필요하다.

## 출처

- [Expo Documentation, Share a development build with your team](https://docs.expo.dev/develop/development-builds/share-with-your-team)
- [Expo Documentation, Tools, workflows and extensions](https://docs.expo.dev/develop/development-builds/development-workflows)

## 관련 문서

- [[Expo-Home-Development-Builds]]
- [[Expo-Home-Release-Updates]]
