import React, { useState, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './HomeScreen';
import NouvelleIntervention from './NouvelleIntervention';
import FormulaireIntervention from './FormulaireIntervention';
import ListeInterventions from './ListeInterventions';
import FicheIntervention from './FicheIntervention';
import ModifierIntervention from './ModifierIntervention';
import { InterventionExtractedData } from './src/utils/interventionParser';
import { sauvegarderInterventions } from './src/utils/interventionStorage';
import CustomAlert from './src/components/CustomAlert';

type Screen = 'home' | 'nouvelle-intervention' | 'formulaire-intervention' | 'liste-interventions' | 'fiche-intervention' | 'modifier-intervention';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [interventionsData, setInterventionsData] = useState<InterventionExtractedData[]>([]);
  const [originalNotes, setOriginalNotes] = useState<string>('');
  const [selectedInterventionId, setSelectedInterventionId] = useState<string>('');

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'danger' | 'warning' | 'info';
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  useEffect(() => {
    const backAction = () => {
      if (screen === 'modifier-intervention') {
        setScreen('fiche-intervention');
        return true;
      }
      if (screen === 'fiche-intervention') {
        setScreen('liste-interventions');
        return true;
      }
      if (screen === 'liste-interventions') {
        setScreen('home');
        return true;
      }
      if (screen === 'formulaire-intervention') {
        setScreen('nouvelle-intervention');
        return true;
      }
      if (screen === 'nouvelle-intervention') {
        setScreen('home');
        return true;
      }
      return false; // home → ferme l'app normalement
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [screen]);

  const handleAnalyzeComplete = (notes: string, data: InterventionExtractedData[]) => {
    setOriginalNotes(notes);
    setInterventionsData(data);
    setScreen('formulaire-intervention');
  };

  const handleSaveInterventions = async (editedData: InterventionExtractedData[]) => {
    const notesParLigne = originalNotes
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);
    const count = await sauvegarderInterventions(editedData, notesParLigne);
    if (count > 0) {
      setAlertConfig({
        visible: true,
        title: 'Enregistré !',
        message: `${count} intervention${count > 1 ? 's' : ''} sauvegardée${count > 1 ? 's' : ''} avec succès.`,
        type: 'success',
        onConfirm: () => {
          setAlertConfig((prev) => ({ ...prev, visible: false }));
          setScreen('home');
        },
      });
    } else {
      setAlertConfig({
        visible: true,
        title: 'Erreur',
        message: 'Impossible de sauvegarder les interventions.',
        type: 'danger',
        onConfirm: () => setAlertConfig((prev) => ({ ...prev, visible: false })),
      });
    }
  };

  const handleInterventionPress = (id: string) => {
    setSelectedInterventionId(id);
    setScreen('fiche-intervention');
  };

  const handleEditPress = (id: string) => {
    setSelectedInterventionId(id);
    setScreen('modifier-intervention');
  };

  const handleEditSaveSuccess = () => {
    // Retourner à la fiche de l'intervention après modification
    setScreen('fiche-intervention');
  };

  const renderScreen = () => {
    if (screen === 'nouvelle-intervention') {
      return (
        <NouvelleIntervention
          onBackPress={() => setScreen('home')}
          onAnalyzeComplete={handleAnalyzeComplete}
        />
      );
    }

    if (screen === 'formulaire-intervention' && interventionsData.length > 0) {
      return (
        <FormulaireIntervention
          interventionsData={interventionsData}
          originalNotes={originalNotes}
          onBackPress={() => setScreen('nouvelle-intervention')}
          onSavePress={handleSaveInterventions}
        />
      );
    }

    if (screen === 'liste-interventions') {
      return (
        <ListeInterventions
          onBackPress={() => setScreen('home')}
          onInterventionPress={handleInterventionPress}
        />
      );
    }

    if (screen === 'fiche-intervention' && selectedInterventionId) {
      return (
        <FicheIntervention
          interventionId={selectedInterventionId}
          onBackPress={() => setScreen('liste-interventions')}
          onEditPress={handleEditPress}
        />
      );
    }

    if (screen === 'modifier-intervention' && selectedInterventionId) {
      return (
        <ModifierIntervention
          interventionId={selectedInterventionId}
          onBackPress={() => setScreen('fiche-intervention')}
          onSaveSuccess={handleEditSaveSuccess}
        />
      );
    }

    return (
      <HomeScreen
        onNewInterventionPress={() => setScreen('nouvelle-intervention')}
        onViewInterventionsPress={() => setScreen('liste-interventions')}
      />
    );
  };

  return (
    <SafeAreaProvider>
      {renderScreen()}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm || (() => setAlertConfig(prev => ({ ...prev, visible: false })))}
      />
    </SafeAreaProvider>
  );
}

