---
tags: [infrastructure, service-mesh, envoy, istio, upgrade, release-notes]
status: done
verified_at: 2026-11-02
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["Envoy Upgrade Behavior Changes", "Envoy 업그레이드 동작 변경", "Envoy runtime guard", "Envoy 1.40.0 변경 사항"]
---

# Envoy 업그레이드와 동작 변경 점검

Envoy는 설정을 그대로 두어도 버전을 올리면 기본값과 요청 처리 방식이 바뀔 수 있다. 업그레이드 전에는 릴리스 노트의 절로 영향 범위와 되돌리는 수단을 나누고, 실제로 쓰는 기능마다 요청을 보내 결과를 확인한다.

Istio는 Envoy를 확장한 프록시를 sidecar로 쓰고, ambient mode의 waypoint도 Envoy 배포다. 이들을 운영하면 Envoy의 동작 변경이 같은 점검 대상이 된다. ambient의 ztunnel은 Rust로 작성된 별도 프록시다. Istio mesh 설정의 `ecdhCurves`는 지정하지 않으면 Envoy가 정한 기본 곡선을 쓰고, mesh mTLS(`meshMTLS`)는 ECDH 곡선 설정을 따르지 않는다. 경로마다 영향이 다를 수 있으므로 Istio에서는 쓰는 Istio 버전에 든 Envoy가 이 변경을 포함하는지와 경로별 곡선 설정을 먼저 확인한다.

## 릴리스 노트의 절

릴리스 노트(version history)는 변경을 아래 절로 나눈다. 절 이름과 설명은 v1.40.0 릴리스 노트와 changelog 정의 파일 기준이며, 괄호 안은 저장소 `changelogs/<버전>.yaml`의 키다.

| 절 | 공식 설명 | 업그레이드 때 읽는 법 |
|---|---|---|
| Incompatible behavior changes (`behavior_changes`) | 해당하면 비호환이 예상되고 배포 변경이 필요할 가능성이 높다 | 먼저 읽는다. 쓰는 필터, 확장과 빌드 방식에 걸리는 항목마다 대응을 정한다. v1.40.0에도 runtime guard로 되돌리는 항목(`local_ratelimit`, `vhds`)이 있어 되돌리는 runtime 이름도 본다 |
| Minor behavior changes (`minor_behavior_changes`) | 일부 사용자에게는 비호환일 수 있으나 대부분은 아니다 | v1.40.0에서는 기본값 추가와 runtime guard 기본값 전환이 여기에 실렸다. 되돌리는 runtime 이름이 있는지 본다 |
| Bug fixes (`bug_fixes`) | 상태를 개선하며 부정적 영향은 적을 것으로 예상된다 | 기존 버그를 피하려고 넣은 우회 설정이 있는지 대조한다 |
| Removed config or runtime (`removed_config_or_runtime`) | 보통 deprecation 기간이 끝날 때 일어난다 | deprecated 설정과 이전 동작으로 되돌리던 runtime guard가 실제로 제거되는 지점이다. 덮어쓰고 있는 runtime 값과 대조한다 |
| New features (`new_features`) | 별도 설명 없음 | 채택할 기능의 성숙도(alpha, work-in-progress)를 API 문서에서 확인한다 |
| Deprecated (`deprecated`) | 별도 설명 없음 | 이후 제거될 설정을 미리 옮긴다 |

