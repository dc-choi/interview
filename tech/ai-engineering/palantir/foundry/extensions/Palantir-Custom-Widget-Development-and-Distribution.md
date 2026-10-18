---
tags: [palantir, custom-widgets, deployment, marketplace]
status: done
verified_at: 2026-10-16
category: "AI엔지니어링(AIEngineering)"
aliases: ["Custom Widget 개발과 배포"]
---

# Custom Widget 개발과 배포

Widget set은 Foundry Code Repository의 tag CI/CD, 외부 repository의 OSDK CLI 또는 production ZIP upload로 발행한다. 하나의 set에 최대 50개 widget을 담을 수 있으며 entry point별 config/HTML을 build input에 포함한다. 공유 코드는 유지하면서 독립 widget을 같은 manifest로 배포할 수 있다.

## Dev mode는 개인의 임시 asset override다

Local은 user-generated token으로 npm run dev를 시작하고 현재 terminal의 setup link를 연다. VS Code Workspaces는 managed auth로 npm run dev:remote를 사용한다. 같은 remote dev server가 workspace/playground/Workshop override를 제공하므로 별도 server를 중복 실행할 필요는 없다.

Dev mode는 개인 계정에만 적용하고 24시간 뒤 만료된다. Disabled/Paused는 published version, Enabled는 dev version, Enabled inactive는 해당 widget override가 없어 published version을 보여준다. 다른 widget set을 열었다면 inactive는 정상일 수 있다. 표시된 localhost/workspace source와 실제 server 실행 상태를 확인한다.

Code/style 저장은 자동 반영하지만 parameter/event config 변경은 dev mode 재적용이 필요하다. Local setup link를 다시 열거나 workspace preview를 refresh한다. 이 configuration preview는 widget.vite-plugin 3.34.0 이상을 요구한다. 신규 widget은 playground/workspace에서 미발행 preview가 가능하지만 Workshop selector에 처음 나타나려면 한 번 publish해야 한다.

## Layout과 browser 성능

Absolute/flex의 container 공간을 채우려면 html/body에 height/width 100%를 적용할 수 있다. Auto layout에서 content가 크기를 결정하게 하려면 이를 적용하지 않고 body가 child content에 맞춰 늘고 줄게 한다. Auto sizing은 widget.client-react 3.3.0 이상을 요구한다. Dark theme는 parent color-scheme의 prefers-color-scheme 또는 matchMedia change listener로 맞추고 listener를 정리한다.

Iframe도 과도한 memory와 main-thread 작업으로 browser를 멈출 수 있다. Effect가 자기 dependency를 갱신하는 loop, 해제하지 않는 timer/event listener, 값 범위가 불명확한 사실상 무한 loop를 점검한다. DevTools Performance에서 실제 실행을 확인한다.

Object 전체 pagination을 한 번에 browser array로 모으지 않는다. 필요한 page만 읽고 filter/sort는 query에, count 등은 aggregation에 맡기며 $select로 property를 줄인다. 연관 값 계산은 derived property를 고려한다. 이 권장은 widget의 사용자 권한과 지원 endpoint 범위 안에서 적용한다.

## Build version과 host 사용 버전은 별개다

Production build에는 `.palantir/widgets.config.json` manifest와 assets가 필요하다. Plugin의 widgetSet.autoVersion이 package-json 또는 git-describe로 version을 계산한다. Manual ZIP은 dist 폴더를 한 겹 더 포함하지 않고 build content를 root에 둔다. CLI widgetset deploy도 이 manifest를 사용한다.

Foundry repository는 tag build가 publish하고 checks로 성공을 확인한다. 새 version을 publish해도 기존 Workshop 사용처는 자동 갱신되지 않는다. 각 host에서 widget set/version을 선택해야 변경이 보인다. Dev mode에서 보인 code와 published production version을 혼동하지 않는다.

Node는 root .nvmrc의 버전과 nvm install로 개발 환경을 맞추고 CI의 NODE_INSTALLATION_VERSION도 그 파일에서 읽도록 구성해야 한다. .nvmrc만 추가했다고 CI가 바뀌지 않는다. 미설정 시 문서의 개발 기본값은 18.20.8이고 CI는 .jemma/settings.sh를 따르므로 일치 여부를 확인한다. 예시 v24.13.0을 모든 환경의 필수/최신 버전으로 보지 않는다.

## Marketplace 설치 후 작업

Widget set 자체를 product output으로 추가하거나 embedding Workshop module을 추가해 함께 포함할 수 있다. widget.vite-plugin 3.1.0 이상이 필요하며 기존 낮은 버전의 release는 plugin upgrade 후 다시 publish한다.

설치된 Foundry code repository source는 debugging용이며 그 자리에서 개발/새 release를 만드는 경로는 지원하지 않는다. Ontology entity API name은 원본과 같아야 하므로 prefix 없이 설치하거나 기존 entity로 input을 mapping한다. Versioned function은 latest만 지원한다.

OSDK Ontology APIs는 설치 시 자동 enable되지 않는다. 설치 후 권한자가 한 번 수동 enable하며 이후 product upgrade에서도 설정은 유지된다. Product 설치 성공을 runtime API enablement 완료로 보고하지 않는다.

## 출처

- [Palantir, Create a widget set](https://www.palantir.com/docs/foundry/custom-widgets/create)
- [Palantir, Add an additional widget](https://www.palantir.com/docs/foundry/custom-widgets/additional-widget)
- [Palantir, Auto sizing](https://www.palantir.com/docs/foundry/custom-widgets/auto-sizing)
- [Palantir, Dark theme support](https://www.palantir.com/docs/foundry/custom-widgets/dark-theme)
- [Palantir, Develop and preview](https://www.palantir.com/docs/foundry/custom-widgets/development)
- [Palantir, Publish a widget set](https://www.palantir.com/docs/foundry/custom-widgets/publish)
- [Palantir, Manage Node.js version](https://www.palantir.com/docs/foundry/custom-widgets/manage-node-version-in-foundry-code-repository)
- [Palantir, Add widget set to Marketplace product](https://www.palantir.com/docs/foundry/custom-widgets/marketplace)
- [Palantir, Troubleshooting](https://www.palantir.com/docs/foundry/custom-widgets/troubleshooting)

## 관련 문서

- [[Palantir-Custom-Widget-State-and-Security|상태와 iframe 경계]]
- [[Palantir-Custom-Endpoint-Releases|Endpoint version routing]]
