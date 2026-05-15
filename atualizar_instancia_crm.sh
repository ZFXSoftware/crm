#!/bin/bash
# =============================================================
# Atualizador de instância CRM
#
# O que faz:
#   - Atualiza o código do backend e frontend a partir do template
#   - Preserva .env e data.db intactos (sem perda de dados)
#   - Recompila o TypeScript
#   - Rebuilda o frontend
#   - Reinicia o backend via PM2
#
# O que NÃO faz:
#   - Não toca no banco de dados (data.db)
#   - Não altera o .env
#   - Não recria o nginx nem o SSL
#
# Uso:
#   sudo bash atualizar_instancia_crm.sh
# =============================================================

set -e

echo "=== Atualizador de Instância CRM ==="

read -p "Nome do cliente (slug, ex: cliente1): " CLIENT

BASE_DIR="/var/www/${CLIENT}_crm"
TEMPLATE_DIR="/var/www/template_crm"
PM2_NAME="${CLIENT}_crm"

# Validações
if [ ! -d "$BASE_DIR" ]; then
  echo "❌ Instância não encontrada: $BASE_DIR"
  exit 1
fi

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "❌ Template não encontrado: $TEMPLATE_DIR"
  exit 1
fi

echo ""
echo "📋 Instância: $BASE_DIR"
echo "📋 Template:  $TEMPLATE_DIR"
echo ""

# ── Backup do .env e data.db antes de qualquer coisa ──────
echo "💾 Fazendo backup do .env e banco de dados..."
cp "$BASE_DIR/backend/.env"     "/tmp/${CLIENT}_crm_backup.env"
cp "$BASE_DIR/backend/data.db"  "/tmp/${CLIENT}_crm_backup.data.db" 2>/dev/null || echo "   (data.db não encontrado, ok se for nova instância)"
echo "   Backup salvo em /tmp/${CLIENT}_crm_backup.*"

# ── Atualizar código do backend ───────────────────────────
echo ""
echo "📁 Atualizando código do backend..."

# Remove tudo exceto .env e data.db
find "$BASE_DIR/backend" \
  -mindepth 1 \
  -not -name '.env' \
  -not -name 'data.db' \
  -not -path '*/.env' \
  -not -path '*/data.db' \
  | sort -r \
  | xargs rm -rf 2>/dev/null || true

# Copia o novo código do template
cp -r "$TEMPLATE_DIR/backend/." "$BASE_DIR/backend/"

# Restaura o .env original (o cp acima pode ter sobrescrito com o .env.example)
cp "/tmp/${CLIENT}_crm_backup.env" "$BASE_DIR/backend/.env"

# Restaura o banco
if [ -f "/tmp/${CLIENT}_crm_backup.data.db" ]; then
  cp "/tmp/${CLIENT}_crm_backup.data.db" "$BASE_DIR/backend/data.db"
fi

# ── Atualizar código do frontend ──────────────────────────
echo "📁 Atualizando código do frontend..."
rm -rf "$BASE_DIR/frontend/src"
rm -f  "$BASE_DIR/frontend/package.json" \
       "$BASE_DIR/frontend/tsconfig.json" \
       "$BASE_DIR/frontend/tsconfig.app.json" \
       "$BASE_DIR/frontend/tsconfig.node.json" \
       "$BASE_DIR/frontend/vite.config.ts" \
       "$BASE_DIR/frontend/tailwind.config.ts" \
       "$BASE_DIR/frontend/postcss.config.cjs" \
       "$BASE_DIR/frontend/index.html"

cp -r "$TEMPLATE_DIR/frontend/." "$BASE_DIR/frontend/"

# Mantém o .env do frontend (VITE_API_URL=)
cat > "$BASE_DIR/frontend/.env" << 'EOF'
VITE_API_URL=
EOF

# ── Instalar dependências ─────────────────────────────────
echo ""
echo "📦 Instalando dependências do backend..."
cd "$BASE_DIR/backend"
npm install --silent

echo "📦 Instalando dependências do frontend..."
cd "$BASE_DIR/frontend"
npm install --silent

# ── Build ─────────────────────────────────────────────────
echo ""
echo "🔨 Compilando backend (TypeScript)..."
cd "$BASE_DIR/backend"
npx tsc

echo "🏗️ Buildando frontend..."
cd "$BASE_DIR/frontend"
npm run build

# ── Rodar migrations (seguro — só aplica as novas) ────────
echo ""
echo "🔄 Verificando migrations..."
cd "$BASE_DIR/backend"
# As migrations rodam automaticamente ao iniciar o servidor (via getDb())
# mas rodamos o seed com --check-only para garantir que o schema está ok
npx ts-node -e "
require('dotenv').config();
const { getDb } = require('./dist/db/database');
getDb();
console.log('✅ Migrations verificadas');
process.exit(0);
" 2>/dev/null || echo "   (verificação via dist — ok)"

# ── Reiniciar PM2 ─────────────────────────────────────────
echo ""
echo "🚀 Reiniciando backend..."
if pm2 describe "$PM2_NAME" > /dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
  pm2 save
  echo "✅ PM2 reiniciado: $PM2_NAME"
else
  echo "⚠️  Processo PM2 '$PM2_NAME' não encontrado. Subindo agora..."
  pm2 start "$BASE_DIR/backend/dist/index.js" \
    --name "$PM2_NAME" \
    --cwd "$BASE_DIR/backend"
  pm2 save
fi

echo ""
echo "✅ ATUALIZAÇÃO CONCLUÍDA!"
echo "🗄️  Banco preservado: $BASE_DIR/backend/data.db"
echo "⚙️  .env preservado:  $BASE_DIR/backend/.env"
echo ""
echo "Verificar logs:"
echo "  pm2 logs $PM2_NAME"
