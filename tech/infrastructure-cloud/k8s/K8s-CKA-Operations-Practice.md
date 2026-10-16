---
tags: [kubernetes, cka, kubectl, troubleshooting]
status: done
verified_at: 2026-10-15
category: "인프라&클라우드(Infrastructure&Cloud)"
aliases: ["CKA 운영 실습", "CKA Operations Practice"]
---

# CKA 운영 실습

CKA(Certified Kubernetes Administrator)는 Linux 명령행에서 Kubernetes 관리 과제를 수행하는 실기 시험이다. 준비의 단위는 명령어 암기량보다 대상 환경 확인, 변경, 결과 검증까지 끝내는 운영 작업이다. 관리형 클러스터에서 애플리케이션을 배포한 경험과 kubeadm, control plane, node 장애를 직접 다루는 경험은 구분한다.

## 시험 계약과 실습 범위

2026-10-15 Linux Foundation 안내 기준으로 시험은 2시간, 15~20개 실기 과제이며 CKA 합격선은 66%다. FAQ와 CKA 기술 안내가 명시한 시험 환경은 Kubernetes v1.35다. 버전과 정책은 응시 전에 공식 페이지를 다시 확인한다.

CNCF CKA v1.35 커리큘럼의 범위는 다음과 같다. 비중은 문제별 출제 확률이나 특정 작업의 출제 보장을 뜻하지 않는다.

| 영역 | 비중 | 직접 수행할 작업 |
|---|---|---|
| Cluster Architecture, Installation & Configuration | 25% | RBAC, 기반 인프라, kubeadm 설치와 수명주기, HA control plane, Helm/Kustomize, CNI/CSI/CRI, CRD/operator |
| Workloads & Scheduling | 15% | 배포와 rollback, ConfigMap/Secret, autoscaling, 자가 복구, 자원 제한과 node affinity |
| Services & Networking | 20% | Pod 연결, NetworkPolicy, Service와 endpoint, Gateway API, Ingress, CoreDNS |
| Storage | 10% | StorageClass와 동적 프로비저닝, volume/access mode/reclaim policy, PV/PVC |
| Troubleshooting | 30% | cluster/node/component 장애, 자원 사용량, container 출력, Service와 네트워크 진단 |

Helm, Kustomize, CRD/operator와 Gateway API는 확인한 커리큘럼에 명시된 항목이다. 이전 자료의 Pod 생성과 전통적인 Ingress 문제만 반복하면 이 범위를 놓칠 수 있다.

## 실습을 반복하는 방법

다음은 개인 일정이 아닌 실습 구성 방법이다. 준비 기간이나 강의 회독 수로 합격 가능성을 계산하지 않는다.

1. **개념을 작업으로 바꾼다.** ServiceAccount, Role, RoleBinding의 관계를 설명한 뒤 실제 권한을 부여하고 허용/거부 결과를 확인한다.
2. **기본 lab으로 빈틈을 찾는다.** 처음부터 모든 강의를 반복하기보다 수행하지 못한 영역을 커리큘럼과 연결한다.
3. **시간을 재고 모의 과제를 푼다.** 정답뿐 아니라 문서 탐색, YAML 수정, 잘못된 host/namespace와 검증에 쓴 시간을 기록한다.
4. **오답의 원인을 분리한다.** 개념 부족, 옵션 기억 실패, 환경 착오, 검증 누락 중 어디서 막혔는지 짧게 남긴다.
5. **조건을 바꾸어 다시 푼다.** 이름, namespace, selector나 장애 원인을 바꾸고 해설 없이 재현한다. 같은 답의 위치를 외운 결과와 구분한다.

인프런 문제풀이, Udemy/KodeKloud의 Practice Lab, Mock Test와 Lightning Lab은 개념 보완과 제한 시간 실습의 후보 자료다. 강좌의 현재 범위와 제공 내역은 별도 확인 대상이며, 특정 모의고사 점수나 회독 수를 합격 기준으로 쓰지 않는다. AI 설명은 이해를 돕는 가설로 받고 공식 문서와 실제 명령 결과로 확인한다.

헷갈리는 개념은 구조를 그린 뒤 실행으로 연결한다. Deployment와 ReplicaSet, Service selector와 EndpointSlice, PV/PVC와 Pod mount처럼 객체 사이의 연결을 설명하고 실제 조회 결과에서 그 연결을 찾는다.

### killer.sh의 역할

2026-10-15 확인한 Linux Foundation FAQ 기준으로 시뮬레이터가 포함된 시험 등록에는 2세션이 제공되며, **CKA-SINGLE 등록에는 포함되지 않는다**. 각 세션은 활성화 시점부터 연속 36시간 동안 열린다. 사용한 시간만 차감하는 방식이 아니므로 구매 상품의 제공 내역을 확인하고, 풀이, 해설 확인과 재실습을 이어서 할 수 있을 때 활성화한다.

