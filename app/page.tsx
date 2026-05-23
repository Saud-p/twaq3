import MatchPredictionApp from '../components/MatchPredictionApp';
import { getUpcomingMatches } from '../lib/matches';

export default async function HomePage() {
  const matches = await getUpcomingMatches();

  return (
    <main className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">دوري التوقعات</p>
          <h1>توقع نتائج مباريات الدوري السعودي</h1>
          <p>تحدّى أصدقائك، واحصل على ترتيب أفضل المتوقعين على منصة تسجيل الحسابات.</p>
        </div>
        <div className="status-card">
          <strong>الحالة:</strong>
          <p>المباريات القادمة محملة من مصدر داخلي جاهز للتطوير.</p>
        </div>
      </header>

      <MatchPredictionApp initialMatches={matches} />
    </main>
  );
}