- 한 변경이 여러 절에 해당하면 가장 중요한 첫 절에만 적고, 비호환을 만드는 버그 수정은 `bug_fixes`가 아니라 `behavior_changes`에 싣도록 한다(Envoy 기여 가이드). 절 하나만 훑으면 비호환 변경을 놓친다.
- 항목은 `area`(예: `tls`, `quic`, `mcp_router`, `build`)로 묶인다. 쓰는 필터와 확장의 area 목록을 먼저 만들고 절마다 대조한다.
- 기여 가이드의 정책상 deprecated 설정은 예외 합의가 없으면 deprecation 다음 릴리스 주기에 경고 로그와 `runtime.deprecated_feature_use` 통계 증가를, 그다음 주기에는 설정 로드 실패를 일으킨다. 해당 기능을 runtime으로 명시적으로 허용하거나 `envoy.features.enable_all_deprecated_features`를 true로 두면 예외다. 중간 버전을 건너뛰면 경고 단계를 보지 못하므로 사이 버전의 노트도 읽는다.
- 실제 거부 시점은 정책의 주기와 다를 수 있다. v1.40.0 runtime 문서는 거부 단계를 필드에 `disallowed_by_default`가 붙는 것으로 설명하는데, 같은 버전 `cluster.proto`에는 `deprecated_at_minor_version`이 3.0인 `http2_protocol_options` 등이 이 표시 없이 남아 있다. 사용 여부는 `runtime.deprecated_feature_use` 통계로 보고, 스테이징에서 `envoy.features.fail_on_any_deprecated_feature`를 켜면 경고 단계에서도 설정 로드가 실패해 쓰는 위치를 찾을 수 있다.

## runtime guard로 이전 동작을 되돌리는 범위

Envoy 기여 가이드는 고위험 변경과, 설정으로 가드되지 않으면서 사용자에게 보이는 프로토콜 처리 변경 대부분(HTTP 헤더 추가나 변경, HTTP 직렬화 방식 등)을 alpha가 아닌 기능에 한해 runtime guard로 감싸는 것을 일반 원칙으로 둔다. 가드 이름은 대부분 `envoy.reloadable_features.<이름>` 형식이고(재시작을 전제로 다루는 `envoy.restart_features.` 가드는 아래 실행 중 변경의 한계 참고), 이런 변경의 릴리스 노트 항목에는 되돌리는 방법을 함께 적는다.

