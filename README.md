# 災厄と継承の呪い — GitHub Pages移行版

ビルド不要の静的サイトです。GitHub PagesのプロジェクトURL（/リポジトリ名/）でも動作する相対パスを使用しています。

## ブラウザから公開する

1. GitHubで新規リポジトリを作成します。例：`calamity-zelg`。
2. このZIPを展開し、`index.html`、`style.css`、`story.js`、`app.js`、`assets`フォルダを、リポジトリの最上位にアップロードしてコミットします。ZIPファイル自体や、これらを囲むフォルダをアップロードしないでください。`.nojekyll`と本READMEも同じ場所に置けます。
3. リポジトリの **Settings → Pages** を開きます。
4. **Source → Deploy from a branch** を選択します。
5. **Branch → main / (root)** を選択して **Save** を押します。ブランチ名が異なる場合はアップロード先ブランチを選びます。
6. デプロイ完了後、Pages画面に表示されたURLを開きます。通常は `https://ユーザー名.github.io/リポジトリ名/` です。

公式手順：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## セーブデータの引き継ぎ

公開先ドメインが変わるため、元サイトのブラウザ保存データは自動では移りません。

1. 元サイトで「設定・セーブ → コードを書き出す」を押し、コード全文をコピーします。
2. GitHub Pages側で「設定・セーブ」の入力欄へ貼り付け、「コードから復元」を押します。
3. 現在の進行、既読情報、到達した結末を引き継ぎます。手動セーブの3スロットと音量・表示速度は、このコードに含まれません。

## 内容と制限

- 横向き専用の短編版。全6結末、22シーン。
- 断片収集・関係値・会話履歴・AUTO・既読スキップ。
- 自動保存と3手動セーブ。保存先は各端末のブラウザです。
- 背景は画像生成で作成。音はWeb Audioによる合成環境音。
- 立ち絵（リーネ・セリオン・ティア）は実装済み。場面別CG・AI生成BGMは未実装。
- セリオンの`serious.png`は素材がないため未登録です（確認ページでは「不足」と表示されます）。
- GitHub Pagesに移行すると、ChatGPTの本人限定アクセスは引き継がれません。通常のPagesはURLを知る人がアクセスできます。
- GitHub Pagesへのデプロイと実機表示は未検証です。

## 編集対象

- `story.js`：本文、選択肢、関係値、結末条件。
- `app.js`：ゲームの進行・保存など。
- `style.css`：表示。
- `stage.js`：場面ごとの立ち絵の表情・登場指定（配列の添字はlinesの添字、nullは非表示）。
- `portraits.js` / `portraits.css`：立ち絵の素材定義と表示位置・縮尺。
- `character-preview.html`：立ち絵の確認ページ（物語は読み込まず、進行・セーブには触れません）。
- `assets/characters/`：立ち絵。各キャラの表情は`portraits.js`の`PORTRAITS`で定義します。
- `assets/cathedral.webp`：背景画像。

変更したファイルをmainへコミットすると、再公開されます。
