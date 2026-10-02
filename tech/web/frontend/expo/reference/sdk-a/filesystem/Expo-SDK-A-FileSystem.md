---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["FileSystem File와 Directory, 현재 entrypoint"]
---

# FileSystem File와 Directory, 현재 entrypoint

## current API와 legacy 분리

`import { File, Directory, Paths } from 'expo-file-system'`는 Android/iOS/tvOS의 현재 API 다. class는 URI 참조를 만들며 constructor가 실제 file/directory를 만들지는 않는다. 기존 path의 종류와 class가 맞지 않으면 constructor가 throw 한다. root의 deprecated copyAsync/readAsStringAsync/downloadAsync/uploadAsync 등은 단순 경고가 아니라 **runtime throw**한다. 기존 function API는 반드시 `expo-file-system/legacy`에서 import 한다. [[Expo-SDK-A-FileSystem-Legacy]]와 [[Expo-SDK-A-FileSystem-Transfer]]에 수명과 transfer 계약을 분리했다.

## Paths와 보관 범위

Paths.cache는 OS가 공간 부족 시 제거할 수 있는 Directory,document는 앱이 관리하는 지속 파일,bundle은 native embedded asset directory 다. availableDiskSpace/totalDiskSpace는 device internal bytes,appleSharedContainers는 group identifier 별 Directory 다. 앱 삭제나 OS 외부 환경까지 document 영구 보존을 보장하지 않는다. iOS plugin supportsOpeningDocumentsInPlace와 enableFileSharing 기본 false는 각각 LSSupportsOpeningDocumentsInPlace/UIFileSharingEnabled를 생성한다. true 면 Documents가 Files/iTunes sharing에 노출되므로 저장 범위를 정한다. 변경은 native build가 필요하다.

Paths.basename/dirname/extname/isAbsolute/join/normalize/parse/relative/info는 URI/path utility 다. parse는 base,dir,ext,name,root를 반환한다. info는 exists/isDirectory(null가 능)다. 원문의 relative 설명은 absolute resolution이 라고 적혀 있어 이름과 충돌하므로 해당 method를 absolute 접근 권한 확보 수단으로 해석하지 않는다.

## File read/write와 metadata

File은 Blob interface를 구현한다. text()/textSync(),base64()/base64Sync(),bytes()/bytesSync(),arrayBuffer(),json(),formData(),slice(),stream()/readableStream()/writableStream()을 제공한다. whole-file read는 메모리에 모두 올리므로 큰 파일은 stream/handle로 나눈다. write(string|Uint8Array,{append=false,encoding=utf8/base64})는 synchronous이고 create({intermediates=false,overwrite=false})는 기존 파일에서 기본 throw 한다.

```ts
const file = new File(Paths.document, 'draft.json');
file.create({ overwrite: true });
file.write(JSON.stringify({ version: 1 }));
await file.copy(new File(Paths.cache, 'draft-copy.json'));
await file.move(new Directory(Paths.document, 'archive'), { overwrite: true });
```

move/copy는 **Promise<void>**이고 moveSync/copySync는 별도 synchronous method 다. 원문 usage의 await 없는 move/copy를 현재 계약으로 복제하지 않는다. relocation overwrite 기본 false,move는 object.uri도 갱신한다. rename/delete는 sync 다. uri는 읽기 전용이지만 이동 후 바뀔 수 있다. Android contentUri는 외부 공유 가능한 content URI 다.

exists=false는 부재뿐 아니라 읽기 권한 없음도 포함한다. size0/type 빈문자/null metadata를 부재와 무조건 동일시하지 않는다. creationTime/lastModified는 epoch **milliseconds**,Android API26 미만 creationTime은 null이다. modificationTime은 deprecated이며 lastModified를 쓴다. md5/info({md5:true})는 파일 hash를 반환하지만 보안적 signature 검증과 다르다. name/extension/parentDirectory도 제공한다.

## Directory와 picker

Directory.create({idempotent,intermediates,overwrite}) 기본은 모두 false 다. createDirectory/createFile로 하위 object를 만들고 list는 File|Directory 배열이다. 없는 directory list는 throw 한다. info는 exists/uri/size/date/files metadata,delete는 전체 하위 항목도 지운다. copy/move async와 Sync variant,rename을 제공한다.

현재 File.pickFileAsync({initialUri,mimeTypes='*/*',multipleFiles})는 canceled union을 반환한다. single 성공 result:File,multipleFiles:true 성공 result:File[],취소 result:null이다. positional initialUri/mimeType overload는 deprecated이며 결과 형태도 다르다. source의 `new File.pickFileAsync()`와 missing await 예제는 유효한 호출로 복제하지 않는다. iOS는 원본을 그대로 두고 temporary copy를 반환하는 경로가 있다. DocumentPicker cache copy를 사용할 때는 canceled와 assets를 먼저 확인한다.

## FileHandle와 watch

open(mode?) 기본은 file://에 ReadWrite(rw),Android SAF content://에 ReadOnly(r)다. SAF는 ReadWrite 미지원이다. WriteOnly(w),Append(wa),Truncate(wt)를 제공하며 truncate는 내용을 지운다. SAF append는 cursor이 동 없이 strict append 다. handle.readBytes(length)/writeBytes(bytes)는 offset을 증가시킨다. offset>size의 다음 write는 끝에 append 한다. close 후 offset/size는 null이고 read/write는 throw 하므로 finally에서 close 한다. 한번 read 크기는 ArrayBuffer 제한에 묶인다.

File/Directory.watch(callback,{debounce=100,events})는 created/modified/deleted/renamed event와 target을 반환한다. Android correlated rename은 newTarget을 포함할 수 있다. iOS directory watcher는 child 별 event 대신 directory의 coarse modified를 주므로 child created/deleted filter를 신뢰하지 않는다. 대상 삭제/개명 시 watcher가 자동 중단되며 subscription.remove()로 수동 해제한다.

## 출처

- [Expo Documentation, FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
