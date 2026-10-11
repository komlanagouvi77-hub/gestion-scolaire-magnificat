// src/components/IconesSidebar.jsx
// Icones simples (trait fin, style Lucide) pour la barre laterale.
function Icone({ enfants }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {enfants}
    </svg>
  );
}

export const IconeGrille = () => <Icone enfants={<><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></>} />;
export const IconeEleves = () => <Icone enfants={<><circle cx="9" cy="8" r="3.2"></circle><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6"></path><circle cx="17.5" cy="8.5" r="2.3"></circle><path d="M15.5 14.2c2.7 0.4 5 2.4 5 5.8"></path></>} />;
export const IconeCasquette = () => <Icone enfants={<><path d="M2 9l10-5 10 5-10 5-10-5Z"></path><path d="M6 11.5v4c0 1.7 2.7 3 6 3s6-1.3 6-3v-4"></path><path d="M22 9v6"></path></>} />;
export const IconeCalendrier = () => <Icone enfants={<><rect x="3" y="4.5" width="18" height="16" rx="2"></rect><path d="M3 9.5h18"></path><path d="M8 2.5v4M16 2.5v4"></path></>} />;
export const IconeCarnet = () => <Icone enfants={<><path d="M4 4h13a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4Z"></path><path d="M4 4v14a2 2 0 0 0 2 2h13"></path><path d="M8 9h7M8 12.5h5"></path></>} />;
export const IconePresseCahier = () => <Icone enfants={<><rect x="5" y="3.5" width="14" height="17" rx="2"></rect><path d="M9 3.5V6h6V3.5"></path><path d="M8.5 11.5l2 2 4-4.5"></path><path d="M8 16h8"></path></>} />;
export const IconeMedaille = () => <Icone enfants={<><circle cx="12" cy="9" r="5.5"></circle><path d="M9 13.5 7.5 21l4.5-2.5 4.5 2.5-1.5-7.5"></path></>} />;
export const IconeBouclier = () => <Icone enfants={<path d="M12 2.5 4 6v6c0 5 3.4 8.4 8 9.5 4.6-1.1 8-4.5 8-9.5V6l-8-3.5Z"></path>} />;
export const IconeDossier = () => <Icone enfants={<path d="M3 6.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11Z"></path>} />;
export const IconeCarte = () => <Icone enfants={<><rect x="2.5" y="5.5" width="19" height="13" rx="2"></rect><path d="M2.5 10h19"></path></>} />;
export const IconeCle = () => <Icone enfants={<><circle cx="8" cy="15.5" r="4"></circle><path d="M11 12.5 20 3.5"></path><path d="M16.5 8 19 5.5M13.5 11l2 2"></path></>} />;
export const IconePersonne = () => <Icone enfants={<><circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"></path></>} />;
export const IconeHorloge = () => <Icone enfants={<><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3.5 2"></path></>} />;
export const IconeEngrenage = () => <Icone enfants={<><circle cx="12" cy="12" r="3.2"></circle><path d="M12 2.5v3M12 18.5v3M4.2 6.2l2.1 2.1M17.7 15.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 17.8l2.1-2.1M17.7 8.3l2.1-2.1"></path></>} />;
export const IconeAnnonce = () => <Icone enfants={<><path d="M3 11v2a2 2 0 0 0 2 2h1l3 4v-4h8.5a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 17.5 5H5a2 2 0 0 0-2 2v4Z"></path></>} />;
export const IconeImport = () => <Icone enfants={<><path d="M12 3v12"></path><path d="M7 10l5 5 5-5"></path><path d="M4 19h16"></path></>} />;
export const IconeDeconnexion = () => <Icone enfants={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><path d="M16 17l5-5-5-5"></path><path d="M21 12H9"></path></>} />;
export const IconeFleche = () => <Icone enfants={<path d="M15 18l-6-6 6-6"></path>} />;
export const IconeMenu = () => <Icone enfants={<><path d="M3 6h18"></path><path d="M3 12h18"></path><path d="M3 18h18"></path></>} />;