- **기본값**: runtime guard는 기본 true로 새 코드 경로를 실행하고, `FALSE_RUNTIME_GUARD`로 선언한 것만 기본 false다. 기여 가이드는 릴리스 시점에 일반적으로 모든 가드를 true로 둔다는 원칙을 적지만, v1.40.0 `runtime_features.cc`에도 `oauth2_use_gcm_encryption`, `unified_mux` 등의 `FALSE_RUNTIME_GUARD`가 남아 있다. 실제 기본값은 해당 버전 태그의 이 파일에서 확인한다. 기본 true인 가드를 되돌릴 때는 해당 이름을 false로 설정한다.
- **설정 경로**: runtime 값은 bootstrap의 layered runtime으로 넣는다. static layer, 로컬 디스크 layer, admin layer, RTDS layer가 있고 뒤 layer가 앞 layer를 덮어쓴다. admin layer 값은 `/runtime_modify` 엔드포인트로 바꾸며 즉시 반영되고, 문서는 이 엔드포인트를 신중히 쓰라고 경고한다. 비어 있지 않은 layered runtime에 admin layer가 없으면 `/runtime_modify` 같은 변경 요청은 503을 받는다.
- **Istio**: mesh 설정의 ProxyConfig `runtimeValues`가 부트스트랩 때 Envoy runtime 값을 넣는 필드다. Istio 문서는 실험적, 안전하지 않은, 지원되지 않는, deprecated 기능까지 설정할 수 있으므로 극도로 주의해 쓰라고 적는다. mesh 기본값은 `meshConfig.defaultConfig`에 두고 Kubernetes에서는 pod의 `proxy.istio.io/config` annotation으로 워크로드별로 덮어쓸 수 있다. 같은 문서는 ProxyConfig 필드가 동적으로 반영되지 않아 바꾸면 워크로드를 재시작해야 한다고 적는다.
- **실행 중 변경의 한계**: 기여 가이드는 `envoy.reloadable_features.` 가드가 실행 중 true와 false를 바꿔도 안전해야 한다고 하고, 연결처럼 Envoy 인스턴스보다 수명이 짧은 객체에 한해 생성 시점에 값을 고정(latch)하는 것을 허용한다. v1.40.0의 TLS 기본 곡선 가드는 listener와 cluster의 TLS context 설정 객체를 만들 때 읽혀 곡선 목록으로 저장된다. 소스 기준으로 추론하면 실행 중 값을 바꿔도 이미 만들어진 TLS 설정으로 맺는 새 연결은 이전 목록을 쓰고, 해당 설정이 다시 로드돼 설정 객체가 새로 만들어져야 반영된다(실행 미검증). v1.40.0 `runtime_features.cc`에는 `envoy.restart_features.` 가드도 있는데, 기여 가이드의 실행 중 변경 안전 요건은 `envoy.reloadable_features.`에만 적혀 있으므로 restart 가드는 바꾼 뒤 재시작을 전제로 다룬다(이름과 소스 주석에 근거한 추론).
- **임시 수단**: 두 코드 경로는 한 릴리스(성능 때문에 둔 가드)에서 deprecation 주기 전체(고위험 동작 변경)까지만 유지된다. 동작 변경의 이전 코드는 운영자 우려가 없으면 6개월 뒤 deprecated되고, 변경이 일부 사용자에게 문제가 되면 메인테이너가 보통 영구 설정 항목의 형태로 해결책을 찾는다. 가드를 꺼야 하는 문제는 GitHub 이슈로 바로 보고하고, 버그가 없는 코드까지 덮어쓰는 것은 강하게 권장되지 않는다(v1.40.0 `runtime_features.cc` 주석). 덮어쓴 값은 배포 설정에 남겨 제거 시점까지 추적한다.
- **runtime으로 되돌릴 수 없는 변경**: v1.40.0에서 설정 필드로 되돌리는 `mcp_router` 헤더 전달 변경, 빌드 방식과 Rust SDK 시그니처 변경에는 runtime guard가 없다. `mcp_router`는 v1.40.0에서 alpha 상태 확장이라 alpha가 아닌 기능을 대상으로 하는 기여 가이드의 가드 원칙 밖에 있다.

## v1.40.0 사례 (2026-10-13 릴리스)

2026-11-02에 v1.40.0 릴리스 노트와 changelog YAML, 관련 API 문서, v1.40.0 태그 소스를 대조했다. 아래는 헤더 전달, 빌드, 동적 모듈, TLS, HTTP/3과 OAuth2에 관한 일부이며 Envoy를 실행해 확인한 결과는 아니다. 같은 날 확인한 패치 릴리스 1.40.1(2026-10-23)과 1.40.2(2026-10-27)의 changelog에는 아래 항목을 바꾼 내용이 없다. 업그레이드 대상이 패치 버전이면 그 버전의 노트도 함께 읽는다.

| area | 절 | 변경 요지 | 이전 동작 복원 |
|---|---|---|---|
| `mcp_router` | Incompatible | 백엔드별 `header_forwarding` 추가, 기본 헤더 전달 축소 | 백엔드별 `forward_all: true` |
| `build` | Incompatible | `WORKSPACE` 제거, bzlmod(`MODULE.bazel`) 전환 | 없음, downstream 빌드 이전 |
| `build` | Incompatible | Wasm 런타임 선택 `--define` 플래그 대체 | 없음, 빌드 스크립트 수정 |
| `dynamic_modules` | Incompatible | Rust SDK `HttpFilter` 훅이 `&self`를 받음 | 없음, 모듈 코드 수정 |
| `tls` | Minor | 기본 ECDH 곡선에 `X25519MLKEM768` 추가 | `envoy.reloadable_features.pqc_default_ecdh_curves`를 false |
| `quic` | Minor | QUIC/HTTP/3을 alpha에서 stable로 승격 | 해당 없음 |
| `oauth2` | Removed config or runtime | `envoy.reloadable_features.oauth2_cleanup_cookies` 가드 제거 | 없음 |

