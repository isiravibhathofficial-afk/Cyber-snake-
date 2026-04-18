import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RefreshCw, Play, Pause, Zap, Crosshair, Volume2, VolumeX } from 'lucide-react';
import { GameStatus, Point, Direction } from './types';
import { GRID_SIZE, INITIAL_SPEED, MIN_SPEED, SPEED_INCREMENT, THEME } from './constants';
import { soundService } from './services/soundService';

export default function App() {
  const [status, setStatus] = useState<GameStatus>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('UP');
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [isMuted, setIsMuted] = useState(false);
  const [shake, setShake] = useState(false);
  
  const gameLoopRef = useRef<NodeJS.Timeout|null>(null);
  const lastDirectionRef = useRef<Direction>('UP');

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('cyberpunk_snake_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 200);
  };

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      if (!currentSnake.some(s => s.x === newFood!.x && s.y === newFood!.y)) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    const startSnake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    setSnake(startSnake);
    setFood(generateFood(startSnake));
    setDirection('UP');
    lastDirectionRef.current = 'UP';
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setStatus('PLAYING');
    if (!isMuted) soundService.playStart();
  };

  const gameOver = () => {
    setStatus('GAME_OVER');
    if (!isMuted) soundService.playGameOver();
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('cyberpunk_snake_highscore', score.toString());
    }
  };

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = { ...head };

      switch (direction) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      // OPEN WORLD WRAP AROUND
      newHead.x = (newHead.x + GRID_SIZE) % GRID_SIZE;
      newHead.y = (newHead.y + GRID_SIZE) % GRID_SIZE;

      // Self collision
      if (prevSnake.some(s => s.x === newHead.x && s.y === newHead.y)) {
        gameOver();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(generateFood(newSnake));
        setSpeed(s => Math.max(MIN_SPEED, s - SPEED_INCREMENT));
        if (!isMuted) soundService.playEat();
        triggerShake();
        // Hit stop effect: briefly pause the loop
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current);
          setTimeout(() => {
            if (status === 'PLAYING') {
              gameLoopRef.current = setInterval(moveSnake, speed);
            }
          }, 50);
        }
      } else {
        newSnake.pop();
        // Play subtle move sound occasionally or every move
        // if (!isMuted) soundService.playMove(); 
      }

      lastDirectionRef.current = direction;
      return newSnake;
    });
  }, [direction, food, gameOver, generateFood, isMuted]);

  useEffect(() => {
    if (status === 'PLAYING') {
      gameLoopRef.current = setInterval(moveSnake, speed);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [status, speed, moveSnake]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': if (lastDirectionRef.current !== 'DOWN') setDirection('UP'); break;
        case 'ArrowDown': if (lastDirectionRef.current !== 'UP') setDirection('DOWN'); break;
        case 'ArrowLeft': if (lastDirectionRef.current !== 'RIGHT') setDirection('LEFT'); break;
        case 'ArrowRight': if (lastDirectionRef.current !== 'LEFT') setDirection('RIGHT'); break;
        case 'p':
        case 'P':
          if (status === 'PLAYING') setStatus('PAUSED');
          else if (status === 'PAUSED') setStatus('PLAYING');
          break;
        case 'm':
        case 'M':
          setIsMuted(prev => !prev);
          break;
        case ' ':
          if (status === 'START' || status === 'GAME_OVER') resetGame();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status]);

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen bg-[#050505] text-[#e0e0e0] p-4 font-mono select-none overflow-hidden transition-transform duration-100 ${shake ? 'scale-[1.02] translate-y-1' : 'scale-100'}`}>
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-magenta-500/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col gap-6">
        {/* HUD */}
        <div className="flex justify-between items-end border-b border-cyan-500/30 pb-4 h-16">
          <div className="flex flex-col">
            <span className="text-[10px] text-cyan-500/60 uppercase tracking-widest">Data Collected</span>
            <div className="text-3xl font-bold neon-text-cyan tabular-nums leading-none">
              {score.toString().padStart(4, '0')}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-magenta-500/60 uppercase tracking-widest">Signal Strength</span>
            <div className="text-xl font-bold neon-text-magenta tabular-nums leading-none">
              {highScore.toString().padStart(4, '0')}
              <Trophy className="inline-block ml-2 w-4 h-4 text-magenta-500/60" />
            </div>
          </div>
        </div>

        {/* Board Container */}
        <div 
          className={`relative aspect-square w-full bg-[#0a0a0a] border-2 border-cyan-500/20 rounded-lg overflow-hidden glass-effect neon-border-cyan group transition-all duration-100 ${shake ? 'border-magenta-500 shadow-[0_0_30px_rgba(255,0,255,0.4)]' : ''}`}
        >
          {/* Grid background */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{ 
              backgroundImage: `linear-gradient(${THEME.grid} 1px, transparent 1px), linear-gradient(90deg, ${THEME.grid} 1px, transparent 1px)`,
              backgroundSize: `${100 / GRID_SIZE}% ${100 / GRID_SIZE}%`
            }}
          />

          {/* Rendering the game grid */}
          <div className="relative w-full h-full">
            {/* Food */}
            <motion.div
              layoutId="food"
              className="absolute bg-magenta-500 rounded-sm shadow-[0_0_15px_rgba(255,0,255,0.7)]"
              style={{
                left: `${(food.x / GRID_SIZE) * 100}%`,
                top: `${(food.y / GRID_SIZE) * 100}%`,
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`,
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
              </div>
            </motion.div>

            {/* Snake */}
            {snake.map((segment, index) => (
              <div
                key={`${index}-${segment.x}-${segment.y}`}
                className={`absolute ${
                  index === 0 
                  ? 'bg-white z-20 shadow-[0_0_10px_white]' 
                  : 'bg-cyan-500 z-10'
                }`}
                style={{
                  left: `${(segment.x / GRID_SIZE) * 100}%`,
                  top: `${(segment.y / GRID_SIZE) * 100}%`,
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                  opacity: 1 - (index / snake.length) * 0.7,
                  borderRadius: index === 0 ? '2px' : '1px',
                }}
              >
                {index === 0 && (
                  <div className="w-full h-full flex items-center justify-center p-[20%]">
                    <div className="bg-[#050505] w-full h-full rounded-full opacity-50" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Overlays */}
          <AnimatePresence>
            {status === 'START' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-8 text-center"
              >
                <div className="mb-6">
                  <motion.h1 
                    className="text-5xl font-black text-cyan-400 tracking-tighter neon-text-cyan glitch-effect"
                    animate={{ x: [-1, 1, -1] }}
                    transition={{ repeat: Infinity, duration: 0.1 }}
                  >
                    CYBER SNAKE
                  </motion.h1>
                  <p className="text-xs text-cyan-500/60 uppercase tracking-[0.3em] font-medium mt-1">Open World Protocol</p>
                </div>
                
                <p className="text-sm text-[#e0e0e0]/70 mb-8 max-w-[200px]">
                  Borders deactivated. Neural wrap engaged. Reclaim the lost data fragments.
                </p>

                <button 
                  onClick={resetGame}
                  className="group relative px-8 py-3 bg-cyan-500/10 border border-cyan-500/50 hover:bg-cyan-500/20 transition-all rounded"
                >
                  <div className="relative z-10 flex items-center gap-2 text-cyan-400 uppercase tracking-widest font-bold">
                    <Play className="w-4 h-4 fill-cyan-400" />
                    Initialize
                  </div>
                  <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />
                </button>
                
                <p className="mt-8 text-[10px] text-cyan-500/40 uppercase tracking-widest">Double check your sound [M]</p>
              </motion.div>
            )}

            {status === 'GAME_OVER' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-magenta-900/40 backdrop-blur-md p-8 text-center border-4 border-magenta-500/30"
              >
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mb-2"
                >
                  <Crosshair className="w-12 h-12 text-magenta-400 mx-auto opacity-50" />
                </motion.div>
                
                <h2 className="text-4xl font-black text-white tracking-tighter mb-4 neon-text-magenta">BUFFER OVERFLOW</h2>
                
                <div className="flex gap-8 mb-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-magenta-300/60 uppercase">Final Signal</span>
                    <span className="text-3xl font-bold text-white leading-none">{score}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-magenta-300/60 uppercase">Peak Peak</span>
                    <span className="text-3xl font-bold text-white leading-none">{highScore}</span>
                  </div>
                </div>

                <button 
                  onClick={resetGame}
                  className="flex items-center gap-2 px-8 py-3 bg-white text-magenta-900 font-black uppercase tracking-widest rounded hover:bg-magenta-100 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reconnect
                </button>
              </motion.div>
            )}

            {status === 'PAUSED' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]"
              >
                <div className="flex flex-col items-center gap-4">
                  <Pause className="w-12 h-12 text-cyan-400 animate-pulse" />
                  <h2 className="text-2xl font-bold tracking-widest text-cyan-400 uppercase">System Paused</h2>
                  <button 
                    onClick={() => setStatus('PLAYING')}
                    className="mt-4 text-xs border border-cyan-500/50 px-4 py-2 hover:bg-cyan-500/10"
                  >
                    Resume Core
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-4 mt-auto">
          {/* Mobile D-Pad */}
          <div className="grid grid-cols-3 grid-rows-3 gap-2 w-32 mx-auto sm:hidden">
            <div />
            <ControlButton icon="UP" active={direction === 'UP'} onClick={() => lastDirectionRef.current !== 'DOWN' && setDirection('UP')} />
            <div />
            <ControlButton icon="LEFT" active={direction === 'LEFT'} onClick={() => lastDirectionRef.current !== 'RIGHT' && setDirection('LEFT')} />
            <ControlButton icon="CENTER" active={status === 'PAUSED'} onClick={() => status === 'PLAYING' ? setStatus('PAUSED') : setStatus('PLAYING')} />
            <ControlButton icon="RIGHT" active={direction === 'RIGHT'} onClick={() => lastDirectionRef.current !== 'LEFT' && setDirection('RIGHT')} />
            <div />
            <ControlButton icon="DOWN" active={direction === 'DOWN'} onClick={() => lastDirectionRef.current !== 'UP' && setDirection('DOWN')} />
            <div />
          </div>

          {/* Desktop Hints */}
          <div className="hidden sm:flex flex-col gap-2 p-4 border border-cyan-500/10 rounded-lg text-[10px] uppercase tracking-wider text-cyan-500/60 bg-cyan-500/5">
            <div className="flex justify-between">
              <span>Navigate</span>
              <span className="text-white">Arrows</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Audio</span>
              <button 
                onClick={() => setIsMuted(!isMuted)}
                className="text-white p-1 hover:bg-cyan-500/20 rounded"
              >
                {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>
            </div>
            <div className="flex justify-between">
              <span>Core Flux</span>
              <div className="flex items-center gap-1 text-magenta-400">
                <Zap className="w-2 h-2 fill-magenta-400" />
                <span>{Math.round((INITIAL_SPEED / speed) * 100)}%</span>
              </div>
            </div>
          </div>

          <div className="hidden sm:flex flex-col gap-2 p-4 border border-magenta-500/10 rounded-lg text-[10px] uppercase tracking-wider text-magenta-500/60 bg-magenta-500/5">
            <div className="font-bold text-magenta-400 mb-1 leading-tight">Hyper-Link Protocol</div>
            <div className="opacity-80 leading-tight">- Borders: OFFLINE</div>
            <div className="opacity-60 leading-tight">- Mode: OPEN WORLD</div>
            <div className="opacity-40 leading-tight">- Flux: {speed}ms</div>
          </div>
        </div>
      </div>

      {/* Footer Decoration */}
      <div className="fixed bottom-4 left-4 right-4 flex justify-between items-center text-[8px] text-cyan-500/30 uppercase tracking-[0.4em] font-medium pointer-events-none">
        <div>Neural-Link established</div>
        <div className="animate-pulse">Running Open World...</div>
        <div>No unauthorized access</div>
      </div>
    </div>
  );
}

function ControlButton({ icon, active, onClick }: { icon: string; active?: boolean; onClick: () => void }) {
  const getIcon = () => {
    switch (icon) {
      case 'UP': return '▲';
      case 'DOWN': return '▼';
      case 'LEFT': return '◀';
      case 'RIGHT': return '▶';
      case 'CENTER': return active ? '▶' : '||';
      default: return '';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full h-10 flex items-center justify-center rounded border transition-all ${
        active 
        ? 'bg-cyan-500 border-cyan-400 text-black shadow-[0_0_10px_rgba(0,242,255,0.5)]' 
        : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-500'
      }`}
    >
      <span className="font-bold">{getIcon()}</span>
    </button>
  );
}
