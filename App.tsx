import React, { useState } from 'react';
import HomeScreen from './HomeScreen';
import NouvelleIntervention from './NouvelleIntervention';

type Screen = 'home' | 'nouvelle-intervention';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  if (screen === 'nouvelle-intervention') {
    return (
      <NouvelleIntervention
        onBackPress={() => setScreen('home')}
        onSavePress={() => setScreen('home')}
      />
    );
  }

  return <HomeScreen onNewInterventionPress={() => setScreen('nouvelle-intervention')} />;
}