같은 버전의 Minor behavior changes에는 `envoy.reloadable_features.use_canonical_suffix_for_quic_brokenness`의 기본값을 true로 바꾼 항목처럼 가드 기본값 전환도 있다.

### MCP router의 헤더 전달

- `McpBackend`에 `header_forwarding`이 추가됐다(MCP router 필터와 `mcp_multicluster` 클러스터 타입). 이전에는 작은 고정 제외 목록을 뺀 모든 downstream 요청 헤더를 모든 백엔드에 넘겼다. 이제 `header_forwarding`을 두지 않은 백엔드에는 router가 직접 만드는 헤더(`content-type`, `accept`, 세션 헤더 등) 외에 downstream이 제어하는 헤더를 넘기지 않으며, 클라이언트의 `authorization`도 넘기지 않는다.
- 기본값을 바꾼 이유는 하나의 `mcp_router`가 신뢰 수준이 다른 백엔드를 모을 수 있고, MCP가 암묵적 token passthrough 대신 audience에 묶인 토큰을 요구하기 때문이다.
- 헤더별 평가 순서는 `disallowed_headers`에 맞으면 차단(`forward_all`보다 우선), 아니면 `forward_all`이 true일 때 전달, 아니면 `allowed_headers`에 맞을 때 전달, 그 외 차단이다. 두 목록은 `type.matcher.v3.ListStringMatcher`다.
- router 소유, framing, session, hop-by-hop 헤더는 이 정책과 별도로 처리되어 이 방식으로 넘길 수 없다. 헤더 변경과 자격 증명 주입도 이 정책의 범위 밖이다.
- `forward_all: true`는 업그레이드 전 동작을 백엔드 단위로 되살리지만 클라이언트의 `authorization`도 함께 넘긴다. 필요한 헤더만 `allowed_headers`로 열고, 넘기면 안 되는 헤더를 `disallowed_headers`에 두면 이후 `forward_all`을 켜도 차단이 유지된다.
- v1.40.0 API 문서는 이 확장을 work-in-progress로 표시하고, 운영 시간이 충분하지 않으며 보안 수준이 확인되지 않아 downstream과 upstream을 모두 신뢰하는 배포에서만 쓰라고 안내한다. work-in-progress API 기능은 안정적이지 않고 위협 모델과 보안팀 지원 범위에 들지 않으며 호환되지 않는 변경이 있을 수 있다고 경고한다.

### 빌드와 배포 산출물

- `WORKSPACE` 파일이 제거되고 `.bazelrc`에 `--enable_bzlmod`, `--noenable_workspace`가 설정됐다. 1.39에서 추가된 `--enable_workspace`, `--noenable_bzlmod`는 더 이상 필요하지 않고 지원되지 않는다. Envoy, Envoy API와 문서는 Bazel 모듈 `envoy`, `envoy_api`, `envoy-docs`로 배포된다.
- Envoy를 의존성으로 빌드하는 downstream 프로젝트는 bzlmod로 옮기고, Bazel Central Registry에 더해 Envoy 커스텀 레지스트리(`https://raw.githubusercontent.com/envoyproxy/bazel-registry`)를 `--registry`로 추가해 따라가야 한다. 많은 의존성과 패치한 모듈이 그곳에만 배포된다.
- `bazel-bin/external` 아래 저장소 이름이 bzlmod 정식 이름(예: `su-exec` 대신 `su-exec+`)으로 바뀌어 이 경로를 참조하는 스크립트가 영향을 받을 수 있다.
- Wasm 런타임 선택은 `--define wasm=<engine>`, `--define engine=<engine>` 대신 `--@proxy-wasm-cpp-host//bazel:engine=<engine>`을 쓴다. 이전 플래그는 더 이상 적용되지 않고 실패를 낸다.
- 같은 Incompatible 절에는 hermetic LLVM/Clang 툴체인을 18에서 22로 올린 변경과 쓸모없어진 Clang Bazel 설정 제거(`build`), 선택 가능한 SSL 라이브러리에서 AWS-LC와 `--config=aws-lc-fips` 빌드 설정을 뺀 변경(`tls`, ppc64le는 `--config=openssl`)도 있다.
- 직접 빌드하지 않아도 배포 산출물을 확인한다. Debian bullseye(11) `.deb` 패키지와 `google-vrp` Docker 이미지 변형은 더 이상 배포되지 않는다.

