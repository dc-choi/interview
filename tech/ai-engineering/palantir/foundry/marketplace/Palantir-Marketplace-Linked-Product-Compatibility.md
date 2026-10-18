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

## 화면에서 확인한 상태 구분

예전 marketplace 경로의 이미지 7개는 현재 404다. 이 중 4개는 같은 파일이 현재 foundry-devops/linked-products 문서에서 제공되고, 설치 draft, draft 목록과 설치 job 화면 3개는 Wayback의 2026-04-10 보관본으로만 확인했다(2026-10-18 이미지 확인). 설치 job 화면의 생성일은 2024-06-04이므로 보관 화면 3개는 현재 화면이 아니라 상태를 구분하는 예시로만 쓴다.

- DevOps의 연결 제품 설정은 Enable this linked product(설치 때 input 충족 선택지로 표시)와 Promote this linked product(권장 선택으로 표시)를 따로 둔다. 노출과 권장은 다른 설정이다. [연결 제품 설정 화면](https://www.palantir.com/docs/resources/foundry/foundry-devops/linked-products-packaging-preview.png)
- 보관된 설치 화면은 연결 제품마다 `16 out of 16 inputs`, `1 out of 16 inputs`처럼 충족 범위를 다르게 표시한다. 연결 제품을 고른 뒤에도 Inputs는 15/16이고 Multipass groups는 0/1로 남는다. 현재 설치 안내도 Inputs 화면에서 충족 상태를 확인하고 Multipass group input을 mapping하도록 한다. 연결 제품이 모든 input을 채운다고 가정하지 않고 남은 input을 따로 mapping한다. [입력 충족 화면 보관본](https://web.archive.org/web/20260410013440/https://www.palantir.com/docs/resources/foundry/marketplace/linked-products-install-draft.png)
- 보관된 Drafts 목록의 Validations `Passed`는 Install을 누르기 전 상태다. 제출한 installation job은 Preparing과 Installing resources 단계를 거치며 In progress로 표시된다. 현재 설치 안내도 Install이 draft를 제출해 job을 시작한다고 설명한다. 검증 통과를 설치 완료로 기록하지 않는다. [Draft 목록 보관본](https://web.archive.org/web/20260410013443/https://www.palantir.com/docs/resources/foundry/marketplace/linked-products-draft-group.png), [설치 job 화면 보관본](https://web.archive.org/web/20260410013441/https://www.palantir.com/docs/resources/foundry/marketplace/linked-products-job.png)

## 출처

- [Palantir Foundry, linked-products](https://www.palantir.com/docs/foundry/foundry-devops/linked-products)
- [Palantir Foundry, install-product](https://www.palantir.com/docs/foundry/marketplace/install-product/)
- [Palantir Foundry, linked-products (기계 번역)](https://palantir.com/docs/zh/foundry/marketplace/linked-products/)

## 관련 문서

- [[Palantir-Foundry-Marketplace]]
