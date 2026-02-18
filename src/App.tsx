import { useState, useCallback } from 'react';
import type { GameMode, Bot } from '@/types';
import { useBots, usePlayerStats, useProfile } from '@/hooks/useStorage';
import { Menu } from '@/components/Menu';
import { BotSelector } from '@/components/BotSelector';
import { Tournament } from '@/components/Tournament';
import { CustomBots } from '@/components/CustomBots';
import { Stats } from '@/components/Stats';
import { Profile } from '@/components/Profile';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { ChevronLeft, Trophy } from 'lucide-react';

function App() {
  const [mode, setMode] = useState<GameMode>('menu');
  const [currentBot, setCurrentBot] = useState<Bot | null>(null);
  const [tournamentProgress, setTournamentProgress] = useState<string[]>([]);
  const [currentTournamentIndex, setCurrentTournamentIndex] = useState(0);

  const { bots, isLoaded: botsLoaded, addBot, removeBot, getTournamentBots } = useBots();
  const { stats, isLoaded: statsLoaded, addGameResult } = usePlayerStats();
  const { profile, isLoaded: profileLoaded, createProfile, updateProfile } = useProfile();

  const handleSelectMode = useCallback((newMode: GameMode) => {
    setMode(newMode);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setMode('menu');
    setCurrentBot(null);
  }, []);

  const handleSelectBot = useCallback((bot: Bot) => {
    setCurrentBot(bot);
    setMode('game');
  }, []);

  const handleGameEnd = useCallback((result: 'win' | 'loss' | 'draw', moves: number) => {
    if (currentBot) {
      addGameResult(result, currentBot.elo, currentBot.name, moves);
      
      // Si estamos en modo torneo y ganamos, avanzar
      if (result === 'win' && mode === 'game' && currentBot.inTournament) {
        const tournamentBots = getTournamentBots().sort((a, b) => a.difficulty - b.difficulty);
        const botIndex = tournamentBots.findIndex(b => b.id === currentBot.id);
        
        if (botIndex >= 0 && !tournamentProgress.includes(currentBot.id)) {
          setTournamentProgress(prev => [...prev, currentBot.id]);
          if (botIndex + 1 > currentTournamentIndex) {
            setCurrentTournamentIndex(botIndex + 1);
          }
        }
      }
    }
  }, [currentBot, addGameResult, mode, tournamentProgress, currentTournamentIndex, getTournamentBots]);

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
                  onClick={handleBackToMenu}
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
            onSelectBot={handleSelectBot} 
            onBack={handleBackToMenu} 
          />
        );

      case 'tournament':
        return (
          <Tournament
            bots={bots}
            onSelectBot={handleSelectBot}
            onBack={handleBackToMenu}
            completedBots={tournamentProgress}
            currentBotIndex={currentTournamentIndex}
          />
        );

      case 'custom-bots':
        return (
          <CustomBots
            bots={bots}
            onAddBot={addBot}
            onRemoveBot={removeBot}
            onBack={handleBackToMenu}
            onSelectBot={handleSelectBot}
          />
        );

      case 'stats':
        return (
          <Stats
            stats={stats}
            onBack={handleBackToMenu}
          />
        );

      case 'profile':
        return (
          <Profile
            profile={profile}
            onCreateProfile={createProfile}
            onUpdateProfile={updateProfile}
            onBack={handleBackToMenu}
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
