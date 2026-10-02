---
tags: [expo, react-native, development]
status: done
verified_at: 2026-10-01
category: "웹&네트워크(Web&Network)"
aliases: ["Expo Contacts, iOS Container와 Group"]
---

# Expo Contacts, iOS Container와 Group

iOS 주소록은 Contact, Group, Container로 구성된다. Container는 기기 local/iCloud/CardDAV/Exchange 같은 연락처 저장 계정이고 Group은 해당 Container에 속한 연락처 묶음이다. 현재 객체 API의 두 class는 iOS 전용이다.

## Container

`Container.getAll(): Promise<Container[]>`는 모든 저장 계정, `getDefault(): Promise<Container | null>`은 새 연락처의 기본 계정을 반환한다. 각 인스턴스에는 읽기 전용 `id`가 있고 `getName(): Promise<string | null>`, `getType(): Promise<ContainerType | null>`, `getContacts(): Promise<Contact[]>`, `getGroups(): Promise<Group[]>`를 호출한다. ContainerType 값은 cardDAV, exchange, local, unassigned 다. 계정 부재를 null로 처리한다.

## Group

`Group.create(name, containerId?)`는 생략한 계정 ID 대신 기본 계정에 그룹을 만들고 `Promise<Group>`를 반환한다. `Group.getAll(containerId?)`는 특정 계정 또는 모든 계정의 그룹을 조회한다. 읽기 전용 id, `getName(): Promise<string | null>`, `setName(name): Promise<void>`로 이름을 다룬다.

`group.getContacts(ContactQueryOptions?)`는 Contact 객체 목록이다. `addContact(contact)`/`removeContact(contact)`는 그룹 구성원을 변경하며 연락처 객체를 받는다. `delete()`는 그룹을 삭제한다. 원문은 보통 그룹 정의만 지우고 주소록의 연락처는 남는다고 설명하므로 그룹 삭제를 연락처 삭제로 간주하지 않는다.

```ts
import { Container, Group, ContactsSortOrder } from 'expo-contacts';

export async function membersOfFirstGroup() {
  const container = await Container.getDefault();
  if (!container) return [];
  const groups = await container.getGroups();
  if (!groups.length) return [];
  return await groups[0].getContacts({
    sortOrder: ContactsSortOrder.GivenName, limit: 50,
  });
}
```

권한 요청은 조회 전 [[Expo-SDK-A-Contacts]]의 흐름으로 처리한다. 일부 deprecated 안내가 `container.addGroup()`을 대체 API로 지목하지만 current Container method 목록에 해당 함수가 없다. 이 문서는 실제 기재된 `Group.create(name, containerId)`를 사용한다. legacy 그룹/계정 함수의 넓은 platform 표시를 current class 지원 범위로 확장하지 않는다.

## 출처

- [Expo Documentation, Contacts](https://docs.expo.dev/versions/latest/sdk/contacts/)

## 관련 문서

- [[Expo-SDK-A|Expo SDK A reference]]
