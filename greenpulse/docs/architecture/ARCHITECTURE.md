# GreenPulse — Architecture Technique

## Vue d'ensemble

GreenPulse est une architecture microservices conteneurisée, suivant les principes Clean Architecture et SOLID.

## Diagramme des flux

```
                    ┌─────────────────────────────────────────────┐
                    │              UTILISATEUR                      │
                    └─────────────────────┬───────────────────────┘
                                          │ HTTPS
                    ┌─────────────────────▼───────────────────────┐
                    │         FRONTEND (React + Vite)              │
                    │                                               │
                    │  Dashboard │ Audits │ Reports │ Settings      │
                    │                                               │
                    │  State: Zustand                               │
                    │  Charts: Recharts                             │
                    │  Animations: Framer Motion                   │
                    └─────────────────────┬───────────────────────┘
                                          │ REST API / SSE
                    ┌─────────────────────▼───────────────────────┐
                    │           BACKEND (NestJS)                    │
                    │                                               │
                    │  ┌─────────┐  ┌──────────────────────────┐  │
                    │  │  Auth   │  │      Audit Engine         │  │
                    │  │  JWT    │  │                           │  │
                    │  │  RBAC   │  │  ┌────────────────────┐  │  │
                    │  └─────────┘  │  │  Scanner Registry  │  │  │
                    │               │  │                    │  │  │
                    │               │  │  ┌──┐ ┌──┐ ┌──┐   │  │  │
                    │               │  │  │F │ │B │ │DB│   │  │  │
                    │               │  │  └──┘ └──┘ └──┘   │  │  │
                    │               │  │  ┌──┐ ┌──┐ ┌──┐   │  │  │
                    │               │  │  │I │ │AI│ │Net│   │  │  │
                    │               │  │  └──┘ └──┘ └──┘   │  │  │
                    │               │  └────────────────────┘  │  │
                    │               │                           │  │
                    │               │  ┌──────────┐ ┌───────┐  │  │
                    │               │  │AI Engine │ │Reports│  │  │
                    │               │  │(OpenAI)  │ │(PDF)  │  │  │
                    │               │  └──────────┘ └───────┘  │  │
                    │               └──────────────────────────┘  │
                    │  ┌──────────────────────────────────────────┐ │
                    │  │    Metrics (Prometheus prom-client)       │ │
                    │  └──────────────────────────────────────────┘ │
                    └──────┬──────────────────────────┬────────────┘
                           │                          │
               ┌───────────▼──────────┐    ┌─────────▼────────┐
               │   PostgreSQL 16       │    │    Redis 7        │
               │                      │    │                   │
               │  organizations        │    │  Sessions JWT     │
               │  users                │    │  Cache API        │
               │  audits               │    │  Queue jobs       │
               │  findings             │    │  Rate limiting    │
               │  recommendations      │    └──────────────────┘
               │  reports              │
               │  metrics_history      │
               └──────────────────────┘
                           │
               ┌───────────▼──────────┐    ┌──────────────────┐
               │   Prometheus          │───▶│    Grafana        │
               │                      │    │                   │
               │  Métriques backend    │    │  Dashboard        │
               │  Métriques PostgreSQL │    │  Alertes          │
               │  Métriques système   │    │  Historique       │
               └──────────────────────┘    └──────────────────┘
```

## Pattern des Scanners

Chaque scanner est un service NestJS injectable implémentant `IScanner`:

```typescript
interface IScanner {
  name: string;
  category: ScanCategory;
  scan(target: ScanTarget, options?: ScanOptions): Promise<ScanResult>;
  isAvailable(): Promise<boolean>;
}
```

Le `ScannerRegistry` orchestre les scanners en parallèle (configurable, max N simultanés):

```
runScans(categories, target, options)
  → Batch 1: [frontend, backend, database]   ← parallèle
  → Batch 2: [infrastructure, ai, network]   ← parallèle
  → AiEngine.analyze(allResults)
  → persistResults()
```

## Flux SSE (Server-Sent Events)

Le frontend reçoit les mises à jour de progression en temps réel via SSE:

```
Client: GET /api/audits/:id/status  (SSE connection)
Server:
  → { type: 'progress', category: 'frontend', score: 85, progress: 16 }
  → { type: 'progress', category: 'backend', score: 68, progress: 33 }
  → { type: 'progress', category: 'database', score: 61, progress: 50 }
  → { type: 'progress', category: 'infrastructure', score: 48, progress: 66 }
  → { type: 'progress', category: 'ai_usage', score: 79, progress: 83 }
  → { type: 'progress', message: 'Analyse IA...', progress: 90 }
  → { type: 'completed', score: 72, progress: 100 }
```

## Modèle de données

Le schéma PostgreSQL est conçu pour être scalable:
- `organizations` → `users` (RBAC)
- `projects` → `audits` → `scan_results` → `findings`
- `audits` → `ai_recommendations`
- `audits` → `reports`
- `metrics_history` (time-series, partitionnable)

## Sécurité

- JWT RS256 avec refresh tokens rotatifs
- RBAC: admin > user > viewer
- Rate limiting: 100 req/min/IP (configurable)
- Helmet.js headers de sécurité
- Validation Zod + class-validator
- Logs sécurisés (pas de secrets, PII masqués)
- CORS strict
- User non-root dans Docker

## Scalabilité

- Scanners parallèles avec concurrence configurable
- Redis pour le cache et les queues (BullMQ en production)
- PostgreSQL avec index appropriés
- Docker Compose → Kubernetes-ready (même structure)
- Métriques Prometheus pour l'auto-scaling
