---
tags: [ontology, vocabulary]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["웹과 프론트엔드 주제 어휘", "Vocabulary Frontend"]
ontology_concepts:
  - {id: web, type: Topic, label: Web, aliases: [웹]}
  - {id: frontend, type: Topic, label: Frontend, aliases: [프론트엔드]}
  - {id: react, type: Topic, label: React, aliases: [리액트]}
  - {id: nextjs, type: Topic, label: Next.js}
  - {id: app-router, type: Topic, label: App Router, broader: nextjs}
  - {id: pages-router, type: Topic, label: Pages Router, broader: nextjs}
  - {id: react-native, type: Topic, label: React Native, aliases: [RN, 리액트 네이티브]}
  - {id: expo, type: Topic, label: Expo}
  - {id: eas, type: Topic, label: EAS, aliases: [Expo Application Services], broader: expo}
  - {id: expo-sdk, type: Topic, label: Expo SDK, broader: expo}
  - {id: expo-router, type: Topic, label: Expo Router, broader: expo}
  - {id: expo-integrations, type: Topic, label: Expo Integrations, aliases: [integrations], broader: expo}
  - {id: updates, type: Topic, label: Updates}
  - {id: build, type: Topic, label: Build, aliases: [builds]}
  - {id: workflows, type: Topic, label: Workflows}
  - {id: configuration, type: Topic, label: Configuration}
  - {id: development, type: Topic, label: Development}
  - {id: basics, type: Topic, label: Basics}
  - {id: controls, type: Topic, label: Controls}
  - {id: components, type: Topic, label: Components, aliases: [component]}
  - {id: layout, type: Topic, label: Layout}
  - {id: state, type: Topic, label: State}
  - {id: ui, type: Topic, label: UI, aliases: [User Interface]}
  - {id: ux, type: Topic, label: UX, aliases: [User Experience, 사용자 경험]}
  - {id: accessibility, type: Topic, label: Accessibility, aliases: [a11y, 접근성]}
  - {id: rendering, type: Topic, label: Rendering, aliases: [렌더링]}
  - {id: ssr, type: Topic, label: SSR, aliases: [Server-Side Rendering, 서버 사이드 렌더링]}
  - {id: browser, type: Topic, label: Browser, aliases: [브라우저]}
  - {id: dom, type: Topic, label: DOM}
  - {id: routing, type: Topic, label: Routing}
  - {id: mobile, type: Topic, label: Mobile, aliases: [모바일]}
  - {id: android, type: Topic, label: Android}
  - {id: swiftui, type: Topic, label: SwiftUI}
  - {id: native, type: Topic, label: Native}
  - {id: video, type: Topic, label: Video}
  - {id: media, type: Topic, label: Media}
---

# 주제 어휘: 웹과 프론트엔드

문서 frontmatter의 `tags` 표기를 웹, React, Next.js, Expo와 React Native 주제의 Topic 개념에 잇는 매핑 층이다. 태그를 정규화(NFC, 소문자, 공백과 `_`, `-` 제거)한 키가 개념의 `id`, `label`, `aliases` 중 하나와 같으면 그 개념에 연결되며 문서의 태그는 고치지 않는다. 새 표기는 해당 개념의 `aliases`에, 새 주제는 같은 형식의 한 줄로 추가하고 `broader`는 포함 관계가 분명할 때만 쓴다.

상위: [[Ontology-Vocabulary]]
