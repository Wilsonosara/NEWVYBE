
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage, type Language } from "../LanguageProvider";
import { usePosts } from "../PostContext";
import { createClient } from "../../../../utils/supabase/client";

type Notification = {
  id: number;
  type: string;
  icon: string;
  user: string;
  action: string;
  detail: string;
  time: string;
  unread: boolean;
  avatar?: string;
  thumbnail?: string;
  followedBack?: boolean;
  postId?: number;
  actorId?: string;
  databaseId?: number;
  databaseIds?: number[];
  messageCount?: number;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type DatabaseNotification = {
  id: number;
  user_id: string;
  actor_id: string | null;
  type: string;
  message_id: number | null;
  post_id: number | null;
  comment_id: number | null;
  message: string | null;
  read_at: string | null;
  created_at: string;
};

type Preferences = {
  likes_comments: boolean;
  follows: boolean;
  messages: boolean;
  mentions: boolean;
};

const STORAGE_KEY = "project-one-notifications";
const REMOVED_FAKE_ACTORS = new Set([
  "davidokafor",
  "chiomajames",
  "tundebello",
  "amaraokafor",
  "danieljames",
]);

function isRemovedFakeActor(name: string | null | undefined) {
  return REMOVED_FAKE_ACTORS.has(
    (name ?? "").toLowerCase().replace(/^@/, "").replace(/[^a-z0-9]/g, "")
  );
}

const DEFAULT_PREFERENCES: Preferences = {
  likes_comments: true,
  follows: true,
  messages: true,
  mentions: true,
};

const initialNotifications: Notification[] = [];

const translations: Record<Language, Record<string, string>> = {
  en: {
    title: "Notifications",
    subtitle: "Stay connected with your community.",
    backHome: "Back home",
    activity: "Your activity",
    unread: "unread",
    notification: "notification",
    notifications: "notifications",
    markAll: "Mark all as read",
    all: "All",
    following: "Following",
    preferencesError:
      "Your notification preferences could not be loaded. Default settings are being used.",
    databaseError:
      "Some notifications could not be loaded. Check the browser console for the Supabase error.",
    loading: "Loading notifications...",
    caughtUp: "You're all caught up!",
    empty: "New activity from your community will appear here.",
    justNow: "Just now",
    minuteAgo: "{n} min ago",
    hourAgo: "{n} hr ago",
    hoursAgo: "{n} hrs ago",
    yesterday: "Yesterday",
    daysAgo: "{n} days ago",
    defaultUser: "A VYBE user",
    liked: "liked your post.",
    commented: "commented on your post.",
    followed: "started following you.",
    mentioned: "mentioned you in a post.",
    privateMessage: "sent you a private message.",
    privateMessages: "sent you private messages.",
    message: "message",
    messages: "messages",
    openConversation: "Open Conversation",
    followBack: "Follow Back",
    followingButton: "Following",
    viewPost: "View Post",
    viewRelatedPost: "View related post",
    unreadLabel: "Unread",
    openNotification: "Open {name}'s notification",
    missingPost:
      "This notification does not have a linked post yet. You can still find the post in your feed.",
    brand: "VYBE · One platform. Many worlds.",
    followError: "Could not update your follow status. Please try again.",
  },
  fr: {
    title: "Notifications",
    subtitle: "Restez connecté à votre communauté.",
    backHome: "Retour à l’accueil",
    activity: "Votre activité",
    unread: "non lue(s)",
    notification: "notification",
    notifications: "notifications",
    markAll: "Tout marquer comme lu",
    all: "Tout",
    following: "Abonnements",
    preferencesError:
      "Impossible de charger vos préférences de notification. Les paramètres par défaut sont utilisés.",
    databaseError:
      "Certaines notifications n’ont pas pu être chargées. Consultez la console du navigateur pour voir l’erreur Supabase.",
    loading: "Chargement des notifications...",
    caughtUp: "Vous êtes à jour !",
    empty: "Les nouvelles activités de votre communauté apparaîtront ici.",
    justNow: "À l’instant",
    minuteAgo: "Il y a {n} min",
    hourAgo: "Il y a {n} h",
    hoursAgo: "Il y a {n} h",
    yesterday: "Hier",
    daysAgo: "Il y a {n} jours",
    defaultUser: "Un utilisateur de VYBE",
    liked: "a aimé votre publication.",
    commented: "a commenté votre publication.",
    followed: "a commencé à vous suivre.",
    mentioned: "vous a mentionné dans une publication.",
    privateMessage: "vous a envoyé un message privé.",
    privateMessages: "vous a envoyé des messages privés.",
    message: "message",
    messages: "messages",
    openConversation: "Ouvrir la conversation",
    followBack: "Suivre en retour",
    followingButton: "Abonné(e)",
    viewPost: "Voir la publication",
    viewRelatedPost: "Voir la publication associée",
    unreadLabel: "Non lue",
    openNotification: "Ouvrir la notification de {name}",
    missingPost:
      "Cette notification n’est pas encore liée à une publication. Vous pouvez toujours la retrouver dans votre fil.",
    brand: "VYBE · Une plateforme. Plusieurs univers.",
    followError:
      "Impossible de modifier votre abonnement. Veuillez réessayer.",
  },
  es: {
    title: "Notificaciones",
    subtitle: "Mantente conectado con tu comunidad.",
    backHome: "Volver al inicio",
    activity: "Tu actividad",
    unread: "sin leer",
    notification: "notificación",
    notifications: "notificaciones",
    markAll: "Marcar todo como leído",
    all: "Todas",
    following: "Seguidos",
    preferencesError:
      "No se pudieron cargar tus preferencias de notificaciones. Se usarán los ajustes predeterminados.",
    databaseError:
      "No se pudieron cargar algunas notificaciones. Consulta la consola del navegador para ver el error de Supabase.",
    loading: "Cargando notificaciones...",
    caughtUp: "¡Estás al día!",
    empty: "Aquí aparecerá la nueva actividad de tu comunidad.",
    justNow: "Ahora mismo",
    minuteAgo: "Hace {n} min",
    hourAgo: "Hace {n} h",
    hoursAgo: "Hace {n} h",
    yesterday: "Ayer",
    daysAgo: "Hace {n} días",
    defaultUser: "Un usuario de VYBE",
    liked: "le ha gustado tu publicación.",
    commented: "ha comentado tu publicación.",
    followed: "ha comenzado a seguirte.",
    mentioned: "te ha mencionado en una publicación.",
    privateMessage: "te ha enviado un mensaje privado.",
    privateMessages: "te ha enviado mensajes privados.",
    message: "mensaje",
    messages: "mensajes",
    openConversation: "Abrir conversación",
    followBack: "Seguir también",
    followingButton: "Siguiendo",
    viewPost: "Ver publicación",
    viewRelatedPost: "Ver publicación relacionada",
    unreadLabel: "Sin leer",
    openNotification: "Abrir la notificación de {name}",
    missingPost:
      "Esta notificación todavía no tiene una publicación vinculada. Puedes encontrarla en tu feed.",
    brand: "VYBE · Una plataforma. Muchos mundos.",
    followError:
      "No se pudo actualizar tu seguimiento. Inténtalo de nuevo.",
  },
  pt: {
    title: "Notificações",
    subtitle: "Mantenha-se conectado à sua comunidade.",
    backHome: "Voltar ao início",
    activity: "Sua atividade",
    unread: "não lida(s)",
    notification: "notificação",
    notifications: "notificações",
    markAll: "Marcar todas como lidas",
    all: "Todas",
    following: "Seguindo",
    preferencesError:
      "Não foi possível carregar suas preferências de notificação. As configurações padrão serão usadas.",
    databaseError:
      "Algumas notificações não puderam ser carregadas. Consulte o console do navegador para ver o erro do Supabase.",
    loading: "Carregando notificações...",
    caughtUp: "Você está em dia!",
    empty: "Novas atividades da sua comunidade aparecerão aqui.",
    justNow: "Agora mesmo",
    minuteAgo: "Há {n} min",
    hourAgo: "Há {n} h",
    hoursAgo: "Há {n} h",
    yesterday: "Ontem",
    daysAgo: "Há {n} dias",
    defaultUser: "Um usuário do VYBE",
    liked: "curtiu sua publicação.",
    commented: "comentou sua publicação.",
    followed: "começou a seguir você.",
    mentioned: "mencionou você em uma publicação.",
    privateMessage: "enviou uma mensagem privada para você.",
    privateMessages: "enviou mensagens privadas para você.",
    message: "mensagem",
    messages: "mensagens",
    openConversation: "Abrir conversa",
    followBack: "Seguir de volta",
    followingButton: "Seguindo",
    viewPost: "Ver publicação",
    viewRelatedPost: "Ver publicação relacionada",
    unreadLabel: "Não lida",
    openNotification: "Abrir a notificação de {name}",
    missingPost:
      "Esta notificação ainda não está vinculada a uma publicação. Você pode encontrá-la no seu feed.",
    brand: "VYBE · Uma plataforma. Muitos mundos.",
    followError:
      "Não foi possível atualizar seu status de seguimento. Tente novamente.",
  },
  ar: {
    title: "الإشعارات",
    subtitle: "ابقَ على تواصل مع مجتمعك.",
    backHome: "العودة إلى الرئيسية",
    activity: "نشاطك",
    unread: "غير مقروء",
    notification: "إشعار",
    notifications: "إشعارات",
    markAll: "تحديد الكل كمقروء",
    all: "الكل",
    following: "المتابَعون",
    preferencesError:
      "تعذّر تحميل تفضيلات الإشعارات. سيتم استخدام الإعدادات الافتراضية.",
    databaseError:
      "تعذّر تحميل بعض الإشعارات. تحقق من وحدة تحكم المتصفح لمعرفة خطأ Supabase.",
    loading: "جارٍ تحميل الإشعارات...",
    caughtUp: "لقد اطلعت على كل شيء!",
    empty: "سيظهر هنا النشاط الجديد من مجتمعك.",
    justNow: "الآن",
    minuteAgo: "قبل {n} دقيقة",
    hourAgo: "قبل {n} ساعة",
    hoursAgo: "قبل {n} ساعات",
    yesterday: "أمس",
    daysAgo: "قبل {n} أيام",
    defaultUser: "مستخدم في VYBE",
    liked: "أُعجب بمنشورك.",
    commented: "علّق على منشورك.",
    followed: "بدأ بمتابعتك.",
    mentioned: "أشار إليك في منشور.",
    privateMessage: "أرسل إليك رسالة خاصة.",
    privateMessages: "أرسل إليك رسائل خاصة.",
    message: "رسالة",
    messages: "رسائل",
    openConversation: "فتح المحادثة",
    followBack: "متابعة بالمثل",
    followingButton: "تتابعه",
    viewPost: "عرض المنشور",
    viewRelatedPost: "عرض المنشور المرتبط",
    unreadLabel: "غير مقروء",
    openNotification: "فتح إشعار {name}",
    missingPost:
      "لا يرتبط هذا الإشعار بمنشور حتى الآن. يمكنك العثور على المنشور في موجزك.",
    brand: "VYBE · منصة واحدة. عوالم متعددة.",
    followError: "تعذّر تحديث حالة المتابعة. يرجى المحاولة مرة أخرى.",
  },
  ha: {
    title: "Sanarwa",
    subtitle: "Ka ci gaba da kasancewa tare da al'ummarka.",
    backHome: "Komawa gida",
    activity: "Ayyukanka",
    unread: "ba a karanta ba",
    notification: "sanarwa",
    notifications: "sanarwa",
    markAll: "Alama duk an karanta",
    all: "Duka",
    following: "Waɗanda kake bi",
    preferencesError:
      "Ba a iya ɗauko saitunan sanarwarka ba. Ana amfani da saitunan tsoho.",
    databaseError:
      "Ba a iya ɗauko wasu sanarwa ba. Duba console na burauza don ganin kuskuren Supabase.",
    loading: "Ana ɗauko sanarwa...",
    caughtUp: "Ka gama duba duk sanarwarka!",
    empty: "Sabbin ayyukan al'ummarka za su bayyana a nan.",
    justNow: "Yanzu-yanzu",
    minuteAgo: "Mintuna {n} da suka wuce",
    hourAgo: "Sa'o'i {n} da suka wuce",
    hoursAgo: "Sa'o'i {n} da suka wuce",
    yesterday: "Jiya",
    daysAgo: "Kwanaki {n} da suka wuce",
    defaultUser: "Mai amfani da VYBE",
    liked: "ya/ta so rubutunka.",
    commented: "ya/ta yi sharhi a rubutunka.",
    followed: "ya/ta fara bin ka.",
    mentioned: "ya/ta ambace ka a rubutu.",
    privateMessage: "ya/ta aiko maka da saƙon sirri.",
    privateMessages: "ya/ta aiko maka da saƙonnin sirri.",
    message: "saƙo",
    messages: "saƙonni",
    openConversation: "Buɗe tattaunawa",
    followBack: "Bi shi/ta baya",
    followingButton: "Kana bi",
    viewPost: "Duba rubutu",
    viewRelatedPost: "Duba rubutun da ya shafi wannan",
    unreadLabel: "Ba a karanta ba",
    openNotification: "Buɗe sanarwar {name}",
    missingPost:
      "Ba a haɗa wannan sanarwa da wani rubutu ba tukuna. Za ka iya samun rubutun a shafinka na labarai.",
    brand: "VYBE · Dandali ɗaya. Duniyoyi da yawa.",
    followError: "Ba a iya sabunta bin mai amfani ba. Sake gwadawa.",
  },
  yo: {
    title: "Àwọn ìfitónilétí",
    subtitle: "Máa bá àwùjọ rẹ sọ̀rọ̀, kí o sì wà ní ìbáṣepọ̀.",
    backHome: "Padà sí ojúlé",
    activity: "Ìṣe rẹ",
    unread: "tí a kò tíì kà",
    notification: "ìfitónilétí",
    notifications: "ìfitónilétí",
    markAll: "Sàmì sí gbogbo rẹ̀ pé a ti kà á",
    all: "Gbogbo",
    following: "Àwọn tí o ń tẹ̀lé",
    preferencesError:
      "A kò lè ṣí àwọn àyànfẹ́ ìfitónilétí rẹ. A ń lo àwọn ètò àkọ́kọ́.",
    databaseError:
      "A kò lè ṣí àwọn ìfitónilétí kan. Ṣàyẹ̀wò console aṣàwákiri fún àṣìṣe Supabase.",
    loading: "Ń ṣí àwọn ìfitónilétí...",
    caughtUp: "O ti rí gbogbo ìfitónilétí rẹ!",
    empty: "Ìṣe tuntun láti ọ̀dọ̀ àwùjọ rẹ yóò hàn níbí.",
    justNow: "Ní báyìí",
    minuteAgo: "Ìṣẹ́jú {n} sẹ́yìn",
    hourAgo: "Wákàtí {n} sẹ́yìn",
    hoursAgo: "Wákàtí {n} sẹ́yìn",
    yesterday: "Àná",
    daysAgo: "Ọjọ́ {n} sẹ́yìn",
    defaultUser: "Olùlò VYBE",
    liked: "fẹ́ràn ìfìwéránṣẹ́ rẹ.",
    commented: "sọ̀rọ̀ lórí ìfìwéránṣẹ́ rẹ.",
    followed: "bẹ̀rẹ̀ sí í tẹ̀lé ọ.",
    mentioned: "sọ orúkọ rẹ nínú ìfìwéránṣẹ́ kan.",
    privateMessage: "ránṣẹ́ àdáni sí ọ.",
    privateMessages: "rán àwọn ìfiránṣẹ́ àdáni sí ọ.",
    message: "ìfiránṣẹ́",
    messages: "àwọn ìfiránṣẹ́",
    openConversation: "Ṣí ìjíròrò",
    followBack: "Tẹ̀lé e padà",
    followingButton: "O ń tẹ̀lé e",
    viewPost: "Wo ìfìwéránṣẹ́",
    viewRelatedPost: "Wo ìfìwéránṣẹ́ tó jọ mọ́ ọn",
    unreadLabel: "A kò tíì kà á",
    openNotification: "Ṣí ìfitónilétí {name}",
    missingPost:
      "A kò tíì so ìfitónilétí yìí mọ́ ìfìwéránṣẹ́ kan. O ṣì lè rí i nínú àkójọ ìfìwéránṣẹ́ rẹ.",
    brand: "VYBE · Pẹpẹ kan. Ọ̀pọ̀ ayé.",
    followError:
      "A kò lè ṣe àtúnṣe ìtẹ̀lé rẹ. Jọ̀wọ́ tún gbìyànjú.",
  },
  ig: {
    title: "Ọkwa",
    subtitle: "Nọgide na ndị obodo gị na-akpakọrịta.",
    backHome: "Laghachi n'ụlọ",
    activity: "Ihe omume gị",
    unread: "agụghị",
    notification: "ọkwa",
    notifications: "ọkwa",
    markAll: "Kaa ha niile dị ka agụrụla",
    all: "Ha niile",
    following: "Ndị ị na-eso",
    preferencesError:
      "Enweghị ike ibudata nhọrọ ọkwa gị. A na-eji ntọala ndabara.",
    databaseError:
      "Enweghị ike ibudata ụfọdụ ọkwa. Lelee console ihe nchọgharị maka njehie Supabase.",
    loading: "A na-ebudata ọkwa...",
    caughtUp: "Ị gụọla ihe niile!",
    empty: "Ihe omume ọhụrụ sitere n'obodo gị ga-apụta ebe a.",
    justNow: "Ugbu a",
    minuteAgo: "Nkeji {n} gara aga",
    hourAgo: "Elekere {n} gara aga",
    hoursAgo: "Elekere {n} gara aga",
    yesterday: "Ụnyaahụ",
    daysAgo: "Ụbọchị {n} gara aga",
    defaultUser: "Onye ọrụ VYBE",
    liked: "hụrụ post gị n'anya.",
    commented: "kwuru okwu na post gị.",
    followed: "malitere iso gị.",
    mentioned: "kpọtụrụ gị na post.",
    privateMessage: "zigara gị ozi nzuzo.",
    privateMessages: "zigara gị ozi nzuzo dị iche iche.",
    message: "ozi",
    messages: "ozi",
    openConversation: "Mepee mkparịta ụka",
    followBack: "Sokwa ya",
    followingButton: "Ị na-eso ya",
    viewPost: "Lee post",
    viewRelatedPost: "Lee post metụtara ya",
    unreadLabel: "Agụghị",
    openNotification: "Mepee ọkwa {name}",
    missingPost:
      "Ejikọbeghị ọkwa a na post. Ị ka nwere ike ịchọta post ahụ na ndepụta gị.",
    brand: "VYBE · Otu ikpo okwu. Ọtụtụ ụwa.",
    followError:
      "Enweghị ike imelite ọnọdụ iso onye a. Biko nwaa ọzọ.",
  },
};

function notifyLayout() {
  window.dispatchEvent(new Event("project-one-notifications-updated"));
}

function formatTime(
  dateString: string,
  language: Language,
  t: (key: string) => string
) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  );

  if (seconds < 60) return t("justNow");

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return t("minuteAgo").replace("{n}", String(minutes));
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    const key = hours === 1 ? "hourAgo" : "hoursAgo";
    return t(key).replace("{n}", String(hours));
  }

  const days = Math.floor(hours / 24);

  if (days === 1) return t("yesterday");

  if (days < 7) {
    return t("daysAgo").replace("{n}", String(days));
  }

  const locale: Record<Language, string> = {
    en: "en",
    fr: "fr-FR",
    es: "es-ES",
    pt: "pt-PT",
    ar: "ar",
    ha: "ha",
    yo: "yo",
    ig: "ig",
  };

  return date.toLocaleDateString(locale[language] ?? "en");
}

