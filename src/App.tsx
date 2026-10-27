import { BarChart3, Hand, Settings } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Logo } from './components/Logo';
import { SessionAlerts } from './components/SessionAlerts';
import { useGameState } from './hooks/useGameState';
import { I18nProvider, MESSAGES } from './i18n';
import { setBaseTitle } from './lib/alerts';
import { ChallengePage } from './pages/ChallengePage';
import { HomePage } from './pages/HomePage';
import { ProgressPage } from './pages/ProgressPage';
import { SettingsPage } from './pages/SettingsPage';

type View = 'home' | 'challenge' | 'progress' | 'settings';

const AUTHOR_URL = 'https://nordiel.com';

export default function App() {
  const game = useGameState();
  const { session } = game;
  const { locale } = game.prefs;
  const t = MESSAGES[locale];
  // Land back in an unfinished challenge after a refresh.
  const [view, setView] = useState<View>(() => (session && session.savedAt === null ? 'challenge' : 'home'));
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [view, session?.phase]);

  useEffect(() => {
    document.documentElement.lang = locale;
    setBaseTitle(t.meta.title);
  }, [locale, t]);

  // A finished, saved session has nothing left to resume.
  useEffect(() => {
    if (view !== 'challenge' && session?.savedAt) game.endSession();
  }, [view, session?.savedAt, game.endSession]);

  const recent = useMemo(() => [...game.history].reverse().slice(0, 3), [game.history]);

  const start = () => {
    game.newChallenge();
    setView('challenge');
  };

  const goHome = () => {
    game.endSession();
    setView('home');
  };

  const hasActive = session !== null && session.savedAt === null;
  const playOrResume = () => (hasActive ? setView('challenge') : start());
  const showChallenge = view === 'challenge' && session !== null;

  return (
    <I18nProvider locale={locale}>
      <SessionAlerts session={session} alerts={{ sound: game.prefs.sound, notify: game.prefs.notify }} />
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-8">
        <header className="flex items-center justify-between gap-2 py-5 sm:py-8">
          <button type="button" onClick={() => setView('home')} className="shrink-0 rounded-lg" aria-label={t.nav.home}>
            <Logo />
          </button>
          <nav className="flex items-center gap-1" aria-label={t.nav.main}>
            <NavButton active={showChallenge} onClick={playOrResume}>
              <Hand className="h-4 w-4" aria-hidden="true" />
              <span>{hasActive ? t.nav.resume : t.nav.play}</span>
            </NavButton>
            <NavButton active={view === 'progress'} onClick={() => setView('progress')}>
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t.nav.progress}</span>
              <span className="sr-only sm:hidden">{t.nav.progress}</span>
            </NavButton>
            <NavButton active={view === 'settings'} onClick={() => setView('settings')}>
              <Settings className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{t.nav.settings}</span>
              <span className="sr-only sm:hidden">{t.nav.settings}</span>
            </NavButton>
          </nav>
        </header>

        <main ref={mainRef} tabIndex={-1} className="flex-1 outline-none focus-visible:ring-0">
          {showChallenge ? (
            <ChallengePage
              session={session}
              alerts={{ sound: game.prefs.sound, notify: game.prefs.notify }}
              dispatch={game.dispatch}
              onSkip={game.skipTopic}
              onSave={game.saveResult}
              onPlayAgain={start}
              onHome={goHome}
            />
          ) : view === 'progress' ? (
            <ProgressPage stats={game.stats} history={game.history} onStart={playOrResume} onReset={game.resetProgress} />
          ) : view === 'settings' ? (
            <SettingsPage
              alerts={{ sound: game.prefs.sound, notify: game.prefs.notify }}
              onLocaleChange={game.setLocale}
              onAlertsChange={game.setAlerts}
            />
          ) : (
            <HomePage
              session={session}
              stats={game.stats}
              recent={recent}
              category={game.prefs.category}
              onCategoryChange={game.setCategory}
              onStart={start}
              onResume={() => setView('challenge')}
              onAbandon={game.endSession}
              onOpenProgress={() => setView('progress')}
            />
          )}
        </main>

        <footer className="space-y-2 border-t border-ink-700 py-6 text-center font-mono text-xs text-mute">
          <p>
            {t.footer.creditBefore}
            <a
              href={AUTHOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded text-lime underline decoration-lime/40 underline-offset-4 transition-colors hover:decoration-lime"
            >
              Nordiel
            </a>
            {t.footer.creditAfter}
          </p>
          <p>{t.footer.privacy}</p>
        </footer>
      </div>
    </I18nProvider>
  );
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors sm:px-4 ${
        active ? 'bg-ink-700 text-lime' : 'text-mute hover:bg-ink-800 hover:text-bone'
      }`}
    >
      {children}
    </button>
  );
}
