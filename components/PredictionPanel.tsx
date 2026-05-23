'use client';

import { MatchPrediction } from '../lib/matches';

interface PredictionPanelProps {
  matches: MatchPrediction[];
  onUpdate: (matches: MatchPrediction[]) => void;
  disabled: boolean;
}

export default function PredictionPanel({ matches, onUpdate, disabled }: PredictionPanelProps) {
  const handleScore = (id: string, field: 'homeScore' | 'awayScore', value: string) => {
    const num = value === '' ? null : Math.max(0, Math.min(99, parseInt(value) || 0));
    onUpdate(matches.map((m) => (m.id === id ? { ...m, [field]: num } : m)));
  };

  const isFilled = (m: MatchPrediction) => m.homeScore !== null && m.awayScore !== null;

  return (
    <div className="section">
      <h2 className="section-title">
        <span className="icon">⚽</span>
        توقعات المباريات
      </h2>
      <div className="divider" />
      {matches.map((match) => (
        <div key={match.id} className={`match-item${isFilled(match) ? ' filled' : ''}`}>
          <div className="match-teams">
            <span className="team-name">{match.home}</span>
            <div className="score-inputs">
              <input
                className="score-input"
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={match.homeScore ?? ''}
                onChange={(e) => handleScore(match.id, 'homeScore', e.target.value)}
                placeholder="-"
                disabled={disabled}
              />
              <span className="vs-sep">-</span>
              <input
                className="score-input"
                type="number"
                inputMode="numeric"
                min={0}
                max={99}
                value={match.awayScore ?? ''}
                onChange={(e) => handleScore(match.id, 'awayScore', e.target.value)}
                placeholder="-"
                disabled={disabled}
              />
            </div>
            <span className="team-name away">{match.away}</span>
          </div>
          <div className="match-date">{match.date}</div>
        </div>
      ))}
    </div>
  );
}
