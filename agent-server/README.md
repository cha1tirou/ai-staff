# AI Staff Agent Server

Claude Agent SDKを使ったオーケストレーター/サブエージェントサーバー。

## Railway へのデプロイ手順

1. agent-serverディレクトリをGitHubの別リポジトリとして作成
   ```
   cd agent-server
   git init
   git add .
   git commit -m "initial"
   gh repo create cha1tirou/ai-staff-agent-server --public --push --source=.
   ```

2. Railway でデプロイ
   - railway.app → New Project → Deploy from GitHub
   - cha1tirou/ai-staff-agent-server を選択

3. Railway の環境変数に設定
   ```
   ANTHROPIC_API_KEY=<your key>
   INTERNAL_SECRET=<random string>  # Next.jsと同じ値を設定
   ```

4. Vercel の環境変数に設定
   ```
   AGENT_SERVER_URL=https://<railway-app>.railway.app
   INTERNAL_SECRET=<同じrandom string>
   ```

## ローカル動作確認

```bash
pip install -r requirements.txt
ANTHROPIC_API_KEY=xxx uvicorn main:app --reload

# テスト
curl -X POST http://localhost:8000/run \
  -H "Content-Type: application/json" \
  -d '{
    "message": "SNS投稿案を出してください",
    "biz_name": "プリシアリゾート与論",
    "sub_agents": [
      {"name": "SNS担当 Ai", "role": "SNS運用担当", "tasks": ["Instagram投稿", "競合調査"]}
    ]
  }'
```
