---
tags: [expo, react-native, ui]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo 정적 에셋의 번들링과 로딩"]
---

# Expo 정적 에셋의 번들링과 로딩

## Local import와 원격 URL

이미지, video, audio, SQLite DB와 font는 code가 아닌 static asset이다. local asset은 개발에서는 HTTP로 제공되고 production build에서는 native binary에 포함되어 disk에서 제공될 수 있다.

```tsx
import { Image } from 'expo-image';

export const Logo = () => <Image source={require('./assets/images/logo.png')} />;
export const RemoteLogo = () => <Image
  source={{ uri: 'https://example.com/logo.png' }}
  style={{ width: 50, height: 50 }}
/>;
```

경로는 예제 component 위치에 맞춘다. `require`/`import`로 정적으로 연결한 이미지는 bundler가 width/height metadata를 읽을 수 있다. remote URI는 크기를 별도로 지정하며 연결 실패, 파일 삭제와 cache 정책을 고려한다.

## Build-time embedding

`expo-asset` config plugin은 지원 asset file/directory를 native project에 연결한다.

```json
{
  "expo": {
    "plugins": [["expo-asset", { "assets": ["./assets/images/example.png"] }]]
  }
}
```

`npx expo install expo-asset` 후 native build를 다시 만든다. assets path는 project root 기준이다. 연결된 resource를 `source={{uri: 'example'}}`처럼 이름으로 사용할 때는 require metadata가 없으므로 width/height를 지정한다. 지원하지 않는 형식은 Reference를 확인하고 runtime loader를 검토한다.

## Runtime loading

```tsx
import { useAssets } from 'expo-asset';
import { Image } from 'expo-image';
import { Text } from 'react-native';

export default function AssetScreen() {
  const [assets, error] = useAssets([require('./assets/images/example.png')]);
  if (error) return <Text>이미지를 불러오지 못했습니다.</Text>;
  if (!assets) return null;
  return <Image source={assets[0]} style={{ width: 100, height: 100 }} />;
}
```

hook은 async download/local 저장을 수행하고 준비 후 Asset instances와 error를 반환한다. blank loading을 사용할지 skeleton/error state를 보여줄지 UX에 맞게 정한다. config plugin의 build-time embedding과 runtime download는 앱 용량과 시작 latency의 다른 선택이다.

## 최적화

lossless PNG 재인코딩은 pixel을 유지하며 pngcrush/optipng 같은 도구를 사용할 수 있다. lossy compression은 일부 정보를 버려 작은 파일을 만들며 사람의 인지 품질과 SSIM 같은 지표를 함께 볼 수 있다. 지표가 높다고 branding/UI 가독성이 보장되지는 않는다.

GIF는 video codec보다 비효율적일 수 있으므로 animation 요구와 지원 playback 형식에 맞춰 검토한다. video/audio/DB/font도 크기와 loading을 따로 최적화한다. 파일을 원격으로 옮기면 binary는 줄지만 offline availability와 network 비용을 부담한다.

## 출처

- [Expo Documentation, Assets](https://docs.expo.dev/develop/user-interface/assets)

## 관련 문서

- [[Expo-Home-Fonts]]
- [[Expo-Home-Storage]]
