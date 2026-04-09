# AI Staff

質問に答えるだけで、自律型デジタル従業員を生成するサービス。

Claude Managed Agents を使って、毎日メールで報告・実行するAIスタッフを作れます。

## 技術スタック

- **フロントエンド**: Next.js 15 + Tailwind CSS → Vercel
- **エージェント基盤**: Claude Managed Agents API
- **メール**: Gmail API (MCP経由)
- **DB**: PostgreSQL (Railway)

## セットアップ

```bash
npm install
cp .env.example .env.local
# .env.local に API キーを設定

npm run dev
```

## アーキテクチャ

```
ユーザー（オンボーディング）
        ↓
POST /api/agents
        ↓
Managed Agents API でエージェント生成
        ↓
agent_id + environment_id を DB に保存
        ↓
毎朝 cron でセッション起動
        ↓
エージェントがメール送信
```

## TODO

- [ ] PostgreSQL 接続 (Railway)
- [ ] 朝のcronセッション起動
- [ ] Gmailミッション変更の検知・反映
- [ ] 週次レビューメール
- [ ] ダッシュボード（エージェント管理画面）
