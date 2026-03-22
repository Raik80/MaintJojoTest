import * as Print from 'expo-print';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { SavedIntervention } from './interventionStorage';

const RESPONSABLE_EMAIL = 'jean-francois.marc@univ-lorraine.fr';

const getIconBase64 = async (): Promise<string> => {
    try {
        const asset = Asset.fromModule(require('../../assets/icon.png'));
        await asset.downloadAsync();
        const base64 = await FileSystem.readAsStringAsync(asset.localUri!, { encoding: FileSystem.EncodingType.Base64 });
        return `data:image/png;base64,${base64}`;
    } catch {
        return '';
    }
};

const urlToBase64 = async (url: string): Promise<string> => {
    try {
        const localPath = FileSystem.cacheDirectory + 'tmp_photo_' + Date.now() + Math.random() + '.jpg';
        await FileSystem.downloadAsync(url, localPath);
        const base64 = await FileSystem.readAsStringAsync(localPath, { encoding: FileSystem.EncodingType.Base64 });
        await FileSystem.deleteAsync(localPath, { idempotent: true });
        return `data:image/jpeg;base64,${base64}`;
    } catch {
        return url;
    }
};

const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    const jour = date.getDate().toString().padStart(2, '0');
    const mois = (date.getMonth() + 1).toString().padStart(2, '0');
    const annee = date.getFullYear();
    const heures = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${jour}/${mois}/${annee} à ${heures}:${minutes}`;
};

const buildHTML = async (intervention: SavedIntervention): Promise<string> => {
    const isTerminee = intervention.status === 'terminee';
    const statusLabel = isTerminee ? 'Terminée' : 'En cours';
    const statusColor = isTerminee ? '#10B981' : '#F59E0B';
    const statusBg = isTerminee ? '#D1FAE5' : '#FEF3C7';

    const iconBase64 = await getIconBase64();
    const brandIconHTML = iconBase64
        ? `<img src="${iconBase64}" style="width:42px;height:42px;border-radius:10px;object-fit:cover;" />`
        : `<div class="brand-icon">⚡</div>`;

    let photosHTML = '';
    if (intervention.photos && intervention.photos.length > 0) {
        const base64Photos = await Promise.all(intervention.photos.map(urlToBase64));
        photosHTML = `<div class="section">
            <h3 class="section-title">📷 Photos</h3>
            <div class="photos-grid">
                ${base64Photos.map(src => `<img src="${src}" class="photo" />`).join('')}
            </div>
          </div>`;
    }

    const commentaireHTML = intervention.commentaire
        ? `<div class="section">
            <h3 class="section-title">💬 Commentaire du technicien</h3>
            <div class="text-box">${intervention.commentaire}</div>
          </div>`
        : '';

    const noteOriginaleHTML = intervention.noteOriginale
        ? `<div class="section">
            <h3 class="section-title">🎙️ Note originale</h3>
            <div class="text-box italic">${intervention.noteOriginale}</div>
          </div>`
        : '';

    const dateTermineeHTML = isTerminee && intervention.dateTerminee
        ? `<div class="info-row">
            <span class="info-label">Terminée le</span>
            <span class="info-value">${formatDate(intervention.dateTerminee)}</span>
          </div>`
        : '';

    const entreeHTML = intervention.entree
        ? `<div class="info-row">
            <span class="info-label">Entrée</span>
            <span class="info-value">${intervention.entree}</span>
          </div>`
        : '';

    const personneHTML = (intervention.numeroInterne || intervention.nomPersonne)
        ? `<div class="info-row">
            <span class="info-label">Personne concernée</span>
            <span class="info-value">${
                intervention.numeroInterne && intervention.nomPersonne
                    ? `${intervention.numeroInterne} — ${intervention.nomPersonne}`
                    : intervention.numeroInterne
                        ? `Numéro : ${intervention.numeroInterne}`
                        : intervention.nomPersonne ?? ''
            }</span>
          </div>`
        : '';

    const isTelephonie = intervention.typeIntervention.toLowerCase().includes('téléphonie')
        || intervention.typeIntervention.toLowerCase().includes('telephonie');
    const typeIcon = isTelephonie ? '📞' : '🔧';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, 'Segoe UI', sans-serif;
      background: #ffffff;
      color: #111827;
      padding: 40px 48px;
      font-size: 14px;
      line-height: 1.5;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 20px;
      border-bottom: 2px solid #E5E7EB;
      margin-bottom: 28px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 42px;
      height: 42px;
      background: #F3F4F6;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }
    .brand-name {
      font-size: 22px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 12px;
      color: #6B7280;
      margin-top: 1px;
    }
    .status-badge {
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      background: ${statusBg};
      color: ${statusColor};
    }

    /* ── Title ── */
    .page-title {
      font-size: 28px;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 6px;
    }
    .page-subtitle {
      font-size: 13px;
      color: #9CA3AF;
      margin-bottom: 28px;
    }

    /* ── Info Card ── */
    .info-card {
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 24px;
    }
    .info-card-header {
      background: #F9FAFB;
      padding: 16px 20px;
      border-bottom: 1px solid #E5E7EB;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .type-icon {
      width: 42px;
      height: 42px;
      background: #EDE9FE;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .type-label {
      font-size: 11px;
      font-weight: 600;
      color: #9CA3AF;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .type-value {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin-top: 2px;
    }
    .info-grid { padding: 0 20px; }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label {
      font-size: 13px;
      color: #6B7280;
      font-weight: 500;
    }
    .info-value {
      font-size: 13px;
      color: #111827;
      font-weight: 600;
      text-align: right;
    }

    /* ── Sections ── */
    .section { margin-bottom: 24px; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #374151;
      margin-bottom: 10px;
    }
    .text-box {
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      padding: 14px 16px;
      font-size: 14px;
      color: #374151;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .text-box.italic { font-style: italic; color: #6B7280; }

    /* ── Photos ── */
    .photos-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .photo {
      width: 160px;
      height: 160px;
      object-fit: cover;
      border-radius: 10px;
      border: 1px solid #E5E7EB;
    }

    /* ── Footer ── */
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-text {
      font-size: 11px;
      color: #9CA3AF;
    }
    .footer-id {
      font-size: 10px;
      color: #D1D5DB;
      font-family: monospace;
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="brand">
      ${brandIconHTML}
      <div>
        <div class="brand-name">MaintJojo</div>
        <div class="brand-sub">Rapport d'intervention</div>
      </div>
    </div>
    <div class="status-badge">${statusLabel}</div>
  </div>

  <div class="page-title">Fiche d'intervention</div>
  <div class="page-subtitle">Généré le ${formatDate(new Date().toISOString())}</div>

  <div class="info-card">
    <div class="info-card-header">
      <div class="type-icon">${typeIcon}</div>
      <div>
        <div class="type-label">Type d'intervention</div>
        <div class="type-value">${intervention.typeIntervention || '—'}</div>
      </div>
    </div>
    <div class="info-grid">
      <div class="info-row">
        <span class="info-label">Bâtiment</span>
        <span class="info-value">${intervention.batiment || '—'}</span>
      </div>
      ${entreeHTML}
      <div class="info-row">
        <span class="info-label">Étage</span>
        <span class="info-value">${intervention.etage || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Pièce / Local</span>
        <span class="info-value">${intervention.piece || '—'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Créée le</span>
        <span class="info-value">${formatDate(intervention.dateCreation)}</span>
      </div>
      ${dateTermineeHTML}
      ${personneHTML}
    </div>
  </div>

  ${noteOriginaleHTML}
  ${commentaireHTML}
  ${photosHTML}

  <div class="footer">
    <div class="footer-text">MaintJojo · Rapport généré automatiquement</div>
    <div class="footer-id">ID : ${intervention.id}</div>
  </div>

</body>
</html>`;
};

