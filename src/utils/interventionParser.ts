/**
 * Types des informations extraites depuis les notes.
 */
export type InterventionExtractedData = {
    batiment: string;
    entree: string;
    etage: string;
    piece: string;
    typeIntervention: string;
};

// ─────────────────────────────────────────────────────────────
// 🏢 BÂTIMENTS DU SITE — avec alias de reconnaissance
// ─────────────────────────────────────────────────────────────

type BatimentConfig = {
    nom: string;
    aliases: string[];
    entrees?: string[]; // ex: ["1A", "2A", ...]
};

const BATIMENTS: BatimentConfig[] = [
    {
        nom: "BU (Bibliothèque)",
        aliases: ["bu", "bibliothèque", "bibliotheque"],
    },
    {
        nom: "IECL (Math)",
        aliases: ["iecl", "math"],
    },
    {
        nom: "Bâtiment C",
        aliases: ["bat c", "batiment c", "bâtiment c"],
    },
    {
        nom: "AIP",
        aliases: ["aip"],
    },
    {
        nom: "Atela",
        aliases: ["atela"],
    },
    {
        nom: "Cryogénie",
        aliases: ["cryogénie", "cryogenie", "cryo"],
    },
    {
        nom: "Magasin Central",
        aliases: ["magasin central", "magasin"],
    },
    {
        nom: "1er Cycle",
        aliases: ["1 cycle", "1er cycle", "premier cycle"],
    },
    {
        nom: "ESA",
        aliases: ["esa"],
    },
    {
        nom: "SSE",
        aliases: ["sse"],
    },
    {
        nom: "Bâtiment B",
        aliases: ["bat b", "batiment b", "bâtiment b"],
        entrees: ["1B", "2B", "3B", "4B", "5B"],
    },
    {
        nom: "Bâtiment A",
        aliases: ["bat a", "batiment a", "bâtiment a"],
        entrees: ["1A", "2A", "3A", "4A", "5A"],
    },
];

// ─────────────────────────────────────────────────────────────
// ⚡ TYPES D'INTERVENTION — mots-clés sans conflit
// ─────────────────────────────────────────────────────────────

const TYPES_INTERVENTION = [
    {
        type: "Éclairage",
        keywords: [
            "neon qui clignote", "néon qui clignote",
            "lumiere qui marche pas", "lumière qui marche pas",
            "interrupteur cassé", "interrupteur qui marche pas",
            "disjonction eclairage", "disjonction éclairage",
            "lumiere hs", "lumière hs",
            "remplacer neon", "remplacer néon",
            "dalle led",
            // Mots courts de secours
            "néon", "neon", "clignote", "lumière", "lumiere",
            "interrupteur", "éclairage", "eclairage",
            "lampe", "luminaire", "spot", "plafonnier", "LED",
        ],
    },
    {
        type: "Prises de courant",
        keywords: [
            "prise de courant qui marche pas",
            "prise de courant arrachée", "prise de courant arracher", "prise de courant arraché",
            "disjonction des prises de courant", "disjonction des prises",
            "disjonction prise",
            // Mots courts de secours
            "prise de courant", "prise",
        ],
    },
    {
        type: "Contrôle d'accès",
        keywords: [
            "lecteur de badge qui marche pas", "lecteur de badge",
            "gache qui marche pas", "gâche qui marche pas",
            "uca qui repond plus", "uca qui répond plus",
            "interphase ip", "interphace ip",
            // Mots courts de secours
            "gâche", "gache", "uca", "badge",
        ],
    },
    {
        type: "Réseau",
        keywords: [
            "prise reseau qui marche plus", "prise réseau qui marche plus",
            "prise reseau deboité", "prise réseau déboîtée",
            "prise reseau qui est deboité", "prise réseau qui est déboîtée",
            // Mots courts de secours
            "prise réseau", "prise reseau",
        ],
    },
];

// ─────────────────────────────────────────────────────────────
// 🔍 FONCTION D'ANALYSE PRINCIPALE
// ─────────────────────────────────────────────────────────────

/**
 * Extrait le bâtiment, l'entrée, la pièce et le type d'intervention
 * à partir d'un texte libre saisi par le technicien.
 *
 * @param texte Le texte saisi par l'utilisateur
 * @returns Les informations extraites sous forme d'objet
 */
