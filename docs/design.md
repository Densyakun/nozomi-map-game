# 設計書 - 鉄道網建設ゲーム (v2)

## 1. 画面設計

### 1.1 画面一覧
| 画面ID | 画面名 | 説明 |
|--------|--------|------|
| SC-01 | タイトル画面 | 新規ゲーム、ロード、マルチプレイ選択 |
| SC-02 | シナリオ/フリープレイ選択 | シナリオ一覧 or フリープレイ（マップ選択へ） |
| SC-03 | マップ選択 | 実在地図ベースのステージ選択 |
| SC-04 | メインゲーム画面 | 3D地図 + 建設UI + HUD |
| SC-05 | 建設パネル | 路線・駅・施設の建設UI（ボトムシート） |
| SC-06 | ダイヤ編集画面 | 時刻表編集モーダル |
| SC-07 | 財務/経営画面 | 収支・乗客数・評価の表示 |
| SC-08 | 設定画面 | ゲーム設定・セーブ・ロード |

### 1.2 メインゲーム画面レイアウト (PC)
```
+----------------------------------------------------------+
| [HUD左上] 日時: 2026/4/1 12:00 | 資金: ¥1,000,000       |
| [HUD右上] 評価: B (収益性:B 輸送量:C 路線網:B 財務:A)   |
+----------------------------------------------------------+
|                                  |                        |
|                                  |  サイドパネル          |
|       3D 地図ビューポート       |  ┌─ ミニマップ ─┐    |
|       (Three.js Canvas)          |  └─────────────┘    |
|                                  |  ■ 建設ツール         |
|                                  |  ■ 路線一覧           |
|                                  |  ■ 駅一覧             |
|                                  |  ■ 財務状況           |
|                                  |  ■ ダイヤ編集         |
+----------------------------------------------------------+
| [フッター] ◀Ⅱ▶ 速度:x1 x2 x5 x10 | メニュー            |
+----------------------------------------------------------+
```

### 1.3 メインゲーム画面レイアウト (モバイル)
```
+------------------------------------+
| [HUD] 日時 | 資金 | 評価          |
+------------------------------------+
|                                    |
|     3D 地図ビューポート            |
|     (Three.js Canvas)              |
|     - ピンチズーム                 |
|     - タップで施設選択             |
|     - ロングタップで建設モード     |
|                                    |
+------------------------------------+
| [ミニマップ]              [≡  menu]|
+------------------------------------+
| [ボトムシート - スワイプで展開]    |
| ┌────────────────────────────────┐ |
| │ ■ 建設ツール  │ ■ 路線一覧   │ |
| │ ■ ダイヤ編集  │ ■ 財務       │ |
| │ ■ 早送り/停止  │ ■ メニュー  │ |
| └────────────────────────────────┘ |
+------------------------------------+
```

### 1.4 モバイル操作対応
- 地図のドラッグ: パン操作
- ピンチイン/アウト: ズーム
- タップ: 施設/地形の選択・情報表示
- ダブルタップ: 建設モード起動
- ロングタップ: コンテキストメニュー
- スワイプアップ: ボトムシート展開
- 地図上の2点タップ: 路線の始点/終点指定

## 2. データ設計

### 2.1 全体構造
```
Map (地理データ: 静的)
  ├── 地形標高 (heightMap)
  ├── 土地利用 (landUse)
  ├── 河川・道路・建物
  └── 人口分布データ

Scenario (シナリオ定義: 静的)
  ├── 使用マップID + 使用領域 (bounds)
  ├── 開始条件 (資金, 年度)
  ├── 初期設備 (自社路線/駅)
  ├── 競合他社データ
  └── 目的・評価条件

GameState (ゲーム状態: 動的, 永続化対象)
  ├── メタ情報 (id, name, scenarioId, mapId)
  ├── 時間進行 (year, month, day, hour, minute, speed, paused)
  ├── 鉄道網 (自社 + 競合すべての設備)
  ├── 財務 (資金, 収支履歴)
  └── シナリオ進行状況
```

