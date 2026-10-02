---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["DocumentPicker 시스템 문서 선택과 cache 복사"]
---

# DocumentPicker 시스템 문서 선택과 cache 복사

## 선택 API와 결과

`import * as DocumentPicker from 'expo-document-picker'` 후 `getDocumentAsync(options)`로 Android, iOS, Web의 system picker를 연다. Expo Go도 지원한다. generated API의 ReactElement component 표기는 실제 호출 계약과 맞지 않으며 함수가 Promise 결과를 반환한다.

| option | 계약 |
| --- | --- |
| `type` | MIME string 또는 배열. 기본 `*/*` |
| `multiple` | 복수 선택, 기본 false |
| `copyToCacheDirectory` | native에서 cache 복사, 기본 true. 즉시 FileSystem 으로 읽을 때 사용 |
| `base64` | Web 결과에 base64 추가, 기본 true |

성공은 `{ canceled: false, assets: DocumentPickerAsset[], output? }`, 취소는 `{ canceled: true, assets: null, output? }`다. asset은 `name`, `uri`, optional `size`(bytes), `mimeType`, `lastModified`(epoch milliseconds)를 가진다. Web에 는 `file: File`, optional `base64`, 결과 `output: FileList`가 추가될 수 있다.

```ts
const result = await DocumentPicker.getDocumentAsync({
  type: ['application/pdf', 'text/plain'], copyToCacheDirectory: true,
});
if (!result.canceled) {
  const first = result.assets[0];
  const file = new File(first.uri); // expo-file-system File
  const bytes = await file.bytes();
  await uploadBytes(first.name, bytes);
}
```

cache 복사는 다른 API가 선택 직후 파일에 접근하도록 돕지만 큰 파일의 시간과 저장 공간 비용이 있다. URI는 영구 보관을 뜻하지 않는다. Web에서는 button click 같은 user activation에서 picker를 열어야 한다. mount 직후 자동 호출은 동작하지 않으며 browser의 cancel이 벤트가 일관되지 않다.

## iCloud 설정

iCloud 저장은 `ios.usesIcloudStorage`와 `expo-document-picker` plugin의 `iCloudContainerEnvironment`(Development/Production), 필요 시 `kvStoreIdentifier`를 구성한다. Environment 설정은 Ad Hoc 배포 시 영향을 준다. Apple 팀을 이전한 앱에서는 기존 key-value store identifier를 override 해야 할 수 있다. 직접 native 관리 시 iCloud entitlement, CloudDocuments service, container 및 ubiquity identifier를 구성한다. Apple Developer에서 container와 capability가 실제 준비되어야 하며 config만 추가했다고 서버 쪽 provisioning이 완성되는 것은 아니다. 변경 후 native build를 다시 만든다.

## 출처

- [Expo Documentation, DocumentPicker](https://docs.expo.dev/versions/latest/sdk/document-picker)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
