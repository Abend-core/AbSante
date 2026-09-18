/** Contenu des fenêtres du pied de page. Séparé du composant : c'est du texte éditorial (sources,
 *  mentions) qui doit pouvoir être relu et corrigé sans toucher au code d'affichage. */

/** Un morceau de texte : chaîne simple, ou lien externe. */
export type InfoPart = string | { text: string; href: string }

export interface InfoItem {
  title?: string
  body: InfoPart[]
}

export interface FooterDialog {
  id: string
  /** Texte du lien dans le pied de page. */
  label: string
  /** Titre de la fenêtre. */
  title: string
  items: InfoItem[]
}

export const TEAM_NAME = 'Abend'
export const REPO_URL = 'https://github.com/Abend-core/AbSante'
export const TAGLINE = 'Carte interactive des professionnels de santé en France.'

const RPPS_URL =
  'https://www.data.gouv.fr/datasets/annuaire-sante-extractions-des-donnees-en-libre-acces-des-professionnels-intervenant-dans-le-systeme-de-sante-rpps/'

export const FOOTER_DIALOGS: FooterDialog[] = [
  {
    id: 'sources',
    label: 'Sources des données',
    title: 'Sources des données',
    items: [
      {
        title: 'Professionnels de santé.',
        body: [
          { text: 'Annuaire Santé — RPPS', href: RPPS_URL },
          ', Agence du Numérique en Santé : données en libre accès, Licence Ouverte 2.0, mises à jour chaque jour.',
        ],
      },
      {
        title: 'Fond de carte.',
        body: ['© ', { text: 'contributeurs OpenStreetMap', href: 'https://www.openstreetmap.org/copyright' }, ' (licence ODbL).'],
      },
      {
        title: 'Adresses.',
        body: ['Géocodées avec la ', { text: 'Base Adresse Nationale', href: 'https://adresse.data.gouv.fr/' }, '.'],
      },
      {
        title: 'Contours et communes.',
        body: [
          'Contours des départements du projet ',
          { text: 'france-geojson', href: 'https://github.com/gregoiredavid/france-geojson' },
          ", d'après l'IGN ; communes : data.gouv.fr (Licence Ouverte 2.0).",
        ],
      },
    ],
  },
  {
    id: 'legal',
    label: 'Informations légales',
    title: 'Informations légales',
    items: [
      {
        title: 'Service indépendant.',
        body: [
          "AbSante n'est affilié ni à l'Agence du Numérique en Santé ni à l'État. Il ne remplace ni l'annuaire officiel ni un avis médical.",
        ],
      },
      {
        title: 'Données publiques.',
        body: [
          'Les informations proviennent du RPPS et sont reproduites telles que publiées : elles peuvent être incomplètes ou en retard sur la réalité. « Non renseigné » signale une information absente du répertoire.',
        ],
      },
      {
        title: 'Rectification.',
        body: [
          "Elle se fait à la source, auprès de l'ordre ou de l'organisme d'enregistrement du professionnel ; AbSante suit ensuite la mise à jour quotidienne.",
        ],
      },
    ],
  },
  {
    id: 'privacy',
    label: 'Vie privée',
    title: 'Vie privée',
    items: [
      { title: 'Aucun traceur.', body: ["AbSante n'utilise ni cookie ni outil de mesure d'audience."] },
      {
        title: 'Fond de carte.',
        body: ['Les tuiles de la carte sont chargées depuis openstreetmap.org, qui reçoit à ce titre votre adresse IP.'],
      },
    ],
  },
  {
    id: 'about',
    label: 'À propos',
    title: 'À propos d’AbSante',
    items: [
      {
        body: [
          `AbSante est un projet de l'équipe ${TEAM_NAME}. Il permet de rechercher un spécialiste par ville, de voir la densité des professionnels de santé par département et leur répartition, établissement par établissement.`,
        ],
      },
    ],
  },
]
