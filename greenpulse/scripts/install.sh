#!/bin/bash
# =============================================================
# GreenPulse — Script d'installation et de démarrage
# =============================================================
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║         🌱 GreenPulse Installer       ║${NC}"
echo -e "${GREEN}║     Green IT Audit SaaS Platform      ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""

# Vérification des prérequis
check_requirements() {
  echo -e "${YELLOW}→ Vérification des prérequis...${NC}"

  if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker non trouvé. Installez Docker Desktop.${NC}"
    exit 1
  fi

  if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}✗ Docker Compose non trouvé.${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ Docker installé${NC}"
  echo -e "${GREEN}✓ Docker Compose installé${NC}"
}

# Configuration .env
setup_env() {
  if [ ! -f .env ]; then
    echo -e "${YELLOW}→ Création du fichier .env...${NC}"
    cp .env.example .env

    # Générer un JWT secret aléatoire
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || cat /dev/urandom | tr -dc 'a-zA-Z0-9' | head -c 64)
    sed -i "s/your_super_secret_jwt_key_change_this_in_production_minimum_32_chars/${JWT_SECRET}/" .env

    echo -e "${GREEN}✓ .env créé${NC}"
    echo -e "${YELLOW}⚠ N'oubliez pas d'ajouter votre OPENAI_API_KEY dans .env${NC}"
  else
    echo -e "${GREEN}✓ .env existant${NC}"
  fi
}

# Démarrage des services
start_services() {
  echo -e "${YELLOW}→ Démarrage des services Docker...${NC}"

  docker compose up -d --build

  echo -e "${YELLOW}→ Attente que les services soient prêts...${NC}"
  sleep 10

  # Vérification santé
  echo -e "${YELLOW}→ Vérification de la santé des services...${NC}"

  for service in greenpulse-postgres greenpulse-redis greenpulse-backend greenpulse-frontend; do
    if docker ps | grep -q "$service"; then
      echo -e "${GREEN}✓ $service opérationnel${NC}"
    else
      echo -e "${RED}✗ $service non démarré${NC}"
    fi
  done
}

# Message final
print_urls() {
  echo ""
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  echo -e "${GREEN}        🎉 GreenPulse est prêt !        ${NC}"
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  echo ""
  echo -e "  🌐 Application    → ${GREEN}http://localhost:3000${NC}"
  echo -e "  🔌 API Backend    → ${GREEN}http://localhost:3001${NC}"
  echo -e "  📚 Swagger Docs   → ${GREEN}http://localhost:3001/api/docs${NC}"
  echo -e "  📊 Grafana        → ${GREEN}http://localhost:3002${NC}"
  echo -e "  🔥 Prometheus     → ${GREEN}http://localhost:9090${NC}"
  echo ""
  echo -e "  Compte admin:     admin@greenpulse.io / Admin123!"
  echo ""
  echo -e "${YELLOW}Arrêter: docker compose down${NC}"
  echo -e "${YELLOW}Logs:    docker compose logs -f backend${NC}"
  echo ""
}

# Exécution
check_requirements
setup_env
start_services
print_urls