### Rust 동적 모듈

- `HttpFilter` 훅이 `&mut self` 대신 `&self`를 받는다. 기존 필터는 훅 시그니처를 바꾸고, 스트림별 가변 상태를 `Cell`이나 `RefCell` 같은 내부 가변성 뒤에 두며, `Drop`에서 panic하지 않아야 한다.
- 훅이 필터 체인의 동기 해제(예: `recreate_stream`)를 일으키면 이미 해제된 모듈 안 필터로 돌아오는 use-after-free가 있었다. 이제 각 훅이 실행되는 동안 필터를 참조 카운트로 유지한다. Envoy가 훅 실행 중 같은 필터에 동기적으로 다시 들어올 수 있어 `&mut self`가 겹치면 정의되지 않은 동작이 되므로 공유 참조로 바꿨다.

### TLS 기본 키 교환 곡선과 HTTP/3

- upstream과 downstream TLS의 기본 ECDH 곡선에 하이브리드 양자 내성 키 교환 `X25519MLKEM768`이 추가됐다(FIPS 빌드 포함). runtime 플래그 `envoy.reloadable_features.pqc_default_ecdh_curves`를 false로 두면 끌 수 있다.
- v1.40.0 태그 소스의 기본 목록은 플래그가 켜진 상태에서 비 FIPS `X25519MLKEM768:X25519:P-256`, FIPS `X25519MLKEM768:P-256`이고, 끄면 각각 `X25519:P-256`과 `P-256`이다. client와 server 설정이 같은 목록을 쓴다. `tls_params.ecdh_curves`를 지정한 설정은 기본 목록을 쓰지 않으므로 비워 둔 설정만 업그레이드로 바뀐다. `compliance_policies`를 쓴 설정은 정책이 마지막에 적용돼 다른 TLS 파라미터를 덮어쓸 수 있으므로(예: `FIPS_202205`는 키 합의를 P-256, P-384로 제한), 기본 목록 변경과 `ecdh_curves` 지정이 그대로 반영되지 않을 수 있다.
- 2026-11-02 확인 시점에 v1.40.0과 개발 버전 API 레퍼런스의 `ecdh_curves` 설명은 비 FIPS 기본값을 여전히 X25519, P-256으로 적는다. 기본값 판단은 릴리스 노트와 소스를 따르고, 실제 협상 결과는 연결 시험으로 확인한다.
- QUIC/HTTP/3이 alpha에서 stable로 승격됐다. 모든 QUIC 확장과 upstream HTTP/3 지원을 포함하며, downstream HTTP/3은 이전부터 production-ready로 간주됐다.

### 제거된 runtime guard

- `envoy.reloadable_features.oauth2_cleanup_cookies` 가드와 이전 코드 경로가 제거됐다. OAuth2 필터는 OAuth 흐름 쿠키(`OauthHMAC`, `OauthExpires`, `RefreshToken`, `OauthNonce`, `CodeVerifier`와 접미사가 붙은 이름)를 upstream으로 넘기기 전에 항상 제거하므로 백엔드는 이 쿠키를 받지 않는다. 이전 버전에서 이 가드를 false로 덮어썼다면 v1.40.0에는 되돌릴 수단이 없다.

## 실제 요청으로 백엔드가 받은 헤더 확인

