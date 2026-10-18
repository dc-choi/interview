---
tags: [palantir, foundry, ontology, osdk]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# React 사용자 cache와 polymorphic/media hook

useAdmin은 current user, user batch와 profile picture 읽기 전용이다. create/update/delete 사용자 관리는 구현하지 않는다. empty user-ID 배열은 요청 없이 빈 object를 반환한다.

## 사용자 cache

currentUser key와 user-<id> cache를 사용하고 없는 사용자만 getBatch로 가져와 mutate(...,revalidate:false)로 채운다. current-user SWR error와 별도로 호출한 batch 실패의 세부 복구는 소비자가 다뤄야 한다. 명시적인 사용자-data invalidation/cancel이 없어 재사용 시 stale response/cache scope를 확인한다.

picture fetch는 Response.blob→URL.createObjectURL이다. user record 자체에는 사진이 없다. URL은 browser resource를 붙잡으므로 소비자가 사용 종료 시 revoke해야 한다. useTasks usage 예제의 picture hook은 별도 revoke cleanup을 보여 주지만 useAdmin hook 자체가 자동 회수하는 것은 아니다.

## useCodingTask

parent task의 interface instance에 `$as(osdkCodingTask)`를 사용한다. useTasks가 concrete base properties를 포함해서 미리 읽었다는 조건이 있다. createdBy/assignedTo를 parent에서 재사용하고 metadata는 별도 fetch/effect로 가져온다.

SWR key는 task primary key이며 focus/reconnect revalidation을 끈다. 잘못된 concrete type pivot과 missing parent user를 별도로 처리하지 않아 runtime failure/undefined가 가능하다. no mutation support이며 설명의 자동 retry를 일반 보장으로 읽지 않고 실제 SWR/runtime 설정을 확인한다.

## useLearningTask

같은 primary key로 concrete learning task를 fetchOneWithErrors한 뒤 Result.error를 확인한다. user batch, media와 metadata의 여러 요청이 의존하므로 task fetch 성공만으로 전체 UI가 완성되지 않는다.

mediaReference가 없으면 contentUrl을 LINK 또는 NONE으로, 있으면 contents Blob과 metadata MIME을 읽어 URL/type을 만든다. MIME matcher는 PDF/jpeg/png/gif/mp4/html 범위이고 모르는 형식은 NONE이다. 모든 browser/media format 지원을 뜻하지 않는다.

큰 media를 전량 Blob으로 읽으면 memory 비용이 커진다. hook 자체는 URL cleanup, 별도 media cache, 요청 cancel과 세부 media retry를 구현하지 않는다. Result를 Error(message)로 바꾸면 원래 structured error의 일부 정보도 잃을 수 있다.

## 컴포넌트 경계

metadata는 task data와 별도 loading이므로 fallback display를 둔다. createdBy/assignedTo가 타입상 User여도 실제 lookup은 undefined일 수 있다. coding/learning hook의 primary-key-only SWR key를 다른 type/ontology로 확장할 때 충돌이 없는지 확인한다.

위 한계는 공개 sample의 동작과 적용 조건이다. 예제를 실행해 browser memory, 실제 user permission이나 network retry를 검증한 결과는 아니다.

## 출처

- [Palantir, useadmin-hook](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/useadmin-hook)
- [Palantir, useadmin-tsx](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/useadmin-tsx)
- [Palantir, usecodingtask-hook](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/usecodingtask-hook)
- [Palantir, usecodingtask-tsx](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/usecodingtask-tsx)
- [Palantir, uselearningtask-hook](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/uselearningtask-hook)
- [Palantir, uselearningtask-tsx](https://www.palantir.com/docs/foundry/ontology-sdk-react-applications/uselearningtask-tsx)

## 관련 문서

- [[Palantir-OSDK-React]]
- [[Palantir-OSDK-React-Task-Cache]]
- [[Palantir-OSDK-Actions]]