### 2.2 マップデータ (MapData)
実際の地理情報（国土地理院データなど）を元に作成。領域は緯度経度で管理し、内部的にはグリッド座標に変換。

```typescript
interface MapData {
  id: string;
  name: string;
  description: string;
  // 実際の地理情報
  bounds: GeoBounds;           // 緯度経度範囲
  center: { lat: number; lng: number };
  // グリッド設定
  gridSize: number;            // 1グリッドあたりのメートル数 (例: 50m)
  gridWidth: number;           // グリッド数 (X)
  gridHeight: number;          // グリッド数 (Z)
  // 地形
  heightMap: number[][];       // 標高データ (m)
  landUse: LandUseCell[][];    // 土地利用
  // 地理オブジェクト (レンダリング用、経路計算用)
  rivers: GeoObject[];
  roads: GeoObject[];
  buildings: GeoObject[];
  coastlines: GeoObject[];
  // 人口 (グリッド単位)
  population: PopulationCell[][];
  // 地名・ランドマーク
  landmarks: Landmark[];
}

interface GeoBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface LandUseCell {
  type: 'urban' | 'suburban' | 'rural' | 'forest' | 'mountain' | 'water' | 'river' | 'agriculture' | 'industrial' | 'park';
  // 建設コスト倍率 (地形による)
  costMultiplier: number;
  // 工法制限 (水域→橋梁 only, 山地→トンネル必須 など)
  allowedMethods: ConstructionMethod[];
}

interface PopulationCell {
  daytime: number;     // 昼間人口
  nighttime: number;   // 夜間人口
  commercial: number;  // 商業床面積
  residential: number; // 住宅数
  industrial: number;  // 工業面積
}

type ConstructionMethod = 'surface' | 'elevated' | 'tunnel' | 'bridge';
```

### 2.3 シナリオデータ (ScenarioData)
```typescript
interface ScenarioData {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'normal' | 'hard';
  mapId: string;
  // 使用するマップ上の領域（切り取り範囲）
  mapBounds: {
    startX: number;
    startZ: number;
    width: number;
    height: number;
  };
  // 開始条件
  startYear: number;
  startFunds: number;
  initialFacilities: InitialFacility[]; // 初期からある自社設備
  // 競合他社
  competitors: CompetitorData[];
  // 目的
  objectives: Objective[];
}

interface InitialFacility {
  type: 'station' | 'line';
  ownerId: string;             // 'player' または競合ID
  // 駅の場合
  stationName?: string;
  position?: { x: number; z: number };
  // 路線の場合
  stationIds?: string[];
  lineName?: string;
}

interface CompetitorData {
  id: string;
  name: string;
  color: string;
  aggression: number;          // 0-1 路線拡張の積極性
  initialFacilities: InitialFacility[];
}

interface Objective {
  id: string;
  type: 'passengers' | 'profit' | 'coverage' | 'punctuality' | 'custom';
  description: string;
  target: number;
  current: number;             // ゲーム中の進捗
  reward: number;              // 達成ボーナス
  timeLimit?: number;          // 達成期限 (ゲーム内月数)
}
```

### 2.4 ゲーム状態 (GameState)
```typescript
interface GameState {
  // メタ情報
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  playTime: number;            // 実経過時間 (ms)
  scenarioId: string | null;   // null = フリープレイ

  // 時間進行
  time: GameTime;
  speed: 0 | 1 | 2 | 5 | 10;  // 0=停止(ポーズ), 1x, 2x, 5x, 10x
  paused: boolean;

  // マップ参照
  mapId: string;

  // 鉄道網 (自社+競合すべて)
  railwayNetwork: RailwayNetwork;

  // 財務
  finance: FinanceData;

  // シナリオ進行
  objectives: ObjectiveProgress[];
}

interface GameTime {
  year: number;
  month: number;   // 1-12
  day: number;     // 1-30
  hour: number;    // 0-23
  minute: number;  // 0-59
}

interface RailwayNetwork {
  stations: Station[];
  lines: RailLine[];
  trains: Train[];
  facilities: Facility[];
}
```

