---
tags: [expo, expo-sdk, media-library]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo SDK Class 기반 MediaLibrary"]
---

# Expo SDK Class 기반 MediaLibrary

SDK57 expo-media-library root는 Asset/Album/Query class API다. npx expo install expo-media-library 후 named imports를 사용한다. Android/iOS/tvOS/Expo Go 배지는 모든 세부 기능 동등 지원을 보장하지 않는다. 기존 함수는 [[Expo-SDK-MediaLibrary-Legacy]]의 /legacy entrypoint로 분리한다.

## Root deprecated API는 실행되지 않는다

root import의 saveToLibraryAsync/createAssetAsync/getAssetsAsync/getAssetInfoAsync/createAlbumAsync/getAlbumAsync/getAlbumsAsync/deleteAssetsAsync/deleteAlbumsAsync/addAssetsToAlbumAsync/removeAssetsFromAlbumAsync/albumNeedsMigrationAsync/migrateAlbumIfNeededAsync/getAssetContentUriAsync/getMomentsAsync/isAvailableAsync/presentPermissionsPickerAsync/removeSubscription/setAssetFavoriteAsync는 deprecated shim이며 원문이 runtime throw를 명시한다. 단순 warning으로 읽지 않는다. permission Async 함수는 current API로 유지되고 picker는 presentPermissionsPicker()로 이름이 바뀌었다. 관련 migration 흐름은 [[Expo-Integrations-Migration-Media]]에 있다.

## Asset 계약

new Asset(id)로 재구성할 수 있는 id는 Android content URI, iOS PHAsset localIdentifier URI다. static Asset.create(localFileURI, album?):Promise<Asset>는 local file을 import하며 Android album 생략시 Pictures에 넣는다. import한 Asset과 app file은 다른 lifetime/권한을 가진다. asset.delete()/Asset.delete(assets):Promise<void>는 system media를 삭제한다.

```ts
const permission = await requestPermissionsAsync(false, ['photo']);
if (!permission.granted) return;
const asset = await Asset.create(file.uri);
const uri = await asset.getUri();
```

getter는 모두 Promise다. getFilename()/getUri():string, getMediaType():IMAGE(image)/VIDEO/AUDIO/UNKNOWN, getWidth()/getHeight():number(px), getShape():{width, height}|null, getCreationTime()/getModificationTime():epoch-ms|null, getDuration():milliseconds|null이다. legacy duration seconds와 단위가 다르다. getInfo():AssetInfo는 id/uri/filename/mediaType/dimensions/timestamps/duration/isFavorite를 묶는다. Query metadata부터 필요 field만 getter로 읽으면 native/file decode 비용을 줄인다.

getOrientation():1..8|null은 image EXIF display orientation, getExif()는 object 또는{}라고 설명하지만 return type이 Promise<undefined>로 생성돼 불일치한다. 실제 installed type/source를 확인하고 undefined를 임의 데이터 구조로 신뢰하지 않는다. getLocation():{latitude, longitude}|null과 EXIF는 Android ACCESS_MEDIA_LOCATION이 필요하다. getIsInCloud():boolean은 iCloud local 부재 확인이며 download를 시작하지 않는다. getLivePhotoVideoUri():string|null은 paired video temporary file, getMediaSubtypes():[]는 livePhoto/hdr/panorama/depthEffect/screenshot/highFrameRate/timelapse/spatialMedia/videoCinematic/stream을 제공한다.

getFavorite()/setFavorite(boolean)은 iOS Favorites smart album, Android10+ IS_FAVORITE다. older Android readfalse/write no-op이며 third-party gallery 자체 favorite 목록은 동기화되지 않을 수 있다. getAlbums():Album[]은 Android 보통하나, iOS 여러개다.

## Album

new Album(id)와 static Album.get(title):Promise<Album|null>, getAll():Promise<Album[]>로 찾는다. title은 unique가 아니다. Album.create(name, Asset[]|fileURI[], moveAssets=true):Promise<Album>는 Android move가 기본이며 legacy copy=true와 반대다. album.add(asset|assets):Promise<void>, getAssets():Promise<Asset[]>, getTitle():Promise<string>를 제공한다.

album.removeAssets(assets)는 iOS만 library를 유지하면서 membership을 제거한다. Android는 asset이 하나의 album에 속하므로 이동/삭제로 처리한다. album.delete()는 Android album과 assets 모두삭제, iOS album만 삭제다. static Album.delete(albums, deleteAssets=false)도 Android에서는 항상 assets를 삭제한다. deleteAssets=false를 Android 보호장치로 쓰지 않는다.

## Query

new Query().album(album).eq(field, value).gt/gte/lt/lte(field, number).within(field, values).orderBy(field|{key, ascending}).limit(number).offset(number)으로 chain한다. AssetField는 MEDIA_TYPE/CREATION_TIME/MODIFICATION_TIME/WIDTH/HEIGHT/DURATION/IS_FAVORITE다. eq/within은 field별 enum/boolean/number를 사용하며 source within value=undefined 표시는 docgen 결손이다. field 단독 orderBy는 기본 ascending이다.

```ts
const rows = await new Query().eq(AssetField.MEDIA_TYPE,MediaType.IMAGE)
  .orderBy({key:AssetField.CREATION_TIME,ascending:false}).limit(20).exeForMetadata();
```

exe():Promise<Asset[]>는 class refs, exeForMetadata():Promise<AssetMetadata[]>는 file paths/decoding 없이 id/filename?/mediaType/dimensions?/time?/duration?/isFavorite를 읽는다. Android metadata dimensions는 null일 수 있다. offset pagination 도중 library mutation이 생기면 결과를 재조회해야 한다.

## 출처

- [Expo Documentation, MediaLibrary](https://docs.expo.dev/versions/latest/sdk/media-library)

## 관련 문서

- [[Expo-SDK-MediaLibrary-Permissions]]
- [[Expo-SDK-MediaLibrary-Legacy]]
- [[Expo-Integrations-Migration-Media]]
- [[Expo-SDK-LivePhoto-Thumbnails]]
