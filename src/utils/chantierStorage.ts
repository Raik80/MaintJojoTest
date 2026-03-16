import { supabase } from './supabaseClient';

export type Tache = {
  description: string;
  done: boolean;
};

export type SavedChantier = {
  id: string;
  localisation: string;
  taches: Tache[];
  date_creation: string;
  status: 'en_cours' | 'termine';
};

export const chargerChantiers = async (): Promise<SavedChantier[]> => {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .select('*')
      .order('date_creation', { ascending: false });

    if (error) {
      console.error('Erreur chargement chantiers:', error.message);
      return [];
    }

    return (data as SavedChantier[]) || [];
  } catch (error) {
    console.error('Erreur chargement chantiers:', error);
    return [];
  }
};

export const sauvegarderChantier = async (
  localisation: string,
  taches: Tache[]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('chantiers')
      .insert({ localisation, taches, status: 'en_cours' });

    if (error) {
      console.error('Erreur sauvegarde chantier:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur sauvegarde chantier:', error);
    return false;
  }
};

export const updateTachesChantier = async (
  id: string,
  taches: Tache[]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('chantiers')
      .update({ taches })
      .eq('id', id);

    if (error) {
      console.error('Erreur mise à jour tâches:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur mise à jour tâches:', error);
    return false;
  }
};

export const supprimerChantier = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('chantiers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur suppression chantier:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur suppression chantier:', error);
    return false;
  }
};

/**
 * Supprime tous les chantiers.
 * Note: Supabase requiert un filtre sur DELETE. On utilise .neq() avec un UUID
 * impossible comme contournement — même pattern que supprimerToutesInterventions.
 */
export const supprimerTousChantiers = async (): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('chantiers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Erreur suppression totale chantiers:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur suppression totale chantiers:', error);
    return false;
  }
};
