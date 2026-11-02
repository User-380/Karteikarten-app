import { CardEditorPage } from './pages/CardEditorPage';
import { DeckPage } from './pages/DeckPage';
import { HomePage } from './pages/HomePage';
import { SettingsPage } from './pages/SettingsPage';
import { StatsPage } from './pages/StatsPage';
import { StudyPage } from './pages/StudyPage';
import { useRoute } from './lib/router';

export default function App() {
  const route = useRoute();
  const [section, param] = route;

  let page;
  switch (section) {
    case 'deck':
      page = <DeckPage key={param} deckId={param} />;
      break;
    case 'card':
      page = <CardEditorPage key={location.hash} cardId={param ?? 'new'} />;
      break;
    case 'study':
      page = <StudyPage key={param} deckId={param ?? 'all'} />;
      break;
    case 'stats':
      page = <StatsPage />;
      break;
    case 'settings':
      page = <SettingsPage key={location.hash} />;
      break;
    default:
      page = <HomePage />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <a className="brand" href="#/">
          Karteikarten
        </a>
        <nav>
          <a href="#/" className={!section ? 'active' : ''}>
            Start
          </a>
          <a href="#/stats" className={section === 'stats' ? 'active' : ''}>
            Statistik
          </a>
          <a href="#/settings" className={section === 'settings' ? 'active' : ''} aria-label="Einstellungen">
            ⚙︎
          </a>
        </nav>
      </header>
      <main className="page">{page}</main>
    </div>
  );
}