### 2.5 駅・路線・車両 (ownerId で自社/競合を判別)
```typescript
// 自社判定: element.ownerId === gameStore.getState().playerId
// 通常プレイヤーのIDは 'player'

interface Station {
  id: string;
  ownerId: string;             // 'player' または競合ID
  name: string;
  position: { x: number; z: number };
  elevation: number;
  type: 'normal' | 'terminal' | 'junction' | 'underground';
  passengers: number;          // 1日あたり乗客数 (シミュレーション結果)
  lines: string[];             // 所属路線ID
  facilities: string[];
}

interface RailLine {
  id: string;
  ownerId: string;             // 'player' または競合ID
  name: string;
  color: string;
  stationIds: string[];
  segments: LineSegment[];
  timetable: TimetableEntry[];
  trainIds: string[];
}

interface LineSegment {
  startStationId: string;
  endStationId: string;
  length: number;              // m
  constructionCost: number;
  constructionMethod: ConstructionMethod;
  completed: boolean;
  underConstruction: boolean;
  remainingDays: number;       // 工事残日数
}

interface Train {
  id: string;
  ownerId: string;
  name: string;
  capacity: number;
  maxSpeed: number;
  // 編成情報
  cars: number;
}
```

### 2.6 時刻表情報
```typescript
interface TimetableEntry {
  trainId: string;
  lineId: string;
  direction: 'up' | 'down';
  departures: {
    stationId: string;
    arrivalTime: string;   // "HH:mm"
    departureTime: string;
  }[];
  // 運行間隔 (分) - 簡易ダイヤ用
  intervalMinutes?: number;
}
```

### 2.7 財務データ
```typescript
interface FinanceData {
  funds: number;
  history: FinanceRecord[];
}

interface FinanceRecord {
  date: GameTime;
  type: 'construction' | 'fare' | 'maintenance' | 'subsidy' | 'scenario_reward' | 'other';
  amount: number;
  description: string;
}
```

### 2.8 評価システム
```typescript
interface Evaluation {
  overall: 'S' | 'A' | 'B' | 'C' | 'D' | 'E';
  profitability: ScoreGrade;    // 収益性: 経常利益率
  transportVolume: ScoreGrade;  // 輸送量: 1日あたり利用者数
  networkCoverage: ScoreGrade;  // 路線網: カバー人口率
  financialHealth: ScoreGrade;  // 財務健全性: 資金残高/負債
  punctuality: ScoreGrade;      // 定時性: ダイヤ遅延率
}

type ScoreGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'E';

// 評価計算
// profitability = monthlyRevenue / max(monthlyExpenses, 1) → 0~∞
//   S: >1.5, A: >1.2, B: >1.0, C: >0.8, D: >0.5, E: <=0.5
// transportVolume = totalPassengers / targetPassengers
//   targetはマップ/シナリオの人口から算出
// networkCoverage = sum(stationCatchmentPop) / totalMapPop
//   駅から半径500m圏内の人口 ÷ マップ総人口
// financialHealth = funds / 10,000,000
// punctuality = onTimeTrains / totalTrains
// overall = 各指標の加重平均
//   シナリオによって評価ウェイトが変化
```

## 3. コンポーネント設計

