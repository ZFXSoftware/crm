#!/bin/bash
set -e  # para imediatamente se qualquer comando falhar
echo "=== Criador de Instância CRM ==="

# ================= INPUTS =================
read -p "Nome do cliente (slug, ex: cliente1): " CLIENT
read -p "Nome do admin: " ADMIN_NAME
read -p "Email do admin: " ADMIN_EMAIL
read -p "Senha do admin: " ADMIN_PASS
read -p "Domínio (ex: crm.cliente.com): " DOMAIN

BASE_DIR="/var/www/${CLIENT}_crm"
TEMPLATE_DIR="/var/www/template_crm"

# ================= VALIDAÇÕES =================
if [ -d "$BASE_DIR" ]; then
  echo "❌ Diretório $BASE_DIR já existe. Use outro slug ou remova o diretório antes."
  exit 1
fi

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "❌ Template não encontrado em $TEMPLATE_DIR"
  exit 1
fi

# ================= PORTA LIVRE =================
echo "🔎 Buscando porta livre..."
PORT=3001
while lsof -i :$PORT >/dev/null 2>&1; do
  PORT=$((PORT+1))
done
echo "✅ Porta: $PORT"

# ================= JWT SECRET =================
JWT_SECRET=$(openssl rand -hex 32)

# ================= CRIA ESTRUTURA =================
echo "📁 Copiando template..."
mkdir -p $BASE_DIR
cp -r $TEMPLATE_DIR/. $BASE_DIR/

# ================= FRONTEND =================
cd $BASE_DIR/frontend
echo "📦 Instalando frontend..."
npm install --silent

# VITE_API_URL vazio = usa o mesmo domínio via nginx (sem CORS)
cat > .env << EOF
VITE_API_URL=
EOF

echo "🏗️ Buildando frontend..."
npm run build

# ================= BACKEND =================
cd $BASE_DIR/backend
echo "📦 Instalando backend..."
npm install --silent

cat > .env << EOF
PORT=${PORT}
CORS_ORIGIN=https://${DOMAIN}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
SEED_ADMIN_NAME=${ADMIN_NAME}
SEED_ADMIN_EMAIL=${ADMIN_EMAIL}
SEED_ADMIN_PASSWORD=${ADMIN_PASS}
EOF

echo "🔨 Compilando TypeScript..."
npx tsc

echo "🧠 Rodando seed..."
# As migrations rodam automaticamente dentro do seed ao chamar getDb()
# Não existe "npm run migrate" separado — tudo é automático
npx ts-node src/db/seed.ts

# ================= NGINX =================
echo "🌐 Configurando Nginx..."
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"

cat > $NGINX_CONF << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    # Frontend React (SPA)
    root ${BASE_DIR}/frontend/dist;
    index index.html;

    location / {
        try_files \$uri /index.html;
    }

    # Proxy /api → backend
    location /api {
        proxy_pass http://localhost:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;
    }

    # Proxy /auth → backend (login, registro, convites)
    location /auth {
        proxy_pass http://localhost:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:${PORT};
        proxy_set_header Host \$host;
    }
}
EOF

ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# ================= SSL =================
echo "🔒 Gerando SSL..."
certbot --nginx -d ${DOMAIN} \
  --non-interactive \
  --agree-tos \
  -m ${ADMIN_EMAIL} \
  --redirect

# ================= PM2 =================
echo "🚀 Subindo com PM2..."
cd $BASE_DIR/backend

pm2 start dist/index.js \
  --name "${CLIENT}_crm" \
  --cwd "$BASE_DIR/backend"

pm2 save

# ================= FINAL =================
echo ""
echo "✅ INSTÂNCIA CRIADA COM SUCESSO!"
echo "🌍 https://${DOMAIN}"
echo "📡 Porta backend: ${PORT}"
echo "🗄️  Banco: ${BASE_DIR}/backend/data.db"
echo ""
echo "Gerenciar:"
echo "  pm2 logs ${CLIENT}_crm"
echo "  pm2 restart ${CLIENT}_crm"
echo "  pm2 stop ${CLIENT}_crm"
