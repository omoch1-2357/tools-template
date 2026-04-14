# tools-template

GitHub Pages に公開する各ツール用のテンプレートです。

## 最初に置き換えるもの

- `tool.config.json`
- `.env.local`
- 画面本体の `src/ui/App.tsx`
- `tool.config.json` の `namespace` は保存先を変えない固定値として扱う
- `tool.config.json` の `owner` を実際の GitHub owner にする
- `tool.config.json` の `id` は必ず一意の値に変える
- 公開停止や削除前は `tool.config.json` の `catalogMode` を `hide` または `remove` にしてから push する
- Firestore 上の `toolId` と catalog の document ID は `namespace__id` が使われる

## ローカル起動

```bash
npm install
npm run dev
```

## GitHub 側の設定

### Actions Variables

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Actions Secret

- `FIREBASE_SERVICE_ACCOUNT_JSON`

### Pages

- `Settings` -> `Pages`
- `Build and deployment` -> `Source`
- `GitHub Actions`

## Firestore

このテンプレートは次のパスに保存します。

- 未ログイン: `localStorage`
- ログイン時: `users/{uid}/apps/{toolId}`
- 公開カタログ: `tools/{toolId}`

`main` に push すると、このテンプレートは repo 名から公開 URL を組み立てて `tools` コレクションを自動更新します。
