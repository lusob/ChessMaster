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
  Trash2, Edit3, Check, X, Download, Loader2, Plus,
} from 'lucide-react';

interface CustomChampionshipProps {
  userProfile: PlayerProfile;
  onSelectBot: (bot: Bot, playerColor?: 'w' | 'b') => void;
  onBack: () => void;
}

type ActiveTab = 'partida' | 'clasificacion' | 'historial';

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

// Parse info64.org HTML — extract title, rounds and players
function parseInfo64Html(html: string): TournamentData | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Title: try h1 first, then <title>
  const h1 = doc.querySelector('h1');
  const pageTitle = doc.querySelector('title');
  const rawTitle = h1?.textContent?.trim()
    || pageTitle?.textContent?.replace(/\s*-\s*info64\.org.*$/i, '').trim()
    || 'Campeonato';

  // Number of rounds: count round links in pairings section
  // info64 renders round tabs as links like /tournament-slug/1, /tournament-slug/2 …
  // They appear as <a> elements with href ending in /1, /2 etc. inside the rounds nav
  let totalRounds = 7; // default fallback
  const roundLinks = Array.from(doc.querySelectorAll('a[href]')) as HTMLAnchorElement[];
  const roundNums = roundLinks
    .map(a => {
      const m = a.getAttribute('href')?.match(/\/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter(n => n > 0 && n <= 20);
  if (roundNums.length > 0) {
    totalRounds = Math.max(...roundNums);
  }

  // Players from initial ranking table
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
      players.push({
        id: `info64-${players.length}`,
        name,
        emoji: randomEmoji(),
        elo,
        club: club || undefined,
      });
    }
  }

  if (players.length === 0) return null;

  return { title: rawTitle, totalRounds, players };
}

// Inline player editor row
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

  const save = () => {
    onChange({ ...draft, name: draft.name.trim() || player.name });
    setEditing(false);
  };
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

