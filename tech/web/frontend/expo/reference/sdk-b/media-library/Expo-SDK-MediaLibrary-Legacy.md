---
tags: [expo, expo-sdk, media-library]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Legacy MediaLibrary API"]
---

# Expo SDK Legacy MediaLibrary API

import * as MediaLibrary from 'expo-media-library/legacy'로 기존 function API를 유지할 수 있다. root shim은 runtime throw이므로 import 경로를 명시한다. 권한은 [[Expo-SDK-MediaLibrary-Permissions]], class 전환은 [[Expo-SDK-MediaLibrary]]에 있다.

## Read, pagination, shape

getAlbumsAsync({includeSmartAlbums}), getAlbumAsync(title)→Album|null, getMomentsAsync()→moment Album[]로 조회한다. 원문의 getAlbumsAsync가 component로 생성된 부분은 JSX component 사용 근거가 아니다. Album은 id/title/estimatedassetCount, iOS type(album/moment/smartAlbum)와 moment start/endTime/locationNames/approximateLocation이다.

getAssetsAsync(options={}):Promise<PagedInfo<Asset>>는 assets/endCursor/hasNextPage/estimatedtotalCount를 반환한다. first default20, after=endCursor, album, createdAfter/Before(Date 또는 epoch-ms), mediaType default photo, iOS mediaSubtypes, sortBy를 받는다. sortBy keys default/mediaType/width/height/creationTime/modificationTime/duration은 기본 descending, [key, true]는 ascending, 앞 key가 우선이다. default key는 ascending을 무시한다. endCursor는 iOS lastAssetID/Android index이므로 직접 계산하지 않는다.

```ts
const page = await MediaLibrary.getAssetsAsync({first:20,mediaType:'photo',resolveWithFullInfo:true});
if (page.hasNextPage) await MediaLibrary.getAssetsAsync({first:20,after:page.endCursor});
```

Asset은 id/uri/filename/mediaType/dimensions/time/duration, Android albumId, iOS mediaSubtypes다. uri는 iOS ph://, Android file://이며 duration seconds다. getAssetInfoAsync(asset,{shouldDownloadFromNetwork:true})는 localUri/exif/location/orientation/favorite/pairedVideoAsset를 추가한다. false면 iCloud isNetworkAsset를 조회하고 download하지 않는다. Android resolveWithFullInfo=true는 EXIF orientation 오류를 교정할 수 있다. metadata가 불필요하면 class getters로 최소 data만 읽는다.

## Create/save/move/delete

createAssetAsync(localURI, album?)→Asset는 extension 있는 file을 저장한다(Android file:///). 기존 album을 즉시 지정하면 Android11+ 생성 후 move confirmation을 줄인다. saveToLibraryAsync(localURI)→void는 Asset를 반환하지 않는다. iOS11+ add-only save에는 NSPhotoLibraryAddUsageDescription을 사용하며 read permission 요구와 구분한다.

createAlbumAsync(name, asset?, copyAsset=true, initialAssetLocalUri?)→Album는 Android empty album 불가다. initialURI는 extension/file:///이고 asset이 있으면 무시된다. addAssetsToAlbumAsync(assets, album, copy=true)→boolean은 Android 기본 copy라 duplicated query rows가 생긴다. false는 move다. removeAssetsFromAlbumAsync→boolean은 Android의 빈 album을 자동 삭제하며 current iOS-only removeAssets contract로 무조건 동등하게 치환하지 않는다.

deleteAssetsAsync→boolean은 iOS 모든 album membership에서 삭제와 확인 dialog, Android의 다른 copies는 남는다. deleteAlbumsAsync(albums, assetRemove=false)→boolean은 iOS 기본적으로 assets 유지, Android에서는 assets 삭제다. setAssetFavoriteAsync→boolean은 iOS smart album을 조정한다.

## Migration와 availability

getAssetContentUriAsync(legacyAsset):Promise<string>는 Android content URI를 반환하며 new Asset(id)에 전달하는 bridge다. legacy integer ID를 새 Asset id로 그대로 넣지 않는다. albumNeedsMigrationAsync→boolean은 Android R+에서 write access 없는 album 검사, 기타 false다. migrateAlbumIfNeededAsync→void는 Android R+의 MediaStore directory로 옮기고이미 쓸 수 있는 경우, 구형 Android/iOS/web이면 no-op다. 사진+영상은 compatible하지만 음악과 사진 혼합은 reject할 수 있다. 읽기만 하고 album에 추가하지 않으면 migration이 불필요할 수 있다. isAvailableAsync():Promise<boolean>은 legacy entrypoint에서 현재 device의 지원 여부를 검사한다.

원문 example은 permissionResponse가 처음 null인데 .status를 읽고 request 결과를 재검사하지 않는다. 실제 코드는 null guard와 새 response.granted 검사를 거친다. library change subscription은 제거하고 삭제와 취소/native failure를 UI에서 구분한다.

## 출처

- [Expo Documentation, MediaLibrary (legacy)](https://docs.expo.dev/versions/latest/sdk/media-library-legacy)

## 관련 문서

- [[Expo-SDK-MediaLibrary]]
- [[Expo-SDK-MediaLibrary-Permissions]]
- [[Expo-Integrations-Migration-Media]]
