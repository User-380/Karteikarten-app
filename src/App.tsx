import { CardEditorPage } from './pages/CardEditorPage';
import { DeckPage } from './pages/DeckPage';
import { HomePage } from './pages/HomePage';
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
        </nav>
      </header>
      <main className="page">{page}</main>
    </div>
  );
}