function getNotificationIcon(type: string) {
  if (type === "like") return "heart";
  if (type === "comment" || type === "message") return "message";
  if (type === "follow") return "user-plus";
  if (type === "mention") return "mention";
  return "bell";
}

function getActorName(profile: Profile | undefined, fallback: string) {
  return (
    profile?.display_name ||
    (profile?.username ? `@${profile.username}` : "") ||
    fallback
  );
}

function isNotificationEnabled(type: string, preferences: Preferences) {
  switch (type.toLowerCase()) {
    case "like":
    case "comment":
      return preferences.likes_comments;
    case "follow":
      return preferences.follows;
    case "message":
      return preferences.messages;
    case "mention":
      return preferences.mentions;
    default:
      return true;
  }
}

function NotificationIcon({ type }: { type: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (type === "like") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" {...common}>
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
      </svg>
    );
  }

  if (type === "comment" || type === "message") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" {...common}>
        <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8Z" />
      </svg>
    );
  }

  if (type === "follow") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M19 8v6M16 11h6" />
      </svg>
    );
  }

  if (type === "mention") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" {...common}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="M16 12v2a2 2 0 0 0 4 0v-2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" {...common}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

function Avatar({ name, src }: { name: string; src?: string }) {
  const [imageFailed, setImageFailed] = useState(false);

  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (src && !imageFailed) {
    return (
      <Image
        src={src}
        alt={name}
        width={52}
        height={52}
        unoptimized
        className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-gray-200 sm:h-13 sm:w-13"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-700 sm:h-13 sm:w-13">
      {initials || "?"}
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { posts } = usePosts();
  const { language } = useLanguage();
  const c = translations[language] ?? translations.en;

  const t = useCallback(
    (key: string) => c[key] ?? translations.en[key] ?? key,
    [c]
  );

  const supabase = useMemo(() => createClient(), []);

  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);
  const [databaseNotifications, setDatabaseNotifications] =
    useState<Notification[]>([]);
  const [messageNotifications, setMessageNotifications] =
    useState<Notification[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [preferences, setPreferences] =
    useState<Preferences>(DEFAULT_PREFERENCES);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const [filter, setFilter] = useState("All");
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [databaseError, setDatabaseError] = useState("");

  const loadPreferences = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("likes_comments, follows, messages, mentions")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Could not load notification preferences:", error);
        setPreferencesError(t("preferencesError"));
        setPreferences(DEFAULT_PREFERENCES);
        setPreferencesLoaded(true);
        return;
      }

      if (data) {
        setPreferences({
          likes_comments: data.likes_comments,
          follows: data.follows,
          messages: data.messages,
          mentions: data.mentions,
        });
      } else {
        setPreferences(DEFAULT_PREFERENCES);
      }

      setPreferencesError("");
      setPreferencesLoaded(true);
    },
    [supabase, t]
  );

  const loadDatabaseNotifications = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id,user_id,actor_id,type,message_id,post_id,comment_id,message,read_at,created_at"
        )
        .eq("user_id", userId)
        .neq("type", "message")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Could not load activity notifications:", error);
        setDatabaseError(error.message);
        return;
      }

      const rows = (data ?? []) as DatabaseNotification[];

      const actorIds = [
        ...new Set(
          rows
            .map((row) => row.actor_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const profileMap = new Map<string, Profile>();

      if (actorIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id,username,display_name,avatar_url")
          .in("id", actorIds);

        if (profileError) {
          console.error("Could not load notification profiles:", profileError);
        } else {
          for (const profile of (profiles ?? []) as Profile[]) {
            profileMap.set(profile.id, profile);
          }
        }
      }

      const followedIds = new Set<string>();

      if (actorIds.length > 0) {
        const { data: followRows, error: followError } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", userId)
          .in("following_id", actorIds);

        if (followError) {
          console.error("Could not load follow status:", followError);
        } else {
          for (const row of followRows ?? []) {
            followedIds.add(row.following_id);
          }
        }
      }

      const mapped: Notification[] = rows.flatMap((row) => {
        const profile = row.actor_id
          ? profileMap.get(row.actor_id)
          : undefined;

        if (
          isRemovedFakeActor(profile?.display_name) ||
          isRemovedFakeActor(profile?.username)
        ) {
          return [];
        }

        const type = row.type.toLowerCase();

        let action = row.message ?? "";

        if (type === "like") action = t("liked");
        if (type === "comment") action = t("commented");
        if (type === "follow") action = t("followed");
        if (type === "mention") action = t("mentioned");

        return [{
          id: -row.id,
          databaseId: row.id,
          actorId: row.actor_id ?? undefined,
          type,
          icon: getNotificationIcon(type),
          user: getActorName(profile, t("defaultUser")),
          action,
          detail:
            type === "comment"
              ? row.message && row.message !== "commented on your post"
                ? row.message
                : ""
              : "",
          time: formatTime(row.created_at, language, t),
          unread: !row.read_at,
          avatar: profile?.avatar_url ?? undefined,
          postId: row.post_id ?? undefined,
          followedBack: row.actor_id
            ? followedIds.has(row.actor_id)
            : false,
        }];
      });

      setDatabaseNotifications(mapped);
      setDatabaseError("");
    },
    [supabase, language, t]
  );

  const loadMessageNotifications = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id,user_id,actor_id,type,message_id,post_id,comment_id,message,read_at,created_at"
        )
        .eq("user_id", userId)
        .eq("type", "message")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Could not load message notifications:", error);
        setDatabaseError(error.message);
        return;
      }

      const rows = (data ?? []) as DatabaseNotification[];

      const actorIds = [
        ...new Set(
          rows
            .map((row) => row.actor_id)
            .filter((id): id is string => Boolean(id))
        ),
      ];

      const profileMap = new Map<string, Profile>();

      if (actorIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id,username,display_name,avatar_url")
          .in("id", actorIds);

        if (profileError) {
          console.error(
            "Could not load message sender profiles:",
            profileError
          );
        } else {
          for (const profile of (profiles ?? []) as Profile[]) {
            profileMap.set(profile.id, profile);
          }
        }
      }

      const grouped = new Map<string, DatabaseNotification[]>();

      for (const row of rows) {
        const actorProfile = row.actor_id
          ? profileMap.get(row.actor_id)
          : undefined;

        if (
          isRemovedFakeActor(actorProfile?.display_name) ||
          isRemovedFakeActor(actorProfile?.username)
        ) {
          continue;
        }

        const senderKey = row.actor_id ?? `unknown-${row.id}`;
        const existing = grouped.get(senderKey) ?? [];
        existing.push(row);
        grouped.set(senderKey, existing);
      }

      const mapped: Notification[] = Array.from(grouped.entries()).map(
        ([, senderRows]) => {
          const latest = senderRows[0];
          const profile = latest.actor_id
            ? profileMap.get(latest.actor_id)
            : undefined;

          const unreadMessages = senderRows.filter(
            (row) => !row.read_at
          ).length;

          return {
            id: -latest.id,
            databaseId: latest.id,
            databaseIds: senderRows.map((row) => row.id),
            actorId: latest.actor_id ?? undefined,
            type: "message",
            icon: "message",
            user: getActorName(profile, t("defaultUser")),
            action:
              unreadMessages > 0
                ? t("privateMessages")
                : t("privateMessage"),
            detail: latest.message ?? "",
            time: formatTime(latest.created_at, language, t),
            unread: unreadMessages > 0,
            avatar: profile?.avatar_url ?? undefined,
            messageCount: senderRows.length,
          };
        }
      );

      setMessageNotifications(mapped);
      setDatabaseError("");
    },
    [supabase, language, t]
  );

  const refreshDatabaseNotifications = useCallback(
    async (userId: string) => {
      await Promise.all([
        loadDatabaseNotifications(userId),
        loadMessageNotifications(userId),
      ]);
    },
    [loadDatabaseNotifications, loadMessageNotifications]
  );

  useEffect(() => {
    let active = true;
    let activeUserId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function initialise() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved && active) {
          const parsed = JSON.parse(saved) as Notification[];

          setNotifications(
            parsed
              .filter(
                (item) =>
                  !item.databaseId && !isRemovedFakeActor(item.user)
              )
              .map((notification) => ({
                ...notification,
                icon:
                  notification.icon ||
                  getNotificationIcon(notification.type),
                followedBack: notification.followedBack ?? false,
              }))
          );
        }
      } catch (error) {
        console.error("Could not load saved notifications:", error);
      } finally {
        if (active) setIsLoaded(true);
      }

      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !data.user) {
        setLoadingMessages(false);
        setPreferencesLoaded(true);
        return;
      }

      const userId = data.user.id;
      activeUserId = userId;
      setMyId(userId);

      await loadPreferences(userId);

      if (!active) return;

      await refreshDatabaseNotifications(userId);

      if (!active) return;

      channel = supabase
        .channel(`project-one-activity-notifications-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void refreshDatabaseNotifications(userId);
          }
        )
        .subscribe();

      setLoadingMessages(false);
    }

    void initialise();

    function handleFocus() {
      if (activeUserId) {
        void loadPreferences(activeUserId);
        void refreshDatabaseNotifications(activeUserId);
      }
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      active = false;
      window.removeEventListener("focus", handleFocus);

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [supabase, loadPreferences, refreshDatabaseNotifications]);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
      notifyLayout();
    } catch (error) {
      console.error("Could not save notifications:", error);
    }
  }, [notifications, isLoaded]);

  const allNotifications = useMemo(
    () => [
      ...databaseNotifications,
      ...messageNotifications,
      ...notifications,
    ],
    [databaseNotifications, messageNotifications, notifications]
  );

  const enabledNotifications = useMemo(
    () =>
      preferencesLoaded
        ? allNotifications.filter((notification) =>
            isNotificationEnabled(notification.type, preferences)
          )
        : allNotifications,
    [allNotifications, preferences, preferencesLoaded]
  );

  const filteredNotifications = enabledNotifications.filter(
    (notification) => {
      if (filter === "Unread") return notification.unread;
      if (filter === "Following") return notification.type === "follow";
      return true;
    }
  );

  const unreadCount = enabledNotifications.filter(
    (notification) => notification.unread
  ).length;

  async function markAllAsRead() {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, unread: false }))
    );
    setDatabaseNotifications((current) =>
      current.map((notification) => ({ ...notification, unread: false }))
    );
    setMessageNotifications((current) =>
      current.map((notification) => ({ ...notification, unread: false }))
    );

    if (myId) {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", myId)
        .is("read_at", null);

      if (error) {
        console.error("Could not mark notifications as read:", error);
        await refreshDatabaseNotifications(myId);
        return;
      }

      await refreshDatabaseNotifications(myId);
    }

    notifyLayout();
  }

  const markAsRead = useCallback(
    async (notification: Notification) => {
      if (notification.databaseId && myId) {
        if (!notification.unread) return;

        setDatabaseNotifications((current) =>
          current.map((item) =>
            item.databaseId === notification.databaseId
              ? { ...item, unread: false }
              : item
          )
        );

        setMessageNotifications((current) =>
          current.map((item) =>
            item.actorId === notification.actorId &&
            notification.type === "message"
              ? { ...item, unread: false }
              : item
          )
        );

        const query = supabase
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("user_id", myId)
          .is("read_at", null);

        const { error } = notification.databaseIds?.length
          ? await query.in("id", notification.databaseIds)
          : await query.eq("id", notification.databaseId);

        if (error) {
          console.error("Could not mark notification as read:", error);
          await refreshDatabaseNotifications(myId);
          return;
        }

        await refreshDatabaseNotifications(myId);
      } else {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, unread: false }
              : item
          )
        );
      }

      notifyLayout();
    },
    [myId, supabase, refreshDatabaseNotifications]
  );

  const toggleFollowBack = useCallback(
    async (notification: Notification) => {
      if (!myId || !notification.actorId) {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, followedBack: !item.followedBack }
              : item
          )
        );
        return;
      }

      const currentlyFollowing = Boolean(notification.followedBack);

      setDatabaseNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, followedBack: !currentlyFollowing }
            : item
        )
      );

      if (currentlyFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", myId)
          .eq("following_id", notification.actorId);

        if (error) {
          console.error("Could not unfollow user:", error);
          await refreshDatabaseNotifications(myId);
          window.alert(t("followError"));
          return;
        }
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: myId,
          following_id: notification.actorId,
        });

        if (error) {
          console.error("Could not follow user back:", error);
          await refreshDatabaseNotifications(myId);
          window.alert(t("followError"));
          return;
        }
      }

      await refreshDatabaseNotifications(myId);
    },
    [myId, supabase, refreshDatabaseNotifications, t]
  );

  function viewMessage(notification: Notification) {
    void markAsRead(notification);

    const destination = notification.actorId
      ? `/app/messages?user=${encodeURIComponent(notification.actorId)}`
      : "/app/messages";

    router.push(destination);
  }

  function viewPost(notification: Notification) {
    if (notification.postId !== undefined) {
      void markAsRead(notification);
      router.push(`/app?post=${notification.postId}`);
      return;
    }

    const existingPost = posts.find(
      (post) => Number(post.id) === notification.postId
    );

    if (existingPost) {
      void markAsRead(notification);
      router.push(`/app?post=${existingPost.id}`);
      return;
    }

    void markAsRead(notification);
    window.alert(t("missingPost"));
  }

  const filterLabels: Record<string, string> = {
    All: t("all"),
    Unread: t("unread"),
    Following: t("following"),
  };

  return (
    <main className="min-h-screen bg-white px-3 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <header className="mb-7 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-950 sm:text-3xl">
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
          </div>

          <Link
            href="/app"
            aria-label={t("backHome")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-xl text-gray-700 transition hover:bg-gray-100"
          >
            ←
          </Link>
        </header>

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white sm:rounded-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 sm:p-5">
            <div>
              <h2 className="font-bold text-gray-950">{t("activity")}</h2>
              <p className="mt-1 text-xs text-gray-500">
                {unreadCount} {t("unread")}{" "}
                {unreadCount === 1
                  ? t("notification")
                  : t("notifications")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => void markAllAsRead()}
              disabled={unreadCount === 0}
              className="text-xs font-semibold text-gray-900 transition hover:text-gray-500 disabled:opacity-40 sm:text-sm"
            >
              {t("markAll")}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-3 sm:px-5">
            {["All", "Unread", "Following"].map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setFilter(item)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  filter === item
                    ? "bg-gray-950 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {filterLabels[item]}
              </button>
            ))}
          </div>

          {preferencesError && (
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {preferencesError}
            </div>
          )}

          {databaseError && (
            <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t("databaseError")}
            </div>
          )}

          <div>
            {filteredNotifications.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <NotificationIcon type="bell" />
                </div>

                <h3 className="mt-4 font-bold text-gray-900">
                  {loadingMessages || !preferencesLoaded
                    ? t("loading")
                    : t("caughtUp")}
                </h3>

                <p className="mt-2 text-sm text-gray-500">{t("empty")}</p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={
                    notification.databaseId
                      ? `database-${notification.databaseId}`
                      : notification.actorId &&
                          notification.type === "message"
                        ? `message-sender-${notification.actorId}`
                        : `local-${notification.id}`
                  }
                  className={`flex items-center gap-3 border-b border-gray-100 p-4 transition last:border-b-0 hover:bg-gray-50 sm:gap-4 sm:p-5 ${
                    notification.unread ? "bg-gray-50/80" : "bg-white"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (notification.type === "message") {
                        viewMessage(notification);
                      } else if (
                        notification.type === "like" ||
                        notification.type === "comment" ||
                        notification.type === "mention"
                      ) {
                        viewPost(notification);
                      } else {
                        void markAsRead(notification);
                      }
                    }}
                    aria-label={t("openNotification").replace(
                      "{name}",
                      notification.user
                    )}
                    className="relative shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400"
                  >
                    <Avatar
                      name={notification.user}
                      src={notification.avatar}
                    />

                    <span
                      className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white ${
                        notification.type === "like"
                          ? "bg-red-500 text-white"
                          : notification.type === "comment"
                            ? "bg-blue-500 text-white"
                            : notification.type === "follow"
                              ? "bg-sky-500 text-white"
                              : notification.type === "message"
                                ? "bg-emerald-600 text-white"
                                : "bg-gray-800 text-white"
                      }`}
                    >
                      <NotificationIcon type={notification.type} />
                    </span>
                  </button>

                  <div className="min-w-0 flex-1 py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (notification.type === "message") {
                          viewMessage(notification);
                        } else if (
                          notification.type === "like" ||
                          notification.type === "comment" ||
                          notification.type === "mention"
                        ) {
                          viewPost(notification);
                        } else {
                          void markAsRead(notification);
                        }
                      }}
                      className="block text-left"
                    >
                      <p className="break-words text-sm leading-6 text-gray-700">
                        <span className="font-bold text-gray-950">
                          {notification.user}
                        </span>{" "}
                        {notification.action}
                      </p>

                      {notification.detail && (
                        <p className="mt-1 break-words text-sm text-gray-500">
                          {notification.detail}
                        </p>
                      )}

                      <p className="mt-1.5 text-xs text-gray-400">
                        {notification.time}
                        {notification.type === "message" &&
                          notification.messageCount !== undefined && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                              {notification.messageCount}{" "}
                              {notification.messageCount === 1
                                ? t("message")
                                : t("messages")}
                            </span>
                          )}
                      </p>
                    </button>

                    {notification.type === "message" && (
                      <button
                        type="button"
                        onClick={() => viewMessage(notification)}
                        className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                      >
                        {t("openConversation")}
                      </button>
                    )}

                    {notification.type === "follow" && (
                      <button
                        type="button"
                        onClick={() => void toggleFollowBack(notification)}
                        className={`mt-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
                          notification.followedBack
                            ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {notification.followedBack
                          ? t("followingButton")
                          : t("followBack")}
                      </button>
                    )}

                    {(notification.type === "like" ||
                      notification.type === "comment" ||
                      notification.type === "mention") && (
                      <button
                        type="button"
                        onClick={() => viewPost(notification)}
                        className="mt-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-800 transition hover:bg-gray-100"
                      >
                        {t("viewPost")}
                      </button>
                    )}
                  </div>

                  {notification.thumbnail && (
                    <button
                      type="button"
                      onClick={() => viewPost(notification)}
                      aria-label={t("viewRelatedPost")}
                      className="shrink-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                      <Image
                        src={notification.thumbnail}
                        alt={t("viewRelatedPost")}
                        width={56}
                        height={56}
                        unoptimized
                        className="h-12 w-12 rounded-lg border border-gray-100 object-cover sm:h-14 sm:w-14"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    </button>
                  )}

                  {notification.unread && (
                    <span
                      aria-label={t("unreadLabel")}
                      className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <p className="mt-5 text-center text-xs text-gray-400">
          {t("brand")}
        </p>
      </div>
    </main>
  );
}
