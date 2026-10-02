---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Contacts, 부분 수정과 필드 데이터"]
---

# Expo Contacts, 부분 수정과 필드 데이터

## patch와 update의 차이

`contact.patch(ContactPatch)`는 생략하거나 undefined 인 필드를 보존한다. 명시적 null은 값을 지운다. 배열을 전달하면 해당 목록 전체를 조정한다. 기존 id가 있으면 수정하고 새 항목은 추가하며 전달하지 않은 기존 항목은 삭제한다. `contact.update(CreateContactRecord)`는 전체 연락처를 덮어써서 생략한 필드까지 제거한다. 한 값만 바꾸는 경우 patch 또는 개별 setter를 사용한다.

```ts
import { Contact } from 'expo-contacts';

export async function appendPhone(id: string, number: string) {
  const contact = new Contact(id);
  const phones = await contact.getPhones();
  await contact.patch({ phones: [...phones, { label: 'work', number }] });
}
// 더 좁은 변경은 await contact.addPhone({ label: 'work', number })로 가능하다.
```

## 단일 값

이름 given/family/middle, prefix/suffix, phonetic given/family/middle/company, company/department/jobTitle/note는 `getX(): Promise<string | null>`, `setX(string | null): Promise<boolean>` 형태다. setter의 boolean은 갱신 결과다. `getFullName()`은 OS가 조합한 이름으로 읽기 전용이다. image는 로컬 URI 또는 null을 사용하고 원격 URL은 먼저 내려받는다. thumbnail은 image에서 파생된 읽기 전용 값이다.

iOS는 `getBirthday`/`setBirthday`, `getNonGregorianBirthday`/`setNonGregorianBirthday`, `getMaidenName`/`setMaidenName`, `getNickname`/`setNickname`을 지원한다. Android의 생일은 dates 목록의 birthday label, 별명/결혼 전 이름은 extraNames 목록으로 다룬다. Android만 `getIsFavourite`/`setIsFavourite(boolean)`가 있다.

`ContactDate`는 숫자 `day: 1–31`, `month: 1–12`, 선택적 year 다. 연도 없는 생일을 표현할 수 있다. legacy Date의 0부터 시작하는 month와 혼동하지 않는다. iOS NonGregorianBirthday는 calendar와 같은 날짜 필드를 갖는다. calendar는 buddhist/chinese/coptic/ethiopicAmeteAlem/ethiopicAmeteMihret/hebrew/indian/islamic/islamicCivil/japanese/persian/republicOfChina 다.

iOS note 접근에는 일반 연락처 허가 외에 Apple의 별도 contact notes entitlement 승인이 필요하다. 승인 후 `ios.accessesContactNotes: true`와 자체 development build를 사용한다. Expo Go에 는 이 entitlement가 없다.

## 목록 단위 API

| 목록 | 공통 또는 플랫폼별 메서드 |
| --- | --- |
| 주소 | `addAddress`, `getAddresses`, `updateAddress`, `deleteAddress` |
| 날짜 | `addDate`, `getDates`, `updateDate`, `deleteDate` |
| 이메일 | `addEmail`, `getEmails`, `updateEmail`, `deleteEmail` |
| 전화 | `addPhone`, `getPhones`, `updatePhone`, `deletePhone` |
| 관계 | `addRelation`, `getRelations`, `updateRelation`, `deleteRelation` |
| URL | `addUrlAddress`, `getUrlAddresses`, `updateUrlAddress`, `deleteUrlAddress` |
| Android 추가 이름 | `addExtraName`, `getExtraNames`, `updateExtraName`, `deleteExtraName` |
| iOS IM 주소 | `addImAddress`, `getImAddresses`, `updateImAddress`, `deleteImAddress` |
| iOS social profile | `addSocialProfile`, `getSocialProfiles`, `updateSocialProfile`, `deleteSocialProfile` |

add는 생성된 항목 ID를 `Promise<string>`으로 반환한다. get은 Existing 항목 배열, update/delete는 `Promise<void>`다. update에 는 get에서 받은 유효한 ID가 필요하다. delete는 해당 Existing 객체를 받으며 ExtraName/Relation은 ID 문자열도 받을 수 있다. 연락처 자체의 `delete()`는 주소록에서 연락처를 삭제한다.

New 항목은 label을 생략하면 보통 other가 된다. Existing 타입은 New 타입에 읽어온 `id: string`이 추가된다. iOS ID는 CNLabeledValue identifier, Android는 각 CommonDataKinds 테이블 ID 다. 다른 연락처의 항목 ID를 재사용하지 않는다.

| New 타입 | 주요 데이터 필드 |
| --- | --- |
| Address | street, city, country, postcode, region, state, label |
| Date | `date: ContactDate`, label |
| Email | `address`, label. legacy의 email과 다르다 |
| Phone | number, label. E.164 권장이나 DB가 형식을 강제하지 않는다 |
| Relation / ExtraName | name, label |
| ImAddress | service, username, label |
| SocialProfile | service, username, userId, url, label |
| UrlAddress | url, label |

필드별 platform 표를 따른다. generated type의 SocialProfile 공통 표만 보고 Android 객체 메서드가 있다고 추정하지 않는다.

## 출처

- [Expo Documentation, Contacts](https://docs.expo.dev/versions/latest/sdk/contacts/)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
