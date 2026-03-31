import { useState, useEffect } from "react";
import { C } from "../constants/colors";
import { F } from "../constants/fonts";

const cardStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 14 };
const btnStyle = (color, active) => ({
  background: active ? `${color}20` : "transparent", border: `1.5px solid ${active ? color : C.border}`,
  color: active ? color : C.dim, padding: "10px 18px", borderRadius: 8, cursor: "pointer",
  fontSize: F.sm, fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s",
});

const RM_KEY = "roadmap-progress-v1";
const loadProgress = () => {
  try { return JSON.parse(localStorage.getItem(RM_KEY)) || { currentStep: 0, completedSteps: [], startedAt: null }; }
  catch { return { currentStep: 0, completedSteps: [], startedAt: null }; }
};
const saveProgress = (p) => { localStorage.setItem(RM_KEY, JSON.stringify(p)); };

const STEPS = [
  {
    title: "証券口座を開設する",
    icon: "🏦",
    desc: "まずは証券口座を作るところから。ネット証券がおすすめです。",
    actions: [
      "SBI証券・楽天証券・マネックス証券のいずれかを比較する",
      "必要書類（マイナンバー・本人確認書類）を用意する",
      "口座開設を申し込む（NISA口座も同時に）",
      "口座開設完了メールを受け取る",
    ],
    color: C.accent,
  },
  {
    title: "少額を入金する",
    icon: "💰",
    desc: "最初は少額で十分。失っても生活に影響しない金額から始めましょう。",
    actions: [
      "まず1〜5万円を入金する（なくなっても困らない額）",
      "入金方法を確認する（銀行振込・即時入金）",
      "口座残高が反映されたことを確認する",
    ],
    color: C.green,
  },
  {
    title: "投資方針書（IPS）を記入する",
    icon: "📜",
    desc: "冷静な今のうちに「自分との契約書」を書く。パニック時の判断ミスを防ぐ最重要ステップ。",
    actions: [
      "規律ツールの「投資方針書」タブを開く",
      "損切りライン（推奨: 8〜15%）を設定する",
      "1銘柄のポジション上限を決める",
      "自分ルール（ナンピン禁止など）を書く",
    ],
    color: C.orange,
  },
  {
    title: "Morning Screenerで銘柄を探す",
    icon: "🔎",
    desc: "AIを使って今日注目すべき銘柄候補を見つける。ここは「調査の出発点」。",
    actions: [
      "スクリーナーページでスクリーニングを実行する",
      "結果の中から興味のある銘柄をウォッチリストに追加する",
      "最低3銘柄はリストアップする",
    ],
    color: C.cyan,
  },
  {
    title: "Research Labで深掘りする",
    icon: "🔬",
    desc: "スクリーナーで見つけた銘柄をResearch Labの7ステップで徹底調査。",
    actions: [
      "Research Labのニュース収集→セクター分析→銘柄候補を実行する",
      "気になる1社を「企業深掘り」で調査する",
      "業績・競合・リスクを理解する",
    ],
    color: C.purple,
  },
  {
    title: "仮説を立てて記録する",
    icon: "💡",
    desc: "「この銘柄は〇〇の理由で上がる/下がると思う」を言語化。後で検証して精度を磨く。",
    actions: [
      "仮説ジャーナルで新しい仮説を作成する",
      "仮説の根拠を具体的に書く",
      "検証期間を設定する（最初は1〜3ヶ月がおすすめ）",
    ],
    color: C.orange,
  },
  {
    title: "1株だけ買ってみる",
    icon: "🎯",
    desc: "理論より実践。まず1株だけ買って「株を持つ」経験をする。失敗しても数百円〜数千円の学び。",
    actions: [
      "ウォッチリストから最も理解できている銘柄を1つ選ぶ",
      "証券口座で1株だけ成行注文を出す",
      "取引ジャーナルにエントリーを記録する（理由・感情も）",
      "IPSの損切りラインに逆指値注文を入れる",
    ],
    color: C.green,
  },
  {
    title: "1週間観察・記録する",
    icon: "📊",
    desc: "毎日株価をチェックし、自分の感情の変化を記録する。これが投資心理学の実体験。",
    actions: [
      "毎日1回だけ株価を確認する（それ以上は見すぎ）",
      "株価が上がったとき・下がったときの自分の感情をメモする",
      "SNSの株情報を見て影響されないか自己観察する",
      "1週間後にバイアス自己診断を実施する",
    ],
    color: C.accent,
  },
  {
    title: "バイアス診断を受ける",
    icon: "🧠",
    desc: "1週間の実体験を踏まえて、自分の心理的バイアスを診断。理論で知るのと体験するのは全く違う。",
    actions: [
      "規律ツールの「バイアス診断」を正直に回答する",
      "リフレーミング回診で保有銘柄を点検する",
      "診断結果を振り返り、自分の弱点を認識する",
    ],
    color: C.purple,
  },
  {
    title: "2回目のトレードに挑戦する",
    icon: "🚀",
    desc: "1回目の学びを活かして2回目。記録→検証→改善のサイクルを回し始める。",
    actions: [
      "1回目のトレードを取引ジャーナルで振り返る",
      "Morning Screener → Research Lab → 仮説記録のフローを再度実行",
      "ケリー基準計算機でポジションサイズを確認する",
      "2回目の1株トレードを実行・記録する",
      "仮説ジャーナルの過去仮説をAI検証する",
    ],
    color: C.green,
  },
];

