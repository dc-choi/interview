---
tags: [ontology, vocabulary]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["AI와 Palantir 주제 어휘", "Vocabulary AI"]
ontology_concepts:
  - {id: ai, type: Topic, label: AI, aliases: [Artificial Intelligence, 인공지능]}
  - {id: llm, type: Topic, label: LLM, aliases: [Large Language Model, 대규모 언어 모델], broader: ai}
  - {id: machine-learning, type: Topic, label: Machine Learning, aliases: [ml, 머신러닝], broader: ai}
  - {id: mlops, type: Topic, label: MLOps}
  - {id: agent, type: Topic, label: Agent, aliases: [ai-agent, agents, 에이전트]}
  - {id: coding-agent, type: Topic, label: Coding Agent, aliases: [코딩 에이전트], broader: agent}
  - {id: claude-code, type: Topic, label: Claude Code, broader: coding-agent}
  - {id: harness, type: Topic, label: Harness}
  - {id: workflow, type: Topic, label: Workflow, aliases: [워크플로]}
  - {id: skills, type: Topic, label: Skills}
  - {id: mcp, type: Topic, label: MCP, aliases: [Model Context Protocol]}
  - {id: context, type: Topic, label: Context}
  - {id: rag, type: Topic, label: RAG, aliases: [Retrieval-Augmented Generation, 검색 증강 생성]}
  - {id: retrieval, type: Topic, label: Retrieval}
  - {id: embedding, type: Topic, label: Embedding, aliases: [embeddings, 임베딩]}
  - {id: n-gram, type: Topic, label: N-gram}
  - {id: inference, type: Topic, label: Inference}
  - {id: training, type: Topic, label: Training}
  - {id: evaluation, type: Topic, label: Evaluation, aliases: [eval, 평가]}
  - {id: evidence, type: Topic, label: Evidence}
  - {id: gpu, type: Topic, label: GPU}
  - {id: model, type: Topic, label: Model}
  - {id: recommendation-system, type: Topic, label: Recommendation System, aliases: [recommender-systems, 추천 시스템]}
  - {id: ontology, type: Topic, label: Ontology, aliases: [온톨로지]}
  - {id: geospatial, type: Topic, label: Geospatial}
  - {id: palantir, type: Topic, label: Palantir, aliases: [팔란티어]}
  - {id: foundry, type: Topic, label: Palantir Foundry, broader: palantir}
  - {id: aip, type: Topic, label: Palantir AIP, broader: palantir}
  - {id: gotham, type: Topic, label: Palantir Gotham, broader: palantir}
  - {id: osdk, type: Topic, label: OSDK, aliases: [Ontology SDK], broader: palantir}
  - {id: pipeline-builder, type: Topic, label: Pipeline Builder, broader: foundry}
  - {id: workshop, type: Topic, label: Workshop, aliases: [Palantir Workshop]}
  - {id: contour, type: Topic, label: Contour, aliases: [Palantir Contour]}
  - {id: quiver, type: Topic, label: Quiver, aliases: [Palantir Quiver]}
  - {id: notepad, type: Topic, label: Notepad, aliases: [Palantir Notepad]}
  - {id: data-connection, type: Topic, label: Data Connection, aliases: [Palantir Data Connection]}
  - {id: apollo, type: Topic, label: Apollo, aliases: [Palantir Apollo]}
  - {id: transforms, type: Topic, label: Transforms}
  - {id: functions, type: Topic, label: Functions}
  - {id: models, type: Topic, label: Models}
  - {id: connectors, type: Topic, label: Connectors}
  - {id: release-history, type: Topic, label: Release History}
  - {id: map, type: Topic, label: Map}
---

# 주제 어휘: AI와 Palantir

문서 frontmatter의 `tags` 표기를 AI 모델, 에이전트, 검색 증강과 Palantir 제품 주제의 Topic 개념에 잇는 매핑 층이다. 태그를 정규화(NFC, 소문자, 공백과 `_`, `-` 제거)한 키가 개념의 `id`, `label`, `aliases` 중 하나와 같으면 그 개념에 연결되며 문서의 태그는 고치지 않는다. 새 표기는 해당 개념의 `aliases`에, 새 주제는 같은 형식의 한 줄로 추가하고 `broader`는 포함 관계가 분명할 때만 쓴다.

상위: [[Ontology-Vocabulary]]
