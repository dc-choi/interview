---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Preparation 변환 의미와 이관 경계"]
---

# Preparation 변환 의미와 이관 경계

## 수명과 output

Preparation은 Contour backend의 interactive cleaning/preparation 도구다. 공식 문서는2027-05-04 deprecation 예정, 현재 full support와 Pipeline Builder 이관 권장을 명시한다. 현재 제거된 것으로 쓰지 않는다. Preparation/change/changelog를 구분하며 updating output은 underlying input/logic 변경에 따라 rebuild되고 one-off dataset은 별도 선택이다.

Contour에서 Analyze해도 preparation 변경이 자동으로 기존 분석에 확정되는 것은 아니다. Update data로 반영하며 output save는 build 시작과 완료를 구분한다. Output dataset branch, 다른 branch에 save, saved version restore는 각각 다른 상태 변경이다.

## Cleaning의 의미 보존

Whitespace trim, empty string→null, case normalization, numeric parsing을 별도 단계로 남긴다. N/A/Other/Unknown을 null로 바꾸는 것은 업무상 의미 결정이며 보편적인 진실이 아니다. New value /NULL 적용 전에 값을 선택하지 않으면 전체 column이 null이 된다는 경고가 있다. Null row/column 제거도 모집단을 바꾸는 결정이다.

Tutorial은 좌표(0,0)를 invalid라고 부르지만 이는 지구상 유효한 좌표다. 해당 meteorite sample의 결측 placeholder 처리로만 이해해야 하며 일반 GIS validation rule로 옮기지 않는다. ZIP을5자리 substring으로 자르는 예시도 미국 도메인/정밀도 손실을 전제로 한다.

monotonically_increasing_id는 연속적이거나 결정적인 row ID가 아니며 rebuild마다 달라질 수 있다. 이를 기반으로 한 row_number는 작은 dataset용이고 큰 데이터에 비싸다. Stable identity/order가 필요하면 원천 key와 명시적 ordering을 별도로 정의한다. Changelog 중간에 step을 삽입하면 후속 step의 schema/값 가정을 다시 검토한다.

## 입력 교체와 project scope

Preparation 복사 후 starting dataset을 바꿀 수 있지만 column명/type/값 차이로 기존 change가 실패할 수 있다. 성공한 소규모 preview가 전체 source 호환성을 보장하지 않는다. Project-scoped preparation의 input은 같은 project 또는 명시적 reference여야 하며 output은 preparation과 같은 project에 있어야 한다.

Reference import에는 source의 compass:import-resource-from과 destination의 compass:import-resource-to가 필요하며 기본 Viewer/Editor role의 확장일 뿐 custom role에 따라 다르다. Cleaned output을 저장하지 않는 단순 분석에는 reference가 필요 없다는 설명을 persistent data 이동의 허가로 일반화하지 않는다. 실제 이관, upload/build와 데이터 정정은 수행하지 않았다.

## 출처

- [Palantir preparation, preparation](https://www.palantir.com/docs/foundry/preparation)
- [Palantir preparation, advanced-examples](https://www.palantir.com/docs/foundry/preparation/advanced-examples)
- [Palantir preparation, basic-examples](https://www.palantir.com/docs/foundry/preparation/basic-examples)
- [Palantir preparation, faq](https://www.palantir.com/docs/foundry/preparation/faq)
- [Palantir preparation, getting-started](https://www.palantir.com/docs/foundry/preparation/getting-started)
- [Palantir preparation, overview](https://www.palantir.com/docs/foundry/preparation/overview)
- [Palantir preparation, preparation-tutorial](https://www.palantir.com/docs/foundry/preparation/preparation-tutorial)
- [Palantir preparation, project-references](https://www.palantir.com/docs/foundry/preparation/project-references)

## 관련 문서

- [[Palantir-Project-Data-Management]]