export default function RoadmapPage() {
  const [tab, setTab] = useState("guide");
  const [progress, setProgress] = useState(loadProgress);

  useEffect(() => { saveProgress(progress); }, [progress]);

  const toggleStep = (index) => {
    const completed = [...progress.completedSteps];
    const idx = completed.indexOf(index);
    if (idx >= 0) {
      completed.splice(idx, 1);
    } else {
      completed.push(index);
    }
    const newProgress = {
      ...progress,
      completedSteps: completed,
      currentStep: Math.max(progress.currentStep, index + 1),
      startedAt: progress.startedAt || new Date().toISOString(),
    };
    setProgress(newProgress);
  };

  const completedCount = progress.completedSteps.length;
  const progressPct = Math.round((completedCount / STEPS.length) * 100);
  const allDone = completedCount === STEPS.length;

  const resetProgress = () => {
    setProgress({ currentStep: 0, completedSteps: [], startedAt: null });
  };

  return (
    <div>
      {/* タブ切替 */}
      <div style={{ display: "flex", gap: 0, marginBottom: 14, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
        {[["guide", "📖 使い方ガイド"], ["steps", "🗺️ 10ステップ"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex: 1, padding: "12px", cursor: "pointer", fontFamily: "inherit", border: "none",
            background: tab === k ? `${C.cyan}18` : C.card, color: tab === k ? C.cyan : C.dim,
            fontSize: F.sm, fontWeight: 700,
          }}>{l}</button>
        ))}
      </div>

      {/* ── 使い方ガイド ── */}
      {tab === "guide" && (
        <div>
          <div style={cardStyle}>
            <div style={{ fontSize: F.h1, fontWeight: 700, color: C.accent, marginBottom: 8 }}>📖 投資支援プラットフォーム 使い方ガイド</div>
            <div style={{ fontSize: F.sm, color: C.dim, lineHeight: 2 }}>
              このアプリは「買い/売りの判断を自分でできるようになる」ための学習支援ツールです。<br />
              AIが投資推奨をすることは一切ありません。最終判断は必ず自分で行ってください。
            </div>
          </div>

          {/* 全体フロー */}
          <div style={{ ...cardStyle, borderColor: `${C.cyan}30` }}>
            <div style={{ fontSize: F.h2, fontWeight: 700, color: C.cyan, marginBottom: 12 }}>🔄 基本の流れ（毎日〜毎週）</div>
            <div style={{ fontSize: F.sm, color: C.text, lineHeight: 2.2 }}>
              <span style={{ color: C.cyan, fontWeight: 700 }}>① 銘柄発見</span>（Morning Screener）— AIが最新ニュースから注目銘柄を提案<br />
              &nbsp;&nbsp;&nbsp;↓<br />
              <span style={{ color: C.accent, fontWeight: 700 }}>② テクニカル確認</span>（Signal Engine）— 7指標で「買い/売り」を数値化<br />
              &nbsp;&nbsp;&nbsp;↓<br />
              <span style={{ color: C.purple, fontWeight: 700 }}>③ 深掘り調査</span>（Research Lab）— ニュース→セクター→企業の段階的分析<br />
              &nbsp;&nbsp;&nbsp;↓<br />
              <span style={{ color: C.orange, fontWeight: 700 }}>④ 仮説を記録</span>（仮説ジャーナル）— 「なぜ上がると思うか」を言語化<br />
              &nbsp;&nbsp;&nbsp;↓<br />
              <span style={{ color: C.green, fontWeight: 700 }}>⑤ 売買を実行・記録</span>（トレードジャーナル）— 実際の取引を記録<br />
              &nbsp;&nbsp;&nbsp;↓<br />
              <span style={{ color: C.red, fontWeight: 700 }}>⑥ 振り返り・規律</span>（規律ツール）— バイアス診断、リフレーミング
            </div>
          </div>

          {/* 各機能の説明 */}
          {[
            {
              icon: "☀️", title: "銘柄発見（Morning Screener）", color: C.cyan, group: "🔍 分析",
              what: "ボタン1つでAIが最新ニュース10件を取得し、注目セクター→銘柄候補を自動抽出します。",
              how: "「スクリーニング実行」を押す → 結果から気になる銘柄を「+ウォッチ」 → ウォッチリストで管理",
              warn: "表示される銘柄は「調査候補」であり購入推奨ではありません。必ずResearch Labで深掘りしてから判断を。",
            },
            {
              icon: "📊", title: "Signal Engine（テクニカル分析）", color: C.accent, group: "🔍 分析",
              what: "7つのテクニカル指標で総合スコアリング。「買い/売り/様子見」を-100〜+100の数値で表示します。",
              how: "銘柄を選択 → タイムフレーム（デイ/スイング/中長期）を選ぶ → 判定結果と各指標の解説を確認",
              warn: "スコアが高くても、それだけで買ってはいけません。docsの原則に基づく警告メッセージを必ず読んでください。",
            },
            {
              icon: "🔬", title: "Research Lab（ファンダメンタルズ分析）", color: C.purple, group: "🔍 分析",
              what: "ニュース→深掘り→セクター分析→銘柄候補→企業調査の7ステップで段階的にリサーチ。",
              how: "Step 1から順番に進める。各ステップのボタンを押すとAIが分析。Step 7で仮説として記録。",
              warn: "AIの分析は「調査の出発点」です。AIが言ったから正しいとは限りません。",
            },
            {
              icon: "💡", title: "仮説ジャーナル", color: C.orange, group: "📝 記録",
              what: "投資仮説を立て、時間が経った後にAIで検証。的中率をセクター別に追跡して自分の得意/不得意を把握。",
              how: "仮説を書く（なぜ上がる/下がると思うか） → 時間が経ったら「AI検証」 → 的中/外れを記録 → 振り返りメモ",
              warn: "50件以上溜めると「自分はテック株が得意で金融は苦手」等のパターンが見えてきます。",
            },
            {
              icon: "💰", title: "トレードジャーナル", color: C.green, group: "📝 記録",
              what: "実際の売買記録。損益・手数料・税金を自動計算し、勝率・リスクリワード比・感情分析を集計。",
              how: "買った/売ったら記入 → 自動で損益計算 → 成績タブで自分の傾向を分析",
              warn: "「冷静な時」と「焦った時」の勝率の差が見えると、規律の重要性が実感できます。",
            },
            {
              icon: "🛡️", title: "規律ツール群", color: C.red, group: "🛡️ 規律",
              what: "リフレーミング回診、バイアス自己診断、ケリー基準計算機、投資方針書（IPS）の4ツール。",
              how: "毎月1回バイアス診断 → 保有銘柄にリフレーミング回診 → IPSを見直し",
              warn: "規律ツールは「使わない時こそ必要」。相場が荒れた時にIPSだけを見て判断するのが正しい使い方。",
            },
            {
              icon: "🧮", title: "コスト計算", color: "#78909c", group: "🛡️ 規律",
              what: "手数料・税金込みの実質リターンを計算。ケリー基準を現実のコスト込みで再計算します。",
              how: "勝率・損益・手数料率・税率を入力 → 税引後のケリー基準と年間コストが見える",
              warn: "短期売買を繰り返すとコストだけで利益が消える場合があります。",
            },
            {
              icon: "🗺️", title: "10ステップロードマップ", color: C.accent, group: "📚 学習",
              what: "投資知識ゼロから最初のトレードまでを10ステップで案内。このアプリの全機能を順番に体験できます。",
              how: "Step 1から順番にチェックを進める。各ステップのやることリストを1つずつクリアしていく。",
              warn: "急がないこと。1日1ステップでも十分です。",
            },
          ].map((item, i) => (
            <div key={i} style={{ ...cardStyle, borderLeft: `3px solid ${item.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: F.h3, fontWeight: 700, color: item.color }}>{item.icon} {item.title}</div>
                <span style={{ fontSize: F.label, color: C.dim, background: `${C.border}40`, padding: "2px 8px", borderRadius: 4 }}>{item.group}</span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: F.xs, color: C.cyan, fontWeight: 600, marginBottom: 2 }}>何ができる？</div>
                <div style={{ fontSize: F.sm, color: C.text, lineHeight: 1.8 }}>{item.what}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: F.xs, color: C.green, fontWeight: 600, marginBottom: 2 }}>使い方</div>
                <div style={{ fontSize: F.sm, color: "#8ab0cc", lineHeight: 1.8 }}>{item.how}</div>
              </div>
              <div style={{ background: `${C.orange}08`, borderRadius: 6, padding: "8px 12px" }}>
                <div style={{ fontSize: F.xs, color: C.orange, fontWeight: 600, marginBottom: 2 }}>⚠️ 注意</div>
                <div style={{ fontSize: F.xs, color: "#9a8060", lineHeight: 1.8 }}>{item.warn}</div>
              </div>
            </div>
          ))}

          {/* AI設定の案内 */}
          <div style={{ ...cardStyle, borderColor: `${C.red}30`, background: `${C.red}04` }}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.red, marginBottom: 8 }}>🔑 AI機能を使うには（管理者向け）</div>
            <div style={{ fontSize: F.sm, color: "#c08080", lineHeight: 2 }}>
              Morning Screener・Research Lab・仮説AI検証にはClaude APIが必要です。<br />
              <strong style={{ color: C.text }}>設定方法:</strong><br />
              1. <a href="https://console.anthropic.com/" target="_blank" rel="noreferrer" style={{ color: C.accent }}>Anthropic Console</a> でAPIキーを取得<br />
              2. Vercelのプロジェクト設定 → Environment Variables → <code style={{ background: "#0e1a30", padding: "2px 6px", borderRadius: 4 }}>ANTHROPIC_API_KEY</code> を追加<br />
              3. Vercelを再デプロイ<br />
              <br />
              APIキーがなくても、Signal Engine（テクニカル分析）、規律ツール、トレードジャーナルなどAIを使わない機能は全て動作します。
            </div>
          </div>

          <div style={{ ...cardStyle, background: `${C.cyan}06`, borderColor: `${C.cyan}20` }}>
            <div style={{ fontSize: F.h3, fontWeight: 700, color: C.cyan, marginBottom: 8 }}>📚 このシステムの設計思想</div>
            <div style={{ fontSize: F.sm, color: "#80b8c8", lineHeight: 2 }}>
              8つの投資資料から抽出した6つの核心原則に基づいて設計されています：<br /><br />
              <strong>① 期待リターン10.4%</strong> — 75年平均が現実。28.2%は幻想<br />
              <strong>② プロスペクト理論</strong> — 損失の痛みは利益の2倍。仕組みで対処する<br />
              <strong>③ 順張り哲学</strong> — 上がるものは上がる。押し目買いは危険<br />
              <strong>④ エコノミックモート</strong> — 企業の堀（競争優位性）を見る<br />
              <strong>⑤ ケリー基準</strong> — 数式で破滅を回避する<br />
              <strong>⑥ ルールベース運用</strong> — 感情ではなくシステムで投資する<br />
            </div>
          </div>

          <button onClick={() => setTab("steps")} style={{ ...btnStyle(C.accent, true), width: "100%", padding: 16, fontSize: F.base }}>
            🗺️ 10ステップロードマップを始める →
          </button>
        </div>
      )}

      {/* ── 10ステップ ── */}
      {tab === "steps" && (<div>
      {/* Progress Header */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: F.h2, fontWeight: 700, color: C.accent }}>🗺️ 投資はじめてロードマップ</div>
            <div style={{ fontSize: F.sm, color: C.dim, marginTop: 4 }}>知識ゼロから最初のトレードまで、10ステップで導きます。</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: progressPct === 100 ? C.green : C.accent }}>{progressPct}%</div>
            <div style={{ fontSize: F.xs, color: C.dim }}>{completedCount}/{STEPS.length} 完了</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: "100%", height: 10, background: "#0e1a30", borderRadius: 5, overflow: "hidden" }}>
          <div style={{
            width: `${progressPct}%`, height: "100%",
            background: allDone ? C.green : `linear-gradient(90deg, ${C.accent}, ${C.cyan})`,
            borderRadius: 5, transition: "width 0.5s ease",
          }} />
        </div>

        {progress.startedAt && (
          <div style={{ fontSize: F.xs, color: C.dim, marginTop: 8 }}>
            開始日: {new Date(progress.startedAt).toLocaleDateString("ja-JP")}
          </div>
        )}
      </div>

      {/* Completion Message */}
      {allDone && (
        <div style={{
          ...cardStyle, textAlign: "center", borderColor: `${C.green}40`,
          background: `linear-gradient(135deg, ${C.card}, #0a2018)`,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: F.h1, fontWeight: 700, color: C.green, marginBottom: 8 }}>おめでとうございます！</div>
          <div style={{ fontSize: F.base, color: C.text, lineHeight: 2, marginBottom: 16 }}>
            10ステップすべて完了！投資の基礎を一通り体験しました。<br />
            ここからが本当のスタートです。記録→検証→改善のサイクルを回し続けてください。<br />
            仮説ジャーナルの蓄積が、あなた固有の投資エッジになります。
          </div>
          <button onClick={resetProgress} style={{ ...btnStyle(C.dim, false), padding: "8px 16px" }}>リセットして最初から</button>
        </div>
      )}

      {/* Steps */}
      {STEPS.map((step, i) => {
        const isCompleted = progress.completedSteps.includes(i);
        const isNext = !isCompleted && (i === 0 || progress.completedSteps.includes(i - 1));

        return (
          <div key={i} style={{
            ...cardStyle,
            borderColor: isCompleted ? `${C.green}30` : isNext ? `${step.color}30` : C.border,
            opacity: isCompleted ? 0.8 : 1,
          }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              {/* Step Number / Checkbox */}
              <div
                onClick={() => toggleStep(i)}
                style={{
                  width: 36, height: 36, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isCompleted ? C.green : isNext ? step.color : C.border,
                  color: "#fff", fontSize: 14, fontWeight: 700,
                  transition: "all 0.2s",
                }}
              >
                {isCompleted ? "✓" : i + 1}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{
                    fontSize: F.base, fontWeight: 700,
                    color: isCompleted ? C.green : isNext ? step.color : C.dim,
                    textDecoration: isCompleted ? "line-through" : "none",
                  }}>
                    {step.icon} Step {i + 1}: {step.title}
                  </div>
                  <button onClick={() => toggleStep(i)}
                    style={{ ...btnStyle(isCompleted ? C.green : step.color, isCompleted), padding: "6px 14px", fontSize: F.xs }}>
                    {isCompleted ? "完了 ✓" : "完了にする"}
                  </button>
                </div>

                <div style={{ fontSize: F.sm, color: C.dim, lineHeight: 1.8, marginBottom: 10 }}>{step.desc}</div>

                {/* Action Items */}
                <div style={{ background: "#0e1a30", borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: F.xs, color: C.dim, marginBottom: 8, fontWeight: 600 }}>やること:</div>
                  {step.actions.map((action, j) => (
                    <div key={j} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0", fontSize: F.sm, color: isCompleted ? C.dim : C.text, lineHeight: 1.8 }}>
                      <span style={{ color: isCompleted ? C.green : step.color, flexShrink: 0 }}>
                        {isCompleted ? "✓" : "○"}
                      </span>
                      <span style={{ textDecoration: isCompleted ? "line-through" : "none" }}>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* 注意書き */}
      <div style={{ padding: 10, background: `${C.orange}05`, borderRadius: 8, border: `1px solid ${C.orange}12`, marginTop: 8 }}>
        <p style={{ fontSize: F.xs, color: "#7a6a4a", lineHeight: 1.8 }}>⚠️ このロードマップは投資の学習補助ツールです。投資助言ではありません。投資は自己責任で行ってください。</p>
      </div>
      </div>)}
    </div>
  );
}
