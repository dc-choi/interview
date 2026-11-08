---
tags: [palantir, foundry, product-delivery]
status: done
verified_at: 2026-11-08
category: "AI엔지니어링(AIEngineering)"
---

# DevOps product의 입출력과 packaging 경계

Product는 설치 가능한 resource 모음이며 Store에 version을 publish한다. Installation은 installer가 inputs를 채워 outputs를 재생성한 결과다. 같은 product를 여러 user group이나 environment에 각각 설치할 수 있다. downstream resource를 먼저 선택하면 DevOps가 dependencies를 inputs로 찾는다. installer가 제공할 resource는 input으로, product가 생성할 것은 output으로 둔다. parameter/group처럼 설치 시 설정이 필요한 input은 output으로 옮기지 못한다. 승격으로 새로 드러난 dependency까지 반복해 input이 하나도 남지 않으면 installer는 설치 때 mapping할 것이 없다. 이동할 수 없는 parameter/group input이 있으면 그 설정은 남는다.

Output은 Compass 파일 선택 외에 Ontology resource 전용 선택, 폴더의 모든 파일 일괄 추가, Data Lineage와 Workflow Lineage 그래프에서의 추가로 넣을 수 있다. 일괄 추가는 한 번의 선택이며 이후 source 변경을 따라가려면 folder tracking을 쓴다. 공개 Marketplace API로 설치할 product는 publish 전에 input API name을 설정해야 호출자가 설치 값을 input에 지정할 수 있다. Documentation 탭의 설명, thumbnail, 이미지와 Markdown 상세 설명은 storefront에서 product를 고르는 사용자에게 보인다. Publish는 변경을 검토하고 changelog를 남기는 단계이며 product 크기에 따라 몇 분이 걸릴 수 있다.

Store는 project/folder 권한을 상속한다. Production은 fleet 관리/자동 upgrade에 적합하지만 auto upgrade 기본값은 off다. Singleton은 같은 Space/Ontology에 하나의 installation만 허용하는 Production 설정이다. Bootstrap은 설치 후 custom 작업의 시작점이며 auto upgrade 기본 off다. Build settings는 installation job에서 dataset/model hydration 여부를 정한다.

## 규모와 자동 추적

Product의 input+output 합계는 nested column/property까지 세어 최대 15,000개다. resource 개수만 세지 않는다. 75%부터 warning, 100%에서는 output을 줄이거나 재구성하기 전까지 진행을 막는 오류가 된다. column 추가만으로 다음 version이 한도를 넘을 수 있어 warning 단계에서 여러 product로 나눠 함께 packaging하는 방안을 검토한다. unsupported output은 제거해야 하며 Data Connection sources, Code Workbook workbooks, Fusion sheets는 비지원 예시에 포함된다. 개별 resource의 packaging 지원 범위도 별도 확인한다.

Folder tracking은 source project/folder를 새 version 생성 또는 Refresh all 때 재탐색한다. ignore folder의 descendants도 제외한다. default configuration/latest version을 추적하지만 manual override는 다음 version에도 유지되는 manual output이 된다. stale override는 기본값과 같거나 folder discovery와 겹친 설정을 정리한다. Strict mode는 manual output을 막고 source 밖 resource에 validation error를 낸다. manual↔tracking migration은 preview를 확인하며 filesystem 밖 Ontology entity의 project-based permissions 여부에 따라 계속 manual로 남을 수 있다.

Input preset은 allowed values, default는 초기 자동 mapping이다. Source preset은 source dependency 변경을 추적하고 Override는 수동 목록이다. mandatory preset은 custom값을 막는다. installer의 Track default는 product upgrade 때 default 변경을 따른다. API-name locator는 target Ontology에서 해석되며 dataset RID 등은 환경 간 존재를 보장하지 않는다. matching resource가 없고 custom도 금지면 설치할 수 없다.

Folder structure는 lowest common ancestor까지 포장하고 installation project로 대체한다. resource list가 package된다고 데이터 값/secret/외부 연결까지 모두 복사되는 것으로 해석하지 않는다.

동일 본문 canonical alias: [overview](https://www.palantir.com/docs/foundry/foundry-devops/overview).

동일 본문 canonical alias: [overview](https://www.palantir.com/docs/foundry/devops/overview).

## 출처

- [Palantir, foundry-devops](https://www.palantir.com/docs/foundry/foundry-devops)
- [Palantir, create-products](https://www.palantir.com/docs/foundry/foundry-devops/create-products)
- [Palantir, folder-tracking](https://www.palantir.com/docs/foundry/foundry-devops/folder-tracking)
- [Palantir, input-presets](https://www.palantir.com/docs/foundry/foundry-devops/input-presets)
- [Palantir, supported-resources](https://www.palantir.com/docs/foundry/foundry-devops/supported-resources)
- [Palantir, devops](https://www.palantir.com/docs/foundry/devops)
- [Palantir, core-concepts](https://www.palantir.com/docs/foundry/devops/core-concepts)

## 관련 문서

- [[Palantir-DevOps-Permissions-and-Transport]]
- [[Palantir-DevOps-Linked-Products]]
