
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export const LANGUAGE_STORAGE_KEY =
  "project-one-language-preference";

const LANGUAGE_UPDATED_EVENT = "project-one-language-updated";

export const supportedLanguages = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "ar", label: "العربية" },
  { value: "ha", label: "Hausa" },
  { value: "yo", label: "Yorùbá" },
  { value: "ig", label: "Igbo" },
] as const;

export type Language =
  (typeof supportedLanguages)[number]["value"];

const dictionary = {
  en: {
    home: "Home",
    explore: "Explore",
    create: "Create",
    connect: "Connect",
    profile: "Profile",
    messages: "Messages",
    notifications: "Notifications",
    menu: "Menu",
    worlds: "Worlds",
    sports: "Sports",
    social: "Social",
    learn: "Learn",
    career: "Career",
    business: "Business",
    gaming: "Gaming",
    entertainment: "Entertainment",
    communities: "Communities",
    yourWorld: "Your world.",
    yourPeople: "Your people.",
    yourStory: "Your story.",
    tagline: "One platform. Many worlds.",
    language: "Language",
    chooseLanguage: "Choose your preferred language",
    displayLanguage: "Display language",
    languageDescription:
      "Select the language you prefer to use on VYBE.",
    savePreference: "Save preference",
    preferenceSaved: "Your language preference has been saved.",
    saveError: "We couldn't save your preference. Please try again.",
    backToSettings: "Back to settings",
    search: "Search",
  },
  fr: {
    home: "Accueil",
    explore: "Explorer",
    create: "Créer",
    connect: "Se connecter",
    profile: "Profil",
    messages: "Messages",
    notifications: "Notifications",
    menu: "Menu",
    worlds: "Univers",
    sports: "Sports",
    social: "Social",
    learn: "Apprendre",
    career: "Carrière",
    business: "Entreprise",
    gaming: "Jeux",
    entertainment: "Divertissement",
    communities: "Communautés",
    yourWorld: "Votre univers.",
    yourPeople: "Vos proches.",
    yourStory: "Votre histoire.",
    tagline: "Une plateforme. Plusieurs univers.",
    language: "Langue",
    chooseLanguage: "Choisissez votre langue préférée",
    displayLanguage: "Langue d’affichage",
    languageDescription:
      "Choisissez la langue que vous préférez utiliser sur VYBE.",
    savePreference: "Enregistrer la préférence",
    preferenceSaved: "Votre préférence linguistique a été enregistrée.",
    saveError: "Impossible d’enregistrer votre préférence. Réessayez.",
    backToSettings: "Retour aux paramètres",
    search: "Rechercher",
  },
  es: {
    home: "Inicio",
    explore: "Explorar",
    create: "Crear",
    connect: "Conectar",
    profile: "Perfil",
    messages: "Mensajes",
    notifications: "Notificaciones",
    menu: "Menú",
    worlds: "Mundos",
    sports: "Deportes",
    social: "Social",
    learn: "Aprender",
    career: "Carrera",
    business: "Negocios",
    gaming: "Videojuegos",
    entertainment: "Entretenimiento",
    communities: "Comunidades",
    yourWorld: "Tu mundo.",
    yourPeople: "Tu gente.",
    yourStory: "Tu historia.",
    tagline: "Una plataforma. Muchos mundos.",
    language: "Idioma",
    chooseLanguage: "Elige tu idioma preferido",
    displayLanguage: "Idioma de visualización",
    languageDescription:
      "Selecciona el idioma que prefieres usar en VYBE.",
    savePreference: "Guardar preferencia",
    preferenceSaved: "Tu preferencia de idioma se ha guardado.",
    saveError: "No se pudo guardar tu preferencia. Inténtalo de nuevo.",
    backToSettings: "Volver a configuración",
    search: "Buscar",
  },
  pt: {
    home: "Início",
    explore: "Explorar",
    create: "Criar",
    connect: "Conectar",
    profile: "Perfil",
    messages: "Mensagens",
    notifications: "Notificações",
    menu: "Menu",
    worlds: "Mundos",
    sports: "Desporto",
    social: "Social",
    learn: "Aprender",
    career: "Carreira",
    business: "Negócios",
    gaming: "Jogos",
    entertainment: "Entretenimento",
    communities: "Comunidades",
    yourWorld: "O seu mundo.",
    yourPeople: "As suas pessoas.",
    yourStory: "A sua história.",
    tagline: "Uma plataforma. Muitos mundos.",
    language: "Idioma",
    chooseLanguage: "Escolha seu idioma preferido",
    displayLanguage: "Idioma de exibição",
    languageDescription:
      "Selecione o idioma que prefere usar no VYBE.",
    savePreference: "Salvar preferência",
    preferenceSaved: "Sua preferência de idioma foi salva.",
    saveError: "Não foi possível salvar sua preferência. Tente novamente.",
    backToSettings: "Voltar às configurações",
    search: "Pesquisar",
  },
  ar: {
    home: "الرئيسية",
    explore: "استكشاف",
    create: "إنشاء",
    connect: "تواصل",
    profile: "الملف الشخصي",
    messages: "الرسائل",
    notifications: "الإشعارات",
    menu: "القائمة",
    worlds: "العوالم",
    sports: "الرياضة",
    social: "اجتماعي",
    learn: "التعلم",
    career: "المهنة",
    business: "الأعمال",
    gaming: "الألعاب",
    entertainment: "الترفيه",
    communities: "المجتمعات",
    yourWorld: "عالمك.",
    yourPeople: "أشخاصك.",
    yourStory: "قصتك.",
    tagline: "منصة واحدة. عوالم متعددة.",
    language: "اللغة",
    chooseLanguage: "اختر لغتك المفضلة",
    displayLanguage: "لغة العرض",
    languageDescription:
      "اختر اللغة التي تفضل استخدامها على VYBE.",
    savePreference: "حفظ التفضيل",
    preferenceSaved: "تم حفظ تفضيل اللغة.",
    saveError: "تعذر حفظ تفضيلك. حاول مرة أخرى.",
    backToSettings: "العودة إلى الإعدادات",
    search: "بحث",
  },
  ha: {
    home: "Gida",
    explore: "Bincika",
    create: "Ƙirƙira",
    connect: "Haɗuwa",
    profile: "Bayanan martaba",
    messages: "Saƙonni",
    notifications: "Sanarwa",
    menu: "Menu",
    worlds: "Duniyoyi",
    sports: "Wasanni",
    social: "Zamantakewa",
    learn: "Koyo",
    career: "Sana'a",
    business: "Kasuwanci",
    gaming: "Wasannin kwamfuta",
    entertainment: "Nishaɗi",
    communities: "Al'ummomi",
    yourWorld: "Duniyarka.",
    yourPeople: "Mutanenka.",
    yourStory: "Labarinka.",
    tagline: "Dandali ɗaya. Duniyoyi da yawa.",
    language: "Harshe",
    chooseLanguage: "Zaɓi harshen da ka fi so",
    displayLanguage: "Harshen nuni",
    languageDescription:
      "Zaɓi harshen da ka fi so amfani da shi a VYBE.",
    savePreference: "Ajiye zaɓi",
    preferenceSaved: "An ajiye zaɓin harshenka.",
    saveError: "Ba a iya ajiye zaɓinka ba. Sake gwadawa.",
    backToSettings: "Komawa saituna",
    search: "Bincika",
  },
  yo: {
    home: "Ilé",
    explore: "Ṣàwárí",
    create: "Ṣẹ̀dá",
    connect: "Sopọ̀",
    profile: "Àkọọ́lẹ̀",
    messages: "Ìránṣẹ́",
    notifications: "Àwọn ìfitónilétí",
    menu: "Àkójọ",
    worlds: "Àwọn ayé",
    sports: "Eré ìdárayá",
    social: "Àwùjọ",
    learn: "Kọ́ ẹ̀kọ́",
    career: "Iṣẹ́",
    business: "Òwò",
    gaming: "Eré",
    entertainment: "Ìdárayá",
    communities: "Àwọn àwùjọ",
    yourWorld: "Ayé rẹ.",
    yourPeople: "Àwọn ènìyàn rẹ.",
    yourStory: "Ìtàn rẹ.",
    tagline: "Pẹpẹ kan. Ọ̀pọ̀ ayé.",
    language: "Èdè",
    chooseLanguage: "Yan èdè tí o fẹ́ràn",
    displayLanguage: "Èdè ìfihàn",
    languageDescription:
      "Yan èdè tí o fẹ́ lò lórí VYBE.",
    savePreference: "Fi àṣàyàn pamọ́",
    preferenceSaved: "A ti fi àṣàyàn èdè rẹ pamọ́.",
    saveError: "A kò lè fi àṣàyàn rẹ pamọ́. Jọ̀wọ́ tún gbìyànjú.",
    backToSettings: "Padà sí àwọn ètò",
    search: "Ṣàwárí",
  },
  ig: {
    home: "Ụlọ",
    explore: "Chọpụta",
    create: "Mepụta",
    connect: "Jikọọ",
    profile: "Profaịlụ",
    messages: "Ozi",
    notifications: "Ọkwa",
    menu: "Nchịkọta",
    worlds: "Ụwa",
    sports: "Egwuregwu",
    social: "Mmekọrịta",
    learn: "Mụta",
    career: "Ọrụ",
    business: "Azụmahịa",
    gaming: "Egwuregwu kọmputa",
    entertainment: "Ntụrụndụ",
    communities: "Obodo",
    yourWorld: "Ụwa gị.",
    yourPeople: "Ndị gị.",
    yourStory: "Akụkọ gị.",
    tagline: "Otu ikpo okwu. Ọtụtụ ụwa.",
    language: "Asụsụ",
    chooseLanguage: "Họrọ asụsụ masịrị gị",
    displayLanguage: "Asụsụ ngosi",
    languageDescription:
      "Họrọ asụsụ ịchọrọ iji na VYBE.",
    savePreference: "Chekwa nhọrọ",
    preferenceSaved: "Echekwala nhọrọ asụsụ gị.",
    saveError: "Anyị enweghị ike ichekwa nhọrọ gị. Biko nwaa ọzọ.",
    backToSettings: "Laghachi na ntọala",
    search: "Chọọ",
  },
} as const;

