---
tags: [palantir, foundry, product-delivery]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# Product packaging 권한과 안전한 store 전송

실제 operation과 enrollment의 role set을 확인한다. 보통 store view/read-local-marketplace와 install-from-local-marketplace, input resource use-resource-as-input은 Viewer, install-in은 target Space/Ontology/Project/Folder Editor다. store 생성 create-local-marketplace, product create-block/edit-block-set/upload-attachment는 보통 Editor다. 설치자는 store의 Organization marking 하나 이상에도 접근해야 한다. remote store 권한은 Control Panel에서 관리하며 DevOps로 edit/import/export하지 못한다.

**Include with static data** dataset packaging은 underlying files를 읽으므로 foundry-data-proxy:get-files(Download)가 필요하다. download-restricted enrollment는 Owner에서도 이를 빼고 Exporter 같은 별도 role에 줄 수 있다. ownership이 raw export 권한을 보장하지 않는다. definition only 또는 transform/pipeline/sync/RV로 생성하는 옵션은 static file download를 요구하지 않는다.

Local product export는 export-block-set, import는 import-blockset-with-provenance로 보통 Owner에 부여된다. export 파일은 **암호화되지 않았고** dataset/media/model 및 metadata를 담을 수 있다. code signature는 변조 시 import를 막는 무결성 장치이며 기밀성을 제공하지 않는다. 전송용의 단기 artifact이고 format breaking change가 허용되므로 영구 backup으로 취급하지 않는다. exporter/importer가 양쪽에서 data 이동 허용 범위를 확인한다.

## Marking과 승인

Resource→Store 이동이 Organization 접근을 늘리면 Expand access, marking을 빼면 Remove가 필요하다. A resource를 A+B store로 포장하면 A의 Expand, A+B resource를 A store에 포장하면 B의 Remove가 필요한 예시다. 설치에서도 store/target Space의 Organization 범위를 대조한다. installer가 기존 store marking만 적용하거나 store 자체 접근을 넓히는 선택은 노출 대상을 바꾸므로 함께 판단한다.

새 product version에 approval을 요구할 수 있다. approver는 draft author와 달라야 하며 store의 finalize-block-set operation이 필요하고 기본 Owner/Editor에 주어진다. custom role set으로 승인자를 제한한다. role 명칭만으로 download, expand/remove, publish approval이 모두 충족됐다고 가정하지 않는다.

## 출처

- [Palantir, export-import-products](https://www.palantir.com/docs/foundry/foundry-devops/export-import-products)
- [Palantir, manage-store-permissions](https://www.palantir.com/docs/foundry/foundry-devops/manage-store-permissions)

## 관련 문서

- [[Palantir-DevOps-Product-Packaging]]
