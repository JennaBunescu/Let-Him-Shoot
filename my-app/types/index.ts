export interface Team {
  id: string;
  name: string;
  alias: string;
  market: string;
}

export interface Player {
  id: string;
  full_name: string;
  jersey_number?: string;
  position: string;
  experience: string;
  teamId: string;
}

export interface GameLog {
  date: string;
  opponent: string;
  threePtMade: number;
  threePtAttempted: number;
  threePtPercentage: number;
}

export interface PlayerStats {
  playerId: string;
  gamesPlayed: number;
  minutesPerGame: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  turnoversPerGame: number;
  personalFoulsPerGame: number;
  threePtPercentage: number;
  threePtAttemptsPerGame: number;
  threePtMadePerGame: number;
  fgPercentage: number;
  fgAttemptsPerGame: number;
  fgMadePerGame: number;
  ftPercentage: number;
  ftAttemptsPerGame: number;
  ftMadePerGame: number;
  trueShootingPercentage: number;
  efficiency: number;
  gameLog?: GameLog[]; // Made optional since not populated
}

export interface TeamStats {
  teamId: string;
  gamesPlayed: number;
  minutes: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  turnoversPerGame: number;
  personalFoulsPerGame: number;
  threePtPercentage: number;
  threePtAttemptsPerGame: number;
  threePtMadePerGame: number;
  fgPercentage: number;
  fgAttemptsPerGame: number;
  fgMadePerGame: number;
  ftPercentage: number;
  ftAttemptsPerGame: number;
  ftMadePerGame: number;
  pointsInPaintPerGame: number;
  secondChancePointsPerGame: number;
  fastBreakPointsPerGame: number;
  pointsOffTurnoversPerGame: number;
  trueShootingPercentage: number;
  efficiency: number;
  wins?: number;
  losses?: number;
  conferenceWins?: number;
  conferenceLosses?: number;
}