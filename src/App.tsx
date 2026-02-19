import { useState, useCallback } from 'react';
import type { GameMode, Bot } from '@/types';
import { useBots, usePlayerStats, useProfile, useChampionshipState } from '@/hooks/useStorage';
import { useAchievements } from '@/hooks/useAchievements';
import { Menu } from '@/components/Menu';
import { BotSelector } from '@/components/BotSelector';
import { Tournament } from '@/components/Tournament';
import { Championship } from '@/components/Championship';
import { CustomBots } from '@/components/CustomBots';
import { Stats } from '@/components/Stats';
import { Profile } from '@/components/Profile';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { ChevronLeft, Trophy } from 'lucide-react';
import { fireWinConfetti } from '@/lib/confetti';

function App() {
  const [mode, setMode] = useState<GameMode>('menu');
  const [currentBot, setCurrentBot] = useState<Bot | null>(null);
  const [tournamentProgress, setTournamentProgress] = useState<string[]>([]);
  const [currentTournamentIndex, setCurrentTournamentIndex] = useState(0);
  const [returnMode, setReturnMode] = useState<GameMode>('menu');

  const {
    bots,
    isLoaded: botsLoaded,
    addBot,
    removeBot,
    getTournamentBots,
    updateFixedBot,
    resetFixedBots,
  } = useBots();
  const { stats, isLoaded: statsLoaded, addGameResult } = usePlayerStats();
  const { profile, isLoaded: profileLoaded, createProfile, updateProfile } = useProfile();
  const { achievements, processGameEnd } = useAchievements(stats);
  const { submitUserResultAndSimulateRound } = useChampionshipState();

  const handleSelectMode = useCallback((newMode: GameMode) => {
    setMode(newMode);
  }, []);

  const handleBack = useCallback((target: GameMode = 'menu') => {
    setMode(target);
    setCurrentBot(null);
  }, []);

  const startGame = useCallback((bot: Bot, backTo: GameMode) => {
    setCurrentBot(bot);
    setReturnMode(backTo);
    setMode('game');
  }, []);

  const handleGameEnd = useCallback((payload: {
    result: 'win' | 'loss' | 'draw';
    moves: number;
    reason: string;
    historySan: string[];
    lastMoveVerbose?: any;
  }) => {
    if (currentBot) {
      const playerEloBefore = stats?.profile?.elo ?? 1000;

      addGameResult(payload.result, currentBot.elo, currentBot.name, payload.moves);

      if (payload.result === 'win') {
        fireWinConfetti();
      }
      
      // Si estamos en modo torneo y ganamos, avanzar
      let tournamentCompleted = false;
      if (payload.result === 'win' && mode === 'game' && currentBot.inTournament) {
        const tournamentBots = getTournamentBots().sort((a, b) => a.difficulty - b.difficulty);
        const botIndex = tournamentBots.findIndex(b => b.id === currentBot.id);
        
        if (botIndex >= 0 && !tournamentProgress.includes(currentBot.id)) {
          setTournamentProgress(prev => [...prev, currentBot.id]);
          if (botIndex + 1 > currentTournamentIndex) {
            setCurrentTournamentIndex(botIndex + 1);
          }
          tournamentCompleted = (tournamentProgress.length + 1) === tournamentBots.length;
        }
      }

      processGameEnd({
        result: payload.result,
        reason: payload.reason,
        moves: payload.moves,
        opponentElo: currentBot.elo,
        opponentName: currentBot.name,
        playerEloBefore,
        lastMoveVerbose: payload.lastMoveVerbose,
        tournamentCompleted,
      });

      // Si estamos en modo campeonato, registrar resultado y simular ronda
      if (returnMode === 'championship') {
        submitUserResultAndSimulateRound(payload.result);
        // Volver al modo campeonato después de la partida
        setTimeout(() => {
          setMode('championship');
          setCurrentBot(null);
        }, 2000);
      }
    }
  }, [
    currentBot,
    addGameResult,
    stats?.profile?.elo,
    mode,
    tournamentProgress,
    currentTournamentIndex,
    getTournamentBots,
    processGameEnd,
    returnMode,
    submitUserResultAndSimulateRound,
  ]);

  // Pantalla de carga
  if (!botsLoaded || !statsLoaded || !profileLoaded) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-500 border-t-transparent 
                          rounded-full animate-spin" />
          <p className="text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Renderizar según el modo
  const renderContent = () => {
    switch (mode) {
      case 'menu':
        return (
          <Menu 
            onSelectMode={handleSelectMode} 
            playerName={profile?.name}
            playerElo={profile?.elo}
          />
        );

      case 'game':
        if (currentBot) {
          return (
            <div className="px-4 py-6">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => handleBack(returnMode)}
                  className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white">Partida en curso</h2>
                  <p className="text-sm text-gray-400">vs {currentBot.name}</p>
                </div>
              </div>
              <ChessBoard 
                bot={currentBot} 
                onGameEnd={handleGameEnd}
              />
            </div>
          );
        }
        return (
          <BotSelector 
            bots={bots} 
            onSelectBot={(bot) => startGame(bot, 'menu')} 
            onBack={() => handleBack('menu')} 
          />
        );

      case 'tournament':
        return (
          <Tournament
            bots={bots}
            onSelectBot={(bot) => startGame(bot, 'tournament')}
            onBack={() => handleBack('menu')}
            completedBots={tournamentProgress}
            currentBotIndex={currentTournamentIndex}
            updateFixedBot={updateFixedBot}
            resetFixedBots={resetFixedBots}
          />
        );

      case 'custom-bots':
        return (
          <CustomBots
            bots={bots}
            onAddBot={addBot}
            onRemoveBot={removeBot}
            onBack={() => handleBack('menu')}
            onSelectBot={(bot) => startGame(bot, 'custom-bots')}
          />
        );

      case 'stats':
        return (
          <Stats
            stats={stats}
            onBack={() => handleBack('menu')}
          />
        );

      case 'profile':
        return (
          <Profile
            profile={profile}
            onCreateProfile={createProfile}
            onUpdateProfile={updateProfile}
            onBack={() => handleBack('menu')}
            achievements={achievements}
          />
        );

      case 'championship':
        if (!profile) {
          return (
            <div className="w-full max-w-md mx-auto px-4 py-6">
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">Necesitas crear un perfil primero</p>
                <button
                  onClick={() => handleSelectMode('profile')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Crear Perfil
                </button>
              </div>
            </div>
          );
        }
        return (
          <Championship
            userProfile={profile}
            onSelectBot={(bot) => startGame(bot, 'championship')}
            onBack={() => handleBack('menu')}
          />
        );

      default:
        return <Menu onSelectMode={handleSelectMode} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Contenido principal */}
      <main className="pb-safe">
        {renderContent()}
      </main>

      {/* Notificación de torneo completado */}
      {tournamentProgress.length === 4 && mode === 'tournament' && (
        <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto">
          <div className="bg-gradient-to-r from-yellow-600 to-orange-600 
                          text-white p-4 rounded-xl shadow-lg text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2" />
            <p className="font-bold text-lg">¡Felicitaciones!</p>
            <p className="text-sm opacity-90">Has completado el torneo</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
