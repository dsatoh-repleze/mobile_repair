# Mobile Repair

モバイルリペア管理システム

## 技術スタック

- **Backend**: Laravel 12 / PHP 8.4
- **Frontend**: Next.js 16 / React 19 / TypeScript
- **Database**: MySQL 8.0
- **Cache**: Redis
- **Deploy**: GCP Cloud Run + Cloud SQL

## ローカル開発環境（Docker）

### 起動

```bash
docker compose up --build
```

| サービス | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000/api |
| MySQL | localhost:3306 |
| Redis | localhost:6379 |

### 初回セットアップ

```bash
# マイグレーション
docker compose exec mobile_repair_backend php artisan migrate

# シーダー（必要に応じて）
docker compose exec mobile_repair_backend php artisan db:seed

# アプリキー生成
docker compose exec mobile_repair_backend php artisan key:generate

# JWTシークレット生成
docker compose exec mobile_repair_backend php artisan jwt:secret
```

### 停止

```bash
docker compose down
```

データも含めて削除する場合:

```bash
docker compose down -v
```

## デプロイ

mainブランチへのpushで GitHub Actions が自動的にGCP Cloud Runへデプロイします。

### 必要なGitHubシークレット

| シークレット名 | 説明 |
|--------------|------|
| `WIF_PROVIDER` | Workload Identity Federation Provider |
| `WIF_SERVICE_ACCOUNT` | GCPサービスアカウント |
| `CLOUD_SQL_CONNECTION_NAME` | Cloud SQL接続名 |
| `API_URL` | バックエンドAPIのURL |

### 必要なGitHubリポジトリ変数

| 変数名 | 説明 |
|-------|------|
| `GCP_PROJECT_ID` | GCPプロジェクトID |
