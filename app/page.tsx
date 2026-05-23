import MatchPredictionApp from '../components/MatchPredictionApp';
import { upcomingMatches } from '../lib/matches';

export default function HomePage() {
  return <MatchPredictionApp initialMatches={upcomingMatches} />;
}
