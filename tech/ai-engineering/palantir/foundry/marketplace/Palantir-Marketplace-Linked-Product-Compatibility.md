---
tags: [palantir, marketplace]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
---

# 연결 제품의 버전과 재패키징

## 연결 생성

Product를 작은 workflow 모듈로 나누면 출력과 다른 제품 입력을 연결해 중복 자원을 줄일 수 있다. 연결은 이름 유사도가 아니라 같은 source entity를 가리키는 관계에 기반한다. Upstream 출력이 downstream input의 원래 entity를 충족해야 한다.

이전 중국어 기계 번역 경로는 동일 store의 downstream packaging 시점에 link를 생성하는 동작을 설명한다. 번역 정확성은 미검증이며 현재 설치 안내는 cross-store external reference도 지원하므로 같은 store 제약을 모든 참조 방식에 확대하지 않는다.

## Version과 전환

열 제거/타입 변경 등 호환성을 깨는 수정은 major version으로 표시한다. Upstream에 새 출력을 넣으면 downstream도 다시 packaging해 새 link를 생성해야 한다. Upstream부터 downstream 순서로 packaging하고 소비자 링크를 재생성한다.

기존 큰 제품을 둘로 나눠 새 제품을 설치하면 기존 설치 자원을 재사용하지 않고 새 자원을 만들어 중복이 생길 수 있다. Product 구조 개선과 이미 배포된 installation의 자원 이동은 별도 전환 계획이 필요하다. Semver range만으로 실제 schema 호환성을 증명하지 않는다.

## 출처

- [Palantir Foundry, linked-products (기계 번역)](https://palantir.com/docs/zh/foundry/marketplace/linked-products/)

## 관련 문서

- [[Palantir-Foundry-Marketplace]]
