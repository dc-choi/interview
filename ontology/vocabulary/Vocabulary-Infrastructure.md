---
tags: [ontology, vocabulary]
status: vocabulary
category: "AI엔지니어링(AIEngineering)"
aliases: ["인프라, 운영, 네트워크와 보안 주제 어휘", "Vocabulary Infrastructure"]
ontology_concepts:
  - {id: infrastructure, type: Topic, label: Infrastructure, aliases: [인프라]}
  - {id: cloud, type: Topic, label: Cloud, aliases: [Cloud Computing, 클라우드]}
  - {id: aws, type: Topic, label: AWS, aliases: [Amazon Web Services], broader: cloud}
  - {id: s3, type: Topic, label: Amazon S3, broader: aws}
  - {id: ec2, type: Topic, label: Amazon EC2, broader: aws}
  - {id: rds, type: Topic, label: Amazon RDS, broader: aws}
  - {id: aurora, type: Topic, label: Amazon Aurora, broader: rds}
  - {id: ecs, type: Topic, label: Amazon ECS, broader: aws}
  - {id: sqs, type: Topic, label: Amazon SQS, broader: aws}
  - {id: cloudwatch, type: Topic, label: Amazon CloudWatch, broader: aws}
  - {id: bedrock, type: Topic, label: Amazon Bedrock, broader: aws}
  - {id: saa-c03, type: Topic, label: AWS SAA-C03, aliases: [saa, "AWS Certified Solutions Architect - Associate"], broader: aws}
  - {id: lambda, type: Topic, label: Lambda}
  - {id: iam, type: Topic, label: IAM}
  - {id: auto-scaling, type: Topic, label: Auto Scaling}
  - {id: private-link, type: Topic, label: PrivateLink}
  - {id: serverless, type: Topic, label: Serverless, aliases: [서버리스]}
  - {id: compute, type: Topic, label: Compute}
  - {id: finops, type: Topic, label: FinOps}
  - {id: cost, type: Topic, label: Cost}
  - {id: container, type: Topic, label: Container, aliases: [containers, 컨테이너]}
  - {id: docker, type: Topic, label: Docker, broader: container}
  - {id: kubernetes, type: Topic, label: Kubernetes, aliases: [k8s, 쿠버네티스]}
  - {id: service-mesh, type: Topic, label: Service Mesh, aliases: [서비스 메시]}
  - {id: istio, type: Topic, label: Istio, broader: service-mesh}
  - {id: sandbox, type: Topic, label: Sandbox}
  - {id: orchestration, type: Topic, label: Orchestration}
  - {id: cicd, type: Topic, label: CI/CD}
  - {id: continuous-delivery, type: Topic, label: Continuous Delivery, broader: cicd}
  - {id: deployment, type: Topic, label: Deployment, aliases: [배포]}
  - {id: git, type: Topic, label: Git}
  - {id: automation, type: Topic, label: Automation, aliases: [자동화]}
  - {id: versioning, type: Topic, label: Versioning}
  - {id: migration, type: Topic, label: Migration, aliases: [migrations, 마이그레이션]}
  - {id: upgrade, type: Topic, label: Upgrade}
  - {id: compatibility, type: Topic, label: Compatibility, aliases: [호환성]}
  - {id: operations, type: Topic, label: Operations, aliases: [운영]}
  - {id: monitoring, type: Topic, label: Monitoring, aliases: [모니터링]}
  - {id: prometheus, type: Topic, label: Prometheus, broader: monitoring}
  - {id: logging, type: Topic, label: Logging, aliases: [로깅]}
  - {id: metrics, type: Topic, label: Metrics}
  - {id: sre, type: Topic, label: SRE, aliases: [Site Reliability Engineering]}
  - {id: incident, type: Topic, label: Incident, aliases: [장애]}
  - {id: incident-response, type: Topic, label: Incident Response, aliases: [장애 대응]}
  - {id: troubleshooting, type: Topic, label: Troubleshooting, aliases: [트러블슈팅]}
  - {id: debugging, type: Topic, label: Debugging, aliases: [디버깅]}
  - {id: availability, type: Topic, label: Availability, aliases: [가용성]}
  - {id: scalability, type: Topic, label: Scalability, aliases: [확장성]}
  - {id: performance, type: Topic, label: Performance, aliases: [성능]}
  - {id: latency, type: Topic, label: Latency, aliases: [지연 시간]}
  - {id: health-check, type: Topic, label: Health Check}
  - {id: network, type: Topic, label: Network, aliases: [네트워크]}
  - {id: networking, type: Topic, label: Networking}
  - {id: tcp, type: Topic, label: TCP, broader: network}
  - {id: dns, type: Topic, label: DNS, aliases: [Domain Name System], broader: network}
  - {id: osi, type: Topic, label: OSI Model, broader: network}
  - {id: http, type: Topic, label: HTTP}
  - {id: websocket, type: Topic, label: WebSocket, aliases: [웹소켓]}
  - {id: realtime, type: Topic, label: Realtime, aliases: [실시간]}
  - {id: cdn, type: Topic, label: CDN, aliases: [Content Delivery Network]}
  - {id: tls, type: Topic, label: TLS, aliases: [ssl, Transport Layer Security]}
  - {id: proxy, type: Topic, label: Proxy}
  - {id: authentication, type: Topic, label: Authentication, aliases: [authn, 인증]}
  - {id: authorization, type: Topic, label: Authorization, aliases: [authz, 인가]}
  - {id: auth, type: Topic, label: Auth}
  - {id: oauth, type: Topic, label: OAuth, aliases: [oauth2], broader: authorization}
  - {id: identity, type: Topic, label: Identity}
  - {id: permissions, type: Topic, label: Permissions, aliases: [권한]}
  - {id: crypto, type: Topic, label: Crypto, aliases: [cryptography]}
  - {id: owasp, type: Topic, label: OWASP}
  - {id: web-attacks, type: Topic, label: Web Attacks, aliases: [웹 공격]}
  - {id: privacy, type: Topic, label: Privacy, aliases: [개인정보 보호]}
  - {id: governance, type: Topic, label: Governance, aliases: [거버넌스]}
  - {id: supply-chain, type: Topic, label: Supply Chain}
  - {id: dependency, type: Topic, label: Dependency, aliases: [의존성]}
---

# 주제 어휘: 인프라, 운영, 네트워크와 보안

문서 frontmatter의 `tags` 표기를 클라우드와 AWS, 컨테이너, 배포, 관측과 장애 대응, 네트워크, 보안 주제의 Topic 개념에 잇는 매핑 층이다. 태그를 정규화(NFC, 소문자, 공백과 `_`, `-` 제거)한 키가 개념의 `id`, `label`, `aliases` 중 하나와 같으면 그 개념에 연결되며 문서의 태그는 고치지 않는다. 새 표기는 해당 개념의 `aliases`에, 새 주제는 같은 형식의 한 줄로 추가하고 `broader`는 포함 관계가 분명할 때만 쓴다.

상위: [[Ontology-Vocabulary]]