시뮬레이터에서는 원격 데스크톱 조작, 명령 입력, 문서 탐색과 오답 재현을 연습한다. 운영사 FAQ도 Kubernetes와 kubectl의 기본 지식을 전제로 한다. 시뮬레이터 점수는 약점을 찾는 자료이며 실제 시험 점수의 환산표가 아니다. 체감 난이도나 학습 기간에 관한 개인 경험은 보편적 수치로 일반화하지 않는다.

## 터미널 작업의 기본 흐름

각 과제는 지정된 SSH host에서 수행한다. Linux Foundation 기술 안내는 작업 후 `exit`로 base host에 돌아가도록 하며 중첩 SSH를 지원하지 않는다고 설명한다. 다음 과제의 host 지시를 새로 확인한다. context 전환이 제시되면 해당 지시도 따른다.

1. host, context, namespace, 리소스 이름과 결과 파일 경로를 확인한다.
2. 기존 상태를 조회한다.
3. 필요한 부분만 변경한다.
4. 객체 상태와 실제 동작 또는 출력 파일을 확인한다.

지정 SSH host에는 `kubectl`, `k` alias와 Bash 자동완성이 사전 설정되어 있다는 것이 현재 공식 안내다. 개인 Bash 실습 환경에서 직접 준비한다면 completion을 먼저 로드한다.

```bash
# Bash, bash-completion 설치 전제
source <(kubectl completion bash)
alias k=kubectl
complete -o default -F __start_kubectl k

kubectl config current-context
kubectl get pods -n practice

# API에 생성하지 않고 로컬 YAML 뼈대를 만든다.
kubectl run web --image=nginx --dry-run=client -o yaml > pod.yaml
kubectl create deployment web --image=nginx --replicas=3 \
  --dry-run=client -o yaml > deployment.yaml
```

`--dry-run=client` 성공은 실제 클러스터의 admission, 권한, scheduling과 실행 성공을 검증하지 않는다. 생성한 YAML에 과제의 namespace, container, volume과 자원 조건을 반영한 뒤 적용 결과를 확인한다. 명령형 생성은 실습 속도를 높이는 수단이며 운영 환경의 GitOps나 변경 승인 절차를 대체하지 않는다.

## 작업별 확인 기준

아래 목록은 재현용 실습 항목이다. 특정 유형이 시험에 반드시 나온다는 의미는 아니다.

| 작업 | 완료를 판단할 관측 결과 | 연결 문서 |
|---|---|---|
| Pod, multi-container, sidecar | 각 container의 목적, 기동/종료 방식과 로그를 확인 | [[K8s-Core-Workloads-and-Service]] |
| Deployment 생성, scale, rollback | 목표 replica와 rollout 상태, 실제 Pod 확인 | [[K8s-Core-Workloads-and-Service]] |
| nodeSelector와 affinity | Pod가 요구한 node 조건을 만족하는지 확인 | [[K8s-Core-Workloads-and-Service-Architecture]] |
| ConfigMap, Secret, init container | 주입 경로, 초기화 완료와 애플리케이션 동작 확인 | [[K8s-Configuration-Storage-and-Probes]] |
| StatefulSet, DaemonSet, headless Service | workload의 배치/identity 목적과 발견 경로 설명 | [[K8s-Core-Workloads-and-Service]] |
| 로그 파일과 자원 사용량 | 지정 container의 출력과 경로, 측정 대상 확인 | [[K8s-Core-Workloads-and-Service]] |
| cordon, drain, uncordon | scheduling 상태, 퇴거된 workload와 PDB 제약 확인 | [[K8s-PDB]] |
| RBAC | ServiceAccount, Role/RoleBinding과 ClusterRole/ClusterRoleBinding의 범위를 구분하고 허용/거부 확인 | 공식 RBAC 문서 |
| PV, PVC, hostPath | 바인딩, mount와 읽기/쓰기, host 의존성 확인 | [[K8s-Configuration-Storage-and-Probes]] |
| Service, DNS | selector, EndpointSlice, 이름 해석과 실제 연결 확인 | [[K8s-Core-Workloads-and-Service]] |
| NetworkPolicy | 허용 경로와 차단 경로를 각각 호출 | [[K8s-NetworkPolicy]] |
| Ingress, Gateway API, Helm | controller/구현체 조건, route와 배포 결과 확인 | [[K8s-Traffic-Entry-Helm-and-GitOps]] |
| kubelet, runtime, control plane 장애 | 로그와 상태로 고장 층을 좁히고 복구 후 재확인 | [[K8s-Core-Workloads-and-Service-Architecture]] |

로그는 container와 현재/이전 실행을 구분한다. `kubectl top`은 자원 지표가 제공되는 환경에서 확인하며, 조회 실패를 사용량 0으로 해석하지 않는다.

