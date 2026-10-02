---
tags: [react-native, mobile, image, color]
status: done
verified_at: 2026-10-02
category: "웹&네트워크(Web&Network)"
---

# React Native 이미지 로딩과 캐시

React Native 0.87 기준. 정적 require 이미지는 마운트 전에 크기를 알지만 네트워크, data URI, 네이티브 리소스 이름은 크기를 명시해야 한다. source는 문자열 src가 아닌 uri와 메타데이터를 담을 수 있는 입력이다.

## 네트워크 이미지 크기와 요청

```tsx
import {Image} from 'react-native';

export const RemotePhoto = () => (
  <Image source={{uri: 'https://reactnative.dev/img/tiny_logo.png'}}
    style={{width: 120, height: 120, resizeMode: 'contain'}} />
);
```

먼저 화면에 자리를 확보해 이미지 다운로드 뒤 주변 레이아웃이 갑자기 이동하는 상황을 줄인다. 이미지의 비율이나 크기를 미리 알아야 한다는 부담과 안정적인 배치를 얻는 이점이 함께 있다. iOS ATS 조건을 만족하려면 HTTPS를 사용한다.

source에는 `method`, `headers`, `body`도 넣을 수 있다.

```tsx
<Image source={{uri: 'https://example.com/image', method: 'POST',
  headers: {Pragma: 'no-cache'}, body: 'image request'}}
  style={{width: 120, height: 120}} />;
```

헤더를 넣는 것과 저장된 이미지 캐시 정책을 고르는 것은 다른 설정이다. 인증 이미지에서는 실제 요청과 캐시 결과를 플랫폼별로 확인한다.

## data URI와 로컬 이미지

`data:image/png;base64,...` 형식도 source uri로 쓴다. 네트워크 이미지처럼 width와 height가 필요하다. 가이드는 DB에서 가져온 작은 동적 아이콘처럼 매우 작은 이미지에 한정해 권한다. 큰 이미지 전체를 data URI로 전달하는 전략으로 확대하지 않는다.

로컬 파일시스템 이미지는 앱 번들 자산과 구분한다. 가이드는 CameraRoll 사용 사례를 안내한다. 파일 접근과 수명, 권한에 대한 구체적인 계약은 사용하는 로컬 미디어 API에서 확인해야 한다.

## 캐시 전략

다음 `source.cache` 값은 Image reference에서 **iOS** ImageCacheEnum으로 명시한다. Images 가이드의 설명만으로 Android에서 같은 동작을 보장하지 않는다.

| 값 | 캐시가 있을 때 | 캐시가 없을 때 |
|---|---|---|
| default | 플랫폼 기본 전략 | 플랫폼 기본 전략 |
| reload | 기존 캐시로 요청을 충족하지 않음 | 원본 로딩 |
| force-cache | 나이와 만료에 관계없이 사용 | 원본 로딩 |
| only-if-cached | 나이와 만료에 관계없이 사용 | 네트워크 요청 없이 실패 |

```tsx
<Image source={{uri: 'https://example.com/photo.png', cache: 'only-if-cached'}}
  style={{width: 120, height: 120}} />;
```

캐시가 있는 작은 placeholder만 보여 주려는 상황에 `only-if-cached`가 유용하다. 네트워크 재시도를 대신하는 옵션이 아니므로 실패 시 보여 줄 UI를 별도로 정한다. `force-cache`는 대역폭을 줄일 수 있지만 오래된 이미지를 받아들이는 정책이다.

## 카메라 롤의 해상도와 디코딩

iOS Camera Roll은 한 이미지에 여러 크기를 제공할 수 있다. 작은 썸네일에 큰 원본을 쓰면 불필요한 비용이 발생한다. 가이드는 정확한 크기를 우선하며 없으면 흐림을 피하도록 최소 50% 더 큰 첫 후보를 선택하는 동작을 설명한다. 이 규칙을 모든 원격 이미지 서버의 자동 리사이징으로 해석하지 않는다.

React Native의 이미지 디코딩은 별도 스레드에서 수행한다. 다운로드가 끝났어도 디코딩이 끝나기 전에는 placeholder가 더 오래 보일 수 있다. 별도 스레드라는 사실만으로 다운로드 시간과 메모리 비용이 사라지지는 않는다.

