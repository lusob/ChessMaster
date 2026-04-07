import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import type { Bot, CustomChampionshipPlayer, PlayerProfile } from '@/types';
import { useCampeonatos } from '@/hooks/useStorage';
import {
  getUserPairingForRound,
  championshipPlayerToBot,
  isCurrentRoundComplete,
} from '@/lib/championship';
import {
  ChevronLeft, Trophy, Play, Award, TrendingUp, List, BarChart2, Zap,
  Plus, Trash2, Edit3, Check, X, Download, Loader2, ChevronRight, RefreshCw,
} from 'lucide-react';

interface CampeonatosProps {
  userProfile: PlayerProfile;
  onSelectBot: (bot: Bot, playerColor?: 'w' | 'b') => void;
  onBack: () => void;
  /** Incremented by App each time a championship game ends; carries the result */
  pendingResult?: { result: 'win' | 'loss' | 'draw'; seq: number } | null;
  onResultProcessed?: () => void;
}

type ActiveTab = 'partida' | 'clasificacion' | 'historial';
type View = 'list' | 'active' | 'new-siero' | 'new-custom';

const EMOJIS = ['🤖', '🧑', '👦', '👧', '🧒', '🧔', '👨', '👩', '🦁', '🐯', '🦊', '🐺',
  '🦅', '🧙', '🥷', '👑', '🏆', '⚡', '🔥', '💎', '🌟', '🎯'];

