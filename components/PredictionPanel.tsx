'use client';

import { Match, MatchOutcome } from '../lib/matches';
import { UserPrediction } from '../lib/storage';

interface PredictionPanelProps {
  matches: Match[];
  predictions: UserPrediction[];
  onPredict: (matchId: string, prediction: MatchOutcome) => void;
  disabled: boolean;
}

const OUTCOMES: { key: MatchOutcome; badge: string }[] = [
  { key: 'home', badge: '1' },
  { key: 'draw', badge: 'X' },
  { key: 'away', badge: '2' },
];

export default function PredictionPanel({ matches, predictions, onPredict, disabled }: PredictionPanelProps) {
  const getPred = (matchId: string) =>
    predictions.find((p) => p.matchId === matchId)?.prediction ?? null;

  return (
    <div className="section">
      <h2 className="section-title">
        <span className="icon">⚽</span>
        توقعات المباريات
      </h2>
      <div className="divider" />

      {matches.map((match) => {
        const selected = getPred(match.id);
        const hasResult = match.result !== null;
        const resultLabel =
          match.result === 'home' ? `فاز ${match.home}` :
          match.result === 'draw' ? 'تعادل' :
          match.result === 'away' ? `فاز ${match.away}` : '';

        return (
          <div key={match.id} className={`match-item${selected ? ' filled' : ''}`}>
            <div className="match-header">
              <span className="match-date">{match.date}</span>
              {hasResult && <span className="result-badge">النتيجة: {resultLabel}</span>}
            </div>

            <div className="match-teams-row">
              <span className="team-name">{match.home}</span>
              <span className="vs-sep">vs</span>
              <span className="team-name away">{match.away}</span>
            </div>

            <div className="prediction-buttons">
              {OUTCOMES.map(({ key, badge }) => {
                const isSelected = selected === key;
                const isCorrect = hasResult && key === match.result;
                const isWrong = hasResult && isSelected && key !== match.result;
                const label =
                  key === 'home' ? match.home :
                  key === 'draw' ? 'تعادل' : match.away;

                return (
                  <button
                    key={key}
                    className={[
                      'pred-btn',
                      `pred-${key}`,
                      isSelected ? 'selected' : '',
                      isCorrect ? 'correct' : '',
                      isWrong ? 'wrong' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => !disabled && !hasResult && onPredict(match.id, key)}
                    disabled={disabled || hasResult}
                  >
                    <span className="pred-badge">{badge}</span>
                    <span className="pred-label">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
