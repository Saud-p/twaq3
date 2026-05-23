'use client';

import { MatchPrediction } from '../lib/matches';

interface PredictionPanelProps {
  matches: MatchPrediction[];
  onUpdate: (matches: MatchPrediction[]) => void;
  onSave: () => void;
}

export default function PredictionPanel({ matches, onUpdate, onSave }: PredictionPanelProps) {
  const handleScoreChange = (id: string, field: 'homeScore' | 'awayScore', value: string) => {
    const numeric = value === '' ? null : Number(value);
    onUpdate(
      matches.map((match) =>
        match.id === id ? { ...match, [field]: numeric } : match
      )
    );
  };

  return (
    <section className="card">
      <h2>توقعات المباريات</h2>
      <div className="matches">
        {matches.map((match) => (
          <div key={match.id} className="match-row">
            <span className="match-date">{match.date}</span>
            <span>{match.home}</span>
            <input
              type="number"
              min={0}
              value={match.homeScore ?? ''}
              onChange={(e) => handleScoreChange(match.id, 'homeScore', e.target.value)}
              placeholder="-"
            />
            <span>vs</span>
            <input
              type="number"
              min={0}
              value={match.awayScore ?? ''}
              onChange={(e) => handleScoreChange(match.id, 'awayScore', e.target.value)}
              placeholder="-"
            />
            <span>{match.away}</span>
          </div>
        ))}
      </div>
      <button className="primary" onClick={onSave}>حفظ التوقعات</button>
    </section>
  );
}