### kubeadm과 etcd는 명령 한 줄로 끝나지 않는다

- **클러스터 업그레이드:** 대상 버전, version skew, control plane과 worker 순서, drain과 workload 복귀를 연결해 실습한다. 실제 절차는 해당 버전의 kubeadm 문서를 따른다.
- **etcd 백업:** endpoint와 인증서를 확인해 `etcdctl snapshot save`로 snapshot을 만들고 `etcdutl snapshot status`로 파일을 확인한다. snapshot에는 민감한 클러스터 상태가 들어가므로 접근과 보관을 보호한다.
- **etcd 복원:** 현행 Kubernetes 문서는 `etcdutl snapshot restore`를 사용한다. `etcdctl snapshot restore`를 그대로 외우는 오래된 예제는 도구 버전과 대조한다. API server 중지, 복원할 data directory, etcd 설정과 재기동 후 상태까지 포함한 절차로 다룬다. snapshot 파일 생성만으로 복구 가능성을 입증한 것은 아니다.

## 문서 탐색과 시험 환경

2026-10-15 Linux Foundation 허용 자료 기준으로 VM 내부 브라우저에서 볼 수 있는 자료는 다음과 같다.

- Kubernetes Documentation과 Kubernetes Blog
- Helm Documentation
- CKA의 Gateway API Documentation
- 과제의 Quick Reference에 제공되는 문서

문서의 외부 검색 결과를 열거나 개인 블로그, AI 도구와 개인 노트를 시험 중 참고할 수 있다고 해석하지 않는다. 허용 범위는 공식 Resources Allowed 페이지와 과제 지시를 우선한다.

PV/PVC, NetworkPolicy, RBAC, CoreDNS, kubeadm upgrade, etcd recovery, Helm과 Gateway API의 예시를 찾고 자기 조건에 맞게 고치는 과정을 연습한다. 허용 문서를 빠르게 찾는 능력과 문서 예제가 현재 대상 환경에 맞는지 판단하는 능력이 함께 필요하다.

응시 준비에서는 PSI 시스템 검사, 설치 권한, 단일 활성 모니터, 카메라/마이크와 조용한 독립 공간을 확인한다. 신분증 이름과 시험 체크리스트의 검증된 이름을 대조한다. Linux 터미널의 복사/붙여넣기는 `Ctrl+Shift+C`와 `Ctrl+Shift+V`이며 원격 데스크톱의 다른 앱과 다를 수 있다. 막힌 과제는 표시해 두고 이후 돌아오되, 변경한 상태와 남은 조건을 다시 확인한다.

## 출처

- [CKA 합격 후기, 직장인 6주 독학으로 CKA 취득! 공부 방법, 자료별 회독 수, killer.sh 활용법 총정리 (2026 최신) — Velog, Hoyeon호연](https://velog.io/@sophie114/cka-guide-hoyeon)
- [CNCF, Certified Kubernetes Administrator](https://www.cncf.io/training/certification/cka/)
- [CKA Curriculum v1.35 — CNCF, GitHub](https://github.com/cncf/curriculum/blob/master/CKA_Curriculum_v1.35.pdf)
- [Linux Foundation, Frequently Asked Questions: CKA and CKAD & CKS](https://docs.linuxfoundation.org/tc-docs/certification/faq-cka-ckad-cks)
- [Linux Foundation, Important Instructions: CKA and CKAD](https://docs.linuxfoundation.org/tc-docs/certification/tips-cka-and-ckad)
- [Linux Foundation, Resources Allowed: All LF Certification Programs](https://docs.linuxfoundation.org/tc-docs/certification/certification-resources-allowed)
- [Linux Foundation, How do I access the exam simulator (Practice Exams)?](https://linuxfoundation.atlassian.net/wiki/spaces/TCCS/pages/161579396)
- [Killer Shell, FAQ](https://killer.sh/faq)
- [Kubernetes Docs, kubectl Quick Reference](https://kubernetes.io/docs/reference/kubectl/quick-reference/)
- [Kubernetes Docs, Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes Docs, Upgrading kubeadm clusters](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/)
- [Kubernetes Docs, Operating etcd clusters for Kubernetes](https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/)

## 관련 문서

- [[k8s|Kubernetes 인덱스]]
- [[K8s-Core-Workloads-and-Service-Architecture|Control plane과 node component]]
- [[K8s-Core-Workloads-and-Service|Workload와 Service]]
- [[K8s-Configuration-Storage-and-Probes|설정, storage와 probe]]
- [[K8s-NetworkPolicy|NetworkPolicy]]
- [[K8s-PDB|PodDisruptionBudget]]
- [[K8s-Traffic-Entry-Helm-and-GitOps|Traffic entry, Helm과 GitOps]]
