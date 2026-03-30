import { useState, useEffect, useCallback } from "react";
import { C } from "./constants/colors";
import { loadData, saveData } from "./api/storage";
import Navigation from "./components/Navigation";
import SignalPage from "./pages/SignalPage";
import ResearchPage from "./pages/ResearchPage";
import HypoPage from "./pages/HypoPage";
import DisciplinePage from "./pages/DisciplinePage";
import ScreenerPage from "./pages/ScreenerPage";
import TradeJournalPage from "./pages/TradeJournalPage";
import RoadmapPage from "./pages/RoadmapPage";
import CostCalcPage from "./pages/CostCalcPage";

export default function App() {
  const [page, setPage] = useState("roadmap");

  // 永続化データ
  const [hypos, setHypos] = useState([]);
  const [reframes, setReframes] = useState([]);
  const [biasChecks, setBiasChecks] = useState({});
  const [ips, setIps] = useState({ stopLoss: "5", maxPosition: "10", rebalancePeriod: "四半期", moatRule: "", customRules: "" });

  // 初期読み込み
  useEffect(() => {
    (async () => {
      setHypos(await loadData("hypo-v2", []));
      setReframes(await loadData("reframes-v1", []));
      setBiasChecks(await loadData("bias-checks-v1", {}));
      setIps(await loadData("ips-v1", { stopLoss: "5", maxPosition: "10", rebalancePeriod: "四半期", moatRule: "", customRules: "" }));
    })();
  }, []);

  // 保存ヘルパー
  const saveH = useCallback(async (h) => { setHypos(h); await saveData("hypo-v2", h); }, []);
  const saveRF = useCallback(async (r) => { setReframes(r); await saveData("reframes-v1", r); }, []);
  const saveBC = useCallback(async (b) => { setBiasChecks(b); await saveData("bias-checks-v1", b); }, []);
  const saveIPS = useCallback(async (i) => { setIps(i); await saveData("ips-v1", i); }, []);

  // Research Lab → 仮説ジャーナルへの追加
  const onAddHypo = async (newH) => {
    const h = { ...newH, id: Date.now(), createdAt: new Date().toISOString(), status: "検証中", review: "" };
    await saveH([h, ...hypos]);
  };

  const activeHypoCount = hypos.filter((h) => h.status === "検証中").length;

  return (
    <div style={{
      background: C.bg, color: C.text, minHeight: "100vh",
      fontFamily: "'Noto Sans JP','JetBrains Mono',sans-serif",
      padding: "16px 16px 30px",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Orbitron:wght@700;900&display=swap');*{box-sizing:border-box;margin:0}textarea{resize:vertical;font-family:inherit}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes glow{0%,100%{filter:brightness(1)}50%{filter:brightness(1.25)}}.loader{animation:glow 1.2s infinite}`}</style>

      <Navigation page={page} setPage={setPage} activeHypoCount={activeHypoCount} />

      {page === "screen" && <ScreenerPage />}
      {page === "signal" && <SignalPage />}
      {page === "research" && <ResearchPage onAddHypo={onAddHypo} />}
      {page === "hypo" && <HypoPage hypos={hypos} saveH={saveH} />}
      {page === "trade" && <TradeJournalPage />}
      {page === "disc" && <DisciplinePage reframes={reframes} saveRF={saveRF} biasChecks={biasChecks} saveBC={saveBC} ips={ips} saveIPS={saveIPS} />}
      {page === "cost" && <CostCalcPage />}
      {page === "roadmap" && <RoadmapPage />}

      {/* 全ページ共通の免責事項 */}
      <div style={{ padding: "12px 16px", marginTop: 16, background: `${C.border}30`, borderRadius: 8, fontSize: 10, color: C.dim, lineHeight: 1.8, textAlign: "center" }}>
        ⚠️ 本ツールは投資助言ではありません。シミュレーションデータを含みます。投資判断は自己責任で行ってください。
      </div>
    </div>
  );
}
