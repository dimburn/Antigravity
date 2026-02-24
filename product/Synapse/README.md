# Synapse - WBS Project Manager

WBSプロジェクト管理アプリケーション

## 概要

PC版とモバイル版でデバイス別に役割を分ける「ハイブリッド設計」のプロジェクト管理ツールです。

- **PC版**: 高密度な管理コンソール（WBS編集、ガントチャート、CSV操作）
- **モバイル版**: スマートな状況確認モニター（ダッシュボード、クイックアクション）

## 技術スタック

- **Frontend**: React 18 + Vite 5
- **Styling**: Tailwind CSS 3.4
- **UI Components**: Radix UI (Shadcn/ui style)
- **State Management**: Zustand
- **Drag & Drop**: @dnd-kit
- **Backend**: Firebase (Firestore + Auth)

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

## フォルダ構成

```
src/
├── components/
│   ├── layout/      # レイアウトコンポーネント
│   ├── pc/          # PC専用コンポーネント
│   ├── mobile/      # モバイル専用コンポーネント
│   ├── shared/      # 共通コンポーネント
│   └── ui/          # 基本UIコンポーネント
├── hooks/           # カスタムフック
├── lib/             # ユーティリティ関数
├── pages/           # ページコンポーネント
└── store/           # Zustand ストア
```

## 主な機能

### PC版

- WBSエディタ（ツリー構造、ドラッグ&ドロップ）
- ガントチャート（月表示、ズーム機能）
- タスク編集モーダル
- CSVインポート/エクスポート

### モバイル版

- フィルタ付きダッシュボード（今日/遅延/担当/全て）
- クイックアクション（ステータス変更、進捗更新）
- リードオンリー設計（構造編集不可）

## ライセンス

Private
