---
tags: [web, frontend, react, state, state-management, server-state]
status: index
category: "웹&네트워크(Web&Network)"
aliases: ["React State", "React state와 동기화"]
---

# React state와 동기화

React state 문서는 값을 어디에 두는지, 어떻게 갱신하는지, 브라우저 저장소와 서버 같은 외부 시스템과 어떻게 맞추는지를 다룬다. render와 event로 시작하는 지역 state부터 localStorage 영속화, 공유 client state, server state cache까지 소유 범위가 넓어지는 순서로 정리한다.

- [[React-State-Effects-and-Events|React state, Effect와 event]]: render, state, Effect, event와 form
- [[React-Local-State-and-Persistence|React 지역 state와 localStorage 영속화]]: 지역 state 설계와 localStorage 영속화
- [[React-State-Management|React 공유 state 관리]]: 공유 client state, Context, Redux와 Recoil 판단
- [[React-Server-State-and-API|React server state와 API]]: HTTP client, query와 mutation 분리, SWR cache와 Suspense 경계

## 함께 볼 문서

- [[React|리액트]]