### 3.1 ディレクトリ構造
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx               # → TitleScreen
│   ├── game/
│   │   └── page.tsx           # メインゲームページ
│   └── globals.css
├── components/
│   ├── screens/
│   │   ├── TitleScreen.tsx
│   │   ├── ScenarioSelect.tsx
│   │   ├── MapSelect.tsx
│   │   └── GameScreen.tsx     # メインゲーム画面全体
│   ├── game/
│   │   ├── GameCanvas.tsx     # Three.jsキャンバス全体
│   │   ├── Terrain.tsx        # 地形メッシュ
│   │   ├── Water.tsx          # 水面
│   │   ├── BuildingLayer.tsx  # 建物表示
│   │   ├── RailRenderer.tsx   # 路線3D
│   │   ├── StationMarker.tsx  # 駅マーカー
│   │   ├── ConstructionPreview.tsx # 建設プレビュー
│   │   └── CameraController.tsx
│   ├── ui/
│   │   ├── HUD.tsx
│   │   ├── MiniMap.tsx
│   │   ├── SidePanel.tsx      # PCのみ表示
│   │   ├── BottomSheet.tsx    # モバイル用
│   │   ├── ConstructionTool.tsx
│   │   ├── TimetableEditor.tsx
│   │   ├── FinancePanel.tsx
│   │   ├── EvaluationPanel.tsx
│   │   ├── TimeController.tsx # 時間進行コントロール
│   │   └── ObjectiveTracker.tsx # シナリオ目的表示
│   └── common/
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── Slider.tsx
├── store/
│   ├── gameStore.ts           # Zustand - ゲーム状態
│   ├── uiStore.ts             # Zustand - UI状態
│   └── timeStore.ts           # 時間進行管理
├── hooks/
│   ├── useGameLoop.ts         # メインゲームループ
│   └── useTouchControls.ts    # タッチ操作
├── lib/
│   ├── supabase.ts
│   ├── storage.ts
│   ├── terrain.ts
│   ├── simulation.ts          # 乗客・経済シミュレーション
│   ├── evaluation.ts          # 評価計算
│   ├── aiCompetitor.ts        # 競合AI
│   └── types.ts
├── data/
│   ├── maps.ts                # マップデータ定義
│   └── scenarios.ts           # シナリオデータ定義
└── public/
    └── map-data/              # 実際の地図データファイル
        └── tokyo-central.json # 例
```

### 3.2 状態管理

**gameStore** (Zustand + persist middleware):
- 全ゲーム状態を管理
- LocalStorageに自動永続化
- マルチプレイ時はSupabase Realtimeで変更を同期
- 操作: buildStation, buildLine, editTimetable, advanceTime, addFunds, etc.

**uiStore** (Zustand, 非永続化):
- activeTool: 選択中の建設ツール ('select' | 'station' | 'line' | 'demolish' | null)
- selectedElementId: 選択中の施設ID
- openPanel: 開いているパネル ('none' | 'construction' | 'timetable' | 'finance' | 'menu')
- isMobile: モバイル判定フラグ
- cameraPosition: カメラ状態

**timeStore** (Zustand, useGameLoopから更新):
- gameTime: GameTime
- speed: 0 | 1 | 2 | 5 | 10
- paused: boolean
- tick: (deltaMs) => void  // ゲーム時間を進める

### 3.3 時間進行システム
```
ゲーム内時間の進行:
  speed 1x = 1ゲーム分/1実秒 (= 60ゲーム分/1実分)
  speed 2x = 2ゲーム分/1実秒
  speed 5x = 5ゲーム分/1実秒
  speed 10x = 10ゲーム分/1実秒
  ポーズ中(speed=0): 時間停止

  requestAnimationFrame ループ:
    1. deltaTime を計測
    2. speed を乗算してゲーム内経過時間を計算
    3. 時間を進める (分→時→日→月→年)
    4. 時間経過イベントを発火:
       - 毎分: 列車位置更新
       - 毎時: 駅乗客変動
       - 毎日: 収益計上、維持費計上
       - 毎月: 月次決算、競合AI行動、評価再計算
       - 毎年: 年次レポート
    5. 自動セーブ (毎月)
```

### 3.4 データフロー
```
User Input (Mouse/Touch)
    ↓
UI Component (React)
    ↓
Zustand Action (gameStore/ uiStore)
    ↓
State Update → React Re-render (UI)
    ↓
State Update → Three.js Canvas Re-render (3D)
    ↓
Auto-Save to LocalStorage (debounced, 月1回以上)
    ↓
[Multiplayer] Supabase Realtime sync
```

### 3.5 モバイル対応詳細
- CSS メディアクエリ + `useMediaQuery` でデバイス判定
- PC: サイドパネル + 固定HUD
- モバイル: ボトムシート + フローティングHUD
- Three.js にタッチイベントハンドラを追加
- ボトムシートはドラッグ可能、スナップポイント付き
- フォントサイズ・タップターゲットを minimum 44px に設定
