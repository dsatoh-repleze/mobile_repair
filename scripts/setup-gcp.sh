#!/bin/bash
# =============================================================================
# Mobile Repair - GCPリソースセットアップスクリプト
# =============================================================================
# 使い方: bash scripts/setup-gcp.sh
# 前提: gcloud CLI がインストール済みで認証済みであること
# =============================================================================

set -e

PROJECT_ID="mobile-repair-487616"
REGION="asia-northeast1"
SA_NAME="github-actions"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
GITHUB_REPO="dsatoh-repleze/mobile_repair"

echo "=========================================="
echo " Mobile Repair GCP セットアップ"
echo " Project: ${PROJECT_ID}"
echo "=========================================="

# ----- Step 1: プロジェクト設定 -----
echo ""
echo "[1/7] プロジェクトを設定中..."
gcloud config set project ${PROJECT_ID}

# ----- Step 2: API有効化 -----
echo ""
echo "[2/7] 必要なAPIを有効化中..."
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  iamcredentials.googleapis.com

echo "  ✓ API有効化完了"

# ----- Step 3: Artifact Registry -----
echo ""
echo "[3/7] Artifact Registry リポジトリを作成中..."
gcloud artifacts repositories create backend-repo \
  --repository-format=docker \
  --location=${REGION} \
  --description="Mobile Repair Backend" \
  2>/dev/null || echo "  (backend-repo は既に存在します)"

gcloud artifacts repositories create frontend-repo \
  --repository-format=docker \
  --location=${REGION} \
  --description="Mobile Repair Frontend" \
  2>/dev/null || echo "  (frontend-repo は既に存在します)"

echo "  ✓ Artifact Registry 完了"

# ----- Step 4: Cloud SQL -----
echo ""
echo "[4/7] Cloud SQLインスタンスを作成中（数分かかります）..."
gcloud sql instances create mobile-repair-db \
  --database-version=MYSQL_8_0 \
  --tier=db-f1-micro \
  --region=${REGION} \
  --storage-auto-increase \
  2>/dev/null || echo "  (mobile-repair-db は既に存在します)"

gcloud sql databases create mobile_repair \
  --instance=mobile-repair-db \
  2>/dev/null || echo "  (database mobile_repair は既に存在します)"

# DBパスワードの生成
DB_PASSWORD=$(openssl rand -base64 24)
gcloud sql users create mr_user \
  --instance=mobile-repair-db \
  --password="${DB_PASSWORD}" \
  2>/dev/null || echo "  (ユーザー mr_user は既に存在します。パスワード変更はスキップ)"

CLOUD_SQL_CONNECTION=$(gcloud sql instances describe mobile-repair-db --format="value(connectionName)")
echo "  ✓ Cloud SQL 完了"
echo "  → 接続名: ${CLOUD_SQL_CONNECTION}"

# ----- Step 5: Secret Manager -----
echo ""
echo "[5/7] Secret Managerにシークレットを登録中..."

# APP_KEY生成（Laravelフォーマット）
APP_KEY="base64:$(openssl rand -base64 32)"
JWT_SECRET=$(openssl rand -base64 64)

echo -n "mobile_repair" | gcloud secrets create db-name --data-file=- 2>/dev/null || echo "  (db-name は既に存在します)"
echo -n "mr_user" | gcloud secrets create db-user --data-file=- 2>/dev/null || echo "  (db-user は既に存在します)"
echo -n "${DB_PASSWORD}" | gcloud secrets create db-password --data-file=- 2>/dev/null || echo "  (db-password は既に存在します)"
echo -n "${APP_KEY}" | gcloud secrets create app-key --data-file=- 2>/dev/null || echo "  (app-key は既に存在します)"
echo -n "${JWT_SECRET}" | gcloud secrets create jwt-secret --data-file=- 2>/dev/null || echo "  (jwt-secret は既に存在します)"

echo "  ✓ Secret Manager 完了"

# ----- Step 6: サービスアカウント & 権限 -----
echo ""
echo "[6/7] サービスアカウントを作成中..."
gcloud iam service-accounts create ${SA_NAME} \
  --display-name="GitHub Actions" \
  2>/dev/null || echo "  (サービスアカウント ${SA_NAME} は既に存在します)"

echo "  権限を付与中..."
ROLES=(
  "roles/run.admin"
  "roles/artifactregistry.writer"
  "roles/iam.serviceAccountUser"
  "roles/secretmanager.secretAccessor"
  "roles/cloudsql.client"
  "roles/run.invoker"
)

for ROLE in "${ROLES[@]}"; do
  gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --quiet > /dev/null
done

echo "  ✓ サービスアカウント & 権限 完了"

# ----- Step 7: Workload Identity Federation -----
echo ""
echo "[7/7] Workload Identity Federation を設定中..."
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")

gcloud iam workload-identity-pools create github-pool \
  --location=global \
  --display-name="GitHub Pool" \
  2>/dev/null || echo "  (github-pool は既に存在します)"

gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
  2>/dev/null || echo "  (github-provider は既に存在します)"

gcloud iam service-accounts add-iam-policy-binding ${SA_EMAIL} \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_REPO}" \
  --quiet > /dev/null

WIF_PROVIDER=$(gcloud iam workload-identity-pools providers describe github-provider \
  --location=global \
  --workload-identity-pool=github-pool \
  --format="value(name)")

echo "  ✓ Workload Identity Federation 完了"

# ----- 結果サマリー -----
echo ""
echo "=========================================="
echo " セットアップ完了！"
echo "=========================================="
echo ""
echo "以下をGitHubリポジトリに設定してください:"
echo ""
echo "--- Repository Variables (Settings → Variables) ---"
echo "  GCP_PROJECT_ID = ${PROJECT_ID}"
echo ""
echo "--- Repository Secrets (Settings → Secrets) ---"
echo "  WIF_PROVIDER           = ${WIF_PROVIDER}"
echo "  WIF_SERVICE_ACCOUNT    = ${SA_EMAIL}"
echo "  CLOUD_SQL_CONNECTION_NAME = ${CLOUD_SQL_CONNECTION}"
echo "  API_URL                = (デプロイ後に設定: https://mobile-repair-backend-xxxxx-an.a.run.app/api)"
echo ""
echo "※ API_URLはバックエンドの初回デプロイ後にCloud RunのURLを確認して設定してください"
echo "  確認コマンド: gcloud run services describe mobile-repair-backend --region=${REGION} --format='value(status.url)'"