const buildSubject = (intervention: SavedIntervention): string => {
    const date = new Date(intervention.dateCreation);
    const dateStr = date.toLocaleDateString('fr-FR');
    const lieu = [intervention.batiment, intervention.etage, intervention.piece]
        .filter(Boolean)
        .join(' – ');
    return `[MaintJojo] ${intervention.typeIntervention} – ${lieu} – ${dateStr}`;
};

const buildBody = (intervention: SavedIntervention): string => {
    const isTerminee = intervention.status === 'terminee';
    const statut = isTerminee ? 'terminée' : 'en cours';
    const lieu = [intervention.batiment, intervention.etage, intervention.piece]
        .filter(Boolean)
        .join(', ');

    return `Bonjour,

Veuillez trouver ci-joint le rapport de l'intervention suivante :

• Type : ${intervention.typeIntervention}
• Lieu : ${lieu || '—'}
• Date : ${formatDate(intervention.dateCreation)}
• Statut : ${statut}${intervention.noteOriginale ? `\n• Note originale : ${intervention.noteOriginale}` : ''}${intervention.commentaire ? `\n• Commentaire : ${intervention.commentaire}` : ''}

Cordialement.`;
};

export const genererEtEnvoyerPDF = async (intervention: SavedIntervention): Promise<void> => {
    const html = await buildHTML(intervention);

    const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
    });

    const isAvailable = await MailComposer.isAvailableAsync();
    if (!isAvailable) {
        throw new Error('Aucune application mail disponible sur cet appareil.');
    }

    await MailComposer.composeAsync({
        recipients: [RESPONSABLE_EMAIL],
        subject: buildSubject(intervention),
        body: buildBody(intervention),
        attachments: [uri],
    });
};
