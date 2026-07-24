# 表現パターン集

`createServer(jsx)` に渡すJSXの組み立て方。すべて `ReactDOM.createRoot(...).render(<...>)`
の中に入れる想定。固定コンポーネントではなく参考例。内容に応じて自由に変えてよい。

## 構造化データの一覧表示（struct / JSON定義など）

フィールド名と型のペアをテーブルで見せる。

```jsx
<table>
  <tbody>
    <tr><td>id</td><td>number</td></tr>
    <tr><td>name</td><td>string</td></tr>
    <tr><td>email</td><td>string</td></tr>
  </tbody>
</table>
```

## データの変化を見せる（diff表現）

前回の状態と比較し、追加・変更・削除された行に `className` を付けて
ハイライトする。スタイルはJSX内に `<style>` タグとして直接埋め込める。

```jsx
<>
  <style>{`
    .added { background: #dfd; }
    .changed { background: #ffd; }
    .removed { background: #fdd; text-decoration: line-through; }
  `}</style>
  <table>
    <tbody>
      <tr className="added"><td>email</td><td>string</td></tr>
      <tr><td>id</td><td>number</td></tr>
      <tr className="removed"><td>age</td><td>number</td></tr>
    </tbody>
  </table>
</>
```

## 今後追加するパターン

- ステップ実行（処理の各ステップを前後に移動しながら見せる）
- データフローグラフ（ノード・エッジで処理の流れを可視化）
- フォーム編集（structへのフィールド追加をUIから行い、変更を送り返す）

新しいパターンを作ったら、ここに追記していく。