function randomEmoji() {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

interface TournamentData {
  title: string;
  totalRounds: number;
  players: CustomChampionshipPlayer[];
}

function parseInfo64Html(html: string): TournamentData | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const h1 = doc.querySelector('h1');
  const pageTitle = doc.querySelector('title');
  const rawTitle = h1?.textContent?.trim()
    || pageTitle?.textContent?.replace(/\s*-\s*info64\.org.*$/i, '').trim()
    || 'Campeonato';

  let totalRounds = 7;
  const roundLinks = Array.from(doc.querySelectorAll('a[href]')) as HTMLAnchorElement[];
  const roundNums = roundLinks
    .map(a => {
      const m = a.getAttribute('href')?.match(/\/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter(n => n > 0 && n <= 20);
  if (roundNums.length > 0) totalRounds = Math.max(...roundNums);

  const table = doc.querySelector('#initial-ranking-table tbody');
  if (!table) return null;

  const rows = Array.from(table.querySelectorAll('tr'));
  const players: CustomChampionshipPlayer[] = [];

  for (const row of rows) {
    const nameEl = row.querySelector('.playername a, td.playername');
    const fideEl = row.querySelector('.playerfiderat');
    const natEl = row.querySelector('.playernatrat1');
    const clubEl = row.querySelector('.playerorigin');

    if (!nameEl) continue;

    const rawName = nameEl.textContent?.trim() ?? '';
    const name = rawName.includes(',')
      ? rawName.split(',').map((s: string) => s.trim()).reverse().join(' ')
      : rawName;

    const fideElo = parseInt(fideEl?.textContent?.trim() ?? '0', 10);
    const natElo = parseInt(natEl?.textContent?.trim() ?? '0', 10);
    const elo = fideElo > 0 ? fideElo : natElo > 0 ? natElo : 800;
    const club = clubEl?.textContent?.trim() ?? '';

    if (name) {
      players.push({ id: `info64-${players.length}`, name, emoji: randomEmoji(), elo, club: club || undefined });
    }
  }

  if (players.length === 0) return null;
  return { title: rawTitle, totalRounds, players };
}

// ── Player row editor ──────────────────────────────────────────────────────

function PlayerRow({
  player, index, onChange, onRemove,
}: {
  player: CustomChampionshipPlayer;
  index: number;
  onChange: (p: CustomChampionshipPlayer) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player);

  const save = () => { onChange({ ...draft, name: draft.name.trim() || player.name }); setEditing(false); };
  const cancel = () => { setDraft(player); setEditing(false); };

  if (editing) {
    return (
      <div className="bg-gray-700 rounded-xl p-3 space-y-2">
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setDraft(d => ({ ...d, emoji: randomEmoji() }))}
            className="text-2xl w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-500 transition-colors shrink-0"
          >
            {draft.emoji}
          </button>
          <input
            className="flex-1 bg-gray-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={draft.name}
            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder="Nombre"
          />
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-gray-400 text-xs w-8 shrink-0">ELO</span>
          <input
            type="number" min={100} max={3000}
            className="w-24 bg-gray-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={draft.elo}
            onChange={e => setDraft(d => ({ ...d, elo: Math.max(100, parseInt(e.target.value) || 100) }))}
          />
          <input
            className="flex-1 bg-gray-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={draft.club ?? ''}
            onChange={e => setDraft(d => ({ ...d, club: e.target.value }))}
            placeholder="Club (opcional)"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={cancel} className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-300" />
          </button>
          <button onClick={save} className="p-1.5 bg-green-600 hover:bg-green-500 rounded-lg transition-colors">
            <Check className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2">
      <span className="text-gray-500 text-xs w-5 shrink-0">{index + 1}</span>
      <span className="text-xl shrink-0">{player.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{player.name}</p>
        {player.club && <p className="text-gray-500 text-xs truncate">{player.club}</p>}
      </div>
      <span className="text-yellow-400 text-xs font-bold shrink-0">{player.elo}</span>
      <button onClick={() => setEditing(true)} className="p-1 hover:bg-gray-700 rounded-lg transition-colors shrink-0">
        <Edit3 className="w-3.5 h-3.5 text-gray-400" />
      </button>
      <button onClick={onRemove} className="p-1 hover:bg-gray-700 rounded-lg transition-colors shrink-0">
        <Trash2 className="w-3.5 h-3.5 text-red-400" />
      </button>
    </div>
  );
}

// ── Podium animation ───────────────────────────────────────────────────────

function PodiumAnimation({ players, userId }: { players: { id: string; name: string; emoji: string; points: number; buchholz: number; elo: number }[]; userId: string }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 300),
      setTimeout(() => setStep(2), 900),
      setTimeout(() => setStep(3), 1500),
      setTimeout(() => setStep(4), 2200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const top3 = players.slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];
  const heights = ['h-32', 'h-24', 'h-20'];
  const colors = ['from-yellow-500 to-yellow-600', 'from-gray-300 to-gray-400', 'from-amber-600 to-amber-700'];
  const podiumOrder = [1, 0, 2];

  return (
    <div className="text-center mb-6">
      <div className="text-4xl mb-2 transition-all duration-500" style={{ opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? 'scale(1)' : 'scale(0.5)' }}>🏆</div>
      <h3 className="text-2xl font-bold text-white mb-1 transition-all duration-500" style={{ opacity: step >= 1 ? 1 : 0, transform: step >= 1 ? 'translateY(0)' : 'translateY(-20px)' }}>¡Campeonato Finalizado!</h3>
      <p className="text-gray-400 text-sm mb-6 transition-all duration-500" style={{ opacity: step >= 1 ? 1 : 0 }}>Resultado final</p>
      <div className="flex items-end justify-center gap-2 mb-6 px-4">
        {podiumOrder.map((rankIdx, visualPos) => {
          const player = top3[rankIdx];
          if (!player) return null;
          const isUser = player.id === userId;
          const show = step >= visualPos + 2;
          return (
            <div key={player.id} className="flex flex-col items-center flex-1 max-w-[110px] transition-all duration-700" style={{ opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(60px)' }}>
              <div className="text-3xl mb-1">{medals[rankIdx]}</div>
              <div className="text-3xl mb-1" style={{ animationIterationCount: 3 }}>{player.emoji}</div>
              <p className={`text-xs font-bold mb-2 text-center leading-tight ${isUser ? 'text-yellow-400' : 'text-white'}`}>{player.name}</p>
              <div className={`w-full rounded-t-lg bg-gradient-to-b ${colors[rankIdx]} flex items-center justify-center ${heights[rankIdx]}`}>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">{rankIdx + 1}º</p>
                  <p className="text-white/80 text-xs">{player.points} pts</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {step >= 4 && (
        <div className="relative h-8 mb-2 overflow-hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="absolute top-0 w-2 h-2 rounded-sm"
              style={{ left: `${8 + i * 7.5}%`, backgroundColor: ['#fbbf24', '#f87171', '#34d399', '#60a5fa', '#a78bfa', '#fb923c'][i % 6], animation: `fall ${0.8 + (i % 4) * 0.2}s ease-in forwards`, animationDelay: `${i * 0.07}s` }} />
          ))}
        </div>
      )}
      <style>{`@keyframes fall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1; } 100% { transform: translateY(40px) rotate(180deg); opacity: 0; } }`}</style>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function Campeonatos({ userProfile, onSelectBot, onBack, pendingResult, onResultProcessed }: CampeonatosProps) {
  const {
    entries, activeId, activeEntry, isLoaded,
    createSiero, createCustom, deleteEntry, renameEntry, selectActive, resetEntry, ensurePairings, submitResult,
  } = useCampeonatos();

  const [view, setView] = useState<View>('list');
  const [activeTab, setActiveTab] = useState<ActiveTab>('partida');
  const [historyRound, setHistoryRound] = useState(1);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');

  // Siero creation state
  const [adaptive, setAdaptive] = useState(false);

  // Custom / import creation state
  const [url, setUrl] = useState('');
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [fetchError, setFetchError] = useState('');
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // When active entry changes, ensure pairings and reset tabs
  useEffect(() => {
    if (activeEntry?.state && !isCurrentRoundComplete(activeEntry.state)) {
      ensurePairings(activeEntry.id);
    }
  }, [activeEntry?.id, activeEntry?.state?.currentRound]);

  useEffect(() => {
    setActiveTab('partida');
  }, [activeEntry?.state?.currentRound]);

  // If there's an active entry and we come back, show active view
  useEffect(() => {
    if (isLoaded && activeEntry?.state && view === 'list') {
      setView('active');
    }
  }, [isLoaded]);

  // Process game result sent from App after a championship game ends
  useEffect(() => {
    if (!pendingResult || !activeId) return;
    submitResult(activeId, pendingResult.result);
    setView('active');
    onResultProcessed?.();
  }, [pendingResult?.seq]);

  // ── Fetch tournament ───────────────────────────────────────────────────

  const fetchTournament = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setFetchStatus('loading');
    setFetchError('');
    setTournamentData(null);
    try {
      const response = await fetch(trimmed, { signal: ctrl.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const data = parseInfo64Html(html);
      if (!data) {
        setFetchStatus('error');
        setFetchError('No se encontró la tabla de clasificación. Asegúrate de que la URL es de un torneo info64.org.');
        return;
      }
      setTournamentData(data);
      setFetchStatus('ok');
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') return;
      setFetchStatus('error');
      setFetchError('No se pudo cargar la página. Comprueba la URL e inténtalo de nuevo.');
    }
  }, [url]);

  const handleStartCustom = useCallback(() => {
    if (!tournamentData || tournamentData.players.length < 2) return;
    // Remove user from opponents list if present (same name)
    const opponents = tournamentData.players.filter(
      p => p.name.toLowerCase() !== userProfile.name.toLowerCase()
    );
    createCustom(userProfile, tournamentData.title, tournamentData.totalRounds, opponents, url.trim() || undefined);
    setView('active');
    setUrl('');
    setFetchStatus('idle');
    setTournamentData(null);
  }, [tournamentData, userProfile, createCustom, url]);

  const handleStartSiero = useCallback(() => {
    createSiero(userProfile, adaptive);
    setView('active');
  }, [userProfile, adaptive, createSiero]);

  // ── Active championship derived state ──────────────────────────────────

  const championship = activeEntry?.state ?? null;

  const currentPairing = useMemo(() => {
    if (!championship) return null;
    return getUserPairingForRound(championship, championship.currentRound);
  }, [championship]);

  const opponentBot = useMemo(() => {
    if (!championship || !currentPairing) return null;
    const opponentId = currentPairing.whiteId === championship.userId
      ? currentPairing.blackId : currentPairing.whiteId;
    const opponent = championship.players.find(p => p.id === opponentId);
    return opponent ? championshipPlayerToBot(opponent) : null;
  }, [championship, currentPairing]);

  const userColorThisRound = useMemo((): 'w' | 'b' => {
    if (!championship || !currentPairing) return 'w';
    return currentPairing.whiteId === championship.userId ? 'w' : 'b';
  }, [championship, currentPairing]);

  const fullRanking = useMemo(() => {
    if (!championship) return [];
    return [...championship.players].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      return b.elo - a.elo;
    });
  }, [championship]);

  const userStanding = useMemo(() =>
    championship?.players.find(p => p.id === championship.userId), [championship]);

  const userRank = useMemo(() =>
    championship ? fullRanking.findIndex(p => p.id === championship.userId) + 1 : null,
    [fullRanking, championship]);

  const userTable = useMemo(() => currentPairing?.table ?? null, [currentPairing]);

  const roundHistory = useMemo(() => {
    if (!championship) return [];
    const rounds = [];
    for (let r = 1; r < championship.currentRound; r++) {
      const pairing = getUserPairingForRound(championship, r);
      if (!pairing?.result) continue;
      const isWhite = pairing.whiteId === championship.userId;
      const opponentId = isWhite ? pairing.blackId : pairing.whiteId;
      const opponent = championship.players.find(p => p.id === opponentId);
      let result: 'win' | 'loss' | 'draw';
      if (pairing.result === '1/2-1/2') result = 'draw';
      else if ((pairing.result === '1-0' && isWhite) || (pairing.result === '0-1' && !isWhite)) result = 'win';
      else result = 'loss';
      rounds.push({ round: r, opponent, result });
    }
    return rounds;
  }, [championship]);

  const roundPairings = useMemo(() => {
    if (!championship) return [];
    return championship.pairings
      .filter(p => p.round === historyRound && p.result)
      .map(p => ({
        pairing: p,
        white: championship.players.find(pl => pl.id === p.whiteId),
        black: championship.players.find(pl => pl.id === p.blackId),
      }));
  }, [championship, historyRound]);

  const userStats = useMemo(() => {
    const wins = roundHistory.filter(r => r.result === 'win').length;
    const losses = roundHistory.filter(r => r.result === 'loss').length;
    const draws = roundHistory.filter(r => r.result === 'draw').length;
    return { wins, losses, draws, played: roundHistory.length };
  }, [roundHistory]);

  // ── Loading ────────────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  // ── View: List of championships ────────────────────────────────────────

  if (view === 'list') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">Campeonatos</h2>
            <p className="text-sm text-gray-400">Gestiona tus torneos</p>
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="bg-gray-800 rounded-2xl p-6 text-center mb-4">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 text-sm">No tienes campeonatos. Crea uno nuevo.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {entries.map(entry => {
              const isActive = entry.id === activeId;
              const progress = entry.state
                ? `Ronda ${entry.state.currentRound}/${entry.state.totalRounds}${entry.state.completed ? ' · Completado' : ''}`
                : 'Sin iniciar';
              const typeLabel = entry.type === 'siero' ? '⚽ Club Siero' : '🌐 Personalizado';

              if (renamingId === entry.id) {
                return (
                  <div key={entry.id} className="bg-gray-800 rounded-xl px-3 py-2 flex items-center gap-2">
                    <input
                      autoFocus
                      className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { renameEntry(entry.id, renameVal.trim() || entry.name); setRenamingId(null); }
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                    />
                    <button onClick={() => { renameEntry(entry.id, renameVal.trim() || entry.name); setRenamingId(null); }} className="p-1.5 bg-green-600 rounded-lg">
                      <Check className="w-4 h-4 text-white" />
                    </button>
                    <button onClick={() => setRenamingId(null)} className="p-1.5 bg-gray-600 rounded-lg">
                      <X className="w-4 h-4 text-gray-300" />
                    </button>
                  </div>
                );
              }

              return (
                <div key={entry.id} className={`flex items-center gap-2 rounded-xl px-3 py-3 ${isActive ? 'bg-blue-900/30 border border-blue-500/40' : 'bg-gray-800'}`}>
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => { selectActive(entry.id); setView('active'); }}
                  >
                    <p className={`font-semibold text-sm truncate ${isActive ? 'text-blue-300' : 'text-white'}`}>{entry.name}</p>
                    <p className="text-xs text-gray-500">{typeLabel} · {progress}</p>
                  </button>
                  <button onClick={() => { setRenamingId(entry.id); setRenameVal(entry.name); }} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors shrink-0">
                    <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  {entry.state && (
                    <button onClick={() => { if (confirm('¿Reiniciar este campeonato? Se perderá todo el progreso.')) resetEntry(entry.id); }} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors shrink-0">
                      <RefreshCw className="w-3.5 h-3.5 text-yellow-500" />
                    </button>
                  )}
                  <button onClick={() => { if (confirm('¿Eliminar este campeonato?')) deleteEntry(entry.id); }} className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                </div>
              );
            })}
          </div>
        )}

        {/* Create buttons */}
        <div className="space-y-2">
          <button
            onClick={() => setView('new-siero')}
            className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white rounded-xl font-semibold transition-all active:scale-[0.98]"
          >
            <Trophy className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <p className="font-bold text-sm">Nuevo Campeonato Siero</p>
              <p className="text-xs text-white/70">40 jugadores · 7 rondas · Sistema suizo</p>
            </div>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
          <button
            onClick={() => setView('new-custom')}
            className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl font-semibold transition-all active:scale-[0.98]"
          >
            <Download className="w-5 h-5 shrink-0" />
            <div className="text-left">
              <p className="font-bold text-sm">Importar desde info64.org</p>
              <p className="text-xs text-white/70">Pega la URL y empieza a jugar</p>
            </div>
            <ChevronRight className="w-4 h-4 ml-auto" />
          </button>
        </div>
      </div>
    );
  }

  // ── View: New Siero ────────────────────────────────────────────────────

  if (view === 'new-siero') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setView('list')} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Campeonato Siero</h2>
            <p className="text-sm text-gray-400">Sistema suizo · 40 jugadores · 7 rondas</p>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl mb-4">
          <div className="space-y-2">
            {[
              ['Participantes', '40 (39 bots + tú)', 'text-white'],
              ['Rondas', '7', 'text-white'],
              ['Sistema', 'Suizo (FIDE Dutch)', 'text-white'],
              ['😅 Debutantes', 'ELO 100–499', 'text-green-400'],
              ['🧐 Intermedios', 'ELO 500–899', 'text-yellow-400'],
              ['🏆 Avanzados', 'ELO 900–1500', 'text-red-400'],
            ].map(([label, value, cls]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className={`font-medium ${cls}`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => setAdaptive(v => !v)}
          className={`w-full flex items-center justify-between p-3 rounded-xl mb-4 transition-colors border ${adaptive ? 'bg-purple-600/20 border-purple-500/50' : 'bg-gray-700/50 border-gray-600'}`}
        >
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${adaptive ? 'text-purple-400' : 'text-gray-500'}`} />
            <div className="text-left">
              <p className={`text-sm font-semibold ${adaptive ? 'text-purple-200' : 'text-gray-300'}`}>Modo adaptativo</p>
              <p className="text-xs text-gray-500">{adaptive ? `ELOs centrados en tu nivel (${userProfile.elo})` : 'Rivales con ELO fijo (100–1500)'}</p>
            </div>
          </div>
          <div className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${adaptive ? 'bg-purple-500' : 'bg-gray-600'}`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${adaptive ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
        </button>

        <button
          onClick={handleStartSiero}
          className="w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Trophy className="w-5 h-5" />
          Iniciar Campeonato
        </button>
      </div>
    );
  }

  // ── View: New custom (import) ──────────────────────────────────────────

  if (view === 'new-custom') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => { setView('list'); setUrl(''); setFetchStatus('idle'); setTournamentData(null); }} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Importar torneo</h2>
            <p className="text-sm text-gray-400">Desde info64.org</p>
          </div>
        </div>

        {!tournamentData ? (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-2xl p-4">
              <p className="text-gray-300 text-sm mb-3">Pega la URL del torneo en info64.org y carga los participantes automáticamente.</p>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-gray-700 text-white text-sm rounded-xl px-3 py-3 outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-500"
                  placeholder="https://www.info64.org/..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchTournament()}
                />
                <button
                  onClick={fetchTournament}
                  disabled={fetchStatus === 'loading' || !url.trim()}
                  className="px-4 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
                >
                  {fetchStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
              </div>
              {fetchStatus === 'error' && <p className="text-red-400 text-xs mt-2">{fetchError}</p>}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-base truncate">{tournamentData.title}</p>
                  <p className="text-gray-400 text-xs">{tournamentData.players.length} jugadores · {tournamentData.totalRounds} rondas</p>
                </div>
                <button onClick={() => { setTournamentData(null); setFetchStatus('idle'); }} className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors shrink-0">
                  <X className="w-4 h-4 text-gray-300" />
                </button>
              </div>

              {/* Editable rounds */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-gray-400 text-xs">Rondas:</span>
                <input
                  type="number" min={1} max={20}
                  className="w-16 bg-gray-700 text-white text-sm rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-teal-500 text-center"
                  value={tournamentData.totalRounds}
                  onChange={e => setTournamentData(d => d ? { ...d, totalRounds: Math.max(1, parseInt(e.target.value) || 1) } : d)}
                />
              </div>
            </div>

            {/* Player list */}
            <div className="bg-gray-800 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">Jugadores</p>
                <button
                  onClick={() => setTournamentData(d => d ? {
                    ...d,
                    players: [...d.players, { id: `manual-${Date.now()}`, name: 'Nuevo jugador', emoji: randomEmoji(), elo: 1000 }],
                  } : d)}
                  className="p-1 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-300" />
                </button>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {tournamentData.players.map((player, idx) => (
                  <PlayerRow
                    key={player.id}
                    player={player}
                    index={idx}
                    onChange={updated => setTournamentData(d => d ? { ...d, players: d.players.map(p => p.id === updated.id ? updated : p) } : d)}
                    onRemove={() => setTournamentData(d => d ? { ...d, players: d.players.filter(p => p.id !== player.id) } : d)}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleStartCustom}
              disabled={tournamentData.players.length < 2}
              className="w-full py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Trophy className="w-5 h-5" />
              Iniciar Campeonato
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── View: Active championship ──────────────────────────────────────────

  if (!activeEntry || !championship) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6 text-center py-12">
        <p className="text-gray-400 mb-4">No hay campeonato activo.</p>
        <button onClick={() => setView('list')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Ver campeonatos</button>
      </div>
    );
  }

  // Completed
  if (championship.completed) {
    const userPosition = fullRanking.findIndex(p => p.id === championship.userId) + 1;
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setView('list')} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white truncate">{activeEntry.name}</h2>
            <p className="text-sm text-gray-400">Resultado Final</p>
          </div>
        </div>

        <PodiumAnimation players={fullRanking} userId={championship.userId} />

        <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-yellow-500/50 p-4 rounded-2xl mb-4 text-center">
          <p className="text-gray-400 text-sm mb-1">Tu posición final</p>
          <p className="text-5xl font-bold text-yellow-400 mb-1">#{userPosition}</p>
          <p className="text-gray-300 text-sm">{userStanding?.points} puntos · Buchholz: {userStanding?.buchholz.toFixed(1)}</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl mb-4">
          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />Clasificación Final
          </h4>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {fullRanking.map((player, idx) => {
              const isUser = player.id === championship.userId;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
              return (
                <div key={player.id} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${isUser ? 'bg-yellow-600/20 border border-yellow-500/50' : 'bg-gray-900/50'}`}>
                  <span className="font-bold text-gray-400 w-7 text-xs">{medal ?? `#${idx + 1}`}</span>
                  <span className="text-lg">{player.emoji}</span>
                  <div className="flex-1 min-w-0"><p className={`font-medium truncate ${isUser ? 'text-yellow-400' : 'text-white'}`}>{player.name}</p></div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-white">{player.points} pts</p>
                    <p className="text-xs text-gray-500">BH {player.buchholz.toFixed(1)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button onClick={() => { resetEntry(activeEntry.id); setView('list'); }} className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors">
          Volver a campeonatos
        </button>
      </div>
    );
  }

  // Active round
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => setView('list')} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{activeEntry.name}</h2>
          <p className="text-sm text-gray-400">Ronda {championship.currentRound} de {championship.totalRounds}</p>
        </div>
        {userRank && (
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400">Tu posición</p>
            <p className="text-xl font-bold text-yellow-400">#{userRank}</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
            style={{ width: `${((championship.currentRound - 1) / championship.totalRounds) * 100}%` }} />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{championship.currentRound - 1} rondas completadas</span>
          <span>{championship.totalRounds - (championship.currentRound - 1)} restantes</span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Jugadas', value: userStats.played, color: 'text-white' },
          { label: 'Victorias', value: userStats.wins, color: 'text-green-400' },
          { label: 'Derrotas', value: userStats.losses, color: 'text-red-400' },
          { label: 'Tablas', value: userStats.draws, color: 'text-yellow-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-800 rounded-lg p-2 text-center">
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-800 rounded-lg p-1">
        {([
          { id: 'partida', label: 'Tu partida', icon: <Play className="w-3 h-3" /> },
          { id: 'clasificacion', label: 'Clasificación', icon: <TrendingUp className="w-3 h-3" /> },
          { id: 'historial', label: 'Historial', icon: <List className="w-3 h-3" /> },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-semibold transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Tu partida */}
      {activeTab === 'partida' && (
        <div className="space-y-4">
          {opponentBot && currentPairing ? (
            <div className="bg-gray-800 p-5 rounded-2xl">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide text-gray-400">
                <Play className="w-4 h-4 text-blue-400" />
                Ronda {championship.currentRound} — Mesa {userTable}
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-gray-700">{opponentBot.emoji}</div>
                  <div>
                    <p className="font-bold text-white text-lg">{opponentBot.name}</p>
                    <p className="text-sm text-gray-400">ELO {opponentBot.elo}</p>
                    <p className="text-xs font-semibold mt-0.5">
                      <span className={userColorThisRound === 'w' ? 'text-white' : 'text-gray-500'}>
                        {userColorThisRound === 'w' ? '⬜ Juegas con blancas' : '⬛ Juegas con negras'}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onSelectBot(opponentBot, userColorThisRound)}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />Jugar
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 p-5 rounded-2xl text-center text-gray-400">
              <p>No hay partida asignada para esta ronda.</p>
            </div>
          )}

          {roundHistory.length > 0 && (
            <div className="bg-gray-800 p-4 rounded-xl">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Mis partidas</h4>
              <div className="space-y-2">
                {roundHistory.map(({ round, opponent, result }) => (
                  <div key={round} className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500 w-16 text-xs">Ronda {round}</span>
                    <span className="text-lg">{opponent?.emoji ?? '?'}</span>
                    <span className="flex-1 text-white truncate">{opponent?.name ?? 'Desconocido'}</span>
                    <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${result === 'win' ? 'bg-green-700 text-green-200' : result === 'loss' ? 'bg-red-800 text-red-200' : 'bg-yellow-700 text-yellow-200'}`}>
                      {result === 'win' ? 'Victoria' : result === 'loss' ? 'Derrota' : 'Tablas'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Clasificación */}
      {activeTab === 'clasificacion' && (
        <div className="bg-gray-800 p-4 rounded-xl">
          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-400" />Clasificación general
          </h4>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {fullRanking.map((player, idx) => {
              const isUser = player.id === championship.userId;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
              return (
                <div key={player.id} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${isUser ? 'bg-yellow-600/20 border border-yellow-500/50' : 'bg-gray-900/50'}`}>
                  <span className="font-bold text-gray-400 w-7 text-xs shrink-0">{medal ?? `#${idx + 1}`}</span>
                  <span className="text-base shrink-0">{player.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate text-xs ${isUser ? 'text-yellow-400' : 'text-white'}`}>{player.name}</p>
                    <p className="text-xs text-gray-500">ELO {player.elo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-white text-sm">{player.points} pts</p>
                    <p className="text-xs text-gray-500">BH {player.buchholz.toFixed(1)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: Historial */}
      {activeTab === 'historial' && (
        <div className="space-y-3">
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: championship.currentRound - 1 }, (_, i) => i + 1).map(r => (
              <button key={r} onClick={() => setHistoryRound(r)}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${historyRound === r ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                R{r}
              </button>
            ))}
          </div>
          {championship.currentRound <= 1 ? (
            <div className="bg-gray-800 p-5 rounded-xl text-center text-gray-400 text-sm">Aún no hay rondas completadas.</div>
          ) : roundPairings.length === 0 ? (
            <div className="bg-gray-800 p-5 rounded-xl text-center text-gray-400 text-sm">Sin resultados para esta ronda.</div>
          ) : (
            <div className="bg-gray-800 p-4 rounded-xl">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Resultados — Ronda {historyRound}</h4>
              <div className="space-y-2">
                {roundPairings.sort((a, b) => a.pairing.table - b.pairing.table).map(({ pairing, white, black }) => {
                  const isUserPairing = pairing.whiteId === championship.userId || pairing.blackId === championship.userId;
                  return (
                    <div key={pairing.table} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${isUserPairing ? 'bg-blue-900/30 border border-blue-500/40' : 'bg-gray-900/50'}`}>
                      <span className="text-gray-500 w-8 shrink-0">M{pairing.table}</span>
                      <span className={`flex-1 text-right truncate font-medium ${pairing.result === '1-0' ? 'text-green-400' : pairing.result === '1/2-1/2' ? 'text-yellow-400' : 'text-white'}`}>
                        {white?.emoji} {white?.name}
                      </span>
                      <span className="text-gray-400 font-bold shrink-0 px-1">
                        {pairing.result === '1-0' ? '1 – 0' : pairing.result === '0-1' ? '0 – 1' : '½ – ½'}
                      </span>
                      <span className={`flex-1 truncate font-medium ${pairing.result === '0-1' ? 'text-green-400' : pairing.result === '1/2-1/2' ? 'text-yellow-400' : 'text-white'}`}>
                        {black?.emoji} {black?.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => { if (confirm('¿Reiniciar este campeonato? Se perderá todo el progreso.')) { resetEntry(activeEntry.id); setView('list'); } }}
        className="w-full mt-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-500 text-xs rounded-lg transition-colors"
      >
        Reiniciar Campeonato
      </button>
    </div>
  );
}
