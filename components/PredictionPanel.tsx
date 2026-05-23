'use client';

import { Match, MatchOutcome } from '../lib/matches';
import { UserPrediction, MatchResult } from '../lib/storage';

interface PredictionPanelProps {
  matches: Match[];
  predictions: UserPrediction[];
  results: MatchResult[];
  onPredict: (matchId: string, prediction: MatchOutcome) => void;
  disabled: boolean;
}

export default function PredictionPanel({ matches, predictions, results, onPredict, disabled }: PredictionPanelProps) {
  const getPred  = (matchId: string) => predictions.find((p) => p.matchId === matchId)?.prediction ?? null;
  const getResult = (matchId: string) => results.find((r) => r.matchId === matchId)?.result ?? null;

  return (
    <div className="section">
      <h2 className="section-title">
        <span className="icon">⚽</span>
        توقعات المباريات
      </h2>
      <div className="divider" />

      {matches.map((match) => {
        const selected  = getPred(match.id);
        const result    = getResult(match.id);
        const hasResult = result !== null;
        const resultLabel =
          result === 'home' ? `فاز ${match.home}` :
          result === 'draw' ? 'تعادل' :
          result === 'away' ? `فاز ${match.away}` : '';

        const cardClass = (key: MatchOutcome) => {
          const parts = ['pred-card', `pred-${key}`];
          if (selected === key) parts.push('selected');
          if (hasResult && key === result) parts.push('correct');
          if (hasResult && selected === key && key !== result) parts.push('wrong');
          return parts.join(' ');
        };

        return (
          <div key={match.id} className={`match-item${selected ? ' filled' : ''}`}>
            <div className="match-header">
              <span className="match-date">{match.date}</span>
              {hasResult && <span className="result-badge">النتيجة: {resultLabel}</span>}
            </div>

            {/* Teams row */}
            <div className="match-teams-row">
              <span className="team-name">{match.home}</span>
              <span className="vs-sep">vs</span>
              <span className="team-name away">{match.away}</span>
            </div>

            {/* Prediction cards — home | draw | away (RTL: home=right, away=left) */}
            <div className="pred-cards">
              <button
                className={cardClass('home')}
                onClick={() => !disabled && !hasResult && onPredict(match.id, 'home')}
                disabled={disabled || hasResult}
              >
                <span className="pred-card-team">{match.home}</span>
                <span className="pred-card-hint">فوز</span>
              </button>

              <button
                className={cardClass('draw')}
                onClick={() => !disabled && !hasResult && onPredict(match.id, 'draw')}
                disabled={disabled || hasResult}
              >
                <span className="pred-card-team">تعادل</span>
                <span className="pred-card-hint">—</span>
              </button>

              <button
                className={cardClass('away')}
                onClick={() => !disabled && !hasResult && onPredict(match.id, 'away')}
                disabled={disabled || hasResult}
              >
                <span className="pred-card-team">{match.away}</span>
                <span className="pred-card-hint">فوز</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