릴리스 노트는 무엇이 바뀌었는지 알려 주지만, 우리 설정에서 백엔드가 무엇을 받는지는 요청으로 확인한다. 아래는 위 변경에서 도출한 점검 절차다.

1. 같은 설정으로 이전 버전과 새 버전 Envoy를 스테이징에 띄운다.
2. 백엔드 자리에 받은 헤더를 그대로 기록하거나 응답으로 돌려주는 시험용 백엔드를 둔다. 운영 백엔드의 요청 로그를 쓰면 인증 헤더가 로그에 남지 않게 한다.
3. `authorization`, 추적 헤더, 테넌트 같은 업무 헤더를 담은 같은 요청을 양쪽에 보내 백엔드가 받은 헤더 목록을 비교한다. MCP router는 정책이 백엔드별이므로 백엔드마다 확인한다.
4. 새 버전에서 빠진 헤더는 의도한 차단(자격 증명)인지 업무에 필요한 헤더인지 나누고, 필요한 것만 `allowed_headers`에 연다.
5. 반대 방향도 본다. OAuth 흐름 쿠키처럼 새 버전에서 백엔드로 가지 않아야 하는 값이 실제로 빠졌는지 확인한다.
6. TLS와 HTTP/3은 헤더와 따로, 업그레이드 전후의 핸드셰이크 실패, 연결 오류와 프로토콜별 요청 비율을 비교한다.

## 트레이드오프

- runtime guard로 되돌리면 배포를 막지 않고 시간을 벌지만, 가드가 Removed config or runtime 절에서 제거되면 그 버전부터 이전 동작이 사라진다. 기여 가이드는 두 코드 경로를 한 릴리스에서 deprecation 주기 전체까지 유지하고 동작 변경의 이전 코드는 우려가 없으면 6개월 뒤 deprecated한다고만 밝힐 뿐 가드별 제거 버전은 정하지 않으므로, 되돌린 가드마다 보고 이슈와 이 원칙으로 추정한 시점을 기록하고 릴리스마다 Removed config or runtime 절에서 제거 여부를 확인한다.
- `forward_all: true`는 가장 빠른 복원이지만 기본값 변경의 이유인 토큰 경계를 다시 연다.
- 기본 곡선 플래그를 끄면 호환성 문제를 피할 수 있지만 하이브리드 양자 내성 키 교환을 포기한다. 끄기 전에 실패한 연결 상대와 경로를 먼저 특정하고, 전역 플래그 대신 그 상대와 맺는 cluster나 해당 listener의 TLS 설정에만 `tls_params.ecdh_curves`를 지정해 범위를 좁힐 수 있다. 지정한 설정은 이후 기본 목록 변경을 따르지 않는다.

## 체크포인트

- 쓰는 필터, 확장, 직접 빌드 여부와 덮어쓰고 있는 runtime 값 목록이 있는가?
- Incompatible behavior changes에서 해당하는 항목마다 설정, 코드나 빌드 변경이 정해졌는가?
- runtime으로 되돌린 항목마다 보고한 이슈를 남기고, 새 릴리스의 Removed config or runtime 절에서 그 가드의 제거 여부를 확인하는가?
- MCP 백엔드별 허용 헤더가 정해졌고, `forward_all`을 켠 백엔드가 받는 인증 헤더의 용도를 설명할 수 있는가?
- 업그레이드 전후로 백엔드 수신 헤더, TLS 핸드셰이크 실패와 HTTP/3 요청 비율을 비교했는가?

## 출처

