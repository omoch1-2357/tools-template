# tools-template

新しい個人用ツールを作るための React + Vite テンプレートです。

この repo は、認証、local/cloud 保存、同期、catalog 登録の基盤をあらかじめ持った状態で、ツール固有の UI と状態だけを書き換えやすくすることを目的にしています。新しいツールを作るときは、基盤部分を作り直すのではなく、`tool.config.json` と `src/tool/` 配下を中心に編集してください。

## 新しいツールを作るときに編集するファイル

まず触る場所は次のファイルです。

- `tool.config.json`: ツール名、説明、GitHub repo、catalog 表示設定を定義します。
- `src/tool/ToolWorkspace.tsx`: ツール本体の画面を実装します。
- `src/tool/toolState.ts`: ツール固有の保存状態の初期値と補助関数を定義します。
- `src/tool/toolState.test.ts`: ツール固有 state のテストを置きます。
- `src/styles.css`: 必要な見た目だけを追加・調整します。

基本的に触らない場所は次の領域です。

- `src/features/auth/`: GitHub 認証
- `src/features/tool-state/`: local/cloud 保存と同期
- `src/lib/firebase/`: Firebase client と Firestore access
- `src/config/tool.ts`: `tool.config.json` の読み込みと runtime 補完
- `scripts/sync-tool-catalog.ts`: catalog 同期
- `.github/workflows/`: build/deploy/catalog sync の GitHub Actions

## tool.config.json

`tool.config.json` はアプリ表示と catalog sync の入力です。形式は変更せず、値だけを置き換えます。

```json
{
  "namespace": "omoch1-2357",
  "id": "replace-this-tool-id",
  "name": "Replace This Tool Name",
  "description": "この説明文を置き換えてください。",
  "owner": "replace-this-owner",
  "repo": "replace-this-repo-name",
  "tags": ["sample"],
  "catalogMode": "publish",
  "visible": true,
  "sortOrder": 100
}
```

- `namespace`: catalog 上の名前空間です。英小文字、数字、ハイフンで指定します。
- `id`: ツール固有 ID です。英小文字、数字、ハイフンで指定します。Firestore の catalog document ID は `${namespace}__${id}` になります。
- `name`: 画面と catalog に表示するツール名です。
- `description`: 画面と catalog に表示する説明文です。
- `owner`: GitHub repository owner です。GitHub Actions 上では実際の owner と一致している必要があります。
- `repo`: GitHub repository name です。GitHub Actions 上では実際の repo 名と一致している必要があります。
- `tags`: catalog で使うタグの配列です。
- `catalogMode`: catalog sync の動作です。`publish` / `hide` / `remove` のいずれかを指定します。
- `visible`: `publish` 時に catalog へ表示するかどうかです。
- `sortOrder`: catalog 上の並び順に使う数値です。

### catalogMode

- `publish`: catalog document を作成または更新します。`visible` の値も反映します。
- `hide`: catalog document は残したまま、catalog 上では非表示にします。
- `remove`: catalog document を削除します。ツール自体のデプロイや repo は削除しません。

## src/tool/ToolWorkspace.tsx

`ToolWorkspace.tsx` はツール作成者が主に置き換える UI です。

テンプレート初期状態では textarea、文字数、保存ボタン、リセットボタンを表示しています。実際のツールでは、このコンポーネント内を入力フォーム、計算結果、プレビュー、操作ボタンなどに置き換えてください。

渡される props は保存基盤と接続されています。

- `state`: 現在のツール状態です。
- `loading`: cloud/local 状態の読み込み中かどうかです。
- `saving`: 保存中かどうかです。
- `error`: 保存や同期のエラーです。
- `onDraftChange`: state を更新します。
- `onSave`: local または cloud に保存します。
- `onReset`: state を初期値へ戻します。

保存処理そのものは `src/features/tool-state/` 側にあるため、通常は `ToolWorkspace.tsx` から直接 localStorage や Firestore を触らないでください。

## src/tool/toolState.ts

`toolState.ts` はツール固有 state の初期値と、state に関する小さな pure function を置く場所です。

初期状態では次の形です。

```ts
export const initialToolState = {
  draft: "",
  draftUpdatedAt: null,
};
```

ツールに必要な保存項目が増えたら、`ToolState` の型と合わせて初期値を更新します。local/cloud 保存の key や Firestore schema の扱いは基盤側に寄せているため、このファイルでは「このツールが保存したい状態」を明確にすることに集中してください。

## src/tool/toolState.test.ts

`toolState.test.ts` は `toolState.ts` の初期値や pure function を検証するテストです。

ツール固有の状態変換、入力値の正規化、保存対象が空かどうかの判定など、UI なしで確認できるロジックはここに追加してください。React component の大きなテストを増やす前に、まず pure function と state のテストを小さく保つ方針です。

## 認証・保存・同期の基盤

認証、local/cloud 保存、同期、catalog sync はテンプレートの基盤です。新しいツールを作るだけなら、基本的に次の仕様は変更しません。

- GitHub 認証処理
- localStorage key
- Firestore schema
- local/cloud 保存処理
- Firebase 設定読み込み
- `sync:catalog` の挙動
- GitHub Actions

保存したい state の形を変える場合も、まず `src/tool/toolState.ts` と関連する型・テストの更新で済むかを確認してください。

## 開発コマンド

依存関係の install:

```powershell
pnpm install
```

dev server:

```powershell
pnpm run dev
```

test:

```powershell
pnpm run test
```

production build:

```powershell
pnpm run build
```

catalog sync:

```powershell
pnpm run sync:catalog
```

`sync:catalog` は `FIREBASE_SERVICE_ACCOUNT_JSON` が未設定の場合、catalog sync を skip して正常終了します。GitHub Actions で catalog へ反映する場合は、repository secret として設定してください。

## Firebase env vars

ブラウザ側の Firebase client は Vite の env vars を使います。ローカルでは `.env` を作成し、`.env.example` を参考に値を入れます。

```powershell
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

これらは browser bundle に入る前提の Firebase web app 設定です。secret として扱う service account JSON とは分けてください。

## FIREBASE_SERVICE_ACCOUNT_JSON

`FIREBASE_SERVICE_ACCOUNT_JSON` は catalog sync 用の service account JSON です。Firestore の `tools` collection を作成・更新・削除するために `scripts/sync-tool-catalog.ts` が使います。

扱い方:

- repo に commit しません。
- `.env` やソースコードに直接書きません。
- GitHub Actions では repository secret として設定します。
- JSON 全体を 1 つの環境変数として渡します。
- 未設定の場合、`sync:catalog` は catalog sync を skip します。

この値はブラウザ向けの `VITE_FIREBASE_*` とは用途が異なります。service account は管理者権限を持ち得るため、公開される場所には置かないでください。
