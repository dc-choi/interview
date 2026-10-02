---
tags: [react-native, mobile, image, color]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
---

# React Native 정적 이미지와 네이티브 리소스

React Native 0.87 기준. 이미지가 소스 트리에 있는지, 네이티브 프로젝트에 이미 포함돼 있는지, 원격에서 내려오는지에 따라 참조와 크기 정보의 계약이 달라진다.

## 소스 트리의 require와 밀도별 이미지

```tsx
import {Image} from 'react-native';

export const CheckIcon = () => <Image source={require('./img/check.png')} />;
```

이미지 경로는 JavaScript 모듈처럼 현재 파일을 기준으로 해석한다. `check.png`, `check@2x.png`, `check@3x.png`를 두면 장치 밀도에 맞는 파일을 선택한다. 정확한 밀도가 없으면 가까운 적절한 변형을 선택한다.

컴포넌트와 이미지가 같은 주제 폴더에 있고 전역 이름 공간에 의존하지 않는다. 실제 참조한 이미지가 패키지에 포함되며 번들러는 이미지 크기도 안다. npm 패키지 안에서도 자산을 함께 배포할 수 있다. 새 이미지를 추가한 Windows 개발 환경에서는 번들러 재시작이 필요할 수 있다.

## 정적으로 알려진 경로

`require`의 경로는 번들러가 정적으로 알아야 한다. 문자열을 런타임에 조합해서 자산을 찾는 방식은 사용할 수 없다.

```tsx
const source = active
  ? require('./img/check-active.png')
  : require('./img/check-inactive.png');

<Image source={source} />;
```

`require('./img/' + name + '.png')` 대신 가능한 자산을 각각 정적으로 참조한 뒤 선택한다. 로컬 require 결과는 크기 정보를 포함하므로 동적 flex 크기 조정을 원하면 `style={{width: undefined, height: undefined}}`처럼 기존 크기의 영향을 해제할 필요가 있다.

require가 반환하는 내부 객체 형식은 구현 세부다. 가이드에 등장하는 `__packager_asset`, uri, width 등의 예시를 애플리케이션 내부 계약으로 고정하지 않는다.

## iOS asset catalog opt-in

기본 iOS 번들은 참조 이미지와 밀도 변형을 JS 번들 근처의 개별 파일로 복사한다. asset catalog를 사용하면 시스템이 장치에 필요한 scale을 배포하도록 할 수 있다.

```xml
<key>RCTUseAssetCatalog</key>
<true/>
```

앱의 `Info.plist`에서 활성화하면 iOS 빌드 스크립트가 `RNAssets.bundle` asset catalog로 컴파일한다. 기존 `require('./my-icon.png')`와 Xcode 프로젝트의 참조 방식은 유지한다. 설정을 바꾼 뒤 clean build가 필요하다.

## 이미지 이외의 정적 자산

같은 require 방식으로 mp3, wav, mp4, mov, html, pdf 등의 자산도 포함할 수 있다. 기본 목록에 없는 형식은 Metro의 `resolver.assetExts`를 확인한다.

비이미지 자산은 크기 정보가 전달되지 않는다. 가이드에서는 번들 자산인 비디오에 flexGrow 대신 absolute positioning을 사용하는 제약을 설명한다. Xcode나 Android Assets에 직접 연결한 비디오의 경우는 이 조건과 다르다. 자산 포함만으로 영상 재생 컴포넌트가 제공되는 것은 아니다.

## 기존 네이티브 프로젝트의 이미지

```tsx
<Image source={{uri: 'app_icon'}} style={{width: 40, height: 40}} />
<Image source={{uri: 'asset:/app_icon.png'}} style={{width: 40, height: 40}} />
```

첫 줄은 Xcode asset catalog나 Android drawable의 확장자 없는 리소스 이름이다. 두 번째의 `asset:/`은 Android assets 폴더 경로다. 번들러의 경로 존재 검사와 크기 추론에 기대지 않으므로 실제 리소스 포함 여부와 크기를 직접 관리한다.

## Android XML drawable

vector drawable과 shape drawable은 XML 자산으로 사용할 수 있다.

```tsx
<Image source={require('./img/my_icon.xml')} style={{width: 40, height: 40}} />
<Image source={{uri: 'my_icon'}} style={{width: 40, height: 40}} />
```

첫 줄은 JS 근처 정적 자산, 둘째는 `res/drawable`의 이름 참조다. Android AAPT가 빌드 시 Binary XML로 변환해야 하므로 Metro 네트워크 로딩만으로 패키징을 대체할 수 없다. 경로나 이름을 바꾸면 Android 앱을 다시 빌드한다.

import/require로 독립 정적 자산처럼 쓰려는 XML에서는 다른 리소스 참조를 피한다. color state list, dimension, 다른 drawable을 참조해야 하면 네이티브 리소스로 포함하고 이름으로 불러오는 방식을 검토한다. Android Studio Vector Asset Studio는 SVG와 PSD에서 vector drawable을 만드는 도구다.

## 확인할 점

동적 경로 조합, 밀도 변형 이름, Metro 확장자 설정, iOS clean build, drawable 이름 변경 후 재빌드를 확인한다. 원격 이미지와 캐시 조건은 [[RN-Image-Loading|이미지 로딩]]으로 이어진다. 예제의 리소스는 프로젝트에 있다고 가정한 설명용 경로이며 기기 실행 결과가 아니다.

## 출처

- [React Native 0.87, Images](https://reactnative.dev/docs/images)

## 관련 문서

- [[RN-Image-Loading|원격 이미지와 캐시]]
- [[RN-Dimensions|이미지 크기 조건]]
- [[RN-Positioning|비디오와 겹침 배치]]
