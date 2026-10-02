---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Contacts, 객체 조회와 접근 권한"]
---

# Expo Contacts, 객체 조회와 접근 권한

SDK 57의 `expo-contacts` 루트는 `Contact`, `Container`, `Group` 객체 기반 API 다. Android/iOS와 Expo Go를 지원한다. 기존 함수 기반 API는 [[Expo-SDK-A-Contacts-Legacy]]처럼 `expo-contacts/legacy`에서 가져온다. 루트의 deprecated `getContactsAsync`, `addContactAsync`, `updateContactAsync`, picker/form/share/export 함수는 런타임에 throw 하므로 이름이 export 돼 있다는 이유로 호출하지 않는다. 루트의 권한 함수와 변경 listener는 현재 API 다.

## 설치와 권한

`npx expo install expo-contacts`로 설치한다. config plugin `['expo-contacts', { contactsPermission: '연락처를 선택하고 관리하는 데 사용합니다.' }]`은 iOS `NSContactsUsageDescription`을 설정하며 새 binary가 필요하다. CNG를 쓰지 않으면 Android Manifest에 `READ_CONTACTS`/`WRITE_CONTACTS`, iOS Info.plist에 usage description을 직접 넣는다.

`getPermissionsAsync()`는 현재 상태, `requestPermissionsAsync()`는 요청 결과를 반환한다. `status`, `granted`, `canAskAgain`, `expires`에 더해 `accessPrivileges: 'all' | 'limited' | 'none'`을 확인한다. iOS 18+의 limited 권한에서는 반환된 목록이 전체 주소록이라는 보장이 없다. 다시 요청할 수 없으면 설정 화면에서 변경하도록 안내한다.

## Contact를 조회하는 두 방식

| API | 반환과 계약 |
| --- | --- |
| `new Contact(id)` | 기존 ID를 사용하는 handle. ID는 iOS UUID, Android ContactsContract ID이고 읽기 전용이다 |
| `Contact.create(record)` | `Promise<Contact>`, 새 연락처를 저장한다 |
| `Contact.getAll(options?)` | `Promise<Contact[]>`, 상세 값을 읽는 객체 목록 |
| `Contact.getAllDetails(fields, options?)` | 필요한 필드만 일괄 읽은 `PartialContactDetails<T>[]`, 각 항목에 `id`가 있다 |
| `contact.getDetails(fields?)` | 선택한 필드의 상세 값. 생략하면 전체 필드 |
| `Contact.getCount()` / `Contact.hasAny()` | 연락처 수 / 존재 여부를 비동기로 확인 |

`ContactQueryOptions`는 `name` 부분 일치 검색, `limit`, `offset`, `sortOrder`, iOS `rawContacts`를 받는다. limit 생략 시 모든 결과, offset 생략 시 처음부터다. 정렬은 `ContactsSortOrder.GivenName`, `FamilyName`, `None`, `UserDefault`를 쓴다. current query에 legacy의 `pageSize`, `pageOffset`, `sort`를 섞지 않는다.

`ContactField` enum은 `FULL_NAME`, `GIVEN_NAME`, `FAMILY_NAME`, `PHONES`, `EMAILS`, `IMAGE`, `THUMBNAIL`, `ADDRESSES` 등 대문자 멤버다. 원문의 일부 자동 생성 예제가 `ContactField.GivenName`, `ContactSortOrder.FirstName`, `sort`를 사용하지만 현재 enum/type 표에 맞춰 작성한다.

```ts
import { Contact, ContactField, ContactsSortOrder,
  requestPermissionsAsync } from 'expo-contacts';

export async function loadPage(offset = 0) {
  const permission = await requestPermissionsAsync();
  if (!permission.granted) return [];
  return await Contact.getAllDetails(
    [ContactField.FULL_NAME, ContactField.PHONES],
    { offset, limit: 50, sortOrder: ContactsSortOrder.GivenName }
  );
}
```

페이지 UI는 중복 fetch를 막고, 마지막 페이지 여부를 결과 길이로 관리한다. 데이터 변경 후 offset 목록을 재조회해야 삽입/삭제로 항목을 놓치지 않는다. 이 UI 처리 방식은 query 계약에서 도출한 사용 예이며 원문이 안정된 snapshot을 보장하지 않는다.

## Picker, native form과 제한적 접근

`Contact.presentPicker()`는 사용자가 고른 `Contact`, 취소 시 `null`을 반환한다. `Contact.presentCreateForm(record?, options?)`는 실제 생성 여부를 boolean 으로 반환한다. `contact.editWithForm(options?)`는 저장 여부를 반환한다. create options는 iOS `cancelButtonTitle`, `preventAnimation`, `showsCancelButton`(기본 true)이며, edit form은 actions/editing 허용, 표시 필드, alternateName/message, linked contacts, groupId 등을 제어한다. `isNew`는 현재 form에서 효과가 없으므로 별도 create form을 쓴다.

iOS 18+ `Contact.presentAccessPicker()`는 새로 접근을 허용한 `Contact[]`를 반환한다. `ContactAccessButton.isAvailable()`이 true 일 때만 버튼을 표시한다. `query`는 아직 노출되지 않은 연락처를 검색하는 문자열, `ignoredEmails`/`ignoredPhoneNumbers`는 제외 목록, `caption`은 default/email/phone이다. backgroundColor는 투명하게 만들지 않고 textColor와 대비를 확보한다. `tintColor`는 버튼과 여러 일치 결과 modal에 적용되며 ViewProps를 상속한다.

## 변경 관찰

`addContactsChangeListener(() => refresh())`는 인자가 없는 callback과 `remove()` 가능한 subscription을 반환한다. 원문 예제의 단수 `addContactChangeListener` 대신 API heading의 복수 이름을 쓴다. Android ContentObserver는 5–7 초 지연되고 RawContacts/Contacts를 모두 관찰해 한 변경이 두 번 올 수 있다. iOS는 CNContactStoreDidChangeNotification을 즉시 전달한다. callback을 debounce 하고 foreground 복귀 때 재조회할 수 있다. 컴포넌트 종료 시 해당 subscription을 제거한다. `removeAllContactsChangeListeners()`는 다른 화면의 listener까지 제거할 수 있어 개별 해제가 적절하다.

상세 수정, 필드 구조와 iOS 그룹은 [[Expo-SDK-A-Contacts-Mutation]], [[Expo-SDK-A-Contacts-Groups]]에서 이어진다.

## 출처

- [Expo Documentation, Contacts](https://docs.expo.dev/versions/latest/sdk/contacts)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
