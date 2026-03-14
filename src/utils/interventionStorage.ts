import { supabase } from './supabaseClient';
import { InterventionExtractedData } from './interventionParser';
import { File as ExpoFile } from 'expo-file-system';

/**
 * Une intervention sauvegardée avec un ID unique et une date.
 */
export type SavedIntervention = InterventionExtractedData & {
    id: string;
    dateCreation: string; // ISO string
    photos: string[];     // URLs des photos (Supabase Storage)
    status: 'en_cours' | 'terminee';
    dateTerminee?: string; // ISO string
    commentaire?: string;  // Commentaire du technicien
    noteOriginale?: string; // Note dictée par l'utilisateur
};

/**
 * Type de ligne retourné par Supabase (snake_case).
 */
type SupabaseRow = {
    id: string;
    batiment: string;
    entree: string;
    etage: string;
    piece: string;
    type_intervention: string;
    note_originale: string;
    commentaire: string;
    photos: string[];
    status: 'en_cours' | 'terminee';
    date_creation: string;
    date_terminee: string | null;
    numero_interne: string | null;
    nom_personne: string | null;
};

/**
 * Convertit une ligne Supabase (snake_case) en SavedIntervention (camelCase).
 */
const rowToIntervention = (row: SupabaseRow): SavedIntervention => ({
    id: row.id,
    batiment: row.batiment || '',
    entree: row.entree || '',
    etage: row.etage || '',
    piece: row.piece || '',
    typeIntervention: row.type_intervention || '',
    noteOriginale: row.note_originale || '',
    commentaire: row.commentaire || '',
    photos: row.photos || [],
    status: row.status || 'en_cours',
    dateCreation: row.date_creation,
    dateTerminee: row.date_terminee || undefined,
    numeroInterne: row.numero_interne || undefined,
    nomPersonne: row.nom_personne || undefined,
});

/**
 * Charge toutes les interventions depuis Supabase.
 */
export const chargerInterventions = async (): Promise<SavedIntervention[]> => {
    try {
        const { data, error } = await supabase
            .from('interventions')
            .select('*')
            .order('date_creation', { ascending: false });

        if (error) {
            console.error('Erreur chargement interventions:', error.message);
            return [];
        }

        return (data as SupabaseRow[]).map(rowToIntervention);
    } catch (error) {
        console.error('Erreur chargement interventions:', error);
        return [];
    }
};

/**
 * Sauvegarde un tableau d'interventions dans Supabase.
 * Retourne le nombre d'interventions ajoutées.
 */
export const sauvegarderInterventions = async (
    interventions: InterventionExtractedData[],
    notesOriginales?: string[]
): Promise<number> => {
    try {
        const rows = interventions.map((i, index) => ({
            batiment: i.batiment || '',
            entree: i.entree || '',
            etage: i.etage || '',
            piece: i.piece || '',
            type_intervention: i.typeIntervention || '',
            note_originale: notesOriginales?.[index] || '',
            commentaire: '',
            photos: [],
            status: 'en_cours',
            numero_interne: i.numeroInterne || null,
            nom_personne: i.nomPersonne || null,
        }));

        const { data, error } = await supabase
            .from('interventions')
            .insert(rows)
            .select();

        if (error) {
            console.error('Erreur sauvegarde interventions:', error.message);
            return 0;
        }

        return data?.length || 0;
    } catch (error) {
        console.error('Erreur sauvegarde interventions:', error);
        return 0;
    }
};

/**
 * Met à jour une intervention existante.
 */