export function CustomChampionship({ userProfile, onSelectBot, onBack }: CustomChampionshipProps) {
  const {
    championship, isLoaded, startNew, reset, ensureCurrentRoundPairings,
  } = useCustomChampionshipState();

  // Setup state (shown when no active championship)
  const [url, setUrl] = useState('');
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [fetchError, setFetchError] = useState('');
  const [tournamentData, setTournamentData] = useState<TournamentData | null>(null);
  const [editingRounds, setEditingRounds] = useState(false);

  // Active championship UI
  const [activeTab, setActiveTab] = useState<ActiveTab>('partida');
  const [historyRound, setHistoryRound] = useState(1);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (championship && !isCurrentRoundComplete(championship)) {
      ensureCurrentRoundPairings();
    }
  }, [championship, ensureCurrentRoundPairings]);

  useEffect(() => {
    setActiveTab('partida');
  }, [championship?.currentRound]);

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

  const handleStart = useCallback(() => {
    if (!tournamentData || tournamentData.players.length < 2) return;
    startNew(userProfile, tournamentData.title, tournamentData.totalRounds, tournamentData.players);
  }, [tournamentData, userProfile, startNew]);

  // ─── Active championship derived state ────────────────────────────────────

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
      <div className="w-full max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Cargando...</p>
      </div>
    );
  }

  // ─── Setup screen (no active championship) ────────────────────────────────

  if (!championship) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={onBack} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white">Campeonato Real</h2>
            <p className="text-sm text-gray-400">Importa un torneo de info64.org</p>
          </div>
        </div>

        {/* URL input */}
        <div className="bg-gray-800 rounded-xl p-4 mb-4 space-y-3">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
            <Download className="w-3.5 h-3.5" /> URL del torneo
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
              value={url}
              onChange={e => { setUrl(e.target.value); setFetchStatus('idle'); setTournamentData(null); }}
              onKeyDown={e => e.key === 'Enter' && fetchTournament()}
              placeholder="https://info64.org/nombre-del-torneo"
            />
            <button
              onClick={fetchTournament}
              disabled={fetchStatus === 'loading' || !url.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors shrink-0 flex items-center gap-1"
            >
              {fetchStatus === 'loading'
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
            </button>
          </div>
          {fetchStatus === 'error' && (
            <p className="text-red-400 text-xs">{fetchError}</p>
          )}
          <p className="text-gray-600 text-xs">
            Pega la URL principal del torneo (no la de una ronda específica).
          </p>
        </div>

        {/* Preview after fetch */}
        {tournamentData && (
          <div className="space-y-3 mb-4">
            {/* Title + rounds */}
            <div className="bg-gray-800 rounded-xl p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Título</label>
                <input
                  className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={tournamentData.title}
                  onChange={e => setTournamentData(d => d ? { ...d, title: e.target.value } : d)}
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-500 uppercase tracking-wide shrink-0">Rondas</label>
                {editingRounds ? (
                  <input
                    type="number" min={1} max={20}
                    className="w-20 bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500"
                    value={tournamentData.totalRounds}
                    onChange={e => setTournamentData(d => d ? { ...d, totalRounds: Math.max(1, parseInt(e.target.value) || 1) } : d)}
                    onBlur={() => setEditingRounds(false)}
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setEditingRounds(true)}
                    className="flex items-center gap-1 text-yellow-400 font-bold hover:text-yellow-300 transition-colors"
                  >
                    {tournamentData.totalRounds} rondas
                    <Edit3 className="w-3 h-3 text-gray-500" />
                  </button>
                )}
                <span className="text-gray-500 text-xs ml-auto">{tournamentData.players.length} jugadores</span>
              </div>
            </div>

            {/* Player list */}
            <div className="bg-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Jugadores ({tournamentData.players.length})
                </p>
                <button
                  onClick={() => setTournamentData(d => d ? {
                    ...d,
                    players: [...d.players, {
                      id: `manual-${Date.now()}`,
                      name: `Jugador ${d.players.length + 1}`,
                      emoji: randomEmoji(),
                      elo: 800,
                    }],
                  } : d)}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Añadir
                </button>
              </div>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {tournamentData.players.map((p, i) => (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    index={i}
                    onChange={updated => setTournamentData(d => d ? {
                      ...d,
                      players: d.players.map(pl => pl.id === updated.id ? updated : pl),
                    } : d)}
                    onRemove={() => setTournamentData(d => d ? {
                      ...d,
                      players: d.players.filter(pl => pl.id !== p.id),
                    } : d)}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={tournamentData.players.length < 2}
              className="w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Trophy className="w-5 h-5" />
              Iniciar Campeonato
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─── Completed ─────────────────────────────────────────────────────────────

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
          onClick={() => reset()}
          className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
        >
          Nuevo Campeonato
        </button>
      </div>
    );
  }

  // ─── Active round ──────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate">Campeonato Real</h2>
          <p className="text-sm text-gray-400">
            Ronda {championship.currentRound} de {championship.totalRounds}
          </p>
        </div>
        {userRank && (
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-400">Posición</p>
            <p className="text-xl font-bold text-yellow-400">#{userRank}</p>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
            style={{ width: `${((championship.currentRound - 1) / championship.totalRounds) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{championship.currentRound - 1} rondas completadas</span>
          <span>{championship.totalRounds - (championship.currentRound - 1)} restantes</span>
        </div>
      </div>

      {/* Quick stats */}
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
        ] as const).map(tab => (
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
              <h3 className="text-sm uppercase tracking-wide text-gray-400 mb-4 flex items-center gap-2">
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
            {Array.from({ length: championship.currentRound - 1 }, (_, i) => i + 1).map(r => (
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

      <button
        onClick={() => { if (confirm('¿Reiniciar el campeonato?')) reset(); }}
        className="w-full mt-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-500 text-xs rounded-lg transition-colors"
      >
        Reiniciar Campeonato
      </button>
    </div>
  );
}
