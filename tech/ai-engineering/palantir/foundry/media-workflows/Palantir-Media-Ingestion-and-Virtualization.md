---
tags: [palantir, foundry, media-sets-advanced-formats]
status: done
category: "AI엔지니어링(AIEngineering)"
verified_at: 2026-10-16
---

# Media 적재와 virtual source의 경계

Direct upload, Data Connection, transforms, Action과 OSDK로 media를 넣을 수 있다. Path가 같으면 경고 없이 overwrite하므로 고유 path 정책이 필요하다. 기존 item은 version history와 direct reference로 남으며 deduplicate_by_path=False로 조회할 수 있다. Overwrite를 영구 삭제나 이전 item의 build 제외로 생각하면 안 된다.

Data Connection sync를 만든 뒤 build를 실행해야 media가 나타난다. REST source는 external transform으로 연결할 수 있다. Direct upload는 set에 허용한 형식과 일치해야 한다.

## Virtual media set

Virtual media는 원본 파일을 Foundry backing store로 복사하지 않고 source에서 읽는다. 원문 지원표는 S3 access key/secret만 허용하고 STS role을 제외하며 OneLake/ABFS를 추가한다. Agent connection으로 virtual sync를 만들 수 없다. 일반 S3 connector의 인증 지원을 그대로 적용하지 않는다.

Source update/delete를 자동 인식하지 않는다. Source에서 삭제한 item의 등록은 남지만 읽을 수 없을 수 있다. 변환 결과는 Foundry에 저장되어 저장 비용이 발생하며 additional input format은 사용할 수 없다.

Python transform 등록은 source subfolder에 상대적인 physical path와 media item path를 매핑한다. 병렬도와 필터링을 제어할 수 있지만 source의 변경 추적을 자동 해결하지 않는다. 예제 decorator의 mediaSetOutput과 함수 인자 output 이름이 다르므로 실제 template의 input/output binding을 맞춘 뒤 사용한다.

## 출처

- [Palantir, importing-media](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/importing-media)
- [Palantir, virtual-media-sets](https://www.palantir.com/docs/foundry/media-sets-advanced-formats/virtual-media-sets)

## 관련 문서

- [[Palantir-Media-Workflows]]
- [[Palantir-Document-Intelligence]]
