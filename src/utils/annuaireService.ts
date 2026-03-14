const ANNUAIRE_BASE_URL = 'https://annuaire-web.univ-lorraine.fr/p/ldapsearch';
const TIMEOUT_MS = 5000;

export type PersonneAnnuaire = {
    displayName: string;
    nom: string;
    prenom: string;
    telephone: string;
    affectation: string;
};

export const decoderChaine = (s: string): string =>
    s.split('').map(c => String.fromCharCode(c.charCodeAt(0) - 1)).join('');

export const rechercherParNumero = async (numeroInterne: string): Promise<PersonneAnnuaire[]> => {
    const url = `${ANNUAIRE_BASE_URL}?valeur=${encodeURIComponent(numeroInterne)}&filtervalue=&withvac=false`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}`);
        }

        const json = await response.json();
        const items: any[] = json?.items ?? [];

        return items.map((item): PersonneAnnuaire => ({
            displayName: item.displayName ?? '',
            nom: item.nom ?? '',
            prenom: item.prenom ?? '',
            telephone: item.telephone ? decoderChaine(item.telephone) : '',
            affectation: item.affectation ?? '',
        }));
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error?.name === 'AbortError') {
            throw new Error("Timeout : impossible de contacter l'annuaire");
        }
        throw error;
    }
};
