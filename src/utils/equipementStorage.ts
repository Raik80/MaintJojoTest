import { supabase } from './supabaseClient';

export type Equipement = {
  id: string;
  code_barres: string;
  nom: string;
  reference_rexel: string;
};

export const trouverEquipementParCodeBarres = async (
  codeBarres: string
): Promise<Equipement | null> => {
  try {
    const { data, error } = await supabase
      .from('equipements')
      .select('*')
      .eq('code_barres', codeBarres)
      .single();

    if (error) return null;
    return data as Equipement;
  } catch {
    return null;
  }
};

export const ajouterEquipement = async (
  codeBarres: string,
  nom: string,
  referenceRexel: string
): Promise<Equipement | null> => {
  try {
    const { data, error } = await supabase
      .from('equipements')
      .insert({ code_barres: codeBarres, nom, reference_rexel: referenceRexel })
      .select()
      .single();

    if (error) {
      console.error('Erreur ajout équipement:', error.message);
      return null;
    }
    return data as Equipement;
  } catch (error) {
    console.error('Erreur ajout équipement:', error);
    return null;
  }
};