export const analyserNotesIntervention = (texte: string): InterventionExtractedData => {
    const result: InterventionExtractedData = {
        batiment: "",
        entree: "",
        etage: "",
        piece: "",
        typeIntervention: "",
    };

    const lowerTexte = texte.toLowerCase();

    // ── 1. Extraction du Bâtiment ──────────────────────────
    // On trie les alias par longueur décroissante pour matcher
    // les plus longs en premier (ex: "magasin central" avant "magasin")
    let batimentTrouve: BatimentConfig | null = null;

    for (const bat of BATIMENTS) {
        const sortedAliases = [...bat.aliases].sort((a, b) => b.length - a.length);
        for (const alias of sortedAliases) {
            // On cherche l'alias comme mot/segment isolé dans le texte
            // Pour les alias multi-mots, un simple includes suffit
            if (alias.includes(' ')) {
                if (lowerTexte.includes(alias)) {
                    batimentTrouve = bat;
                    break;
                }
            } else {
                // Pour les alias courts (ex: "bu", "sse"), on vérifie les limites de mot
                const regex = new RegExp(`\\b${alias}\\b`, 'i');
                if (regex.test(texte)) {
                    batimentTrouve = bat;
                    break;
                }
            }
        }
        if (batimentTrouve) break;
    }

    if (batimentTrouve) {
        result.batiment = batimentTrouve.nom;

        // ── 2. Extraction de l'Entrée (si applicable) ──────
        if (batimentTrouve.entrees && batimentTrouve.entrees.length > 0) {
            for (const entree of batimentTrouve.entrees) {
                // On cherche "1A", "entrée 1A", "entree 1A", etc.
                const entreeRegex = new RegExp(`(?:entrée|entree)?\\s*\\b${entree}\\b`, 'i');
                if (entreeRegex.test(texte)) {
                    result.entree = entree;
                    break;
                }
            }
        }
    }

    // ── 3. Extraction de l'Étage ────────────────────────────
    // Patterns: "étage 2", "etage 3", "2ème étage", "N2", "N-1", "niveau 2", "rdc", "sous-sol", "ss"
    const etageRegex = /(?:étage|etage|niveau)\s*(\d+)|(?:(\d+)(?:er|ère|ème|e)?\s*(?:étage|etage))|(?:\bn\s*(-?\d+)\b)|(rdc|rez\s*de\s*chauss[ée]e?|sous[- ]?sol|ss\d*)/i;
    const etageMatch = texte.match(etageRegex);
    if (etageMatch) {
        if (etageMatch[1]) {
            result.etage = `Étage ${etageMatch[1]}`;
        } else if (etageMatch[2]) {
            result.etage = `Étage ${etageMatch[2]}`;
        } else if (etageMatch[3]) {
            const num = parseInt(etageMatch[3], 10);
            if (num < 0) {
                result.etage = `Sous-sol ${Math.abs(num)}`;
            } else if (num === 0) {
                result.etage = 'RDC';
            } else {
                result.etage = `Étage ${num}`;
            }
        } else if (etageMatch[4]) {
            const val = etageMatch[4].toLowerCase();
            if (val === 'rdc' || val.startsWith('rez')) {
                result.etage = 'RDC';
            } else {
                result.etage = 'Sous-sol';
            }
        }
    }

    // ── 4. Extraction de la Pièce / Local ──────────────────
    // Liste de tous les types de pièces / locaux reconnus
    const TYPES_PIECES = [
        // Pièces avec numéro (ex: "salle 102", "bureau 201")
        "salle de cours", "salle de réunion", "salle de reunion",
        "salle", "bureau", "local", "pièce", "piece",
        "cuisine", "sanitaire", "wc", "toilette",
        "circulation", "couloir", "hall", "entrée",
        "archive", "archives", "stockage", "réserve", "reserve",
        "atelier", "labo", "laboratoire",
        "accueil", "secrétariat", "secretariat",
        "amphithéâtre", "amphitheatre", "amphi",
    ];

    // Tri par longueur décroissante pour matcher les noms composés en premier
    const sortedTypesPieces = [...TYPES_PIECES].sort((a, b) => b.length - a.length);

    let pieceTrouvee = false;

    // Pass 1 : Chercher "type + identifiant" (ex: "salle 102", "bureau B12")
    for (const typePiece of sortedTypesPieces) {
        const regexAvecId = new RegExp(`${typePiece}\\s+([a-zA-Z0-9]+)`, 'i');
        const match = texte.match(regexAvecId);
        if (match && match[1]) {
            result.piece = `${typePiece.charAt(0).toUpperCase() + typePiece.slice(1)} ${match[1]}`;
            pieceTrouvee = true;
            break;
        }
    }

    // Pass 2 : Si pas de numéro, chercher le nom de pièce seul (ex: "cuisine", "circulation")
    if (!pieceTrouvee) {
        for (const typePiece of sortedTypesPieces) {
            if (typePiece.includes(' ')) {
                if (lowerTexte.includes(typePiece)) {
                    result.piece = typePiece.charAt(0).toUpperCase() + typePiece.slice(1);
                    break;
                }
            } else {
                const regex = new RegExp(`\\b${typePiece}\\b`, 'i');
                if (regex.test(texte)) {
                    result.piece = typePiece.charAt(0).toUpperCase() + typePiece.slice(1);
                    break;
                }
            }
        }
    }

    // ── 4. Déduction du Type d'intervention ────────────────
    // On trie les mots-clés par longueur décroissante pour matcher
    // les phrases longues en premier (ex: "prise de courant" avant "prise réseau")
    for (const categorie of TYPES_INTERVENTION) {
        const sortedKeywords = [...categorie.keywords].sort((a, b) => b.length - a.length);
        const isMatch = sortedKeywords.some(keyword => {
            if (keyword.includes(' ')) {
                return lowerTexte.includes(keyword);
            }
            const regex = new RegExp(`\\b${keyword}\\b`, 'i');
            return regex.test(texte);
        });

        if (isMatch) {
            result.typeIntervention = categorie.type;
            break;
        }
    }

    // Si aucun type n'a été trouvé, on met "Autres" par défaut
    if (!result.typeIntervention && texte.trim().length > 0) {
        result.typeIntervention = "Autres";
    }

    return result;
};

/**
 * Analyse un texte contenant potentiellement plusieurs interventions
 * (une par ligne). Retourne un tableau d'interventions extraites.
 *
 * @param texte Le texte brut saisi par l'utilisateur (multi-lignes)
 * @returns Tableau d'interventions extraites
 */
export const analyserMultipleInterventions = (texte: string): InterventionExtractedData[] => {
    // Séparer par ligne et filtrer les lignes vides
    const lignes = texte
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    // Si aucune ligne valide, retourner un tableau vide
    if (lignes.length === 0) return [];

    // Analyser chaque ligne individuellement
    return lignes.map(ligne => analyserNotesIntervention(ligne));
};
