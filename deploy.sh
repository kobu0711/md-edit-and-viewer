#!/bin/bash
# ============================================================
#  md-edit-and-viewer デプロイスクリプト
#  対象サーバ : 192.168.0.110  (/home/k-ohara/work/md-edit-and-viewer)
#  使い方     : ./deploy.sh          アプリコードのみ転送 → イメージ再ビルド＆再起動
#               ./deploy.sh all      + ルート設定ファイルも転送 → down してから再ビルド＆再起動
#  注記       : 本番は nginx がビルド済み静的ファイルを配信する構成（マウントなし）のため、
#               コード変更のみでもイメージの再ビルドが常に必要です。
# ============================================================

set -e

SERVER="k-ohara@192.168.0.110"
REMOTE="/home/k-ohara/work/md-edit-and-viewer"

echo ""
echo "=== md-edit-and-viewer デプロイ開始 ==="
echo "  送信先: ${SERVER}:${REMOTE}"
echo ""

# [1] リモートディレクトリを確認・作成
echo "[1/4] リモートディレクトリを確認中..."
ssh "${SERVER}" "mkdir -p ${REMOTE}"

# [2] アプリコードを転送（ディレクトリごと rsync・.env は除外）
echo "[2/4] アプリコードを転送中..."
rsync -av --exclude='.env' --exclude='node_modules' --exclude='dist' --exclude='coverage' ./app/ "${SERVER}:${REMOTE}/app/"

if [ "${1}" = "all" ]; then
  # [3] 設定ファイルを転送（ルート直下の設定ファイルをまとめて転送・.env は除外）
  echo "[3/4] 設定ファイルを転送中..."
  rsync -av --exclude='.env' --exclude='app/' ./ "${SERVER}:${REMOTE}/"

  # [4] コンテナを再ビルド・再起動（本番はビルドステージを含む compose のため --build が必要）
  echo "[4/4] コンテナを再ビルド・再起動中..."
  ssh "${SERVER}" "cd ${REMOTE} && docker compose down && docker compose up -d --build"
else
  echo "[3/4] 設定ファイルはスキップ  (./deploy.sh all で含められます)"
  echo "[4/4] コンテナを再ビルド・再起動中（本番はビルドステージのため常に --build）..."
  ssh "${SERVER}" "cd ${REMOTE} && docker compose up -d --build"
fi

echo ""
echo "=== デプロイ完了 ==="
echo ""
