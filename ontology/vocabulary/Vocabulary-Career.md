---
tags: [ontology, vocabulary]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["커리어, 성장과 면접 주제 어휘", "Vocabulary Career"]
ontology_concepts:
  - {id: fit, type: Topic, label: Fit}
  - {id: career, type: Topic, label: Career, aliases: [커리어]}
  - {id: career-stages, type: Topic, label: Career Stages, aliases: [커리어 단계], broader: career}
  - {id: growth, type: Topic, label: Growth, aliases: [성장]}
  - {id: learning, type: Topic, label: Learning, aliases: [학습]}
  - {id: habits, type: Topic, label: Habits, aliases: [습관]}
  - {id: mindset, type: Topic, label: Mindset, aliases: [마인드셋]}
  - {id: productivity, type: Topic, label: Productivity, aliases: [생산성]}
  - {id: writing, type: Topic, label: Writing, aliases: [글쓰기]}
  - {id: documentation, type: Topic, label: Documentation, aliases: [문서화]}
  - {id: retrospective, type: Topic, label: Retrospective, aliases: [회고]}
  - {id: community, type: Topic, label: Community, aliases: [커뮤니티]}
  - {id: seminar, type: Topic, label: Seminar, aliases: [세미나]}
  - {id: certification, type: Topic, label: Certification, aliases: [자격증]}
  - {id: hiring, type: Topic, label: Hiring, aliases: [채용]}
  - {id: resume, type: Topic, label: Resume, aliases: [이력서]}
  - {id: interview, type: Topic, label: Interview, aliases: [면접]}
  - {id: common, type: Topic, label: Common}
  - {id: tech, type: Topic, label: Tech}
  - {id: senior, type: Topic, label: Senior}
  - {id: leadership, type: Topic, label: Leadership, aliases: [리더십]}
  - {id: communication, type: Topic, label: Communication, aliases: [커뮤니케이션]}
  - {id: decision-making, type: Topic, label: Decision Making, aliases: [의사결정]}
  - {id: collaboration, type: Topic, label: Collaboration, aliases: [협업]}
  - {id: culture, type: Topic, label: Culture}
  - {id: organization, type: Topic, label: Organization, aliases: [조직]}
  - {id: outcomes, type: Topic, label: Outcomes}
  - {id: code-review, type: Topic, label: Code Review, aliases: [코드 리뷰]}
  - {id: actionpower, type: Topic, label: ActionPower, aliases: [액션파워]}
  - {id: kinolights, type: Topic, label: Kinolights, aliases: [키노라이츠]}
  - {id: spacemap, type: Topic, label: SpaceMap, aliases: [스페이스맵]}
  - {id: tossplace, type: Topic, label: TossPlace, aliases: [토스플레이스]}
  - {id: yunhoe, type: Topic, label: Yunhoe, aliases: [윤회]}
---

# 주제 어휘: 커리어, 성장과 면접

문서 frontmatter의 `tags` 표기를 구직과 면접, 성장, 시니어 역량과 회사 주제의 Topic 개념에 잇는 매핑 층이다. 태그를 정규화(NFC, 소문자, 공백과 `_`, `-` 제거)한 키가 개념의 `id`, `label`, `aliases` 중 하나와 같으면 그 개념에 연결되며 문서의 태그는 고치지 않는다. 새 표기는 해당 개념의 `aliases`에, 새 주제는 같은 형식의 한 줄로 추가하고 `broader`는 포함 관계가 분명할 때만 쓴다.

상위: [[Ontology-Vocabulary]]
