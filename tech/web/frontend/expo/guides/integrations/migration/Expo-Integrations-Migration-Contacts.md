---
tags: [expo, expo-integrations, migration]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["expo-contacts class API 이전"]
---

# expo-contacts class API 이전

expo-contacts root의 Contact는 native ID 참조이며 legacy plain contact는 /legacy에서 사용한다. firstName/lastName은 givenName/familyName으로 바뀌고 async getter/setter와 typed projection을 사용한다. 부분 update와 전체 replacement를 반드시 구분한다.

## 목록과 write semantics

Contact.create(data)는 instance, getAll({limit,offset,sortOrder})는 instance list다. getAllDetails([ContactField.FULL_NAME,PHONES],options)는 선택 field에 narrowed projection을 반환하고 id를 new Contact(id)에 넣어 method를 호출한다. hasAny/getCount는 존재/count를 조회한다.

contact.patch({givenName:...})는 주어진 field만 바꾸고 contact.update(data)는 빠진 field를 지운다. legacy updateContactAsync를 이름만 update로 치환하면 기존 phone/email 등이 삭제될 수 있다. contact.delete는 native record를 제거한다.

## Scalar와 sub-record

get/set GivenName/FamilyName/MiddleName/Prefix/Suffix/PhoneticGivenName/PhoneticFamilyName/Company/JobTitle/Department/Note/Image를 제공한다. FullName과 Thumbnail은 getter만, Nickname/Birthday는 iOS-only, IsFavourite는 Android-only다. 여러 field는 getDetails(enum[])로 한번에 읽는다.

phone/email/address/URL/social profile/IM/date는 각각 add/get/update/delete dedicated method를 사용한다. URL 이름은 UrlAddress/UrlAddresses이며 Android ExtraName도 별 method다. 기존 array 전체를 다시 쓰는 패턴을 피하고 반환 sub-record identity를 유지해 update/delete한다.

## Native UI, Group와 Container

Contact.presentPicker는 selected Contact 또는 취소, presentCreateForm은 create native form, contact.editWithForm은 edit UI다. presentAccessPicker는 iOS18+ limited-contact grant picker다. iOS Group.getAll/create 후 addContact/removeContact/getContacts/getName/setName/delete를 사용한다. Container.getAll/getDefault(없으면null), instance getName/getType/getGroups/getContacts로 data source를 읽는다.

requestPermissionsAsync/getPermissionsAsync는 root free function으로 유지되고 addContactsChangeListener는 remove 가능한 subscription, removeAllContactsChangeListeners는 전체 정리다. source의 모든 Async suffix 제거 문구에는 permission 함수 예외가 있으므로 mechanical rename하지 않는다. shareContactAsync/writeContactToFileAsync는 replacement가 없다. 수정 대상 record와 전체 replacement 영향을 검증한 뒤 이전한다. 실제 연락처/phone/email을 Vault 예제에 저장하지 않는다.

## 출처

- [Expo Documentation, Migrate to the new expo-contacts API](https://docs.expo.dev/guides/sdk-libraries-migration/contacts)

## 관련 문서

- [[Expo-Integrations-Upgrade]]
- [[Expo-Integrations-Migration-Calendar]]
- [[Expo-Integrations-Privacy]]
