import { supabase } from './supabaseClient';
import { File as ExpoFile } from 'expo-file-system';

export type Tache = {
  description: string;
  done: boolean;
};

export type SavedChantier = {
  id: string;
  localisation: string;
  taches: Tache[];
  photos: string[];
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

export const chargerChantierById = async (id: string): Promise<SavedChantier | null> => {
  try {
    const { data, error } = await supabase
      .from('chantiers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erreur chargement chantier:', error.message);
      return null;
    }

    return data as SavedChantier;
  } catch (error) {
    console.error('Erreur chargement chantier:', error);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────
// 📸 GESTION DES PHOTOS (Supabase Storage)
// ─────────────────────────────────────────────────────────────

export const uploadPhotoChantier = async (
  chantierId: string,
  localUri: string
): Promise<string | null> => {
  try {
    const ext = localUri.split('.').pop() || 'jpg';
    const fileName = `chantiers/${chantierId}/${Date.now()}.${ext}`;

    const file = new ExpoFile(localUri);
    const arrayBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('photos')
      .upload(fileName, arrayBuffer, {
        contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        upsert: false,
      });

    if (uploadError) {
      console.error('Erreur upload photo chantier:', uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Erreur upload photo chantier:', error);
    return null;
  }
};

export const supprimerPhotoChantier = async (photoUrl: string): Promise<boolean> => {
  try {
    const urlParts = photoUrl.split('/storage/v1/object/public/photos/');
    if (urlParts.length < 2) return false;

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('photos')
      .remove([filePath]);

    if (error) {
      console.error('Erreur suppression photo chantier:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur suppression photo chantier:', error);
    return false;
  }
};

export const updatePhotosChantier = async (
  id: string,
  photos: string[]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('chantiers')
      .update({ photos })
      .eq('id', id);

    if (error) {
      console.error('Erreur mise à jour photos chantier:', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erreur mise à jour photos chantier:', error);
    return false;
  }
};
