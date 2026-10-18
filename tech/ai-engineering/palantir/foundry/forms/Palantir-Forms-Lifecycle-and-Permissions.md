---
tags: [palantir, foundry, forms]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Forms sunset, 저장 대상과 권한

Forms는 sunset 단계이고 기존 구현은 지원하지만 신규 기능, 개선과 non-security fix는 기대하지 않는다고 안내한다. deprecation 일정은 확정하지 않았다. 새 입력 workflow는 object type과 Actions/Functions로 설계하는 것이 권장 경로다. mobile responsive 화면은 있으나 공식 mobile 지원은 아니다.

Response destination은 Fusion 또는 permissioned Ontology object type이다. Fusion은 spreadsheet를 즉시 만들고 form 저장 시 새 column을 추가한다. object-backed 응답의 dataset 반영에는 writeback build schedule이 필요하다. destination 변경은 field→새 property mapping과 origin 생성/관리 및 form 수정 권한을 확인한다.

응답자는 기본 Viewer만으로 새 entry를 만들 수 있다. Allow creation of new objects without read or write permissions를 끄면 backing origin 권한도 요구한다. 이 옵션은 기존 entry 수정에 적용되지 않는다. 기존 수정은 form view+origin edit가 필요하지만 오래된 form은 backward compatibility로 origin 권한 없이 편집될 수 있어 실제 배포 설정을 확인한다. published fillable version과 attachment folder upload 권한도 필요하다.

Form definition edit는 기본 compass:edit→fforms:form-definition:edit, publish/manage는 기본 compass:edit→fforms:form-definition:manage로 확장된다. backend에서 manage expansion을 compass:manage로 옮겨 출판을 제한할 수 있다. publish에는 origin manage와 attachment folder compass:manage가 추가로 필요하며 후자는 변경할 수 없다. 새 version은 해당 origin type 생성 및 create-new-version 권한도 요구한다.

Object form 생성/관리의 create-phonograph-form은 기본 fforms-admins/Platform Administrators에, Fusion/no-origin 생성은 기본 모든 사용자에게 주어진다. spreadsheet origin manage는 기본 fusion:edit-document다. form 생성 folder 권한과 backend override도 함께 확인한다. link sharing/직접 user-group 공유에서 Discoverer는 metadata만 보고 응답에는 Viewer 이상이 필요하다.

Subscribe는 제출 notification을 제공하지만 응답 열람 권한을 대신하지 않는다. Fusion results에서 response cell→Forms/Open row로 개별 응답을 수정한다.

동일 본문 canonical alias: [overview](https://www.palantir.com/docs/foundry/forms/overview).

## 출처

- [Palantir, forms](https://www.palantir.com/docs/foundry/forms)
- [Palantir, create-a-form](https://www.palantir.com/docs/foundry/forms/create-a-form)
- [Palantir, notifications](https://www.palantir.com/docs/foundry/forms/notifications)
- [Palantir, permissions](https://www.palantir.com/docs/foundry/forms/permissions)
- [Palantir, review-edit-responses](https://www.palantir.com/docs/foundry/forms/review-edit-responses)
- [Palantir, share-form](https://www.palantir.com/docs/foundry/forms/share-form)

## 관련 문서

- [[Palantir-Forms-Field-and-Schema-Contracts]]
- [[Palantir-Fusion]]