export const updateIntervention = async (
    id: string,
    updates: Partial<Omit<SavedIntervention, 'id' | 'dateCreation'>>
): Promise<boolean> => {
    try {
        // Convertir camelCase → snake_case pour Supabase
        const supabaseUpdates: Record<string, unknown> = {};

        if (updates.batiment !== undefined) supabaseUpdates.batiment = updates.batiment;
        if (updates.entree !== undefined) supabaseUpdates.entree = updates.entree;
        if (updates.etage !== undefined) supabaseUpdates.etage = updates.etage;
        if (updates.piece !== undefined) supabaseUpdates.piece = updates.piece;
        if (updates.typeIntervention !== undefined) supabaseUpdates.type_intervention = updates.typeIntervention;
        if (updates.noteOriginale !== undefined) supabaseUpdates.note_originale = updates.noteOriginale;
        if (updates.commentaire !== undefined) supabaseUpdates.commentaire = updates.commentaire;
        if (updates.photos !== undefined) supabaseUpdates.photos = updates.photos;
        if (updates.status !== undefined) supabaseUpdates.status = updates.status;
        if (updates.dateTerminee !== undefined) supabaseUpdates.date_terminee = updates.dateTerminee;
        if (updates.numeroInterne !== undefined) supabaseUpdates.numero_interne = updates.numeroInterne || null;
        if (updates.nomPersonne !== undefined) supabaseUpdates.nom_personne = updates.nomPersonne || null;

        const { error } = await supabase
            .from('interventions')
            .update(supabaseUpdates)
            .eq('id', id);

        if (error) {
            console.error('Erreur mise à jour intervention:', error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Erreur mise à jour intervention:', error);
        return false;
    }
};

/**
 * Marque une intervention comme terminée.
 */
export const terminerIntervention = async (
    id: string,
    commentaire?: string
): Promise<boolean> => {
    return updateIntervention(id, {
        status: 'terminee',
        dateTerminee: new Date().toISOString(),
        ...(commentaire ? { commentaire } : {}),
    });
};

/**
 * Supprime une intervention par son ID.
 */
export const supprimerIntervention = async (id: string): Promise<boolean> => {
    try {
        // 1. Récupérer les photos avant suppression
        const { data: intervention } = await supabase
            .from('interventions')
            .select('photos')
            .eq('id', id)
            .single();

        // 2. Supprimer les photos du Storage
        if (intervention?.photos && intervention.photos.length > 0) {
            for (const photoUrl of intervention.photos) {
                await supprimerPhoto(photoUrl);
            }
        }

        // 3. Supprimer l'intervention de la base
        const { error } = await supabase
            .from('interventions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Erreur suppression intervention:', error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Erreur suppression intervention:', error);
        return false;
    }
};

/**
 * Supprime toutes les interventions.
 */
export const supprimerToutesInterventions = async (): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('interventions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (error) {
            console.error('Erreur suppression totale:', error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Erreur suppression totale:', error);
        return false;
    }
};

// ─────────────────────────────────────────────────────────────
// 📸 GESTION DES PHOTOS (Supabase Storage)
// ─────────────────────────────────────────────────────────────

/**
 * Upload une photo vers Supabase Storage et retourne l'URL publique.
 */
export const uploadPhoto = async (
    interventionId: string,
    localUri: string
): Promise<string | null> => {
    try {
        const ext = localUri.split('.').pop() || 'jpg';
        const fileName = `${interventionId}/${Date.now()}.${ext}`;

        // Lire le fichier local avec la nouvelle API File de expo-file-system
        const file = new ExpoFile(localUri);
        const arrayBuffer = await file.arrayBuffer();

        const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(fileName, arrayBuffer, {
                contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
                upsert: false,
            });

        if (uploadError) {
            console.error('Erreur upload photo:', uploadError.message);
            return null;
        }

        // Récupérer l'URL publique
        const { data: urlData } = supabase.storage
            .from('photos')
            .getPublicUrl(fileName);

        return urlData.publicUrl;
    } catch (error) {
        console.error('Erreur upload photo:', error);
        return null;
    }
};

/**
 * Supprime une photo du bucket Supabase Storage.
 */
export const supprimerPhoto = async (photoUrl: string): Promise<boolean> => {
    try {
        // Extraire le chemin du fichier depuis l'URL publique
        const urlParts = photoUrl.split('/storage/v1/object/public/photos/');
        if (urlParts.length < 2) return false;

        const filePath = urlParts[1];

        const { error } = await supabase.storage
            .from('photos')
            .remove([filePath]);

        if (error) {
            console.error('Erreur suppression photo:', error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Erreur suppression photo:', error);
        return false;
    }
};
