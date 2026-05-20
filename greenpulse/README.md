# 🌱 GreenPulse — Plateforme SaaS d'Audit Green IT

> **Auditez. Mesurez. Optimisez. Conformez-vous à la loi REEN.**

GreenPulse est une plateforme SaaS enterprise qui permet à toute organisation d'auditer automatiquement l'intégralité de son environnement numérique pour mesurer son impact environnemental, détecter les inefficacités techniques et générer des rapports de conformité à la loi **REEN (Réduction de l'Empreinte Environnementale du Numérique)**.

---

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Scanners](#scanners)
- [Moteur IA](#moteur-ia)
- [Rapports](#rapports)
- [Conformité REEN](#conformité-reen)
- [Contribution](#contribution)

---

## Vue d'ensemble

La loi REEN oblige les organisations françaises à mesurer et réduire leur empreinte numérique. GreenPulse automatise entièrement cet audit en analysant :

| Domaine | Ce qui est analysé |
|---|---|
| **Frontend** | Lighthouse scores, poids assets, images non optimisées, JS inutile |
| **Backend** | Temps réponse API, CPU/RAM, memory leaks, requêtes DB excessives |
| **Base de données** | Requêtes lentes, index manquants, connexions inutiles |
| **Infrastructure** | Containers inutilisés, cloud surdimensionné, services inactifs |
| **IA** | Coût énergétique des prompts, appels excessifs, cache manquant |
| **Réseau** | Payloads trop lourds, requêtes répétitives, trafic excessif |

### Scores générés

```
Score Global Green IT    ████████░░  82/100
Score Énergie           ██████░░░░  65/100
Score CO₂               ███████░░░  74/100
Score Frontend          █████████░  91/100
Score Backend           ███████░░░  70/100
Score Base de données   ██████░░░░  63/100
Score Infrastructure    ████░░░░░░  48/100
Score IA                ████████░░  80/100
Score Réseau            ███████░░░  75/100
```

---

## Fonctionnalités

### 🔍 Audit automatique multi-domaines
- **6 scanners indépendants** et modulaires (Frontend, Backend, BDD, Infra, IA, Réseau)
- Analyse Lighthouse intégrée via Puppeteer
- Analyse des métriques système (CPU, RAM, disque)
- Analyse Docker et containers
- Analyse PostgreSQL (slow queries, index manquants)

### 🤖 Moteur IA
- Analyse contextuelle des résultats d'audit
- Recommandations personnalisées et priorisées
- Génération de plans d'action concrets
- Estimation d'impact (ex: "compression images = -18% bande passante")
- Propulsé par OpenAI GPT-4o

### 📊 Dashboard temps réel
- Interface moderne style Datadog/Vercel
- Graphiques interactifs (Recharts)
- Heatmaps de consommation
- Alertes et incidents
- Historique des audits

### 📄 Rapports professionnels
- Export PDF professionnel
- Rapport de conformité REEN
- Checklist Green IT
- Export JSON/CSV
- Recommandations prioritaires

### 🔐 Sécurité enterprise
- Authentification JWT + Refresh tokens
- RBAC (admin/user/viewer)
- Rate limiting
- Validation Zod
- Logs sécurisés

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GREENPULSE PLATFORM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐     ┌──────────────────────────────────────┐  │
│  │   FRONTEND   │────▶│            BACKEND (NestJS)           │  │
│  │  React/Vite  │     │                                        │  │
│  │  TypeScript  │     │  ┌──────────┐  ┌──────────────────┐  │  │
│  │  TailwindCSS │     │  │   Auth   │  │   Audit Engine   │  │  │
│  │  Framer      │     │  │  Module  │  │                  │  │  │
│  │  Recharts    │     │  └──────────┘  └────────┬─────────┘  │  │
│  └──────────────┘     │                          │            │  │
│                        │  ┌───────────────────────▼──────┐   │  │
│                        │  │       SCANNER REGISTRY        │   │  │
│                        │  │                               │   │  │
│                        │  │  ┌────────┐  ┌────────────┐  │   │  │
│                        │  │  │ Front  │  │  Backend   │  │   │  │
│                        │  │  │Scanner │  │  Scanner   │  │   │  │
│                        │  │  └────────┘  └────────────┘  │   │  │
│                        │  │  ┌────────┐  ┌────────────┐  │   │  │
│                        │  │  │  DB    │  │   Infra    │  │   │  │
│                        │  │  │Scanner │  │  Scanner   │  │   │  │
│                        │  │  └────────┘  └────────────┘  │   │  │
│                        │  │  ┌────────┐  ┌────────────┐  │   │  │
│                        │  │  │  AI    │  │  Network   │  │   │  │
│                        │  │  │Scanner │  │  Scanner   │  │   │  │
│                        │  │  └────────┘  └────────────┘  │   │  │
│                        │  └───────────────────────────────┘   │  │
│                        │                                        │  │
│                        │  ┌──────────────┐  ┌──────────────┐  │  │
│                        │  │  AI Engine   │  │   Reports    │  │  │
│                        │  │  (OpenAI)    │  │  (PDF/JSON)  │  │  │
│                        │  └──────────────┘  └──────────────┘  │  │
│                        └──────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  PostgreSQL  │  │  Prometheus  │  │       Grafana        │   │
│  │  (données)   │  │  (métriques) │  │    (monitoring)      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stack technique

| Couche | Technologie | Version |
|---|---|---|
| **Frontend** | React + Vite | 18.x / 5.x |
| **UI Components** | Shadcn/UI + TailwindCSS | latest |
| **Animations** | Framer Motion | 11.x |
| **Charts** | Recharts | 2.x |
| **State Management** | Zustand | 4.x |
| **Backend** | NestJS + TypeScript | 10.x |
| **ORM** | TypeORM | 0.3.x |
| **Base de données** | PostgreSQL | 16 |
| **Cache** | Redis | 7.x |
| **Validation** | Zod + class-validator | latest |
| **Auth** | JWT + Passport | latest |
| **Scanner Web** | Puppeteer + Lighthouse | latest |
| **Monitoring** | Prometheus + Grafana | latest |
| **IA** | OpenAI API (GPT-4o) | latest |
| **PDF** | PDFKit | latest |
| **Containerisation** | Docker + Docker Compose | latest |

---

## Démarrage rapide

### Prérequis

- Docker Desktop 4.x+
- Node.js 20+
- npm 10+ ou pnpm 9+

### 1. Cloner et configurer

```bash
git clone https://github.com/your-org/greenpulse.git
cd greenpulse
cp .env.example .env
```

### 2. Configurer les variables d'environnement

```bash
# Éditez .env avec vos clés :
nano .env
```

Variables importantes à configurer :
- `OPENAI_API_KEY` — Clé OpenAI pour le moteur IA
- `JWT_SECRET` — Secret JWT (changez en production !)
- `POSTGRES_PASSWORD` — Mot de passe PostgreSQL

### 3. Lancer avec Docker Compose

```bash
# Démarrage complet (recommandé)
docker-compose up -d

# Ou avec le script d'installation
chmod +x scripts/install.sh
./scripts/install.sh
```

### 4. Initialiser la base de données

```bash
docker-compose exec backend npm run migration:run
docker-compose exec backend npm run seed:run
```

### 5. Accéder à la plateforme

| Service | URL | Credentials |
|---|---|---|
| **GreenPulse App** | http://localhost:3000 | admin@greenpulse.io / Admin123! |
| **API Backend** | http://localhost:3001 | — |
| **API Docs (Swagger)** | http://localhost:3001/api/docs | — |
| **Grafana** | http://localhost:3002 | admin / admin |
| **Prometheus** | http://localhost:9090 | — |

---

## Configuration

### Variables d'environnement

| Variable | Description | Défaut |
|---|---|---|
| `NODE_ENV` | Environnement | `development` |
| `PORT` | Port backend | `3001` |
| `FRONTEND_URL` | URL frontend | `http://localhost:3000` |
| `DATABASE_URL` | URL PostgreSQL complète | — |
| `REDIS_URL` | URL Redis | `redis://localhost:6379` |
| `JWT_SECRET` | Secret JWT | **Obligatoire** |
| `JWT_EXPIRY` | Expiration token | `7d` |
| `OPENAI_API_KEY` | Clé API OpenAI | **Obligatoire pour IA** |
| `OPENAI_MODEL` | Modèle OpenAI | `gpt-4o` |
| `PROMETHEUS_METRICS_PORT` | Port Prometheus | `9091` |
| `MAX_CONCURRENT_SCANS` | Scans simultanés | `3` |
| `SCAN_TIMEOUT_MS` | Timeout scan | `120000` |

---

## API Reference

### Authentication

```
POST   /api/auth/login          — Connexion
POST   /api/auth/register       — Inscription
POST   /api/auth/refresh        — Refresh token
POST   /api/auth/logout         — Déconnexion
GET    /api/auth/me             — Profil utilisateur
```

### Audits

```
GET    /api/audits              — Liste des audits
POST   /api/audits              — Créer un audit
GET    /api/audits/:id          — Détail d'un audit
DELETE /api/audits/:id          — Supprimer un audit
POST   /api/audits/:id/run      — Lancer un audit
GET    /api/audits/:id/status   — Statut en temps réel
GET    /api/audits/:id/results  — Résultats complets
POST   /api/audits/:id/stop     — Arrêter un audit
```

### Rapports

```
GET    /api/reports             — Liste des rapports
POST   /api/reports/generate    — Générer un rapport
GET    /api/reports/:id/pdf     — Télécharger PDF
GET    /api/reports/:id/json    — Export JSON
GET    /api/reports/:id/csv     — Export CSV
```

### Métriques

```
GET    /api/metrics/dashboard   — Métriques dashboard
GET    /api/metrics/trends      — Tendances
GET    /api/metrics/co2         — Émissions CO₂
GET    /api/metrics/energy      — Consommation énergie
```

### Recommandations IA

```
POST   /api/ai/analyze          — Analyse IA d'un audit
GET    /api/ai/recommendations/:auditId — Recommandations
POST   /api/ai/action-plan      — Générer plan d'action
```

---

## Scanners

### Architecture des scanners

Chaque scanner implémente l'interface `IScanner` et est indépendant :

```typescript
interface IScanner {
  name: string;
  category: ScanCategory;
  scan(target: ScanTarget, options: ScanOptions): Promise<ScanResult>;
  getScore(results: ScanFinding[]): number;
}
```

### Scanner Frontend (Lighthouse)
Analyse les performances et l'éco-conception des pages web via Puppeteer + Lighthouse.

**Métriques collectées :**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Total Blocking Time (TBT)
- Poids total de la page (KB)
- Images non optimisées (WebP, compression)
- JavaScript non utilisé
- CSS non utilisé
- Requêtes HTTP excessives

### Scanner Backend
Analyse les APIs et services backend.

**Métriques collectées :**
- Temps de réponse moyen / P95 / P99
- Consommation CPU et RAM
- Endpoints sans cache
- Endpoints inutilisés (0 appel / 30j)
- Erreurs 5xx
- Connexions DB non fermées

### Scanner Base de données
Analyse PostgreSQL/MySQL via connexion directe.

**Métriques collectées :**
- Slow queries (>100ms)
- Index manquants (seq scans)
- Tables sans accès récent
- Connexions inactives
- Taille des tables
- Requêtes dupliquées

### Scanner Infrastructure
Analyse Docker, serveurs et cloud.

**Métriques collectées :**
- CPU/RAM moyen des containers (7j)
- Containers arrêtés non supprimés
- Images Docker non utilisées
- Volumes orphelins
- Services avec uptime > 99.9% mais 0 trafic

### Scanner IA
Estime le coût énergétique des appels IA.

**Métriques collectées :**
- Nombre d'appels / jour
- Tokens utilisés
- CO₂ estimé par appel (gCO₂eq)
- Coût énergétique (kWh)
- Appels sans cache
- Prompts redondants

### Scanner Réseau
Analyse le trafic réseau et les payloads.

**Métriques collectées :**
- Taille moyenne des payloads
- Trafic total / jour
- Requêtes sans compression (gzip/brotli)
- WebSockets inactifs
- Requêtes dupliquées

---

## Moteur IA

Le moteur IA analyse l'ensemble des résultats de scan et génère :

1. **Analyse contextuelle** — Comprend pourquoi les scores sont mauvais
2. **Recommandations prioritaires** — Classées par impact/effort
3. **Plans d'action** — Étapes concrètes et ordonnées
4. **Estimations d'impact** — Gains mesurables attendus

### Exemple de recommandation générée

```json
{
  "priority": "critical",
  "category": "frontend",
  "title": "Optimisation des images",
  "description": "23 images non converties en WebP détectées",
  "impact": "Réduction estimée de 18% de la bande passante",
  "effort": "low",
  "co2_reduction_grams": 45.2,
  "energy_saving_kwh": 0.12,
  "action_steps": [
    "Installer sharp ou imagemin",
    "Convertir automatiquement en WebP au build",
    "Ajouter lazy loading sur les images below-fold"
  ]
}
```

---

## Rapports

### Rapport PDF
Généré avec PDFKit, le rapport inclut :
- Page de couverture avec logo et scores
- Résumé exécutif
- Scores détaillés par domaine
- Top 10 des problèmes critiques
- Plan d'action priorisé
- Annexes techniques

### Rapport de conformité REEN
Checklist officielle de la loi REEN 2021 :
- Article 35 : Stratégie numérique responsable
- Référentiel général d'écoconception (RGESN)
- Indicateurs de performance énergétique
- Objectifs de réduction

---

## Conformité REEN

La **loi REEN** (n°2021-1485 du 15 novembre 2021) impose aux entreprises françaises :

| Obligation | Échéance | Couverture GreenPulse |
|---|---|---|
| Définir une stratégie numérique responsable | 2025 | ✅ Rapport de stratégie |
| Mesurer l'empreinte numérique | 2025 | ✅ Métriques CO₂/énergie |
| Réduire la consommation énergie data centers | 2026 | ✅ Scanner Infrastructure |
| Éco-conception des services numériques | 2027 | ✅ Scanner Frontend (RGESN) |
| Former les équipes au numérique responsable | En cours | ✅ Recommandations pédagogiques |

---

## Développement

### Installation en local (sans Docker)

```bash
# Backend
cd apps/backend
npm install
npm run start:dev

# Frontend
cd apps/frontend
npm install
npm run dev
```

### Tests

```bash
# Tests unitaires backend
cd apps/backend
npm run test

# Tests e2e
npm run test:e2e

# Coverage
npm run test:cov
```

### Linting et formatage

```bash
npm run lint
npm run format
```

---

## Structure du projet

```
greenpulse/
├── apps/
│   ├── frontend/                    # Application React
│   │   ├── src/
│   │   │   ├── api/                 # Clients API
│   │   │   ├── components/
│   │   │   │   ├── audit/           # Composants audit
│   │   │   │   ├── charts/          # Graphiques
│   │   │   │   ├── dashboard/       # Dashboard
│   │   │   │   ├── layout/          # Layout global
│   │   │   │   └── ui/              # Composants UI
│   │   │   ├── hooks/               # Custom hooks
│   │   │   ├── pages/               # Pages
│   │   │   ├── store/               # State Zustand
│   │   │   ├── types/               # Types TypeScript
│   │   │   └── utils/               # Utilitaires
│   │   └── package.json
│   │
│   └── backend/                     # API NestJS
│       ├── src/
│       │   ├── ai-engine/           # Moteur IA
│       │   ├── audits/              # Module audits
│       │   ├── auth/                # Authentification
│       │   ├── common/              # Shared utilities
│       │   ├── metrics/             # Métriques Prometheus
│       │   ├── reports/             # Génération rapports
│       │   ├── scanners/            # Scanners indépendants
│       │   │   ├── frontend/        # Scanner web Lighthouse
│       │   │   ├── backend/         # Scanner APIs
│       │   │   ├── database/        # Scanner PostgreSQL
│       │   │   ├── infrastructure/  # Scanner Docker/Cloud
│       │   │   ├── ai-usage/        # Scanner conso IA
│       │   │   └── network/         # Scanner réseau
│       │   └── users/               # Module utilisateurs
│       └── package.json
│
├── packages/
│   └── shared/                      # Types partagés
│
├── infrastructure/
│   ├── postgres/                    # Schema SQL + migrations
│   ├── prometheus/                  # Config Prometheus
│   └── grafana/                     # Dashboards Grafana
│
├── scripts/                         # Scripts d'installation
├── docs/                            # Documentation
├── docker-compose.yml               # Dev
├── docker-compose.prod.yml          # Production
└── .env.example
```

---

## Licence

MIT — GreenPulse © 2025

---

> *"Le meilleur code est le code qui ne s'exécute pas. Le meilleur serveur est celui qui ne consomme que ce dont il a besoin."*
