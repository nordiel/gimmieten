import { useCallback } from 'react';
import { PhaseSteps } from '../components/PhaseSteps';
import { getTopic } from '../data/topics';
import { unlockAudio } from '../lib/alerts';
import type { SessionAction } from '../lib/session';
import type { AlertPrefs, ChallengeSession } from '../types';
import { ChallengeResults } from './challenge/ChallengeResults';
import { ChallengeSetup } from './challenge/ChallengeSetup';
import { ExplanationPhase } from './challenge/ExplanationPhase';
import { ResearchPhase } from './challenge/ResearchPhase';

interface ChallengePageProps {
  session: ChallengeSession;
  alerts: AlertPrefs;
  dispatch: (action: SessionAction) => void;
  onSkip: () => void;
  onSave: () => void;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function ChallengePage({ session, alerts, dispatch, onSkip, onSave, onPlayAgain, onHome }: ChallengePageProps) {
  const topic = getTopic(session.topicId);
  // Starting a timer is a click, which is when browsers let us enable sound for the alert later.
  const startTimer = (type: 'startResearch' | 'startExplain') => {
    if (alerts.sound) unlockAudio();
    dispatch({ type, now: Date.now() });
  };
  const finishResearch = useCallback(() => dispatch({ type: 'finishResearch', now: Date.now() }), [dispatch]);

  // Stored sessions are validated against the topic list on load, so this is a last-resort guard.
  if (!topic) return null;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-center sm:justify-start">
        <PhaseSteps phase={session.phase} />
      </div>
      {/* Keyed by phase so each screen mounts fresh and plays its entrance animation. */}
      <div key={session.phase} className="animate-fade-up">
        {session.phase === 'setup' && (
          <ChallengeSetup
            topic={topic}
            explainMinutes={session.explainMinutes}
            skips={session.skippedTopicIds.length}
            onSkip={onSkip}
            onStart={() => startTimer('startResearch')}
          />
        )}
        {session.phase === 'research' && (
          <ResearchPhase
            topic={topic}
            timer={session.research}
            notes={session.notes}
            explainMinutes={session.explainMinutes}
            onNotesChange={(notes) => dispatch({ type: 'setNotes', notes })}
            onPause={() => dispatch({ type: 'pauseResearch', now: Date.now() })}
            onResume={() => startTimer('startResearch')}
            onFinish={finishResearch}
          />
        )}
        {session.phase === 'explain' && (
          <ExplanationPhase
            topic={topic}
            timer={session.explain}
            explainMinutes={session.explainMinutes}
            onStart={() => startTimer('startExplain')}
            onPause={() => dispatch({ type: 'pauseExplain', now: Date.now() })}
            onFinish={() => dispatch({ type: 'finishExplain', now: Date.now() })}
          />
        )}
        {session.phase === 'results' && (
          <ChallengeResults
            topic={topic}
            explainMinutes={session.explainMinutes}
            explainTimer={session.explain}
            ratings={session.ratings}
            saved={session.savedAt !== null}
            onRate={(key, value) => dispatch({ type: 'rate', key, value })}
            onSave={onSave}
            onPlayAgain={onPlayAgain}
            onHome={onHome}
          />
        )}
      </div>
    </div>
  );
}