export type TranslationKey = keyof typeof dictionary.en;

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext =
  createContext<LanguageContextType | null>(null);

function isLanguage(value: string | null): value is Language {
  return supportedLanguages.some(
    (item) => item.value === value
  );
}

function getSavedLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  try {
    const saved = window.localStorage.getItem(
      LANGUAGE_STORAGE_KEY
    );

    return isLanguage(saved) ? saved : "en";
  } catch {
    return "en";
  }
}

function subscribeToLanguage(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", callback);
  window.addEventListener(LANGUAGE_UPDATED_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(
      LANGUAGE_UPDATED_EVENT,
      callback
    );
  };
}

function getLanguageSnapshot(): Language {
  return getSavedLanguage();
}

function getServerLanguageSnapshot(): Language {
  return "en";
}

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getLanguageSnapshot,
    getServerLanguageSnapshot
  );

  const setLanguage = useCallback((nextLanguage: Language) => {
    try {
      window.localStorage.setItem(
        LANGUAGE_STORAGE_KEY,
        nextLanguage
      );

      window.dispatchEvent(
        new Event(LANGUAGE_UPDATED_EVENT)
      );
    } catch (error) {
      console.error(
        "Could not save language preference:",
        error
      );
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir =
      language === "ar" ? "rtl" : "ltr";
  }, [language]);

  const t = useCallback(
    (key: TranslationKey) => dictionary[language][key],
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside a LanguageProvider."
    );
  }

  return context;
}