## 이미지 위에 콘텐츠 배치

```tsx
import {Image, StyleSheet, Text, View} from 'react-native';

export const PhotoCard = () => (
  <View style={{width: 240, height: 160}}>
    <Image source={{uri: 'https://example.com/photo.png'}}
      style={StyleSheet.absoluteFill} />
    <Text style={{color: 'white'}}>이미지 위의 제목</Text>
  </View>
);
```

컨테이너에 크기를 주고 absolute 이미지를 먼저, 위에 올 콘텐츠를 뒤에 렌더한다. 배경 이미지 예제도 containing block의 크기 조건을 충족해야 한다.

## iOS 모서리와 캐시 한도

가이드는 iOS Image에서 `borderTopLeftRadius`, `borderTopRightRadius`, `borderBottomLeftRadius`, `borderBottomRightRadius`가 무시될 수 있다고 기록한다. 각 모서리 스타일을 사용했다면 iOS 결과를 확인한다.

네이티브 AppDelegate의 초기화 시점에 이미지 캐시 한도를 설정할 수 있다.

```objc
RCTSetImageCacheLimits(4 * 1024 * 1024, 200 * 1024 * 1024);
```

첫 인자는 imageSizeLimit, 둘째는 totalCostLimit이다. 예시는 각각 4 MB와 200 MB이며 기본값을 뜻하지 않는다. source.cache의 요청 전략과 네이티브 캐시 비용 한도는 서로 다른 층이다.

## 확인할 점

원격 이미지 크기 누락, 캐시 미존재, 오래된 이미지, 느린 다운로드와 디코딩, 플랫폼별 모서리 결과를 나눠 확인한다. 이 문서의 요청 예제는 실행 검증되지 않았다.

## Image reference의 로딩과 선행 요청

source는 static require 번호, URI 객체 또는 후보 객체 배열을 받는다. src는 source보다, srcSet은 src/source보다 우선한다. srcSet의 밀도 descriptor와 source 후보의 width/height/scale을 같은 형식으로 혼용하지 않는다.

onLoadStart와 onLoadEnd로 loading을 정리하고, onLoad/onError로 성공과 실패를 나눈다. onProgress는 loaded/total, onLoad는 실제 source 크기를 전달한다. Android debug에서는 defaultSource가 무시되는 조건을 확인한다.

| static API | 반환과 주의점 |
|---|---|
| getSize / getSizeWithHeaders | width/height Promise, 실패 가능, static asset에는 header 방식 부적합 |
| prefetch | disk cache 로딩의 boolean Promise |
| abortPrefetch | Android request id로 취소 |
| queryCache | URL별 memory/disk 상태, mapping에 없으면 cache 없음 |
| resolveAssetSource | require/asset 입력의 uri/scale/width/height 조회 |

getSize는 이미지를 다운로드할 수 있지만 prefetch 대용으로 보장된 API는 아니다. 요청 header와 crossOrigin/referrerPolicy를 쓸 때 server 계약과 실제 플랫폼 동작을 확인한다.

Android resizeMethod는 디코딩 전 resampling 정책이며 resizeMode의 화면 맞춤과 다르다. none은 full-resolution으로 메모리 위험이 있다. resizeMultiplier는 작은 target보다 큰 bitmap을 준비해 downscale 품질과 메모리를 교환한다.

Android GIF/animated WebP 지원은 native Fresco 구성이 필요할 수 있다. 문서의 버전 숫자를 그대로 복사하지 않고 해당 RN tag의 libs.versions.toml과 기존 framework 구성을 확인한다. iOS WebP는 JS와 함께 bundled된 경우라는 조건이 있다.

## 출처

- [React Native 0.87, Images](https://reactnative.dev/docs/images)
- [React Native 0.87, Image의 ImageCacheEnum](https://reactnative.dev/docs/image#imagecacheenum)

- [React Native, image](https://reactnative.dev/docs/image)

## 관련 문서

- [[RN-Image-Assets|정적 자산과 네이티브 리소스]]
- [[RN-Networking|네트워크와 HTTPS 조건]]
- [[RN-Positioning|겹침 배치]]
- [[RN-Image-Presentation]]
