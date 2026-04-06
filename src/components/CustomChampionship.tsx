import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import type { Bot, CustomChampionshipPlayer, PlayerProfile } from '@/types';
import { useCustomChampionshipState } from '@/hooks/useStorage';
import {
  getUserPairingForRound,
  championshipPlayerToBot,
  isCurrentRoundComplete,
} from '@/lib/championship';
import {
  ChevronLeft, Trophy, Play, Award, TrendingUp, List, BarChart2,
  Plus, Trash2, Edit3, Check, X, Download, Loader2, Settings,
  Users, ChevronRight,
} from 'lucide-react';

interface CustomChampionshipProps {
  userProfile: PlayerProfile;
  onSelectBot: (bot: Bot, playerColor?: 'w' | 'b') => void;
  onBack: () => void;
}

type WizardStep = 'config' | 'players' | 'active';
type ActiveTab = 'partida' | 'clasificacion' | 'historial';

const EMOJIS = ['🤖', '🧑', '👦', '👧', '🧒', '🧔', '👨', '👩', '🦁', '🐯', '🦊', '🐺',
  '🦅', '🧙', '🥷', '👑', '🏆', '⚡', '🔥', '💎', '🌟', '🎯'];

function randomEmoji() {
  return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

// Parse info64.org HTML and extract players from initial ranking table
function parseInfo64Html(html: string): { name: string; elo: number; club: string }[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const table = doc.querySelector('#initial-ranking-table tbody');
  if (!table) return [];

  const rows = Array.from(table.querySelectorAll('tr'));
  const players: { name: string; elo: number; club: string }[] = [];

  for (const row of rows) {
    const nameEl = row.querySelector('.playername a, td.playername');
    const fideEl = row.querySelector('.playerfiderat');
    const natEl = row.querySelector('.playernatrat1');
    const clubEl = row.querySelector('.playerorigin');

    if (!nameEl) continue;

    const rawName = nameEl.textContent?.trim() ?? '';
    // Convert "Lastname, Firstname" → "Firstname Lastname"
    const name = rawName.includes(',')
      ? rawName.split(',').map(s => s.trim()).reverse().join(' ')
      : rawName;

    const fideElo = parseInt(fideEl?.textContent?.trim() ?? '0', 10);
    const natElo = parseInt(natEl?.textContent?.trim() ?? '0', 10);
    const elo = fideElo > 0 ? fideElo : natElo > 0 ? natElo : 800;
    const club = clubEl?.textContent?.trim() ?? '';

    if (name) players.push({ name, elo, club });
  }

  return players;
}

// Inline player editor row
function PlayerRow({
  player,
  onChange,
  onRemove,
  index,
}: {
  player: CustomChampionshipPlayer;
  onChange: (p: CustomChampionshipPlayer) => void;
  onRemove: () => void;
  index: number;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(player);

  const save = () => {
    onChange({ ...draft, name: draft.name.trim() || player.name });
    setEditing(false);
  };
  const cancel = () => {
    setDraft(player);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-gray-700 rounded-xl p-3 space-y-2">
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setDraft(d => ({ ...d, emoji: randomEmoji() }))}
            className="text-2xl w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-500 transition-colors shrink-0"
            title="Cambiar emoji"
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
          <span className="text-gray-400 text-xs w-10 shrink-0">ELO</span>
          <input
            type="number"
            min={100}
            max={3000}
            className="flex-1 bg-gray-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={draft.elo}
            onChange={e => setDraft(d => ({ ...d, elo: Math.max(100, parseInt(e.target.value) || 100) }))}
          />
          <span className="text-gray-400 text-xs w-16 shrink-0">Club</span>
          <input
            className="flex-1 bg-gray-600 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={draft.club ?? ''}
            onChange={e => setDraft(d => ({ ...d, club: e.target.value }))}
            placeholder="Club"
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

export function CustomChampionship({ userProfile, onSelectBot, onBack }: CustomChampionshipProps) {
  const {
    championship,
    isLoaded,
    startNew,
    reset,
    ensureCurrentRoundPairings,
  } = useCustomChampionshipState();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('config');

  // Config step
  const [title, setTitle] = useState('Mi Campeonato');
  const [totalRounds, setTotalRounds] = useState(7);
  const [eloMin, setEloMin] = useState(200);
  const [eloMax, setEloMax] = useState(1400);

  // Players step
  const [players, setPlayers] = useState<CustomChampionshipPlayer[]>([]);
  const [info64Url, setInfo64Url] = useState('');
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [fetchError, setFetchError] = useState('');

  // Active championship
  const [activeTab, setActiveTab] = useState<ActiveTab>('partida');
  const [historyRound, setHistoryRound] = useState(1);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isLoaded && championship) setStep('active');
  }, [isLoaded, championship]);

  useEffect(() => {
    if (championship && !isCurrentRoundComplete(championship)) {
      ensureCurrentRoundPairings();
    }
  }, [championship, ensureCurrentRoundPairings]);

  useEffect(() => {
    setActiveTab('partida');
  }, [championship?.currentRound]);

  // Fetch info64 page and extract players
  const fetchInfo64 = useCallback(async () => {
    const url = info64Url.trim();
    if (!url) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setFetchStatus('loading');
    setFetchError('');

    try {
      // info64 allows direct fetch (no CORS restriction for reads)
      const response = await fetch(url, { signal: ctrl.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const parsed = parseInfo64Html(html);

      if (parsed.length === 0) {
        setFetchStatus('error');
        setFetchError('No se encontró la tabla de clasificación en esa URL.');
        return;
      }

      // Filter by ELO range and merge with existing (avoid duplicates by name)
      const existingNames = new Set(players.map(p => p.name.toLowerCase()));
      const newPlayers: CustomChampionshipPlayer[] = parsed
        .filter(p => p.elo >= eloMin && p.elo <= eloMax)
        .filter(p => !existingNames.has(p.name.toLowerCase()))
        .map((p, i) => ({
          id: `imported-${Date.now()}-${i}`,
          name: p.name,
          emoji: randomEmoji(),
          elo: p.elo,
          club: p.club || undefined,
        }));

      setPlayers(prev => [...prev, ...newPlayers]);
      setFetchStatus('ok');
    } catch (e: unknown) {
      if ((e as Error).name === 'AbortError') return;
      setFetchStatus('error');
      setFetchError('No se pudo cargar la página. Asegúrate de que la URL es correcta.');
    }
  }, [info64Url, eloMin, eloMax, players]);

  const addPlayer = useCallback(() => {
    setPlayers(prev => [...prev, {
      id: `manual-${Date.now()}`,
      name: `Jugador ${prev.length + 1}`,
      emoji: randomEmoji(),
      elo: Math.round((eloMin + eloMax) / 2),
    }]);
  }, [eloMin, eloMax]);

  const removePlayer = useCallback((id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  }, []);

  const updatePlayer = useCallback((updated: CustomChampionshipPlayer) => {
    setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, []);

  const handleStart = useCallback(() => {
    const filtered = players.filter(p => p.elo >= eloMin && p.elo <= eloMax);
    if (filtered.length < 2) return;
    startNew(userProfile, title, totalRounds, filtered);
    setStep('active');
  }, [players, eloMin, eloMax, userProfile, title, totalRounds, startNew]);

  // ─── Active championship views ────────────────────────────────────────────

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
    championship?.players.find(p => p.id === championship.userId),
    [championship]);

  const userRank = useMemo(() =>
    championship ? fullRanking.findIndex(p => p.id === championship.userId) + 1 : null,
    [fullRanking, championship]);

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
      rounds.push({ round: r, opponent, result, pairing });
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
    if (!championship) return null;
    return {
      wins: roundHistory.filter(r => r.result === 'win').length,
      losses: roundHistory.filter(r => r.result === 'loss').length,
      draws: roundHistory.filter(r => r.result === 'draw').length,
      played: roundHistory.length,
    };
  }, [roundHistory]);

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (!isLoaded) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-6 text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  // ─── Step: Config ─────────────────────────────────────────────────────────

  if (step === 'config') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Torneo Personalizado</h2>
            <p className="text-sm text-gray-400">Paso 1 de 2 — Configuración</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Título */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Título</label>
            <input
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Nombre del torneo"
            />
          </div>

          {/* Rondas */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Rondas</label>
              <span className="text-yellow-400 font-bold text-lg">{totalRounds}</span>
            </div>
            <input
              type="range" min={1} max={15} value={totalRounds}
              onChange={e => setTotalRounds(parseInt(e.target.value))}
              className="w-full accent-yellow-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1</span><span>8</span><span>15</span>
            </div>
          </div>

          {/* Rango ELO */}
          <div className="bg-gray-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Rango ELO de rivales</label>
              <span className="text-blue-400 font-bold text-sm">{eloMin} – {eloMax}</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-8">Mín</span>
                <input
                  type="range" min={100} max={eloMax - 50} value={eloMin}
                  onChange={e => setEloMin(parseInt(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-xs text-white w-10 text-right">{eloMin}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-8">Máx</span>
                <input
                  type="range" min={eloMin + 50} max={3000} value={eloMax}
                  onChange={e => setEloMax(parseInt(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-xs text-white w-10 text-right">{eloMax}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Los rivales importados fuera de este rango serán excluidos.
            </p>
          </div>

          {/* Sistema */}
          <div className="bg-gray-800 rounded-xl p-4">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-2">Sistema</label>
            <div className="flex gap-2">
              <div className="flex-1 bg-blue-600/20 border border-blue-500/50 rounded-lg px-3 py-2 text-center">
                <p className="text-blue-300 text-sm font-semibold">Suizo</p>
                <p className="text-gray-500 text-xs">FIDE Dutch</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep('players')}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
          >
            <Users className="w-5 h-5" />
            Siguiente — Añadir jugadores
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ─── Step: Players ────────────────────────────────────────────────────────

  if (step === 'players') {
    const filteredCount = players.filter(p => p.elo >= eloMin && p.elo <= eloMax).length;

    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => setStep('config')} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white truncate">{title}</h2>
            <p className="text-sm text-gray-400">Paso 2 de 2 — Jugadores</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-yellow-400 font-bold">{filteredCount}</p>
            <p className="text-xs text-gray-500">rivales</p>
          </div>
        </div>

        {/* Import from info64 */}
        <div className="bg-gray-800 rounded-xl p-4 mb-4 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <Download className="w-3.5 h-3.5" /> Importar desde info64.org
          </p>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
              value={info64Url}
              onChange={e => setInfo64Url(e.target.value)}
              placeholder="https://info64.org/torneo-nombre"
            />
            <button
              onClick={fetchInfo64}
              disabled={fetchStatus === 'loading' || !info64Url.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors shrink-0 flex items-center gap-1"
            >
              {fetchStatus === 'loading'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
            </button>
          </div>
          {fetchStatus === 'ok' && (
            <p className="text-green-400 text-xs">✓ Jugadores importados correctamente</p>
          )}
          {fetchStatus === 'error' && (
            <p className="text-red-400 text-xs">{fetchError}</p>
          )}
          <p className="text-gray-600 text-xs">
            Pega la URL del torneo en info64.org y se importarán los jugadores del ranking inicial.
          </p>
        </div>

        {/* Player list */}
        <div className="space-y-2 mb-4 max-h-80 overflow-y-auto pr-1">
          {players.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No hay jugadores aún. Importa desde info64 o añade manualmente.
            </div>
          )}
          {players.map((p, i) => (
            <PlayerRow
              key={p.id}
              player={p}
              index={i}
              onChange={updatePlayer}
              onRemove={() => removePlayer(p.id)}
            />
          ))}
        </div>

        {/* Add manually */}
        <button
          onClick={addPlayer}
          className="w-full py-2 border border-dashed border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white text-sm rounded-xl transition-colors flex items-center justify-center gap-2 mb-4"
        >
          <Plus className="w-4 h-4" /> Añadir jugador manualmente
        </button>

        {filteredCount < 2 && (
          <p className="text-yellow-500 text-xs text-center mb-3">
            Necesitas al menos 2 rivales en el rango ELO {eloMin}–{eloMax}
          </p>
        )}

        <button
          onClick={handleStart}
          disabled={filteredCount < 2}
          className="w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Trophy className="w-5 h-5" />
          Iniciar Torneo ({filteredCount + 1} jugadores, {totalRounds} rondas)
        </button>
      </div>
    );
  }

  // ─── Active championship ───────────────────────────────────────────────────

  if (!championship) return null;

  if (championship.completed) {
    const userPosition = fullRanking.findIndex(p => p.id === championship.userId) + 1;
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Resultado Final</h2>
            <p className="text-sm text-gray-400 truncate">{championship.seasonId.replace('custom-', '')}</p>
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏆</div>
          <p className="text-gray-400 text-sm mb-1">Tu posición final</p>
          <p className="text-5xl font-bold text-yellow-400 mb-1">#{userPosition}</p>
          <p className="text-gray-300 text-sm">
            {userStanding?.points} puntos · Buchholz: {userStanding?.buchholz.toFixed(1)}
          </p>
        </div>

        <div className="bg-gray-800 p-4 rounded-xl mb-4">
          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" /> Clasificación Final
          </h4>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {fullRanking.map((player, idx) => {
              const isUser = player.id === championship.userId;
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
              return (
                <div key={player.id} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${isUser ? 'bg-yellow-600/20 border border-yellow-500/50' : 'bg-gray-900/50'}`}>
                  <span className="font-bold text-gray-400 w-7 text-xs">{medal ?? `#${idx + 1}`}</span>
                  <span className="text-lg">{player.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate text-xs ${isUser ? 'text-yellow-400' : 'text-white'}`}>{player.name}</p>
                    <p className="text-xs text-gray-500">ELO {player.elo}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-white">{player.points} pts</p>
                    <p className="text-xs text-gray-500">BH {player.buchholz.toFixed(1)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => { reset(); setStep('config'); setPlayers([]); }}
          className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
        >
          Nuevo Torneo
        </button>
      </div>
    );
  }

  // Active round view
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{title || 'Torneo'}</h2>
          <p className="text-sm text-gray-400">Ronda {championship.currentRound} de {championship.totalRounds}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {userRank && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Posición</p>
              <p className="text-xl font-bold text-yellow-400">#{userRank}</p>
            </div>
          )}
          <button
            onClick={() => { setStep('config'); }}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title="Configuración"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${((championship.currentRound - 1) / championship.totalRounds) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{championship.currentRound - 1} rondas completadas</span>
          <span>{championship.totalRounds - (championship.currentRound - 1)} restantes</span>
        </div>
      </div>

      {/* Stats */}
      {userStats && (
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
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-800 rounded-lg p-1">
        {([
          { id: 'partida', label: 'Tu partida', icon: <Play className="w-3 h-3" /> },
          { id: 'clasificacion', label: 'Clasificación', icon: <TrendingUp className="w-3 h-3" /> },
          { id: 'historial', label: 'Historial', icon: <List className="w-3 h-3" /> },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-xs font-semibold transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Partida */}
      {activeTab === 'partida' && (
        <div className="space-y-4">
          {opponentBot && currentPairing ? (
            <div className="bg-gray-800 p-5 rounded-2xl">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wide text-gray-400">
                <Play className="w-4 h-4 text-blue-400" />
                Ronda {championship.currentRound} — Mesa {currentPairing.table}
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl bg-gray-700">
                    {opponentBot.emoji}
                  </div>
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
                  <Play className="w-4 h-4" /> Jugar
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 p-5 rounded-2xl text-center text-gray-400">
              No hay partida asignada para esta ronda.
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
            <BarChart2 className="w-5 h-5 text-blue-400" /> Clasificación general
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
            {Array.from({ length: championship.currentRound - 1 }, (_, i) => i + 1).map((r) => (
              <button
                key={r}
                onClick={() => setHistoryRound(r)}
                className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors ${historyRound === r ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                R{r}
              </button>
            ))}
          </div>
          {championship.currentRound <= 1 ? (
            <div className="bg-gray-800 p-5 rounded-xl text-center text-gray-400 text-sm">
              Aún no hay rondas completadas.
            </div>
          ) : roundPairings.length === 0 ? (
            <div className="bg-gray-800 p-5 rounded-xl text-center text-gray-400 text-sm">
              Sin resultados para esta ronda.
            </div>
          ) : (
            <div className="bg-gray-800 p-4 rounded-xl">
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Resultados — Ronda {historyRound}
              </h4>
              <div className="space-y-2">
                {roundPairings
                  .sort((a, b) => a.pairing.table - b.pairing.table)
                  .map(({ pairing, white, black }) => {
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

      {/* Reset button */}
      <button
        onClick={() => {
          if (confirm('¿Reiniciar el torneo? Se perderá todo el progreso.')) {
            reset();
            setStep('config');
            setPlayers([]);
          }
        }}
        className="w-full mt-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-500 text-xs rounded-lg transition-colors"
      >
        Reiniciar Torneo
      </button>
    </div>
  );
}
