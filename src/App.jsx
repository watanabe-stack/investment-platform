import { useState, useEffect, useCallback, useMemo } from "react";
import { C } from "./constants/colors";
import { loadData, saveData } from "./api/storage";
import { fetchDailyData, searchStocks, getWatchlist, addToWatchlist, removeFromWatchlist } from "./data/api";
import { DATASETS, genDaily, genIntraday } from "./data/simulate";
import { scoreAll, getVerdict } from "./scoring/engine";

import Layout from "./components/Layout";
import LeftSidebar from "./components/LeftSidebar";
import HeaderBar from "./components/HeaderBar";
import RightSidebar from "./components/RightSidebar";
import OverviewTab from "./pages/OverviewTab";
import SignalPage from "./pages/SignalPage";
import ResearchPage from "./pages/ResearchPage";
import HypoPage from "./pages/HypoPage";
import DisciplinePage from "./pages/DisciplinePage";
import ScreenerPage from "./pages/ScreenerPage";
import TradeJournalPage from "./pages/TradeJournalPage";
import RoadmapPage from "./pages/RoadmapPage";
import CostCalcPage from "./pages/CostCalcPage";

export default function App() {
  // 選択中の銘柄
  const [selected, setSelected] = useState({ type: "sim", index: 0, name: DATASETS[0].label });
  const [watchlist, setWatchlist] = useState([]);
  const [tf, setTf] = useState("swing");

  // メインエリアのタブ
  const [mainTab, setMainTab] = useState("overview");
  // モーダル
  const [modal, setModal] = useState(null); // "screener" | "roadmap" | "discipline" | "trade" | "cost"

  // 実データ
  const [realDaily, setRealDaily] = useState(null);
  const [realLoading, setRealLoading] = useState(false);
  const [realError, setRealError] = useState("");

  // 永続化データ
  const [hypos, setHypos] = useState([]);
  const [reframes, setReframes] = useState([]);
  const [biasChecks, setBiasChecks] = useState({});
  const [ips, setIps] = useState({ stopLoss: "5", maxPosition: "10", rebalancePeriod: "四半期", moatRule: "", customRules: "" });
  const [screenerCache, setScreenerCache] = useState({ summary: "", stocks: [], rawText: "" });

  useEffect(() => {
    (async () => {
      setWatchlist(getWatchlist());
      setHypos(await loadData("hypo-v2", []));
      setReframes(await loadData("reframes-v1", []));
      setBiasChecks(await loadData("bias-checks-v1", {}));
      setIps(await loadData("ips-v1", { stopLoss: "5", maxPosition: "10", rebalancePeriod: "四半期", moatRule: "", customRules: "" }));
    })();
  }, []);

  const saveH = useCallback(async (h) => { setHypos(h); await saveData("hypo-v2", h); }, []);
  const saveRF = useCallback(async (r) => { setReframes(r); await saveData("reframes-v1", r); }, []);
  const saveBC = useCallback(async (b) => { setBiasChecks(b); await saveData("bias-checks-v1", b); }, []);
  const saveIPS = useCallback(async (i) => { setIps(i); await saveData("ips-v1", i); }, []);

  // 実データ取得
  const loadRealData = async (symbol) => {
    setRealLoading(true); setRealError("");
    try {
      const data = await fetchDailyData(symbol);
      setRealDaily(data);
    } catch (e) { setRealError(e.message); setRealDaily(null); }
    setRealLoading(false);
  };

  // 銘柄選択
  const handleSelect = (sel) => {
    setSelected(sel);
    if (sel.type === "real") loadRealData(sel.symbol);
    else setRealDaily(null);
  };

  // 銘柄検索
  const handleSearch = async (query) => {
    if (!query) { setModal("screener"); return; }
    try {
      const results = await searchStocks(query);
      // 4桁日本株コード
      const isJp = /^\d{4,5}$/.test(query);
      if (isJp || results.length === 0) {
        const code = query.replace(/\.T$/i, "");
        const updated = addToWatchlist(isJp ? code : query, query);
        setWatchlist(updated);
        handleSelect({ type: "real", symbol: isJp ? code : query, name: query });
      } else if (results.length > 0) {
        const first = results[0];
        const updated = addToWatchlist(first.symbol, first.name);
        setWatchlist(updated);
        handleSelect({ type: "real", symbol: first.symbol, name: first.name });
      }
    } catch { setModal("screener"); }
  };

  const handleRemoveWatch = (symbol) => {
    const updated = removeFromWatchlist(symbol);
    setWatchlist(updated);
    if (selected?.symbol === symbol) setSelected({ type: "sim", index: 0, name: DATASETS[0].label });
  };

  // データ計算
  const si = selected?.type === "sim" ? (selected.index || 0) : 0;
  const simDaily = useMemo(() => genDaily(400, DATASETS[si].p, DATASETS[si].v), [si]);
  const simIntra = useMemo(() => genIntraday(simDaily), [simDaily]);
  const daily = selected?.type === "real" && realDaily ? realDaily : simDaily;
  const intra = selected?.type === "real" && realDaily ? genIntraday(realDaily) : simIntra;
  const result = useMemo(() => scoreAll(tf, daily, intra), [tf, daily, intra]);
  const verdict = getVerdict(result.composite);

  const onAddHypo = async (newH) => {
    const h = { ...newH, id: Date.now(), createdAt: new Date().toISOString(), status: "検証中", review: "" };
    await saveH([h, ...hypos]);
  };

  const biasChecked = Object.values(biasChecks).filter(Boolean).length;
  const biasPct = Math.round((biasChecked / 14) * 100);
  const biasLevel = biasPct >= 60 ? "危険" : biasPct >= 30 ? "注意" : "良好";

  // メインタブ一覧
  const mainTabs = [
    { key: "overview", label: "概要", icon: "📋" },
    { key: "technicals", label: "テクニカル", icon: "📊" },
    { key: "news", label: "ニュース", icon: "📰" },
    { key: "hypothesis", label: "仮説", icon: "💡" },
    { key: "trade", label: "売買記録", icon: "💰" },
  ];

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Orbitron:wght@700;900&display=swap');*{box-sizing:border-box;margin:0}body{background:${C.bg}}textarea{resize:vertical;font-family:inherit}input,select,textarea{font-size:16px}@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes glow{0%,100%{opacity:1}50%{opacity:0.7}}.loader{animation:glow 1.2s infinite}`}</style>

      <Layout
        header={
          <HeaderBar
            selected={selected}
            score={result.composite}
            verdict={verdict}
            onOpenScreener={() => setModal("screener")}
            onOpenDiscipline={() => setModal("discipline")}
            onOpenRoadmap={() => setModal("roadmap")}
          />
        }
        left={
          <LeftSidebar
            watchlist={watchlist}
            simDatasets={DATASETS}
            selected={selected}
            onSelect={handleSelect}
            onRemove={handleRemoveWatch}
            onSearch={handleSearch}
          />
        }
        main={
          <div>
            {/* タブナビゲーション */}
            <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: `2px solid ${C.border}` }}>
              {mainTabs.map((t) => (
                <button key={t.key} onClick={() => setMainTab(t.key)} style={{
                  padding: "10px 16px", border: "none", cursor: "pointer",
                  background: "transparent", fontFamily: "inherit",
                  color: mainTab === t.key ? C.accent : C.dim,
                  fontSize: 14, fontWeight: mainTab === t.key ? 700 : 500,
                  borderBottom: mainTab === t.key ? `2px solid ${C.accent}` : "2px solid transparent",
                  marginBottom: -2,
                }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* ロード/エラー表示 */}
            {realLoading && <div style={{ padding: 16, textAlign: "center", color: C.accent }}>📡 データ取得中...</div>}
            {realError && <div style={{ padding: 12, background: `${C.red}08`, borderRadius: 8, color: C.red, fontSize: 13, marginBottom: 12 }}>⚠️ {realError}</div>}

            {/* タブコンテンツ */}
            {mainTab === "overview" && <OverviewTab daily={daily} intra={intra} tf={tf} result={result} verdict={verdict} />}
            {mainTab === "technicals" && <SignalPage />}
            {mainTab === "news" && <ResearchPage onAddHypo={onAddHypo} />}
            {mainTab === "hypothesis" && <HypoPage hypos={hypos} saveH={saveH} />}
            {mainTab === "trade" && <TradeJournalPage />}
          </div>
        }
        right={
          <RightSidebar
            result={result}
            verdict={verdict}
            tf={tf}
            onChangeTf={setTf}
            biasLevel={biasLevel}
          />
        }
        footer="⚠️ 本ツールは投資助言ではありません。シミュレーションデータを含みます。投資判断は自己責任で行ってください。"
      />

      {/* モーダル */}
      {modal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000,
        }} onClick={() => setModal(null)}>
          <div style={{
            background: C.bg, borderRadius: 16, width: "90%", maxWidth: 900,
            maxHeight: "85vh", overflowY: "auto", padding: "24px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            border: `1px solid ${C.border}`,
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
                {modal === "screener" && "☀️ 銘柄発見"}
                {modal === "discipline" && "🛡️ 規律ツール"}
                {modal === "roadmap" && "🗺️ 使い方ガイド"}
                {modal === "cost" && "🧮 費用計算"}
              </span>
              <button onClick={() => setModal(null)} style={{
                background: "none", border: `1px solid ${C.border}`, borderRadius: 6,
                padding: "6px 12px", cursor: "pointer", color: C.dim, fontFamily: "inherit",
              }}>✕ 閉じる</button>
            </div>
            {modal === "screener" && <ScreenerPage cache={screenerCache} setCache={setScreenerCache} />}
            {modal === "discipline" && <DisciplinePage reframes={reframes} saveRF={saveRF} biasChecks={biasChecks} saveBC={saveBC} ips={ips} saveIPS={saveIPS} />}
            {modal === "roadmap" && <RoadmapPage />}
            {modal === "cost" && <CostCalcPage />}
          </div>
        </div>
      )}
    </>
  );
}
