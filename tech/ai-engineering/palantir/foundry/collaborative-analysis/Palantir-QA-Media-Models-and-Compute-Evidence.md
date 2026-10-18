---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Q&A의 media, 모델과 compute 근거"]
---

# Q&A의 media, 모델과 compute 근거

## Media reference와 원본

Media item fast copy는 같은 blob 참조를 재사용하는 경로와 다운로드/재업로드의 차이다. MediaSet item reference와 일반 dataset file reference는 같지 않으며, Q&A의 2026년7월 답변도 PDF/media Pipeline Builder 표현식이 후자를 그대로 소비하지 못함을 명시한다. Native media sync가 없으면 dataset 파일→MediaSetOutput 경로가 필요하다.

Media reference가 dataset column에 있다는 사실만으로 build token에 원본 media 접근이 부여되지는 않는다. MediaSet input을 import해야 한다. Object media property, capability 설정과 Action write도 별도다.

2024년 답변의 transaction당10,000 item, transactionless의 snapshot/실패 제어 부재, 기본 branch 패키징 제한은 해당 시점 사례다. 현재 media API와 정책을 다시 확인한다. Stop propagation/requiring은 보안 marking 경계 변경이지 copy 비용 최적화 옵션이 아니다.

## 모델 장애의 원인 후보

복구된 중국어 modeling Q&A는 검증되지 않은 기계번역이며 2024년 상태다. Tesseract 언어 pack/실행 환경, model adapter port와 NumPy scalar serialization, resource path/RID 충돌, inference input의 project import를 확인할 진단 후보를 제공한다. 임의 library 제거/실패 build/재설치 절차를 일반 해결책으로 강제하지 않는다.

업그레이드 도중 구/신 replica가 함께 응답할 수 있다는 설명은 rollout 중 schema 호환성과 버전 관측의 필요성을 보여 준다. Exit137이 OOM일 수 있다는 답변은 확정 원인이 아니므로 resource/log 근거가 필요하다. SSE token output과 양방향 realtime audio는 프로토콜이 다른 계약이다. 과거 GPU/라이선스/비용/언어 지원을 현재 보장으로 사용하지 않는다.

## 절약 추정과 실제 영향

2024년 Linter 답변은 sweep 범위, rule category와 cost recommendation의 false positive를 보여 준다. External transform을 모르는 추천, 삭제된 schedule 추천이 남는 사례는 unused 추천이 실제 미사용 증거가 아님을 뜻한다. 월간 batch savings는 schedule별 구분 없는 합계일 수 있고 중복 actioning은 double-count를 만들 수 있다.

Estimated/verified savings를 보는 enrollment role과 underlying resource view는 별도다. Lightweight CPU/memory와 dynamic allocation 최대 수는 실제 job 병렬성과 메모리 사용을 보고 조절해야 한다. 자동 추천의 성공 표시를 비용 실측이나 pipeline correctness의 입증으로 삼지 않는다. 실제 media 업로드, model 배포와 compute 측정은 수행하지 않았다.

## 출처

- [Palantir questions-answers, questions-answers](https://www.palantir.com/docs/foundry/questions-answers)
- [Palantir questions-answers, automate](https://www.palantir.com/docs/foundry/questions-answers/automate)
- [Palantir questions-answers, builds](https://www.palantir.com/docs/foundry/questions-answers/builds)
- [Palantir questions-answers, carbon-community](https://www.palantir.com/docs/foundry/questions-answers/carbon-community)
- [Palantir questions-answers, code-repositories](https://www.palantir.com/docs/foundry/questions-answers/code-repositories)
- [Palantir questions-answers, code-repositories-community](https://www.palantir.com/docs/foundry/questions-answers/code-repositories-community)
- [Palantir questions-answers, code-workspaces](https://www.palantir.com/docs/foundry/questions-answers/code-workspaces)
- [Palantir questions-answers, code-workspaces-community](https://www.palantir.com/docs/foundry/questions-answers/code-workspaces-community)
- [Palantir questions-answers, contour](https://www.palantir.com/docs/foundry/questions-answers/contour)
- [Palantir questions-answers, contour-community](https://www.palantir.com/docs/foundry/questions-answers/contour-community)
- [Palantir questions-answers, data-connection](https://www.palantir.com/docs/foundry/questions-answers/data-connection)
- [Palantir questions-answers, foundry-metadata-community](https://www.palantir.com/docs/foundry/questions-answers/foundry-metadata-community)
- [Palantir questions-answers, functions](https://www.palantir.com/docs/foundry/questions-answers/functions)
- [Palantir questions-answers, functions-community](https://www.palantir.com/docs/foundry/questions-answers/functions-community)
- [Palantir questions-answers, linter](https://www.palantir.com/docs/foundry/questions-answers/linter)
- [Palantir questions-answers, media-sets](https://www.palantir.com/docs/foundry/questions-answers/media-sets)
- [Palantir questions-answers, media-sets-community](https://www.palantir.com/docs/foundry/questions-answers/media-sets-community)
- [Palantir questions-answers, modeling](https://palantir.com/docs/zh/foundry/questions-answers/modeling/)
- [Palantir questions-answers, notepad](https://www.palantir.com/docs/foundry/questions-answers/notepad)
- [Palantir questions-answers, notifications-community](https://www.palantir.com/docs/foundry/questions-answers/notifications-community)
- [Palantir questions-answers, object-views-community](https://www.palantir.com/docs/foundry/questions-answers/object-views-community)
- [Palantir questions-answers, ontology](https://www.palantir.com/docs/foundry/questions-answers/ontology)
- [Palantir questions-answers, ontology-sdk](https://www.palantir.com/docs/foundry/questions-answers/ontology-sdk)
- [Palantir questions-answers, pipeline-builder](https://www.palantir.com/docs/foundry/questions-answers/pipeline-builder)
- [Palantir questions-answers, pipeline-builder-community](https://www.palantir.com/docs/foundry/questions-answers/pipeline-builder-community)
- [Palantir questions-answers, projects-community](https://www.palantir.com/docs/foundry/questions-answers/projects-community)
- [Palantir questions-answers, quiver](https://www.palantir.com/docs/foundry/questions-answers/quiver)
- [Palantir questions-answers, quiver-community](https://www.palantir.com/docs/foundry/questions-answers/quiver-community)
- [Palantir questions-answers, slate](https://www.palantir.com/docs/foundry/questions-answers/slate)
- [Palantir questions-answers, streaming](https://www.palantir.com/docs/foundry/questions-answers/streaming)
- [Palantir questions-answers, vertex](https://www.palantir.com/docs/foundry/questions-answers/vertex)
- [Palantir questions-answers, webhooks](https://www.palantir.com/docs/foundry/questions-answers/webhooks)
- [Palantir questions-answers, workshop](https://www.palantir.com/docs/foundry/questions-answers/workshop)
- [Palantir questions-answers, workshop-community](https://www.palantir.com/docs/foundry/questions-answers/workshop-community)

## 관련 문서

- [[Palantir-Collaborative-Analysis]]
