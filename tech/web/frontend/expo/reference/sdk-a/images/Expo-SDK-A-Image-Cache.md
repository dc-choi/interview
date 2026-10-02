---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Image cache, native loading과 hash 생성"]
---

# Image cache, native loading과 hash 생성

## loading과 native reference

Image.loadAsync(source,{maxWidth,maxHeight,tintColor,onError})는 nativeimage를 memory에 load 해 ImageRef를 반환한다. useImage는 처음성공하기전 null이며 uri 변경또는추가 dependencies로 reload 한다. onError(error,retry)는재시도함수를제공한다. 큰이미지는 maxWidth/maxHeight **pixels** 제한없이 load 하면 memorycrash를 일으킬수있다. ImageRef는 width/height **logical size**,scale,isAnimated,mediaType(iOSnullable),nativeRefType를 가진다. 실제 pixel 크기는 logicalsize*scale이다. @2xiOSfile은 scale2이며 Android는 density 비율이다. hooknativeobject 수명과 manualrelease를 구분한다.

```tsx
const image = useImage(photoUri, { maxWidth: 800, onError: (error, retry) => {
  setRetryAction(() => retry);
}});
return image ? <Image source={image} style={{ width: 200, height: 150 }} /> : <Text>로딩 중</Text>;
```

## cache API와 identity

prefetch(urls,{headers,cachePolicy})의 optionsdefaultmemory-disk 다. 한 image 라도실패하면다른 download 완료와무관하게 false로 resolve 할 수 있다. componentcachePolicydefaultdisk와 일치하도록설정한다. getCachePathAsync(cacheKey)는 disklocalpath|null,readFromCacheAsync는 ImageRef|null이다. defaultkey는 URI이며 signedURL 같은동일 image의 변동 URI에 는명시 key를 쓸수있지만 version/content 변화를구분해야 한다.

writeToCacheAsync(localURI|ImageRef,cacheKey)는 network 없이 diskcache를 seed 한다. 이후 source에 도같은 key를 줘야한다. animatedimage를 decodedImageRef로 cache 하면 singleframe 으로 flatten 되므로 animation을 보존하려면 originalencodedlocalfileURI를 전달한다. clearMemoryCache/clearDiskCache는 Promise<boolean>,Androidactivity 부재에서 false,Webfalse 다.

iOSconfigureCache는 maxDiskSize/maxMemoryCost/maxMemoryCount를 받고0은 nolimit이다. memorycost는 pixelcount가 아니라 bytes로 ARGB8888 약4bytes/pixel이다. cache는 eviction 대상이며사용자원본의영구보관대체가 아니다.

## BlurHash와 ThumbHash

nativegenerateBlurhashAsync(source,components=[4,3])는 string|null,generateThumbhashAsync는 string이다. blurhashcomponents는 각축1~9,높을수록비용이늘고 imageaspect를 고려한다. source는 URL/ImageRef 다. blurhashplaceholderwidth/height는 default16이 며불필요하게크게 decode 하면 performance가 나빠진다.

server 생성은 multipartimage를 받고 Sharp 등으로 RGBArawbuffer를 만든뒤 blurhashencode(Uint8ClampedArray,width,height,componentX,componentY)한다. alphachannel이 없으면 pixelarray/dimensions 오류가난다. 원문 serverexample은 file===null만 검사해 undefined를 놓치고 formfieldnumber를 검증하지 않는다. 실제 endpoint는 missingfile 검사,1~9integer 변환,uploadsize 및 decodedimage 크기제한,error 처리를넣는다. 이는 source의 algorithm 설명과 productionrequest 검증을구분하는사항이다.

- [Expo Documentation, Image](https://docs.expo.dev/versions/latest/sdk/image/)

## 출처


## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
