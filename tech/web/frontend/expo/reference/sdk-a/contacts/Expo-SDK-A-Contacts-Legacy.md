---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Contacts legacy, 함수 API와 이전 데이터 구조"]
---

# Expo Contacts legacy, 함수 API와 이전 데이터 구조

`import * as Contacts from 'expo-contacts/legacy'`를 사용한다. Android/iOS와 Expo Go를 지원하며 current 객체 API와 함께 사용할 수 있다. 설치/plugin/Manifest/Info.plist 및 iOS note entitlement 조건은 [[Expo-SDK-A-Contacts]]와 같다. 루트 export의 deprecated 함수는 runtime throw 하므로 import 경로가 이행의 핵심이다.

## 조회와 페이지

`getContactsAsync(query?)`, `getPagedContactsAsync(query?)`는 `{ data: ExistingContact[], hasNextPage, hasPreviousPage }`를 반환한다. `getContactByIdAsync(id, fields?)`는 항목 또는 undefined 다. `hasContactsAsync()`/`isAvailableAsync()`는 boolean을 반환한다.

query는 `id: string | string[]`, 대소문자 구분 없는 name 부분 검색, fields, pageOffset, pageSize, sort를 받는다. pageSize 생략 또는 0은 모든 항목이다. iOS는 containerId/groupId, rawContacts(기본 false, 통합 방지)를 지원한다. 정렬은 `SortTypes.FirstName`, LastName, None이며 UserDefault는 Android 다. fields 생략은 전체 필드, 목록 화면은 필요한 필드를 좁혀 비용을 줄인다.

```ts
import * as Contacts from 'expo-contacts/legacy';

export async function emailPage(pageOffset = 0) {
  const permission = await Contacts.requestPermissionsAsync();
  if (!permission.granted) return null;
  return await Contacts.getContactsAsync({
    fields: [Contacts.Fields.Emails], pageSize: 50, pageOffset,
    sort: Contacts.SortTypes.FirstName,
  });
}
```

## 저장, native UI, 공유

`addContactAsync(contact, containerId?)`는 새 ID 문자열, `updateContactAsync({ id, ...partial })`는 ID 문자열을 반환한다. `removeContactAsync(id)`는 삭제한다. legacy 원문은 update의 배열 merge/replace 계약을 설명하지 않으므로 current patch 규칙을 가져다 적용하지 않는다.

`presentContactPickerAsync()`는 ExistingContact 또는 취소 시 null, `presentAccessPickerAsync()`는 선택한 ID 문자열 배열이다. `presentFormAsync(contactId?, contact?, formOptions?)`는 native form을 연다. FormOptions는 allowsActions/allowsEditing, alternateName, displayedPropertyKeys, groupId, isNew, message, preventAnimation, shouldShowLinkedContacts, cancelButtonTitle을 갖는다. message/cancel title은 기존 연락처 편집에 적용한다. current의 boolean 저장 결과나 isNew 무효 조건과 같은 계약으로 단정하지 않는다.

`shareContactAsync(contactId, message, shareOptions?)`는 React Native ShareOptions를 받고, `writeContactToFileAsync(query?)`는 파일 URI 문자열 또는 undefined를 반환한다. 원문은 파일 형식/수명과 각 any 반환값의 구조를 명시하지 않는다.

## legacy 필드 구조

`Contact`는 name과 contactType(person/company), 선택적 firstName/lastName/middleName/namePrefix/nameSuffix/phonetic이 름, company/department/jobTitle, nickname/maidenName, dates/birthday, addresses/emails/phoneNumbers/relationships/urlAddresses/instantMessageAddresses/socialProfiles를 갖는다. ExistingContact는 OS가 생성한 불변 id를 추가한다.

Email은 `email`, PhoneNumber는 `number`, digits/countryCode/isPrimary, Address는 street/city/region/postalCode/country/isoCountryCode/neighborhood/poBox를 사용한다. 각 항목은 label과 선택적 id를 갖는다. current의 Email.address, Address.postcode, phones, givenName/familyName, isFavourite와 서로 다르다.

legacy Date는 day/month/year, label/id, OS가 제공하는 format이다. month는 JS Date처럼 0부터 시작한다. format을 직접 설정하지 않는다. current ContactDate는 1부터 시작한다. iOS nonGregorianBirthday는 format을 기준으로 해석한다. Android isFavorite, iOS socialProfiles 등의 platform 조건을 구분한다.

image는 `{ uri, base64?, width?, height? }`, rawImage는 crop 없는 큰 원본, imageAvailable은 이미지 유무 확인에 쓰인다. iOS thumbnail은 320×320, Android는 다를 수 있다. remote URI는 먼저 로컬에 다운로드한다. 원문이 예시로 든 루트 FileSystem.downloadAsync는 SDK 57에서 deprecated throw 하므로 current File API 또는 `/legacy` 경로를 선택한다.

Fields enum에 는 Addresses/Birthday/Company/ContactType/Dates/Department/Emails/ExtraNames/FirstName/ID/Image/ImageAvailable/InstantMessageAddresses/IsFavorite/JobTitle/LastName/MaidenName/MiddleName/Name/NamePrefix/NameSuffix/Nickname/NonGregorianBirthday/Note/PhoneNumbers/PhoneticFirstName/PhoneticLastName/PhoneticMiddleName/RawImage/Relationships/SocialProfiles/UrlAddresses가 있다.

## 계정과 그룹

`getContainersAsync({ contactId?, containerId?: string | string[], groupId? })`, `getDefaultContainerIdAsync()`, `getGroupsAsync({ containerId?, groupId?, groupName? })`로 조회한다. Container에 는 id/name/type가 있다. `createGroupAsync(name?, containerId?)`는 ID를 반환한다. `addExistingContactToGroupAsync`, `removeContactFromGroupAsync`, `addExistingGroupToContainerAsync`, `removeGroupAsync`, `updateGroupNameAsync(groupName, groupId)`가 변경 함수다. iOS의 계층 모델 설명을 기준으로 사용하며 넓게 표시된 Android/iOS heading만 으로 동일한 OS 기능을 보장한다고 추정하지 않는다. 원문 Group 타입의 id/name 설명이 뒤바뀌어 있어 의미는 identifier와 이름으로 구분한다.

## 권한과 변경

get/requestPermissionsAsync 결과의 accessPrivileges는 all/limited/none이고 limited는 iOS 18+다. `ContactAccessButton`은 iOS 18+이며 `isAvailable()`로 확인한다. query/제외 이메일과 전화/caption/색상/ViewProps 계약은 current 버튼과 같다. `addContactsChangeListener(() => {})` 반환 subscription의 remove로 해제한다. event 상수 `onContactsChangeEventName` 값은 onContactsChange 다. legacy 페이지 자체는 callback 지연 세부사항을 반복하지 않는다.

## 출처

- [Expo Documentation, Contacts (legacy)](https://docs.expo.dev/versions/latest/sdk/contacts-legacy)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
