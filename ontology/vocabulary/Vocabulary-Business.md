---
tags: [ontology, vocabulary]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["비즈니스와 경제 주제 어휘", "Vocabulary Business"]
ontology_concepts:
  - {id: business, type: Topic, label: Business, aliases: [비즈니스]}
  - {id: product, type: Topic, label: Product}
  - {id: strategy, type: Topic, label: Strategy, aliases: [전략]}
  - {id: market, type: Topic, label: Market, aliases: [시장]}
  - {id: marketing, type: Topic, label: Marketing, aliases: [마케팅]}
  - {id: content, type: Topic, label: Content, aliases: [콘텐츠]}
  - {id: ott, type: Topic, label: OTT}
  - {id: retention, type: Topic, label: Retention}
  - {id: analytics, type: Topic, label: Analytics}
  - {id: measurement, type: Topic, label: Measurement}
  - {id: pricing, type: Topic, label: Pricing, aliases: [가격 책정]}
  - {id: saas, type: Topic, label: SaaS, aliases: [Software as a Service]}
  - {id: outsourcing, type: Topic, label: Outsourcing, aliases: [외주]}
  - {id: commerce, type: Topic, label: Commerce, aliases: [커머스]}
  - {id: ecommerce, type: Topic, label: E-commerce, aliases: [이커머스, 전자상거래], broader: commerce}
  - {id: marketplace, type: Topic, label: Marketplace}
  - {id: payment, type: Topic, label: Payment, aliases: [payments, 결제]}
  - {id: domain, type: Topic, label: Domain}
  - {id: history, type: Topic, label: History}
  - {id: funding, type: Topic, label: Funding, aliases: [자금 조달]}
  - {id: finance, type: Topic, label: Finance}
  - {id: tax, type: Topic, label: Tax, aliases: [세금]}
  - {id: risk, type: Topic, label: Risk, aliases: [risks, 리스크]}
  - {id: regulation, type: Topic, label: Regulation, aliases: [규제]}
  - {id: econ, type: Topic, label: Econ, aliases: [경제]}
  - {id: macro, type: Topic, label: Macro, aliases: [Macroeconomics, 거시경제]}
  - {id: micro, type: Topic, label: Micro, aliases: [Microeconomics, 미시경제]}
  - {id: applied, type: Topic, label: Applied Economics, aliases: [응용경제]}
  - {id: investing, type: Topic, label: Investing, aliases: [투자]}
---

# 주제 어휘: 비즈니스와 경제

문서 frontmatter의 `tags` 표기를 제품, 마케팅, 커머스, 결제, 재무와 경제 주제의 Topic 개념에 잇는 매핑 층이다. 태그를 정규화(NFC, 소문자, 공백과 `_`, `-` 제거)한 키가 개념의 `id`, `label`, `aliases` 중 하나와 같으면 그 개념에 연결되며 문서의 태그는 고치지 않는다. 새 표기는 해당 개념의 `aliases`에, 새 주제는 같은 형식의 한 줄로 추가하고 `broader`는 포함 관계가 분명할 때만 쓴다.

상위: [[Ontology-Vocabulary]]
