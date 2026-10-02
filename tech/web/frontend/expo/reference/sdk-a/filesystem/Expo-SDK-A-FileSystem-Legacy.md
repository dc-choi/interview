---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["FileSystem legacy URI, transfer와 Android SAF"]
---

# FileSystem legacy URI, transfer와 Android SAF

## import와 sandbox

legacy는 current File/Directory와 같은 package에 남아 있는 호환 API 다. **`import * as FileSystem from 'expo-file-system/legacy'`**로 가져온다. 원문 SAF Basic Usage의 root import는 현행 entrypoint와 충돌하므로 legacy로 바꾼다. Expo Go의 프로젝트 filesystem은 서로 격리된다. documentDirectory/cacheDirectory/bundleDirectory는 string|null이고 document는 trailing slash URI,cache는 system 삭제 가능 파일 영역이다.

## URI function API

getInfoAsync(uri,{md5=false})는 exists union을 반환한다. 존재하면 isDirectory,size,uri,modificationTime(**epoch seconds**)와 optionalmd5 다. current File의 milliseconds와 변환 단위를 구분한다. readAsStringAsync는 utf8(default) 또는 base64이고 position/length는 base64와 함께 둘 다 지정할 때 byte slice 다. writeAsStringAsync는 append(defaultfalse)/encoding을 받으며 SAF URI에서는 기존 파일만 쓸 수 있다.

makeDirectoryAsync({intermediates:true})는 중간 directory를 만든다. readDirectoryAsync는 **이름 배열**,copyAsync({from,to})는 recursive copy,moveAsync는 이동,deleteAsync는 recursive delete이며 idempotent:true 면 missing error를 없앤다. getContentUriAsync는 Android file://를 외부 공유용 content://로 바꾸고 Intent permission flags 같은 공유 수신 계약도 필요하다. disk free/total은 internal partition 전체 bytes 다. deleteLegacyDocumentDirectoryAndroid는 오래된 document 영역 정리용 deprecated API 다.

## download, upload와 legacy 수명

downloadAsync(url,fileUri,{headers,md5,sessionType})는 기존 file contents를 교체하며 parent directory가 먼저 있어야 한다. 결과는 uri,status,headers,mimeType과 optionalmd5 다. createDownloadResumable는 생성만 하고 downloadAsync/resumeAsync로 시작한다. canceled 결과가 undefined 일 수 있어 바로 destructure 하지 않는다. pauseAsync/savable은 url,fileUri,options,resumeData를 보관하고 constructor 또는 createDownloadResumable로 복원한다. opaque resumeData는 임의 편집하지 않는다. callback의 totalBytesExpectedToWrite=-1은 total unknown이며 background에서는 callback이 foreground 복귀까지 오지 않을 수 있다.

uploadAsync 또는 createUploadTask(...).uploadAsync는 POST/PUT/PATCH,headers,sessionType을 받는다. BINARY_CONTENT0는 raw body이며 additional form parameters를 받지 않는다. MULTIPART1은 fieldName(default filename without extension),mimeType(extension 추론),parameters를 받는다. current UploadOptions fieldName 기본 file과 다르다. UploadTask result는 null/undefined가 능하며 cancelAsync는 Promise<void>다. server binary-upload 예제는 stream 완료 전에 성공 응답을 보내므로 production의 완료 보장 구현으로 사용하지 않는다.

iOS BACKGROUND0는 suspension이 후 native session을 유지하고 network/server 실패 시 계속 retry 할 수 있다. FOREGROUND1은 inactive 시 종료되고 복귀 시 reject 할 수 있다. Android session은 항상 background 다. 이 설정은 JS runtime 전체를 영구 유지하는 권한이 아니다.

## Android StorageAccessFramework

SAF requestDirectoryPermissionsAsync(initialUri?)는 선택 directory의 접근을 요청하고 `{granted:false}` 또는 `{granted:true,directoryUri}`를 반환한다. initial URI가 유효하지 않으면 무시된다. getUriForDirectoryInRoot(folder)로 초기 위치를 만들 수 있지만 사용자가 선택한 위치를 검증해야 한다. permission을 받기 전 path string만 으로 접근이 생기지 않는다.

```ts
const { StorageAccessFramework: SAF } = FileSystem;
const grant = await SAF.requestDirectoryPermissionsAsync();
if (grant.granted) {
  const uri = await SAF.createFileAsync(grant.directoryUri, 'draft', 'text/plain');
  await FileSystem.writeAsStringAsync(uri, 'Hello');
  const children = await SAF.readDirectoryAsync(grant.directoryUri);
}
```

SAF.createFileAsync는 extension 없는 filename+MIME을 받아 URI를 반환한다. makeDirectoryAsync(parent,name),readDirectoryAsync는 full SAF URI 배열이다. 일반 readDirectoryAsync의 이름 배열과 다르다. SAF content://와 일반 content://를 동일하게 취급하지 않는다. Android readAsString은 file/asset/SAF,copy는 content/asset/SAF를 localfile로 복사할 수 있다. iOS getInfo/copy는 ph/assets-library URI를 지원하지만 read/write/move는 file://가 기본이다. network download/upload는 http/https와 localfile 사이 API 다. Android no scheme은 bundled resource로 해석된다. manifest의 READ/WRITE_EXTERNAL_STORAGE,INTERNET 자동 선언과 scoped-storage/SAF의 runtime 접근 권한은 별개다. iOS 자체 filesystem API에 는 추가 permission이 없다.

## 출처

- [Expo Documentation, FileSystem (legacy)](https://docs.expo.dev/versions/latest/sdk/filesystem-legacy)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
