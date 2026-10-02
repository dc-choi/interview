---
tags: [expo, expo-integrations, migration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["expo-media-library class API 이전"]
---

# expo-media-library class API 이전

SDK57의 new root API는 Asset/Album/Query이고 legacy free function은 expo-media-library/legacy에서 사용한다. root에 예전 이름이 보인다고 같은 동작을 지원하는 것은 아니다. 특히 root saveToLibraryAsync는 legacy migration을 요구하는 runtime error를 내므로 Asset.create로 바꾼다.

## Asset과 Query

Asset/Album instance는 native ID를 가진 참조이고 property를 미리 채운 plain result가 아니다. await asset.getFilename/getWidth/getHeight/getMediaType/getExif 또는 getInfo로 읽는다. Asset.create(localUri)는 file을 library에 저장하고 Asset instance를 반환한다. asset.delete 또는 Asset.delete(array)로 삭제한다.

```ts
import { Asset, Query, AssetField, MediaType } from 'expo-media-library';
const assets = await new Query().eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
  .limit(20).offset(0)
  .orderBy({key:AssetField.CREATION_TIME,ascending:false}).exe();
const details = await Promise.all(assets.map(asset => asset.getInfo()));
```

Query는 array를 직접 반환하고 legacy assets wrapper/endCursor/hasNextPage가 없다. limit/offset pagination은 insert/delete 중 결과 변동도 고려한다. source의 모든 API async 설명과 requestPermissionsAsync/getPermissionsAsync 같은 그대로 남은 명칭을 구분한다.

legacy iOS Asset.uri는 ph://로 new Asset에 전달하고 저장된 bare ID는 ph://를 붙인다. Android numeric MediaStore ID는 Legacy.getAssetContentUriAsync로 content://를 resolve한 뒤 new Asset에 넣는다. platform URI를 raw legacy ID와 섞지 않는다.

## Album과 변경 알림

Album.get(name)는 missing을 처리하고 getAll은 list, create(name,[asset])는 instance를 반환한다. album.getAssets/getTitle/add와 iOS-only removeAssets를 사용한다. album.delete 또는 Album.delete(array)는 legacy deleteAlbumsAsync argument와 동일하다고 추측하지 말고 deletion semantics를 reference에서 확인한다.

requestPermissionsAsync/getPermissionsAsync/usePermissions는 이름을 유지하고 presentPermissionsPickerAsync는 presentPermissionsPicker로 바뀐다. addListener는 subscription.remove cleanup, removeAllListeners는 전역 정리이며 listener event shape는 유지된다. getMomentsAsync/albumNeedsMigrationAsync/migrateAlbumIfNeededAsync는 new API에 대체가 없다. 제거해도 될지 앱의 기존 기능 목적을 확인한다. native permission과 실제 저장/삭제는 문서 작업에서 실행하지 않았다.

## 출처

- [Expo Documentation, Migrate to the new expo-media-library API](https://docs.expo.dev/guides/sdk-libraries-migration/media-library)

## 관련 문서

- [[Expo-Integrations-Upgrade]]
- [[Expo-Integrations-Migration-Contacts]]
