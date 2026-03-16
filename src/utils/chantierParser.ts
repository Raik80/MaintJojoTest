import { Tache } from './chantierStorage';
import { analyserNotesIntervention } from './interventionParser';

export type ChantierAnalyse = {
  localisation: string;
  taches: Tache[];
};

export const analyserChantier = (texte: string): ChantierAnalyse => {
  if (!texte.trim()) {
    return { localisation: 'Localisation non détectée', taches: [] };
  }

  const lignes = texte
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  let localisation = 'Localisation non détectée';
  let localisationIndex = -1;

  for (let i = 0; i < lignes.length; i++) {
    const parsed = analyserNotesIntervention(lignes[i]);
    if (parsed.batiment !== '') {
      const entree = parsed.entree ? ` — Entrée ${parsed.entree}` : '';
      localisation = `${parsed.batiment}${entree}`;
      localisationIndex = i;
      break;
    }
  }

  const taches: Tache[] = lignes
    .filter((_, i) => i !== localisationIndex)
    .map(description => ({ description, done: false }));

  return { localisation, taches };
};
