---
tags: [palantir, foundry, operations]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Q&A의 식별자, 권한과 부작용"]
---

# Q&A의 식별자, 권한과 부작용

## 역할을 넓히기 전에 경계를 확인한다

Historical Q&A는 OAuth application restriction, organization enablement와 실제 object/dataset/project 권한이 각각 필요할 수 있음을 보여 준다. Restricted Developer Console token은 underlying service endpoint를 직접 호출하지 못하는 계약이며 unrestricted 전환은 단순 오류 수정이 아니라 권한 경계 변경이다. Organization enablement의 Unrestricted 옵션은 사용자 authorization-code flow의 project access 의미로 별도다.

AIP Logic 앱 접근이 없더라도 앱이 소비하는 Logic function을 실행할 수 있다는 답변은 application 진입 권한과 실행 권한을 구분한다. Hidden section/group check도 frontend 표시 제어이며 backend authorization을 대신하지 않는다. Webhook execute를 Source Editor와 분리한 custom role 사례도 최소 작업 권한의 구분이다.

## 데이터 식별과 정책

Restricted View-backed object를 Action으로 만들 때 policy column이 비면 모든 사용자에게 보이지 않을 수 있다. Materialized RV 정책은 backing RV에서 수정한다는 사례, MDO column 위치 이동이 property identity를 유지하는 사례를 schema identity와 데이터 공개 범위로 분리해 읽는다.

Apply most recent value conflict 전략에서는 pipeline timestamp가 edit보다 새로우면 null도 edit를 덮을 수 있다. 단순히 non-null이 우선하는 전략이 아니다. Materialization column rename은 downstream schema에 영향을 주지만 OSv2 edit 자체를 삭제한다는 뜻은 아니라는 구분도 있다.

Function에서 새 객체를 구성한 직후 RID가 이미 영속 할당되었다고 가정하지 않는다. Attachment는 RID 문자열 배열만 채우는 것과 parent를 갖춘 Action 생성이 다르다. Interface shared property API name과 concrete local name은 조회 문맥에 따라 다르다.

## 실패, 재시도와 전달

Optional webhook input이 undefined면 webhook을 건너뛰므로 그 synchronous output을 필수로 요구하는 조합은 실패할 수 있다. HTTP/domain 연결 설정과 webhook execute 권한, 업무 성공을 별도로 확인한다.

Automate PDF는 template에 필요한 triggering object를 수신자가 읽지 못하면 렌더링이 실패할 수 있다. Filter에 새로 들어온 기존 객체와 진짜 생성 객체를 구분해야 하며 per-object webhook은 개별 부작용을 만든다. 2024년 function-generated condition 최대1시간과 2026년 expiry automation Marketplace 제한은 답변 시점의 조건으로 보존한다.

Email 누락은 조직 allowlist와 전달 경로의 가설이며 Action 성공만으로 수신을 보장하지 않는다. 실제 권한 변경, webhook과 이메일 전송은 수행하지 않았다.

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