- [1.40.0 (October 13, 2026) — Envoy](https://www.envoyproxy.io/docs/envoy/v1.40.0/version_history/v1.40/v1.40.0)
- [changelogs/1.40.0.yaml — envoyproxy/envoy](https://raw.githubusercontent.com/envoyproxy/envoy/main/changelogs/1.40.0.yaml)
- [changelogs/1.40.1.yaml — envoyproxy/envoy](https://raw.githubusercontent.com/envoyproxy/envoy/main/changelogs/1.40.1.yaml)
- [changelogs/1.40.2.yaml — envoyproxy/envoy](https://raw.githubusercontent.com/envoyproxy/envoy/main/changelogs/1.40.2.yaml)
- [changelogs/changelogs.yaml — envoyproxy/envoy](https://raw.githubusercontent.com/envoyproxy/envoy/main/changelogs/changelogs.yaml)
- [CONTRIBUTING.md — envoyproxy/envoy](https://raw.githubusercontent.com/envoyproxy/envoy/main/CONTRIBUTING.md)
- [source/common/runtime/runtime_features.cc, v1.40.0 — envoyproxy/envoy](https://raw.githubusercontent.com/envoyproxy/envoy/v1.40.0/source/common/runtime/runtime_features.cc)
- [source/common/tls/context_config_impl.cc, v1.40.0 — envoyproxy/envoy](https://raw.githubusercontent.com/envoyproxy/envoy/v1.40.0/source/common/tls/context_config_impl.cc)
- [source/common/tls/server_context_config_impl.cc, v1.40.0 — envoyproxy/envoy](https://raw.githubusercontent.com/envoyproxy/envoy/v1.40.0/source/common/tls/server_context_config_impl.cc)
- [api/envoy/config/cluster/v3/cluster.proto, v1.40.0 — envoyproxy/envoy](https://raw.githubusercontent.com/envoyproxy/envoy/v1.40.0/api/envoy/config/cluster/v3/cluster.proto)
- [source/extensions/extensions_metadata.yaml, v1.40.0 — envoyproxy/envoy](https://raw.githubusercontent.com/envoyproxy/envoy/v1.40.0/source/extensions/extensions_metadata.yaml)
- [Envoy, Runtime](https://www.envoyproxy.io/docs/envoy/v1.40.0/configuration/operations/runtime)
- [Envoy, MCP Multiplexer/Demultiplexer (proto)](https://www.envoyproxy.io/docs/envoy/v1.40.0/api-v3/extensions/filters/http/mcp_router/v3/mcp_router.proto)
- [Envoy, Common TLS configuration (proto)](https://www.envoyproxy.io/docs/envoy/v1.40.0/api-v3/extensions/transport_sockets/tls/v3/common.proto)
- [Istio, Architecture](https://istio.io/latest/docs/ops/deployment/architecture/)
- [Istio, Overview](https://istio.io/latest/docs/ambient/overview/)
- [Istio, Global Mesh Options](https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/)
- [버전만 올리면 같은 헤더가 갈까? | Envoy 1.40.0 업그레이드 점검 — 길리랩 - 실전 구현 랩](https://www.youtube.com/watch?v=r3Lp4Uy5E-A)

## 관련 문서

- [[Istio-Ambient-Upgrade|Istio Ambient 업그레이드 전략]] — Istio 컴포넌트별 업그레이드 순서
- [[Envoy-XDS-Disconnected-Detection|Envoy xDS 단절 탐지]] — 업그레이드 뒤 control plane 연결 확인
- [[Envoy-Retry-Buffer-507|Envoy Retry Buffer와 507]] — Envoy 기본값이 만드는 운영 제약
- [[Istio-Ambient-Mode|Istio Ambient Mode]] — waypoint와 ztunnel 구조
- [[MCP-Gateway-Architecture|MCP 게이트웨이]] — 백엔드로 넘기는 헤더와 권한 경계
- [[MCP|MCP]] — token passthrough 금지
- [[TLS-Config|TLS 설정 실무]] — 키 교환 그룹과 핸드셰이크 검증
- [[Public-Key-Cryptography#양자 위협을 구분하는 기준|양자 위협 구분]] — ML-KEM 전환 배경
- [[Proxy-Internals|프락시 동작 구조]] — Envoy HTTP 필터 체인
