import { useEffect } from 'react';
import { Redirect, Route, Switch, useLocation } from 'wouter';
import { ExercisesPage } from './features/exercices/ExercisesPage';
import { ProfilPage } from './features/profil/ProfilPage';
import { WorkoutDetail } from './features/profil/WorkoutDetail';
import { SettingsPage } from './features/reglages/SettingsPage';
import { RoutineEditor } from './features/routines/RoutineEditor';
import { FinishScreen } from './features/seance/FinishScreen';
import { LiveWorkout } from './features/seance/LiveWorkout';
import { RestWatcher } from './features/seance/Rest';
import { SeancePage } from './features/seance/SeancePage';
import { useSettings } from './state/data';
import { useDraft } from './state/draft';
import { CHEMINS_ONGLETS, TabBar } from './ui/TabBar';
import { appliquerTheme, suivreSysteme } from './ui/theme';
import { ToastHote } from './ui/toast';

export function App() {
  const [chemin] = useLocation();
  const { theme } = useSettings();
  const draft = useDraft();
  const avecOnglets = CHEMINS_ONGLETS.includes(chemin);

  useEffect(() => {
    appliquerTheme(theme);
    return suivreSysteme(theme);
  }, [theme]);

  // chaque écran s'ouvre en haut de page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [chemin]);

  return (
    <div className={`app${avecOnglets ? ' app--onglets' : ''}${avecOnglets && draft ? ' app--encours' : ''}`}>
      <Switch>
        <Route path="/" component={ProfilPage} />
        <Route path="/seance" component={SeancePage} />
        <Route path="/exercices" component={ExercisesPage} />
        <Route path="/en-cours" component={LiveWorkout} />
        <Route path="/en-cours/fin" component={FinishScreen} />
        <Route path="/routine/:id" component={RoutineEditor} />
        <Route path="/seances/:id" component={WorkoutDetail} />
        <Route path="/reglages" component={SettingsPage} />
        <Route>
          <Redirect to="/" replace />
        </Route>
      </Switch>
      {avecOnglets && <TabBar />}
      <RestWatcher />
      <ToastHote />
    </div>
  );
}
