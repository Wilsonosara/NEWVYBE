
"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../../utils/supabase/client";
import { usePosts, type PostComment } from "./PostContext";
import Stories from "./Stories";
import MediaDisplay from "./MediaDisplay";
import { useLanguage, type Language } from "./LanguageProvider";

const SAVED_KEY = "project-one-saved-posts";
const NOTIFICATIONS_KEY = "project-one-notifications";

type SimulatedNotification = {
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
};

type ShareProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type StoryShareDraft = {
  postId: number;
  userId: string;
  blob: Blob;
  mediaUrl: string;
  isVideo: boolean;
  extension: string;
};

type FeedProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type LikedByUser = {
  id: string;
  name: string;
  username: string | null;
};

function playLikePopSound() {
  if (typeof window === "undefined" || !window.AudioContext) return;

  try {
    const context = new window.AudioContext();
    const oscillator = context.createOscillator();
    const volume = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(720, now);
    oscillator.frequency.exponentialRampToValueAtTime(430, now + 0.11);
    volume.gain.setValueAtTime(0.0001, now);
    volume.gain.exponentialRampToValueAtTime(0.16, now + 0.012);
    volume.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    oscillator.connect(volume);
    volume.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.14);
    oscillator.onended = () => void context.close();
    if (context.state === "suspended") void context.resume();
  } catch {
    // The like interaction still works when browser audio is unavailable.
  }
}

const feedTranslations: Record<Language, Record<string, string>> = {
  en: {
    stories: "Stories",
    happening: "See what's happening",
    yourProfile: "Your profile",
    createPost: "Create post",
    addMedia: "Add photo or video",
    sharePlaceholder: "Share something with your world...",
    forYou: "For you",
    postsFromWorld: "Posts from your world",
    discover: "Discover",
    feedStarts: "Your feed starts here",
    firstPost: "Share your first post or discover people and communities on VYBE.",
    createAPost: "Create a post",
    moreOptions: "More post options",
    saving: "Saving...",
    removeSaved: "Remove from saved",
    savePost: "Save post",
    sharePost: "Share post",
    deletePost: "Delete post",
    deleting: "Deleting...",
    likePost: "Like post",
    unlikePost: "Unlike post",
    comments: "Comments",
    save: "Save",
    unsave: "Unsave post",
    shareCopied: "Share link copied!",
    savedCollection: "Saved to your collection.",
    likes: "likes",
    firstComment: "Be the first to comment.",
    addComment: "Add a comment...",
    post: "Post",
    discoverMore: "Discover more people and worlds →",
    copyLink: "Copy post link",
    directLink: "Share a direct link to this post",
    shareOutside: "Share outside VYBE",
    deviceSharing: "Use your device's sharing options",
    sendFriend: "Send to a friend",
    searchPeople: "Search people by name or username",
    loadingPeople: "Loading people...",
    noProfiles: "No other profiles found yet.",
    noMatches: "No people match your search.",
    sending: "Sending...",
    send: "Send",
    closeShare: "Close share menu",
    pleaseLogIn: "Please log in to access your saved collection.",
    savedLoadError: "Could not load your saved collection. Please refresh and try again.",
    pleaseLogInSave: "Please log in to save posts to your collection.",
    removedSaved: "Post removed from your collection.",
    savedPost: "Post saved to your collection.",
    saveError: "Could not update your saved collection. Please try again.",
    pleaseLogInShare: "Please log in to send posts to friends.",
    peopleLoadError: "Could not load people right now. You can still copy the post link.",
    copyPrompt: "Copy this post link:",
    copyManually: "Copy the link from the box if it did not copy automatically.",
    postPreview: "a post on VYBE",
    checkPost: "Check out this post on VYBE:",
    pleaseLogInSend: "Please log in to send a post.",
    postSent: "Post sent to",
    yourFriend: "your friend",
    sendError: "Could not send the post. Please try again.",
    sharingUnavailable: "Sharing was unavailable. Try copying the post link instead.",
    copyLinkUnavailable: "Copy post link",
    profileLabel: "View profile",
    you: "You",
    postCopied: "Post link copied!",
    savedSignIn: "Please log in to access your saved collection.",
  },
  fr: {
    stories: "Stories",
    happening: "Découvrez l'actualité",
    yourProfile: "Votre profil",
    createPost: "Créer une publication",
    addMedia: "Ajouter une photo ou une vidéo",
    sharePlaceholder: "Partagez quelque chose avec votre communauté...",
    forYou: "Pour vous",
    postsFromWorld: "Publications de votre univers",
    discover: "Découvrir",
    feedStarts: "Votre fil commence ici",
    firstPost: "Publiez votre premier message ou découvrez des personnes et des communautés sur VYBE.",
    createAPost: "Créer une publication",
    moreOptions: "Plus d'options",
    saving: "Enregistrement...",
    removeSaved: "Retirer des favoris",
    savePost: "Enregistrer la publication",
    sharePost: "Partager la publication",
    likePost: "J'aime",
    unlikePost: "Je n'aime plus",
    comments: "Commentaires",
    save: "Enregistrer",
    unsave: "Retirer des favoris",
    shareCopied: "Lien copié !",
    savedCollection: "Enregistré dans votre collection.",
    likes: "J'aime",
    firstComment: "Soyez le premier à commenter.",
    addComment: "Ajouter un commentaire...",
    post: "Publier",
    discoverMore: "Découvrir plus de personnes et d'univers →",
    copyLink: "Copier le lien",
    directLink: "Partager un lien direct vers cette publication",
    shareOutside: "Partager en dehors de VYBE",
    deviceSharing: "Utiliser les options de partage de votre appareil",
    sendFriend: "Envoyer à un ami",
    searchPeople: "Rechercher par nom ou nom d'utilisateur",
    loadingPeople: "Chargement des personnes...",
    noProfiles: "Aucun autre profil trouvé pour le moment.",
    noMatches: "Aucune personne ne correspond à votre recherche.",
    sending: "Envoi...",
    send: "Envoyer",
    closeShare: "Fermer le partage",
    pleaseLogIn: "Connectez-vous pour accéder à votre collection.",
    savedLoadError: "Impossible de charger votre collection. Actualisez la page et réessayez.",
    pleaseLogInSave: "Connectez-vous pour enregistrer des publications.",
    removedSaved: "Publication retirée de votre collection.",
    savedPost: "Publication enregistrée dans votre collection.",
    saveError: "Impossible de modifier votre collection. Réessayez.",
    pleaseLogInShare: "Connectez-vous pour envoyer des publications à vos amis.",
    peopleLoadError: "Impossible de charger les personnes. Vous pouvez toujours copier le lien.",
    copyPrompt: "Copiez le lien de cette publication :",
    copyManually: "Copiez le lien dans la fenêtre s'il n'a pas été copié automatiquement.",
    postPreview: "une publication sur VYBE",
    checkPost: "Découvrez cette publication sur VYBE :",
    pleaseLogInSend: "Connectez-vous pour envoyer une publication.",
    postSent: "Publication envoyée à",
    yourFriend: "votre ami",
    sendError: "Impossible d'envoyer la publication. Réessayez.",
    sharingUnavailable: "Le partage est indisponible. Essayez de copier le lien.",
    copyLinkUnavailable: "Copier le lien",
    profileLabel: "Voir le profil",
    you: "Vous",
    postCopied: "Lien copié !",
    savedSignIn: "Connectez-vous pour accéder à votre collection.",
  },
  es: {
    stories: "Historias",
    happening: "Mira qué está pasando",
    yourProfile: "Tu perfil",
    createPost: "Crear publicación",
    addMedia: "Añadir foto o vídeo",
    sharePlaceholder: "Comparte algo con tu mundo...",
    forYou: "Para ti",
    postsFromWorld: "Publicaciones de tu mundo",
    discover: "Descubrir",
    feedStarts: "Tu feed empieza aquí",
    firstPost: "Comparte tu primera publicación o descubre personas y comunidades en VYBE.",
    createAPost: "Crear una publicación",
    moreOptions: "Más opciones",
    saving: "Guardando...",
    removeSaved: "Quitar de guardados",
    savePost: "Guardar publicación",
    sharePost: "Compartir publicación",
    likePost: "Me gusta",
    unlikePost: "Ya no me gusta",
    comments: "Comentarios",
    save: "Guardar",
    unsave: "Quitar de guardados",
    shareCopied: "¡Enlace copiado!",
    savedCollection: "Guardado en tu colección.",
    likes: "Me gusta",
    firstComment: "Sé la primera persona en comentar.",
    addComment: "Añadir un comentario...",
    post: "Publicar",
    discoverMore: "Descubre más personas y mundos →",
    copyLink: "Copiar enlace",
    directLink: "Compartir un enlace directo a esta publicación",
    shareOutside: "Compartir fuera de VYBE",
    deviceSharing: "Usar las opciones para compartir de tu dispositivo",
    sendFriend: "Enviar a un amigo",
    searchPeople: "Buscar por nombre o nombre de usuario",
    loadingPeople: "Cargando personas...",
    noProfiles: "Todavía no se encontraron otros perfiles.",
    noMatches: "Ninguna persona coincide con tu búsqueda.",
    sending: "Enviando...",
    send: "Enviar",
    closeShare: "Cerrar menú para compartir",
    pleaseLogIn: "Inicia sesión para acceder a tu colección.",
    savedLoadError: "No se pudo cargar tu colección. Actualiza e inténtalo de nuevo.",
    pleaseLogInSave: "Inicia sesión para guardar publicaciones.",
    removedSaved: "Publicación eliminada de tu colección.",
    savedPost: "Publicación guardada en tu colección.",
    saveError: "No se pudo actualizar tu colección. Inténtalo de nuevo.",
    pleaseLogInShare: "Inicia sesión para enviar publicaciones a tus amigos.",
    peopleLoadError: "No se pudieron cargar las personas. Puedes copiar el enlace.",
    copyPrompt: "Copia el enlace de esta publicación:",
    copyManually: "Copia el enlace de la ventana si no se copió automáticamente.",
    postPreview: "una publicación en VYBE",
    checkPost: "Mira esta publicación en VYBE:",
    pleaseLogInSend: "Inicia sesión para enviar una publicación.",
    postSent: "Publicación enviada a",
    yourFriend: "tu amigo",
    sendError: "No se pudo enviar la publicación. Inténtalo de nuevo.",
    sharingUnavailable: "No se pudo compartir. Intenta copiar el enlace.",
    copyLinkUnavailable: "Copiar enlace",
    profileLabel: "Ver perfil",
    you: "Tú",
    postCopied: "¡Enlace copiado!",
    savedSignIn: "Inicia sesión para acceder a tu colección.",
  },
  pt: {
    stories: "Stories",
    happening: "Veja o que está acontecendo",
    yourProfile: "Seu perfil",
    createPost: "Criar publicação",
    addMedia: "Adicionar foto ou vídeo",
    sharePlaceholder: "Compartilhe algo com seu mundo...",
    forYou: "Para você",
    postsFromWorld: "Publicações do seu mundo",
    discover: "Descobrir",
    feedStarts: "Seu feed começa aqui",
    firstPost: "Compartilhe sua primeira publicação ou descubra pessoas e comunidades no VYBE.",
    createAPost: "Criar uma publicação",
    moreOptions: "Mais opções",
    saving: "Salvando...",
    removeSaved: "Remover dos salvos",
    savePost: "Salvar publicação",
    sharePost: "Compartilhar publicação",
    likePost: "Curtir publicação",
    unlikePost: "Descurtir publicação",
    comments: "Comentários",
    save: "Salvar",
    unsave: "Remover dos salvos",
    shareCopied: "Link copiado!",
    savedCollection: "Salvo na sua coleção.",
    likes: "curtidas",
    firstComment: "Seja a primeira pessoa a comentar.",
    addComment: "Adicionar um comentário...",
    post: "Publicar",
    discoverMore: "Descubra mais pessoas e mundos →",
    copyLink: "Copiar link",
    directLink: "Compartilhe um link direto para esta publicação",
    shareOutside: "Compartilhar fora do VYBE",
    deviceSharing: "Usar as opções de compartilhamento do seu dispositivo",
    sendFriend: "Enviar para um amigo",
    searchPeople: "Buscar por nome ou nome de usuário",
    loadingPeople: "Carregando pessoas...",
    noProfiles: "Nenhum outro perfil encontrado ainda.",
    noMatches: "Ninguém corresponde à sua pesquisa.",
    sending: "Enviando...",
    send: "Enviar",
    closeShare: "Fechar menu de compartilhamento",
    pleaseLogIn: "Entre para acessar sua coleção.",
    savedLoadError: "Não foi possível carregar sua coleção. Atualize e tente novamente.",
    pleaseLogInSave: "Entre para salvar publicações.",
    removedSaved: "Publicação removida da sua coleção.",
    savedPost: "Publicação salva na sua coleção.",
    saveError: "Não foi possível atualizar sua coleção. Tente novamente.",
    pleaseLogInShare: "Entre para enviar publicações aos seus amigos.",
    peopleLoadError: "Não foi possível carregar as pessoas. Você ainda pode copiar o link.",
    copyPrompt: "Copie o link desta publicação:",
    copyManually: "Copie o link da caixa se ele não foi copiado automaticamente.",
    postPreview: "uma publicação no VYBE",
    checkPost: "Confira esta publicação no VYBE:",
    pleaseLogInSend: "Entre para enviar uma publicação.",
    postSent: "Publicação enviada para",
    yourFriend: "seu amigo",
    sendError: "Não foi possível enviar a publicação. Tente novamente.",
    sharingUnavailable: "O compartilhamento não está disponível. Tente copiar o link.",
    copyLinkUnavailable: "Copiar link",
    profileLabel: "Ver perfil",
    you: "Você",
    postCopied: "Link copiado!",
    savedSignIn: "Entre para acessar sua coleção.",
  },
  ar: {
    stories: "القصص",
    happening: "اكتشف ما يحدث",
    yourProfile: "ملفك الشخصي",
    createPost: "إنشاء منشور",
    addMedia: "إضافة صورة أو فيديو",
    sharePlaceholder: "شارك شيئًا مع عالمك...",
    forYou: "لك",
    postsFromWorld: "منشورات من عالمك",
    discover: "اكتشف",
    feedStarts: "يبدأ موجزك من هنا",
    firstPost: "شارك أول منشور لك أو اكتشف أشخاصًا ومجتمعات على VYBE.",
    createAPost: "إنشاء منشور",
    moreOptions: "المزيد من خيارات المنشور",
    saving: "جارٍ الحفظ...",
    removeSaved: "إزالة من المحفوظات",
    savePost: "حفظ المنشور",
    sharePost: "مشاركة المنشور",
    likePost: "إعجاب",
    unlikePost: "إلغاء الإعجاب",
    comments: "التعليقات",
    save: "حفظ",
    unsave: "إلغاء حفظ المنشور",
    shareCopied: "تم نسخ الرابط!",
    savedCollection: "تم الحفظ في مجموعتك.",
    likes: "إعجابات",
    firstComment: "كن أول من يعلّق.",
    addComment: "أضف تعليقًا...",
    post: "نشر",
    discoverMore: "اكتشف المزيد من الأشخاص والعوالم ←",
    copyLink: "نسخ رابط المنشور",
    directLink: "مشاركة رابط مباشر لهذا المنشور",
    shareOutside: "المشاركة خارج VYBE",
    deviceSharing: "استخدم خيارات المشاركة على جهازك",
    sendFriend: "إرسال إلى صديق",
    searchPeople: "ابحث بالاسم أو اسم المستخدم",
    loadingPeople: "جارٍ تحميل الأشخاص...",
    noProfiles: "لم يتم العثور على ملفات شخصية أخرى بعد.",
    noMatches: "لا يوجد أشخاص يطابقون بحثك.",
    sending: "جارٍ الإرسال...",
    send: "إرسال",
    closeShare: "إغلاق قائمة المشاركة",
    pleaseLogIn: "سجّل الدخول للوصول إلى مجموعتك المحفوظة.",
    savedLoadError: "تعذر تحميل مجموعتك. حدّث الصفحة وحاول مرة أخرى.",
    pleaseLogInSave: "سجّل الدخول لحفظ المنشورات.",
    removedSaved: "تمت إزالة المنشور من مجموعتك.",
    savedPost: "تم حفظ المنشور في مجموعتك.",
    saveError: "تعذر تحديث مجموعتك. حاول مرة أخرى.",
    pleaseLogInShare: "سجّل الدخول لإرسال المنشورات إلى أصدقائك.",
    peopleLoadError: "تعذر تحميل الأشخاص. يمكنك نسخ رابط المنشور.",
    copyPrompt: "انسخ رابط المنشور:",
    copyManually: "انسخ الرابط من المربع إذا لم يتم نسخه تلقائيًا.",
    postPreview: "منشور على VYBE",
    checkPost: "اطّلع على هذا المنشور في VYBE:",
    pleaseLogInSend: "سجّل الدخول لإرسال منشور.",
    postSent: "تم إرسال المنشور إلى",
    yourFriend: "صديقك",
    sendError: "تعذر إرسال المنشور. حاول مرة أخرى.",
    sharingUnavailable: "المشاركة غير متاحة. جرّب نسخ الرابط.",
    copyLinkUnavailable: "نسخ الرابط",
    profileLabel: "عرض الملف الشخصي",
    you: "أنت",
    postCopied: "تم نسخ الرابط!",
    savedSignIn: "سجّل الدخول للوصول إلى مجموعتك.",
  },
  ha: {
    stories: "Labarai",
    happening: "Dubi abin da ke faruwa",
    yourProfile: "Bayanan martabarka",
    createPost: "Ƙirƙiri rubutu",
    addMedia: "Ƙara hoto ko bidiyo",
    sharePlaceholder: "Raba wani abu da duniyarka...",
    forYou: "Na gare ka",
    postsFromWorld: "Rubuce-rubuce daga duniyarka",
    discover: "Gano",
    feedStarts: "Anan ne shafinka zai fara",
    firstPost: "Raba rubutunka na farko ko gano mutane da al'ummomi a VYBE.",
    createAPost: "Ƙirƙiri rubutu",
    moreOptions: "Ƙarin zaɓuɓɓuka",
    saving: "Ana adanawa...",
    removeSaved: "Cire daga ajiyayyu",
    savePost: "Ajiye rubutu",
    sharePost: "Raba rubutu",
    likePost: "So da rubutu",
    unlikePost: "Cire so",
    comments: "Sharhi",
    save: "Ajiye",
    unsave: "Cire rubutu daga ajiyayyu",
    shareCopied: "An kwafi hanyar haɗi!",
    savedCollection: "An ajiye a tarin ka.",
    likes: "so",
    firstComment: "Ka zama na farko da zai yi sharhi.",
    addComment: "Ƙara sharhi...",
    post: "Wallafa",
    discoverMore: "Gano ƙarin mutane da duniyoyi →",
    copyLink: "Kwafi hanyar haɗin rubutu",
    directLink: "Raba hanyar haɗi kai tsaye zuwa wannan rubutu",
    shareOutside: "Raba a wajen VYBE",
    deviceSharing: "Yi amfani da zaɓuɓɓukan rabawa na na'urarka",
    sendFriend: "Aika wa aboki",
    searchPeople: "Nemo da suna ko sunan mai amfani",
    loadingPeople: "Ana loda mutane...",
    noProfiles: "Ba a sami wasu bayanan martaba ba tukuna.",
    noMatches: "Babu wanda ya dace da bincikenka.",
    sending: "Ana aikawa...",
    send: "Aika",
    closeShare: "Rufe menu na rabawa",
    pleaseLogIn: "Shiga don samun damar tarin abubuwan da ka adana.",
    savedLoadError: "An kasa loda tarinka. Sabunta shafin sannan ka sake gwadawa.",
    pleaseLogInSave: "Shiga don adana rubuce-rubuce.",
    removedSaved: "An cire rubutun daga tarinka.",
    savedPost: "An adana rubutun a tarinka.",
    saveError: "An kasa sabunta tarinka. Sake gwadawa.",
    pleaseLogInShare: "Shiga don aika rubuce-rubuce ga abokanka.",
    peopleLoadError: "An kasa loda mutane. Har yanzu za ka iya kwafi hanyar haɗin.",
    copyPrompt: "Kwafi hanyar haɗin wannan rubutu:",
    copyManually: "Kwafi hanyar haɗin daga akwatin idan ba a kwafa ta kai tsaye ba.",
    postPreview: "wani rubutu a VYBE",
    checkPost: "Duba wannan rubutu a VYBE:",
    pleaseLogInSend: "Shiga don aika rubutu.",
    postSent: "An aika rubutu zuwa",
    yourFriend: "abokinka",
    sendError: "An kasa aika rubutun. Sake gwadawa.",
    sharingUnavailable: "Ba a samu rabawa ba. Gwada kwafi hanyar haɗin.",
    copyLinkUnavailable: "Kwafi hanyar haɗi",
    profileLabel: "Duba bayanan martaba",
    you: "Kai",
    postCopied: "An kwafi hanyar haɗi!",
    savedSignIn: "Shiga don samun damar tarinka.",
  },
  yo: {
    stories: "Àwọn Ìtàn",
    happening: "Wo ohun tó ń ṣẹlẹ̀",
    yourProfile: "Profáìlì rẹ",
    createPost: "Ṣẹ̀dá ìfìwéránṣẹ́",
    addMedia: "Fi fọ́tò tàbí fídíò kún un",
    sharePlaceholder: "Pín ohun kan pẹ̀lú ayé rẹ...",
    forYou: "Fún ọ",
    postsFromWorld: "Àwọn ìfìwéránṣẹ́ láti ayé rẹ",
    discover: "Ṣàwárí",
    feedStarts: "Ojú ìwé rẹ bẹ̀rẹ̀ níbí",
    firstPost: "Pín ìfìwéránṣẹ́ àkọ́kọ́ rẹ tàbí ṣàwárí àwọn ènìyàn àti àwùjọ lórí VYBE.",
    createAPost: "Ṣẹ̀dá ìfìwéránṣẹ́",
    moreOptions: "Àwọn àṣàyàn míì",
    saving: "Ń fi pamọ́...",
    removeSaved: "Yọ kúrò nínú àwọn tí a fipamọ́",
    savePost: "Fi ìfìwéránṣẹ́ pamọ́",
    sharePost: "Pín ìfìwéránṣẹ́",
    likePost: "Fẹ́ràn ìfìwéránṣẹ́",
    unlikePost: "Má fẹ́ràn mọ́",
    comments: "Àwọn àlàyé",
    save: "Fi pamọ́",
    unsave: "Yọ ìfìwéránṣẹ́ kúrò nínú àwọn tí a fipamọ́",
    shareCopied: "A ti daakọ ìjápọ̀!",
    savedCollection: "A ti fi pamọ́ sínú àkójọpọ̀ rẹ.",
    likes: "ìfẹ́ràn",
    firstComment: "Jẹ́ ẹni àkọ́kọ́ láti sọ àlàyé.",
    addComment: "Fi àlàyé kún un...",
    post: "Tẹ̀ jáde",
    discoverMore: "Ṣàwárí àwọn ènìyàn àti ayé míì →",
    copyLink: "Daakọ ìjápọ̀ ìfìwéránṣẹ́",
    directLink: "Pín ìjápọ̀ tààrà sí ìfìwéránṣẹ́ yìí",
    shareOutside: "Pín níta VYBE",
    deviceSharing: "Lo àwọn àṣàyàn pínpín ẹ̀rọ rẹ",
    sendFriend: "Fi ránṣẹ́ sí ọ̀rẹ́",
    searchPeople: "Ṣàwárí nípa orúkọ tàbí orúkọ aṣàmúlò",
    loadingPeople: "Ń gbé àwọn ènìyàn wá...",
    noProfiles: "A kò tíì rí profáìlì mìíràn.",
    noMatches: "Kò sí ẹni tó bá ìwádìí rẹ mu.",
    sending: "Ń fi ránṣẹ́...",
    send: "Fi ránṣẹ́",
    closeShare: "Pa àkójọ pínpín",
    pleaseLogIn: "Wọlé láti rí àkójọpọ̀ rẹ.",
    savedLoadError: "A kò lè gbé àkójọpọ̀ rẹ wá. Tún ojú ìwé ṣe kí o sì tún gbìyànjú.",
    pleaseLogInSave: "Wọlé láti fi àwọn ìfìwéránṣẹ́ pamọ́.",
    removedSaved: "A ti yọ ìfìwéránṣẹ́ kúrò nínú àkójọpọ̀ rẹ.",
    savedPost: "A ti fi ìfìwéránṣẹ́ pamọ́ sínú àkójọpọ̀ rẹ.",
    saveError: "A kò lè ṣe àtúnṣe àkójọpọ̀ rẹ. Gbìyànjú lẹ́ẹ̀kansi.",
    pleaseLogInShare: "Wọlé láti fi àwọn ìfìwéránṣẹ́ ránṣẹ́ sí àwọn ọ̀rẹ́ rẹ.",
    peopleLoadError: "A kò lè gbé àwọn ènìyàn wá. O ṣì lè daakọ ìjápọ̀ náà.",
    copyPrompt: "Daakọ ìjápọ̀ ìfìwéránṣẹ́ yìí:",
    copyManually: "Daakọ ìjápọ̀ láti inú àpótí náà bí kò bá daakọ fúnra rẹ̀.",
    postPreview: "ìfìwéránṣẹ́ kan lórí VYBE",
    checkPost: "Wo ìfìwéránṣẹ́ yìí lórí VYBE:",
    pleaseLogInSend: "Wọlé láti fi ìfìwéránṣẹ́ ránṣẹ́.",
    postSent: "A ti fi ìfìwéránṣẹ́ ránṣẹ́ sí",
    yourFriend: "ọ̀rẹ́ rẹ",
    sendError: "A kò lè fi ìfìwéránṣẹ́ náà ránṣẹ́. Gbìyànjú lẹ́ẹ̀kansi.",
    sharingUnavailable: "Pínpín kò ṣiṣẹ́. Gbìyànjú láti daakọ ìjápọ̀ náà.",
    copyLinkUnavailable: "Daakọ ìjápọ̀",
    profileLabel: "Wo profáìlì",
    you: "Ìwọ",
    postCopied: "A ti daakọ ìjápọ̀!",
    savedSignIn: "Wọlé láti rí àkójọpọ̀ rẹ.",
  },
  ig: {
    stories: "Akụkọ",
    happening: "Lee ihe na-eme",
    yourProfile: "Profaịlụ gị",
    createPost: "Mepụta post",
    addMedia: "Tinye foto ma ọ bụ vidiyo",
    sharePlaceholder: "Kesaa ihe n'ụwa gị...",
    forYou: "Maka gị",
    postsFromWorld: "Post sitere n'ụwa gị",
    discover: "Chọpụta",
    feedStarts: "Ndepụta gị na-amalite ebe a",
    firstPost: "Kesaa post mbụ gị ma ọ bụ chọpụta ndị mmadụ na obodo dị na VYBE.",
    createAPost: "Mepụta post",
    moreOptions: "Nhọrọ ndị ọzọ",
    saving: "A na-echekwa...",
    removeSaved: "Wepụ na ndị echekwara",
    savePost: "Chekwaa post",
    sharePost: "Kekọrịta post",
    likePost: "Masị post",
    unlikePost: "Wepụ mmasị",
    comments: "Nkwupụta",
    save: "Chekwaa",
    unsave: "Wepụ post na ndị echekwara",
    shareCopied: "Eṅomila njikọ!",
    savedCollection: "Echekwara na nchịkọta gị.",
    likes: "mmasị",
    firstComment: "Bụrụ onye mbụ ga-ekwu okwu.",
    addComment: "Tinye nkwupụta...",
    post: "Bipụta",
    discoverMore: "Chọpụta ndị mmadụ na ụwa ndị ọzọ →",
    copyLink: "Detuo njikọ post",
    directLink: "Kekọrịta njikọ kpọmkwem na post a",
    shareOutside: "Kekọrịta na mpụga VYBE",
    deviceSharing: "Jiri nhọrọ nkekọrịta nke ngwaọrụ gị",
    sendFriend: "Ziga enyi",
    searchPeople: "Chọọ site n'aha ma ọ bụ aha njirimara",
    loadingPeople: "A na-ebudata ndị mmadụ...",
    noProfiles: "Ahụghị profaịlụ ndị ọzọ ugbu a.",
    noMatches: "Ọ dịghị onye dabara na ọchụchọ gị.",
    sending: "A na-eziga...",
    send: "Ziga",
    closeShare: "Mechie menu nkekọrịta",
    pleaseLogIn: "Banye iji nweta nchịkọta echekwara gị.",
    savedLoadError: "Enweghị ike ibudata nchịkọta gị. Mee ka ibe ahụ dị ọhụrụ ma nwalee ọzọ.",
    pleaseLogInSave: "Banye iji chekwaa post.",
    removedSaved: "Ewepụla post na nchịkọta gị.",
    savedPost: "Echekwara post na nchịkọta gị.",
    saveError: "Enweghị ike imelite nchịkọta gị. Biko nwalee ọzọ.",
    pleaseLogInShare: "Banye iji zigara ndị enyi gị post.",
    peopleLoadError: "Enweghị ike ibudata ndị mmadụ. Ị ka nwere ike idetuo njikọ ahụ.",
    copyPrompt: "Detuo njikọ post a:",
    copyManually: "Detuo njikọ ahụ n'igbe ahụ ma ọ bụrụ na e detughị ya ozugbo.",
    postPreview: "post dị na VYBE",
    checkPost: "Lelee post a na VYBE:",
    pleaseLogInSend: "Banye iji zipu post.",
    postSent: "Ezigara post nye",
    yourFriend: "enyi gị",
    sendError: "Enweghị ike izipu post ahụ. Biko nwalee ọzọ.",
    sharingUnavailable: "Nkekọrịta adịghị arụ ọrụ. Gbalịa idetuo njikọ ahụ.",
    copyLinkUnavailable: "Detuo njikọ",
    profileLabel: "Lee profaịlụ",
    you: "Gị",
    postCopied: "Eṅomila njikọ!",
    savedSignIn: "Banye iji nweta nchịkọta gị.",
  },
};

export default function AppHome() {
  const router = useRouter();
  const { language } = useLanguage();

  const tr = useCallback(
    (key: string) =>
      feedTranslations[language]?.[key] ??
      feedTranslations.en[key] ??
      key,
    [language]
  );

  const {
    posts,
    postComments: allPostComments,
    addComment,
    toggleCommentLike,
    deletePost,
    deleteComment,
  } = usePosts();

  const [likedPosts, setLikedPosts] = useState<number[]>([]);
  const [dislikedPosts, setDislikedPosts] = useState<number[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<number, { likes: number; dislikes: number }>>({});
  const [likersByPost, setLikersByPost] = useState<Record<number, LikedByUser[]>>({});
  const [reactionStatus, setReactionStatus] = useState<{ postId: number; message: string } | null>(null);
  const [savedPosts, setSavedPosts] = useState<number[]>([]);
  const [interactionsLoaded, setInteractionsLoaded] = useState(false);
  const [likesLoaded, setLikesLoaded] = useState(false);
  const [pendingLikePost, setPendingLikePost] = useState<number | null>(null);
  const [poppingLikePostId, setPoppingLikePostId] = useState<number | null>(null);
  const likePopTimerRef = useRef<number | null>(null);
  const [pendingSavePosts, setPendingSavePosts] = useState<number[]>([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    postId: number;
    comment: PostComment;
  } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(
    () => new Set()
  );
  const [pendingCommentLike, setPendingCommentLike] = useState<number | null>(null);
  const [recordingCommentPostId, setRecordingCommentPostId] = useState<number | null>(null);
  const [voiceCommentPostId, setVoiceCommentPostId] = useState<number | null>(null);
  const [voiceCommentFile, setVoiceCommentFile] = useState<File | null>(null);
  const [voiceCommentUrl, setVoiceCommentUrl] = useState<string | null>(null);
  const [commentError, setCommentError] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const [sharedPost, setSharedPost] = useState<number | null>(null);

  const [shareDialogPost, setShareDialogPost] = useState<number | null>(null);
  const [shareMode, setShareMode] = useState<"options" | "friends" | "story-editor">("options");
  const [storyShareDraft, setStoryShareDraft] = useState<StoryShareDraft | null>(null);
  const [storyShareCaption, setStoryShareCaption] = useState("");
  const [storyShareCrop, setStoryShareCrop] = useState<"cover" | "contain">("cover");
  const [storyShareTheme, setStoryShareTheme] = useState<"original" | "warm" | "cool" | "mono" | "vivid">("original");
  const [storyCaptionPosition, setStoryCaptionPosition] = useState({ x: 50, y: 76 });
  const storyCaptionDragRef = useRef(false);

  const updateStoryCaptionPosition = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!storyCaptionDragRef.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    setStoryCaptionPosition({
      x: Math.min(92, Math.max(8, ((event.clientX - bounds.left) / bounds.width) * 100)),
      y: Math.min(92, Math.max(8, ((event.clientY - bounds.top) / bounds.height) * 100)),
    });
  };
  const [shareProfiles, setShareProfiles] = useState<ShareProfile[]>([]);
  const [shareSearch, setShareSearch] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareStoryBusy, setShareStoryBusy] = useState(false);
  const [shareSendingTo, setShareSendingTo] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState("");

  const [moreOptions, setMoreOptions] = useState<number | null>(null);
  const [highlightedPost, setHighlightedPost] = useState<number | null>(null);
  const handledPostScrollRef = useRef<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followedAuthors, setFollowedAuthors] = useState<string[]>([]);
  const [pendingFollowAuthors, setPendingFollowAuthors] = useState<string[]>([]);
  const [viewerPostId, setViewerPostId] = useState<number | null>(null);
  const [outgoingViewerPostId, setOutgoingViewerPostId] = useState<number | null>(null);
  const [viewerDirection, setViewerDirection] = useState<"next" | "previous" | null>(null);
  const [viewerTransitioning, setViewerTransitioning] = useState(false);
  const viewerTransitionTimerRef = useRef<number | null>(null);
  const [deletingPost, setDeletingPost] = useState<number | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  // Profile avatars are loaded from Supabase for every author in the feed.
  const [feedProfilesById, setFeedProfilesById] = useState<
    Record<string, FeedProfile>
  >({});
  const [feedProfilesByUsername, setFeedProfilesByUsername] = useState<
    Record<string, FeedProfile>
  >({});

  useEffect(() => {
    let active = true;

    async function loadFeedAvatars() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        const authorIds = new Set<string>();
        const authorUsernames = new Set<string>();

        if (user?.id) authorIds.add(user.id);

        for (const post of posts) {
          const postWithOwner = post as typeof post & {
            user_id?: string | null;
            userId?: string | null;
          };

          const ownerId = postWithOwner.user_id || postWithOwner.userId;

          if (ownerId) authorIds.add(ownerId);

          const username = (post.username ?? "")
            .trim()
            .replace(/^@/, "")
            .toLowerCase();

          if (username) authorUsernames.add(username);
        }

        const profilesById: Record<string, FeedProfile> = {};
        const profilesByUsername: Record<string, FeedProfile> = {};

        const ids = Array.from(authorIds);
        const usernames = Array.from(authorUsernames);

        if (ids.length > 0) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("id", ids);

          if (error) throw error;

          for (const profile of (data ?? []) as FeedProfile[]) {
            profilesById[profile.id] = profile;

            const username = (profile.username ?? "")
              .trim()
              .replace(/^@/, "")
              .toLowerCase();

            if (username) profilesByUsername[username] = profile;
          }
        }

        if (usernames.length > 0) {
          const { data, error } = await supabase
            .from("profiles")
            .select("id, username, display_name, avatar_url")
            .in("username", usernames);

          if (error) throw error;

          for (const profile of (data ?? []) as FeedProfile[]) {
            profilesById[profile.id] = profile;

            const username = (profile.username ?? "")
              .trim()
              .replace(/^@/, "")
              .toLowerCase();

            if (username) profilesByUsername[username] = profile;
          }
        }

        if (!active) return;

        setFeedProfilesById(profilesById);
        setFeedProfilesByUsername(profilesByUsername);
        setCurrentUserId(user?.id ?? null);

      } catch (error) {
        console.error("Could not load profile pictures for the feed:", error);
      }
    }

    void loadFeedAvatars();

    return () => {
      active = false;
    };
  }, [posts]);

  useEffect(() => {
    let active = true;

    async function loadFollowedAuthors() {
      if (!currentUserId) {
        setFollowedAuthors([]);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId);

      if (error) {
        console.error("Could not load followed authors:", error);
        return;
      }

      if (active) {
        setFollowedAuthors((data ?? []).map((row) => row.following_id));
      }
    }

    void loadFollowedAuthors();

    return () => {
      active = false;
    };
  }, [currentUserId]);

  useEffect(() => {
    let active = true;

    async function loadSavedPosts() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          if (active) {
            setSavedPosts([]);
            setSaveStatus(tr("pleaseLogIn"));
          }
          return;
        }

        let legacySavedIds: number[] = [];

        try {
          const storedSaves = localStorage.getItem(SAVED_KEY);

          if (storedSaves) {
            const parsed: unknown = JSON.parse(storedSaves);

            if (Array.isArray(parsed)) {
              legacySavedIds = parsed
                .map(Number)
                .filter((id) => Number.isSafeInteger(id) && id > 0);
            }
          }
        } catch (error) {
          console.warn("Could not read older saved posts:", error);
        }

        if (legacySavedIds.length > 0) {
          const { error: migrationError } = await supabase
            .from("saved_posts")
            .upsert(
              legacySavedIds.map((postId) => ({
                user_id: user.id,
                post_id: postId,
              })),
              {
                onConflict: "user_id,post_id",
                ignoreDuplicates: true,
              }
            );

          if (migrationError) {
            console.warn(
              "Could not migrate older saved posts:",
              migrationError
            );
          }
        }

        const { data, error } = await supabase
          .from("saved_posts")
          .select("post_id")
          .eq("user_id", user.id);

        if (error) throw error;
        if (!active) return;

        setSavedPosts((data ?? []).map((row) => Number(row.post_id)));
        setSaveStatus("");

        try {
          localStorage.removeItem(SAVED_KEY);
        } catch {
          // The collection is already loaded from Supabase.
        }
      } catch (error) {
        console.error(
          "Could not load your saved collection from Supabase:",
          error
        );

        if (active) setSaveStatus(tr("savedLoadError"));
      } finally {
        if (active) setInteractionsLoaded(true);
      }
    }

    void loadSavedPosts();

    return () => {
      active = false;
    };
  }, [tr]);

  const refreshReactions = async () => {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) throw authError;

    const [allLikesResult, allDislikesResult] = await Promise.all([
      supabase.from("post_likes").select("post_id,user_id"),
      supabase.from("post_dislikes").select("post_id"),
    ]);

    if (allLikesResult.error) throw allLikesResult.error;
    if (allDislikesResult.error) throw allDislikesResult.error;

    const likeRows = allLikesResult.data ?? [];
    const likerIds = [...new Set(likeRows.map((row) => row.user_id))];
    const likerProfilesResult = likerIds.length > 0
      ? await supabase.from("profiles").select("id,display_name,username").in("id", likerIds)
      : { data: [], error: null };

    if (likerProfilesResult.error) throw likerProfilesResult.error;

    const likerProfiles = new Map(
      (likerProfilesResult.data ?? []).map((profile) => [profile.id, profile])
    );
    const likers: Record<number, LikedByUser[]> = {};
    for (const row of likeRows) {
      const id = Number(row.post_id);
      const profile = likerProfiles.get(row.user_id);
      if (!profile) continue;
      const username = profile.username?.trim() || null;
      const name = profile.display_name?.trim() || username?.replace(/^@/, "") || "VYBE member";
      likers[id] ??= [];
      likers[id].push({ id: profile.id, name, username });
    }
    setLikersByPost(likers);

    const counts: Record<number, { likes: number; dislikes: number }> = {};
    for (const row of likeRows) {
      const id = Number(row.post_id);
      counts[id] ??= { likes: 0, dislikes: 0 };
      counts[id].likes += 1;
    }
    for (const row of allDislikesResult.data ?? []) {
      const id = Number(row.post_id);
      counts[id] ??= { likes: 0, dislikes: 0 };
      counts[id].dislikes += 1;
    }
    setReactionCounts(counts);

    if (!user) {
      setLikedPosts([]);
      setDislikedPosts([]);
      return;
    }

    const [myLikesResult, myDislikesResult] = await Promise.all([
      supabase.from("post_likes").select("post_id").eq("user_id", user.id),
      supabase.from("post_dislikes").select("post_id").eq("user_id", user.id),
    ]);
    if (myLikesResult.error) throw myLikesResult.error;
    if (myDislikesResult.error) throw myDislikesResult.error;

    setLikedPosts((myLikesResult.data ?? []).map((row) => Number(row.post_id)));
    setDislikedPosts((myDislikesResult.data ?? []).map((row) => Number(row.post_id)));
  };

  useEffect(() => {
    let active = true;

    async function loadReactions() {
      try {
        await refreshReactions();
      } catch (error) {
        console.error("Could not load post reactions from Supabase:", error);
        if (active) {
          setLikedPosts([]);
          setDislikedPosts([]);
          setReactionCounts({});
        }
      } finally {
        if (active) setLikesLoaded(true);
      }
    }

    void loadReactions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("project-one-post-reactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => {
        void refreshReactions().catch((error) => console.error("Could not refresh reactions:", error));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_dislikes" }, () => {
        void refreshReactions().catch((error) => console.error("Could not refresh reactions:", error));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postParam = params.get("post");

    if (!postParam) return;
    if (handledPostScrollRef.current === postParam) return;

    const postId = Number(postParam);

    if (!Number.isSafeInteger(postId) || postId <= 0) return;

    const matchingPostExists = posts.some((post) => post.id === postId);
    if (!matchingPostExists) return;

    const timer = window.setTimeout(() => {
      const postElement = document.getElementById(`post-${postId}`);

      if (postElement) {
        handledPostScrollRef.current = postParam;
        setHighlightedPost(postId);
        postElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 400);

    return () => window.clearTimeout(timer);
  }, [posts]);

  useEffect(() => {
    if (highlightedPost === null) return;

    const timer = window.setTimeout(() => {
      setHighlightedPost(null);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [highlightedPost]);

  useEffect(() => {
    if (openComments === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenComments(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openComments]);

  const toggleFollowAuthor = async (authorId: string) => {
    if (!currentUserId || currentUserId === authorId || pendingFollowAuthors.includes(authorId)) return;

    setPendingFollowAuthors((current) => [...current, authorId]);

    try {
      const supabase = createClient();
      const { data: existingFollow, error: lookupError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentUserId)
        .eq("following_id", authorId)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existingFollow) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", authorId);
        if (error) throw error;
        setFollowedAuthors((current) => current.filter((id) => id !== authorId));
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: authorId,
        });
        if (error) throw error;
        setFollowedAuthors((current) => current.includes(authorId) ? current : [...current, authorId]);
      }

      window.dispatchEvent(new Event("project-one-follows-updated"));
    } catch (error) {
      console.error("Could not update post author follow:", error);
    } finally {
      setPendingFollowAuthors((current) => current.filter((id) => id !== authorId));
    }
  };

  const openPostViewer = (postId: number) => {
    if (viewerTransitionTimerRef.current !== null) {
      window.clearTimeout(viewerTransitionTimerRef.current);
      viewerTransitionTimerRef.current = null;
    }
    setOutgoingViewerPostId(null);
    setViewerDirection(null);
    setViewerTransitioning(false);
    setViewerPostId(postId);
  };

  const closePostViewer = useCallback(() => {
    if (viewerTransitionTimerRef.current !== null) {
      window.clearTimeout(viewerTransitionTimerRef.current);
      viewerTransitionTimerRef.current = null;
    }
    setViewerPostId(null);
    setOutgoingViewerPostId(null);
    setViewerDirection(null);
    setViewerTransitioning(false);
  }, []);

  useEffect(() => {
    const handleHomeNavigation = () => closePostViewer();

    window.addEventListener("project-one-home-navigation", handleHomeNavigation);
    return () => {
      window.removeEventListener("project-one-home-navigation", handleHomeNavigation);
    };
  }, [closePostViewer]);

  const transitionToPost = (
    currentPostId: number,
    nextPostId: number,
    direction: "next" | "previous"
  ) => {
    if (viewerTransitioning || viewerPostId !== currentPostId) return;

    setOutgoingViewerPostId(currentPostId);
    setViewerDirection(direction);
    setViewerTransitioning(true);
    setViewerPostId(nextPostId);

    if (viewerTransitionTimerRef.current !== null) {
      window.clearTimeout(viewerTransitionTimerRef.current);
    }
    viewerTransitionTimerRef.current = window.setTimeout(() => {
      setOutgoingViewerPostId(null);
      setViewerTransitioning(false);
      viewerTransitionTimerRef.current = null;
    }, 320);
  };

  useEffect(() => () => {
    if (viewerTransitionTimerRef.current !== null) {
      window.clearTimeout(viewerTransitionTimerRef.current);
    }
  }, []);

  const toggleLike = async (postId: number) => {
    if (pendingLikePost !== null || !likesLoaded) return;

    const wasLiked = likedPosts.includes(postId);
    const post = posts.find((item) => item.id === postId);
    setPendingLikePost(postId);
    setReactionStatus(null);

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Please log in to react to posts.");

      if (wasLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);
        if (error) throw error;
      } else {
        const { error: removeDislikeError } = await supabase
          .from("post_dislikes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);
        if (removeDislikeError) throw removeDislikeError;

        const { error } = await supabase
          .from("post_likes")
          .upsert(
            { user_id: user.id, post_id: postId },
            { onConflict: "user_id,post_id", ignoreDuplicates: true }
          );
        if (error) throw error;
      }

      await refreshReactions();
      setReactionStatus({ postId, message: wasLiked ? "Like removed." : "You liked this post." });
      if (!wasLiked) {
        createSimulatedNotification("like", postId, post?.content ?? "Someone liked your post.");
      }
    } catch (error) {
      console.error("Could not update your like:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      setReactionStatus({ postId, message: `Could not update like: ${message}` });
      try { await refreshReactions(); } catch (refreshError) {
        console.error("Could not refresh reactions:", refreshError);
      }
    } finally {
      setPendingLikePost(null);
    }
  };

  const handleLikeClick = (postId: number) => {
    if (!likedPosts.includes(postId)) {
      playLikePopSound();
      setPoppingLikePostId(postId);
      if (likePopTimerRef.current !== null) {
        window.clearTimeout(likePopTimerRef.current);
      }
      likePopTimerRef.current = window.setTimeout(() => {
        setPoppingLikePostId(null);
        likePopTimerRef.current = null;
      }, 360);
    }

    void toggleLike(postId);
  };

  const toggleDislike = async (postId: number) => {
    if (pendingLikePost !== null || !likesLoaded) return;
    setPendingLikePost(postId);
    setReactionStatus(null);

    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error("Please log in to react to posts.");

      if (dislikedPosts.includes(postId)) {
        const { error } = await supabase
          .from("post_dislikes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);
        if (error) throw error;
      } else {
        const { error: removeLikeError } = await supabase
          .from("post_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);
        if (removeLikeError) throw removeLikeError;

        const { error } = await supabase
          .from("post_dislikes")
          .upsert(
            { user_id: user.id, post_id: postId },
            { onConflict: "user_id,post_id", ignoreDuplicates: true }
          );
        if (error) throw error;
      }

      await refreshReactions();
      setReactionStatus({ postId, message: dislikedPosts.includes(postId) ? "Dislike removed." : "You disliked this post." });
    } catch (error) {
      console.error("Could not update your dislike:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      setReactionStatus({ postId, message: `Could not update dislike: ${message}` });
      try { await refreshReactions(); } catch (refreshError) {
        console.error("Could not refresh reactions:", refreshError);
      }
    } finally {
      setPendingLikePost(null);
    }
  };

  const startVoiceComment = async (postId: number) => {
    setCommentError("");

    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCommentError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      if (voiceCommentUrl) URL.revokeObjectURL(voiceCommentUrl);
      setVoiceCommentFile(null);
      setVoiceCommentUrl(null);
      setVoiceCommentPostId(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];

      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (type) => MediaRecorder.isTypeSupported(type)
      );
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        try {
          const blob = new Blob(recordingChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });

          if (blob.size === 0) {
            setCommentError("No audio was captured. Please record again.");
            return;
          }

          const extension = blob.type.includes("mp4") ? "m4a" : "webm";
          setVoiceCommentFile(
            new File([blob], `voice-comment.${extension}`, { type: blob.type })
          );
          setVoiceCommentUrl(URL.createObjectURL(blob));
          setVoiceCommentPostId(postId);
        } catch (error) {
          console.error("Could not finish voice recording:", error);
          setCommentError(
            error instanceof Error
              ? error.message
              : "Could not finish the recording. Please try again."
          );
        } finally {
          recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
          recordingStreamRef.current = null;
          mediaRecorderRef.current = null;
          setRecordingCommentPostId(null);
        }
      };
      recorder.onerror = (event) => {
        const message =
          event instanceof ErrorEvent && event.message
            ? event.message
            : "The browser could not record audio. Please try again.";
        setCommentError(message);
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        setRecordingCommentPostId(null);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingCommentPostId(postId);
    } catch (error) {
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
      recordingStreamRef.current = null;
      setRecordingCommentPostId(null);
      setCommentError(
        error instanceof Error
          ? error.message
          : "Could not access the microphone. Check browser permissions and try again."
      );
    }
  };

  const stopVoiceComment = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const clearVoiceComment = () => {
    if (voiceCommentUrl) URL.revokeObjectURL(voiceCommentUrl);
    setVoiceCommentUrl(null);
    setVoiceCommentFile(null);
    setVoiceCommentPostId(null);
  };

  const submitComment = async (postId: number) => {
    const cleanComment = commentText.trim();
    const audioFile = voiceCommentPostId === postId ? voiceCommentFile : null;
    if (!cleanComment && !audioFile) return;

    setCommentError("");
    try {
      await addComment(
        postId,
        cleanComment,
        audioFile ?? undefined,
        replyingTo?.postId === postId ? replyingTo.comment.id : null
      );
      createSimulatedNotification(
        "comment",
        postId,
        cleanComment || "Voice comment"
      );
      setCommentText("");
      setReplyingTo(null);
      clearVoiceComment();
    } catch (error) {
      setCommentError(
        error instanceof Error ? error.message : "Could not add your comment."
      );
    }
  };

  const handleCommentLike = async (postId: number, commentId: number) => {
    if (pendingCommentLike !== null) return;
    setPendingCommentLike(commentId);
    setCommentError("");
    try {
      await toggleCommentLike(postId, commentId);
    } catch (error) {
      setCommentError(
        error instanceof Error ? error.message : "Could not update comment like."
      );
    } finally {
      setPendingCommentLike(null);
    }
  };

  const renderComment = (postId: number, comment: PostComment, depth = 0) => (
    <div
      key={`${postId}-comment-${comment.id}`}
      className="flex gap-2.5"
      style={{ marginLeft: `${Math.min(depth * 24, 48)}px` }}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-700">
        {comment.author.trim().charAt(0).toUpperCase() || "V"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-gray-100 px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            {comment.userId ? (
              <Link
                href={`/app/profile?id=${encodeURIComponent(comment.userId)}`}
                className="text-sm font-bold text-gray-950 hover:underline"
              >
                {comment.author}
              </Link>
            ) : (
              <span className="text-sm font-bold text-gray-950">{comment.author}</span>
            )}
            {comment.username && (
              <span className="text-xs text-gray-500">{comment.username}</span>
            )}
            <span className="text-xs text-gray-400">· {comment.createdAt}</span>
          </div>
          {comment.content && (
            <p className="mt-1 break-words text-sm text-gray-800">{comment.content}</p>
          )}
          {comment.audioUrl && (
            <audio
              controls
              preload="none"
              src={comment.audioUrl}
              className="mt-2 block h-10 max-w-full"
              aria-label={`Voice comment by ${comment.username || comment.author}`}
            />
          )}
        </div>
        <div className="mt-1 flex items-center gap-4 px-2 text-xs font-semibold text-gray-500">
          <button
            type="button"
            onClick={() => void handleCommentLike(postId, comment.id)}
            disabled={pendingCommentLike === comment.id}
            className={comment.likedByMe ? "text-rose-600" : "hover:text-gray-900"}
            aria-label={comment.likedByMe ? "Unlike comment" : "Like comment"}
          >
            {comment.likedByMe ? "♥" : "♡"}{" "}
            {comment.likes > 0 ? comment.likes : "Like"}
          </button>
          <button
            type="button"
            onClick={() => {
              setExpandedReplies((current) => {
                const next = new Set(current);
                if (next.has(comment.id)) next.delete(comment.id);
                else next.add(comment.id);
                return next;
              });
              setReplyingTo({ postId, comment });
              setCommentError("");
            }}
            className="hover:text-gray-900"
            aria-expanded={expandedReplies.has(comment.id)}
          >
            Reply
            {" "}
            {allPostComments[postId]?.filter(
              (reply) => reply.parentCommentId === comment.id
            ).length ?? 0}
          </button>
          {comment.userId === currentUserId && (
            <button
              type="button"
              onClick={() => void handleDeleteComment(postId, comment.id)}
              disabled={deletingCommentId !== null}
              className="hover:text-gray-900 disabled:opacity-50"
            >
              {deletingCommentId === comment.id ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderReplies = (postId: number, parentId: number, depth = 1): ReactNode =>
    (expandedReplies.has(parentId) ? allPostComments[postId] : undefined)
      ?.filter((comment) => comment.parentCommentId === parentId)
      .map((comment) => (
        <Fragment key={`${postId}-reply-${comment.id}`}>
          {renderComment(postId, comment, depth)}
          {renderReplies(postId, comment.id, depth + 1)}
        </Fragment>
      ));

  const handleDeleteComment = async (postId: number, commentId: number) => {
    if (deletingCommentId !== null) return;
    if (!window.confirm("Delete your comment? This cannot be undone.")) return;

    setDeletingCommentId(commentId);
    setCommentError("");
    try {
      await deleteComment(postId, commentId);
    } catch (error) {
      setCommentError(
        error instanceof Error ? error.message : "Could not delete your comment."
      );
    } finally {
      setDeletingCommentId(null);
    }
  };

  const toggleSave = async (postId: number) => {
    if (!interactionsLoaded || pendingSavePosts.includes(postId)) return;

    setPendingSavePosts((current) => [...current, postId]);
    setSaveStatus("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setSaveStatus(tr("pleaseLogInSave"));
        return;
      }

      const isCurrentlySaved = savedPosts.includes(postId);

      if (isCurrentlySaved) {
        const { error } = await supabase
          .from("saved_posts")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);

        if (error) throw error;

        setSavedPosts((current) => current.filter((id) => id !== postId));
        setSaveStatus(tr("removedSaved"));
      } else {
        const { error } = await supabase
          .from("saved_posts")
          .upsert(
            {
              user_id: user.id,
              post_id: postId,
            },
            {
              onConflict: "user_id,post_id",
              ignoreDuplicates: true,
            }
          );

        if (error) throw error;

        setSavedPosts((current) =>
          current.includes(postId) ? current : [...current, postId]
        );
        setSaveStatus(tr("savedPost"));
      }

      window.dispatchEvent(new Event("project-one-saved-posts-updated"));
    } catch (error) {
      console.error("Could not update your saved collection:", error);

      setSaveStatus(
        error instanceof Error
          ? `${tr("saveError")} ${error.message}`
          : tr("saveError")
      );
    } finally {
      setPendingSavePosts((current) =>
        current.filter((id) => id !== postId)
      );
    }
  };

  const handleShare = async (postId: number) => {
    setShareDialogPost(postId);
    setShareMode("options");
    if (storyShareDraft?.mediaUrl) URL.revokeObjectURL(storyShareDraft.mediaUrl);
    setStoryShareDraft(null);
    setStoryShareCaption("");
    setStoryShareCrop("cover");
    setStoryShareTheme("original");
    setStoryCaptionPosition({ x: 50, y: 76 });
    setShareSearch("");
    setShareStatus("");
    setShareLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setShareStatus(tr("pleaseLogInShare"));
        setShareProfiles([]);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .neq("id", user.id)
        .order("display_name", { ascending: true });

      if (error) throw error;

      setShareProfiles((data ?? []) as ShareProfile[]);
    } catch (error) {
      console.error("Could not load people to share with:", error);

      setShareStatus(tr("peopleLoadError"));
      setShareProfiles([]);
    } finally {
      setShareLoading(false);
    }
  };

  const getShareUrl = (postId: number) =>
    `${window.location.origin}/app?post=${encodeURIComponent(String(postId))}`;

  const copyPostLink = async (postId: number) => {
    const shareUrl = getShareUrl(postId);

    try {
      await navigator.clipboard.writeText(shareUrl);
      setSharedPost(postId);
      setShareStatus(tr("postCopied"));
      window.setTimeout(() => setSharedPost(null), 2500);
    } catch {
      window.prompt(tr("copyPrompt"), shareUrl);
      setShareStatus(tr("copyManually"));
    }
  };

  const sharePostToStory = async (postId: number) => {
    if (shareStoryBusy) return;
    setShareStoryBusy(true);
    setShareStatus("");
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!user) throw new Error(tr("pleaseLogInShare"));

      const { data: post, error: postError } = await supabase
        .from("posts")
        .select("content, media_path, media_type, media_items")
        .eq("id", postId)
        .maybeSingle();
      if (postError) throw postError;
      if (!post) throw new Error("This post could not be found.");

      const mediaItems = Array.isArray(post.media_items) ? post.media_items : [];
      const firstMedia = mediaItems[0] as { mediaId?: string; mediaType?: string } | undefined;
      const mediaId = (post.media_path as string | null) || firstMedia?.mediaId || "";
      const mediaType = ((post.media_type as string | null) || firstMedia?.mediaType || "image").toLowerCase();
      let mediaBlob: Blob;
      let extension: string;

      if (mediaId) {
        const storagePath = mediaId.startsWith("post-media/")
          ? mediaId.slice("post-media/".length)
          : mediaId;
        const { data, error } = await supabase.storage.from("post-media").download(storagePath);
        if (error || !data) throw error || new Error("Could not load this post's media.");
        mediaBlob = data;
        extension = storagePath.split(".").pop()?.toLowerCase() || (mediaType === "video" ? "mp4" : "jpg");
      } else {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1920;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not create a story card.");
        const gradient = context.createLinearGradient(0, 0, 1080, 1920);
        gradient.addColorStop(0, "#6422d8");
        gradient.addColorStop(1, "#18102d");
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#ffffff";
        context.font = "bold 64px sans-serif";
        context.fillText("VYBE.", 88, 210);
        context.font = "48px sans-serif";
        const words = String(post.content || "Shared a post on VYBE").split(/\s+/);
        let line = "";
        let y = 620;
        for (const word of words) {
          const nextLine = line ? `${line} ${word}` : word;
          if (context.measureText(nextLine).width > 900 && line) {
            context.fillText(line, 88, y);
            line = word;
            y += 72;
          } else line = nextLine;
          if (y > 1300) break;
        }
        if (line && y <= 1300) context.fillText(line, 88, y);
        context.font = "32px sans-serif";
        context.fillStyle = "#ddd0ff";
        context.fillText("Open the post on VYBE", 88, 1640);
        mediaBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not create a story image.")), "image/png");
        });
        extension = "png";
      }
      if (storyShareDraft?.mediaUrl) URL.revokeObjectURL(storyShareDraft.mediaUrl);
      const mediaUrl = URL.createObjectURL(mediaBlob);
      setStoryShareDraft({
        postId,
        userId: user.id,
        blob: mediaBlob,
        mediaUrl,
        isVideo: mediaType === "video" && !!mediaId,
        extension,
      });
      setStoryShareCaption(String(post.content || "").trim().slice(0, 180));
      setStoryShareCrop("cover");
      setStoryShareTheme("original");
      setStoryCaptionPosition({ x: 50, y: 76 });
      setShareMode("story-editor");
    } catch (error) {
      console.error("Could not share post to story:", error);
      setShareStatus(error instanceof Error ? error.message : "Could not share this post to your story.");
    } finally {
      setShareStoryBusy(false);
    }
  };

  const publishStoryDraft = async () => {
    const draft = storyShareDraft;
    if (!draft || shareStoryBusy) return;
    setShareStoryBusy(true);
    setShareStatus("");
    try {
      const supabase = createClient();
      let mediaBlob = draft.blob;
      let extension = draft.extension;

      if (!draft.isVideo) {
        const image = new Image();
        image.src = draft.mediaUrl;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1920;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not prepare the story image.");
        const backgrounds = { original: "#191326", warm: "#493023", cool: "#172b43", mono: "#202020", vivid: "#33145d" };
        context.fillStyle = backgrounds[storyShareTheme];
        context.fillRect(0, 0, canvas.width, canvas.height);
        const scale = storyShareCrop === "cover"
          ? Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight)
          : Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
        const drawWidth = image.naturalWidth * scale;
        const drawHeight = image.naturalHeight * scale;
        const filters = { original: "none", warm: "sepia(0.28) saturate(1.2)", cool: "hue-rotate(12deg) saturate(1.15)", mono: "grayscale(1)", vivid: "saturate(1.5) contrast(1.08)" };
        context.filter = filters[storyShareTheme];
        context.drawImage(image, (canvas.width - drawWidth) / 2, (canvas.height - drawHeight) / 2, drawWidth, drawHeight);
        mediaBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not prepare the story image.")), "image/png");
        });
        extension = "png";
      }

      const storyPath = `${draft.userId}/stories/${crypto.randomUUID()}.${extension}`;
      const contentType = draft.isVideo ? mediaBlob.type || "video/mp4" : "image/png";
      const { error: uploadError } = await supabase.storage.from("post-media").upload(storyPath, mediaBlob, { contentType, upsert: false });
      if (uploadError) throw uploadError;

      const storyStyle = encodeURIComponent(JSON.stringify({
        crop: draft.isVideo ? storyShareCrop : "cover",
        theme: draft.isVideo ? storyShareTheme : "original",
        captionX: storyCaptionPosition.x,
        captionY: storyCaptionPosition.y,
      }));
      const storyText = [storyShareCaption.trim(), `Shared post: ${getShareUrl(draft.postId)}`].filter(Boolean).join("\n");
      const { error: storyError } = await supabase.from("stories").insert({
        user_id: draft.userId,
        media_path: storyPath,
        media_type: draft.isVideo ? "video" : "image",
        text_content: `[[VYBE_STORY_EDIT:${storyStyle}]]\n${storyText}`.slice(0, 500),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      if (storyError) {
        await supabase.storage.from("post-media").remove([storyPath]);
        throw storyError;
      }

      URL.revokeObjectURL(draft.mediaUrl);
      setStoryShareDraft(null);
      setShareMode("options");
      setShareStatus("Post shared to your story.");
      window.dispatchEvent(new Event("project-one-stories-updated"));
    } catch (error) {
      console.error("Could not publish edited story:", error);
      setShareStatus(error instanceof Error ? error.message : "Could not share this post to your story.");
    } finally {
      setShareStoryBusy(false);
    }
  };

  const sendPostToFriend = async (recipient: ShareProfile) => {
    if (shareDialogPost === null || shareSendingTo !== null) return;

    setShareSendingTo(recipient.id);
    setShareStatus("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error(tr("pleaseLogInSend"));

      const postId = shareDialogPost;
      const post = posts.find((item) => item.id === postId);

      let mediaPath = post?.mediaId ?? "";
      let mediaType = post?.mediaType ?? "";

      const { data: databasePost, error: postLookupError } = await supabase
        .from("posts")
        .select("media_path, media_type")
        .eq("id", postId)
        .maybeSingle();

      if (postLookupError) {
        console.warn(
          "Could not retrieve the post's database media details:",
          postLookupError
        );
      } else if (databasePost) {
        if (
          typeof databasePost.media_path === "string" &&
          databasePost.media_path.trim()
        ) {
          mediaPath = databasePost.media_path.trim();
        }

        if (
          typeof databasePost.media_type === "string" &&
          databasePost.media_type.trim()
        ) {
          mediaType = databasePost.media_type.trim().toLowerCase();
        }
      }

      let imageUrl: string | null = null;

      if (mediaPath && mediaType.toLowerCase() === "image") {
        const storagePrefix = "post-media/";

        const storagePath = mediaPath.startsWith(storagePrefix)
          ? mediaPath.slice(storagePrefix.length)
          : mediaPath;

        if (
          storagePath &&
          !storagePath.startsWith("blob:") &&
          !storagePath.startsWith("data:")
        ) {
          const { data: publicUrlData } = supabase.storage
            .from("post-media")
            .getPublicUrl(storagePath);

          imageUrl = publicUrlData.publicUrl || null;
        }
      }

      const messageContent = [
        `[[PROJECT_ONE_SHARED_POST:${postId}]]`,
        ...(imageUrl ? [`[[PROJECT_ONE_SHARED_IMAGE:${imageUrl}]]`] : []),
      ].join("\n");

      const { error } = await supabase.from("direct_messages").insert({
        sender_id: user.id,
        recipient_id: recipient.id,
        content: messageContent,
      });

      if (error) throw error;

      setShareStatus(
        `${tr("postSent")} ${
          recipient.display_name || recipient.username || tr("yourFriend")
        }.`
      );

      window.dispatchEvent(new Event("project-one-messages-updated"));
      router.push(`/app/messages?user=${encodeURIComponent(recipient.id)}`);
    } catch (error) {
      console.error("Could not send shared post:", error);

      setShareStatus(
        error instanceof Error
          ? `${tr("sendError")} ${error.message}`
          : tr("sendError")
      );
    } finally {
      setShareSendingTo(null);
    }
  };

  const filteredShareProfiles = shareProfiles.filter((profile) => {
    const search = shareSearch.trim().toLowerCase().replace(/^@/, "");
    if (!search) return true;

    return (
      (profile.display_name ?? "").toLowerCase().includes(search) ||
      (profile.username ?? "").toLowerCase().replace(/^@/, "").includes(search)
    );
  });

  const handleDeletePost = async (postId: number) => {
    if (deletingPost !== null) return;

    const post = posts.find((item) => item.id === postId);
    const postWithOwner = post as
      | (typeof post & {
          authorId?: string | null;
          user_id?: string | null;
          userId?: string | null;
        })
      | undefined;
    const ownerId =
      postWithOwner?.authorId ||
      postWithOwner?.user_id ||
      postWithOwner?.userId;

    if (!currentUserId || !ownerId || ownerId !== currentUserId) {
      window.alert("You can only delete your own posts.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this post? This cannot be undone.")) {
      return;
    }

    setDeletingPost(postId);

    try {
      await deletePost(postId);
      setMoreOptions(null);
      setSavedPosts((current) => current.filter((id) => id !== postId));
      setLikedPosts((current) => current.filter((id) => id !== postId));
      setDislikedPosts((current) => current.filter((id) => id !== postId));
      setReactionCounts((current) => {
        const next = { ...current };
        delete next[postId];
        return next;
      });
    } catch (error) {
      console.error("Could not delete post:", error);
      window.alert(
        error instanceof Error
          ? `Could not delete post: ${error.message}`
          : "Could not delete post. Please try again."
      );
    } finally {
      setDeletingPost(null);
    }
  };

  const activeCommentsPost = openComments === null
    ? null
    : posts.find((post) => post.id === openComments) ?? null;
  const activeComments = activeCommentsPost
    ? allPostComments[activeCommentsPost.id] ?? []
    : [];

  return (
    <main className="min-h-screen min-w-0 bg-white text-black">
      <div className="mx-auto w-full max-w-2xl min-w-0 px-3 pb-6 pt-3 sm:px-5 sm:pt-5">
        <header className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
          <Link href="/app" className="text-2xl font-black tracking-tight">
            VYBE<span className="text-gray-400">.</span>
          </Link>

          <Link
            href="/app/notifications"
            aria-label={tr("notifications")}
            title={tr("notifications")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-800 transition hover:bg-gray-100"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
          </Link>
        </header>

        <section className="mb-6 border-b border-gray-100 pb-5">
          <div className="min-w-0">
            <Stories />
          </div>
        </section>

        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">
              {tr("forYou")}
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              {tr("postsFromWorld")}
            </p>
          </div>

          <Link
            href="/app/explore"
            className="rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold transition hover:bg-gray-100"
          >
            {tr("discover")}
          </Link>
        </div>

        {saveStatus && (
          <p
            role="status"
            className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600"
          >
            {saveStatus}
          </p>
        )}

        <section className="space-y-6">
          {posts.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <svg
                  viewBox="0 0 24 24"
                  className="h-8 w-8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>

              <h2 className="mt-4 text-lg font-bold">{tr("feedStarts")}</h2>

              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-gray-500">
                {tr("firstPost")}
              </p>

              <Link
                href="/app/create"
                className="mt-5 inline-flex rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition hover:bg-gray-800"
              >
                {tr("createAPost")}
              </Link>
            </div>
          )}

          {posts.map((post, postIndex) => {
            const isLiked = likedPosts.includes(post.id);
            const isDisliked = dislikedPosts.includes(post.id);
            const postReactionCounts = reactionCounts[post.id] ?? { likes: 0, dislikes: 0 };
            const isSaved = savedPosts.includes(post.id);
            const isSavePending = pendingSavePosts.includes(post.id);
            const postComments = allPostComments[post.id] || [];
            const postLikers = likersByPost[post.id] ?? [];
            const isLikePending = pendingLikePost === post.id;

            const postWithOwner = post as typeof post & {
              authorId?: string | null;
              user_id?: string | null;
              userId?: string | null;
            };

            const ownerId =
              postWithOwner.authorId ||
              postWithOwner.user_id ||
              postWithOwner.userId;
            const isOwnPost = Boolean(
              currentUserId && ownerId && currentUserId === ownerId
            );
            const normalizedUsername = post.username
              .trim()
              .replace(/^@/, "")
              .toLowerCase();
            const authorProfile =
              (ownerId ? feedProfilesById[ownerId] : null) ||
              feedProfilesByUsername[normalizedUsername];
            const authorName =
              authorProfile?.display_name?.trim() ||
              authorProfile?.username?.trim().replace(/^@/, "") ||
              post.author;
            const profileUsername =
              authorProfile?.username?.trim() || post.username;
            const profileUrl = `/app/profile?username=${encodeURIComponent(
              profileUsername.replace(/^@/, "")
            )}`;

            const authorAvatar =
              authorProfile?.avatar_url || null;

            return (
              <article
                id={`post-${post.id}`}
                key={post.id}
                className={`min-w-0 overflow-hidden border-b border-gray-200 pb-5 transition-all duration-700 ${
                  highlightedPost === post.id
                    ? "rounded-xl bg-purple-50 ring-2 ring-purple-300 ring-offset-4"
                    : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3 pb-3">
                  <Link
                    href={profileUrl}
                    aria-label={`${tr("profileLabel")}: ${authorName}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-base font-bold text-black transition hover:bg-gray-200"
                  >
                    {authorAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={authorAvatar}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      authorName.charAt(0).toUpperCase()
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={profileUrl}
                      className="block truncate text-sm font-bold transition hover:underline"
                    >
                      {authorName}
                    </Link>

                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      <Link
                        href={profileUrl}
                        className="hover:text-gray-900 hover:underline"
                      >
                        {post.username}
                      </Link>
                      {" · "}
                      {post.time}
                    </p>
                  </div>

                  <span className="max-w-24 truncate rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    {post.world}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setMoreOptions(moreOptions === post.id ? null : post.id)
                    }
                    aria-label={tr("moreOptions")}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100"
                  >
                    ···
                  </button>
                </div>

                {moreOptions === post.id && (
                  <div className="mb-3 flex gap-2">
                    <button
                      type="button"
                      disabled={!interactionsLoaded || isSavePending}
                      onClick={() => void toggleSave(post.id)}
                      className="rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-100 disabled:opacity-50"
                    >
                      {isSavePending
                        ? tr("saving")
                        : isSaved
                          ? tr("removeSaved")
                          : tr("savePost")}
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleShare(post.id)}
                      className="rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold hover:bg-gray-100"
                    >
                      {tr("sharePost")}
                    </button>

                    {isOwnPost && (
                      <button
                        type="button"
                        disabled={deletingPost === post.id}
                        onClick={() => void handleDeletePost(post.id)}
                        className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingPost === post.id
                          ? tr("deleting")
                          : tr("deletePost")}
                      </button>
                    )}
                  </div>
                )}

                {post.content && (
                  <button type="button" onClick={() => openPostViewer(post.id)} className="block w-full pb-3 text-left">
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-900">
                      {post.content}
                    </p>
                  </button>
                )}

                <MediaDisplay
                  mediaId={post.mediaId}
                  mediaType={post.mediaType}
                  mediaName={post.mediaName}
                  isViewerOpen={viewerPostId === post.id || outgoingViewerPostId === post.id}
                  isViewerTransitionIncoming={viewerPostId === post.id && viewerTransitioning}
                  isViewerTransitionOutgoing={outgoingViewerPostId === post.id}
                  isViewerTransitioning={viewerTransitioning}
                  viewerDirection={viewerDirection}
                  onOpenViewer={() => openPostViewer(post.id)}
                  onCloseViewer={closePostViewer}
                  authorName={authorName}
                  authorUsername={profileUsername.startsWith("@") ? profileUsername : `@${profileUsername}`}
                  authorAvatarUrl={authorAvatar}
                  authorProfileUrl={profileUrl}
                  postContent={post.content}
                  likesCount={postReactionCounts.likes}
                  dislikesCount={postReactionCounts.dislikes}
                  commentsCount={post.comments}
                  isLiked={isLiked}
                  isPoppingLike={poppingLikePostId === post.id}
                  isDisliked={isDisliked}
                  isSaved={isSaved}
                  isFollowingAuthor={Boolean(ownerId && followedAuthors.includes(ownerId))}
                  isFollowPending={Boolean(ownerId && pendingFollowAuthors.includes(ownerId))}
                  onLike={() => handleLikeClick(post.id)}
                  onDislike={() => void toggleDislike(post.id)}
                  onFollow={ownerId && !isOwnPost ? () => void toggleFollowAuthor(ownerId) : undefined}
                  onComments={() => {
                    setOpenComments(post.id);
                    setCommentText("");
                    setCommentError("");
                    setReplyingTo(null);
                  }}
                  onSave={() => void toggleSave(post.id)}
                  onShare={() => void handleShare(post.id)}
                  onNavigate={(direction) => {
                    const targetIndex =
                      postIndex + (direction === "next" ? 1 : -1);
                    const targetPost = posts[targetIndex];
                    if (!targetPost) return;
                    transitionToPost(post.id, targetPost.id, direction);
                  }}
                />

                {reactionStatus?.postId === post.id && (
                  <p role="status" className="pb-2 text-xs text-gray-600">
                    {reactionStatus.message}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      onClick={() => handleLikeClick(post.id)}
                      disabled={!likesLoaded || isLikePending}
                      aria-label={isLiked ? tr("unlikePost") : tr("likePost")}
                      aria-pressed={isLiked}
                      className={`flex items-center gap-1.5 text-sm transition disabled:opacity-50 ${
                        isLiked ? "text-amber-300 hover:text-amber-200" : "text-black hover:text-gray-700"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" className={`h-6 w-6 transition-transform duration-300 ease-out ${poppingLikePostId === post.id ? "scale-125 -rotate-12" : "scale-100 rotate-0"}`} fill={isLiked || poppingLikePostId === post.id ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                      </svg>
                      <span>{postReactionCounts.likes}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void toggleDislike(post.id)}
                      disabled={!likesLoaded || isLikePending}
                      aria-label="Dislike post"
                      aria-pressed={isDisliked}
                      className={`flex items-center gap-1.5 text-sm transition disabled:opacity-50 ${isDisliked ? "text-red-600 hover:text-red-700" : "text-gray-800 hover:text-red-600"}`}
                    >
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                        <path d="M15 3H6c-.83 0-1.54.5-1.84 1.22L1.14 11.27c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L10.83 23l6.58-6.59c.37-.36.59-.86.59-1.41V5c0-1.1-.9-2-2-2ZM19 3v12h4V3h-4Z" />
                      </svg>
                      <span>{postReactionCounts.dislikes}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenComments(post.id);
                        setCommentText("");
                        setCommentError("");
                        setReplyingTo(null);
                      }}
                      aria-label={tr("comments")}
                      className="flex items-center gap-1.5 text-sm text-gray-800 hover:text-gray-500"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8.5Z" />
                      </svg>
                      <span>{post.comments}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleShare(post.id)}
                      aria-label={tr("sharePost")}
                      className="flex items-center text-gray-800 hover:text-gray-500"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-6 w-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m22 2-7 20-4-9-9-4Z" />
                        <path d="M22 2 11 13" />
                      </svg>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={!interactionsLoaded || isSavePending}
                    onClick={() => void toggleSave(post.id)}
                    aria-label={isSaved ? tr("unsave") : tr("save")}
                    aria-pressed={isSaved}
                    className={`flex items-center transition disabled:opacity-50 ${
                      isSaved
                        ? "text-black"
                        : "text-gray-800 hover:text-gray-500"
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-6 w-6"
                      fill={isSaved ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4Z" />
                    </svg>
                  </button>
                </div>

                {sharedPost === post.id && (
                  <p className="mt-2 text-xs font-medium text-gray-500">
                    {tr("shareCopied")}
                  </p>
                )}

                {isSaved && (
                  <p className="mt-2 text-xs font-medium text-gray-500">
                    {tr("savedCollection")}
                  </p>
                )}

                <p className="mt-3 text-xs font-semibold text-gray-900">
                  {postReactionCounts.likes} {tr("likes")} · {postReactionCounts.dislikes} dislikes
                </p>

                {postLikers.length > 0 && (
                  <p className="mt-1 text-xs leading-5 text-gray-600">
                    <span className="font-semibold text-gray-800">Liked by </span>
                    {postLikers.slice(0, 3).map((liker, index) => {
                      const profileUrl = liker.username
                        ? `/app/profile?username=${encodeURIComponent(liker.username.replace(/^@/, ""))}`
                        : null;

                      return (
                        <Fragment key={liker.id}>
                          {index > 0 && ", "}
                          {profileUrl ? (
                            <Link href={profileUrl} className="font-medium text-gray-800 hover:underline">
                              {liker.name}
                            </Link>
                          ) : (
                            liker.name
                          )}
                        </Fragment>
                      );
                    })}
                    {postLikers.length > 3 && ` and ${postLikers.length - 3} others`}
                  </p>
                )}

              </article>
            );
          })}
        </section>

        <div className="py-8 text-center">
          <Link
            href="/app/explore"
            className="text-sm font-semibold text-gray-700 hover:text-black hover:underline"
          >
            {tr("discoverMore")}
          </Link>
        </div>
      </div>

      {activeCommentsPost && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpenComments(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-comments-title"
            className="flex h-[86dvh] max-h-[760px] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[min(760px,85vh)] sm:rounded-3xl"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="min-w-0">
                <h2 id="post-comments-title" className="text-base font-bold text-gray-950">
                  {tr("comments")}
                </h2>
                <p className="mt-0.5 truncate text-xs text-gray-500">
                  {activeCommentsPost.author} · {activeCommentsPost.content}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenComments(null)}
                aria-label="Close comments"
                className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <div className="space-y-4">
                {activeComments
                  .filter((comment) => !comment.parentCommentId)
                  .map((comment) => (
                    <div key={`${activeCommentsPost.id}-thread-${comment.id}`} className="space-y-3">
                      {renderComment(activeCommentsPost.id, comment)}
                      {renderReplies(activeCommentsPost.id, comment.id)}
                    </div>
                  ))}
                {activeComments.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-500">{tr("firstComment")}</p>
                )}
              </div>

              {recordingCommentPostId === activeCommentsPost.id && (
                <p className="mt-3 text-xs text-gray-500" role="status">
                  Recording voice comment… Tap the microphone to stop.
                </p>
              )}

              {voiceCommentPostId === activeCommentsPost.id && voiceCommentUrl && (
                <div className="mt-3 flex items-center gap-2">
                  <audio controls src={voiceCommentUrl} className="h-10 min-w-0 flex-1" aria-label="Preview voice comment" />
                  <button type="button" onClick={clearVoiceComment} className="px-2 py-2 text-sm text-gray-600 hover:text-black" aria-label="Remove voice recording">Remove</button>
                </div>
              )}

              {commentError && <p className="mt-3 text-xs text-red-600" role="alert">{commentError}</p>}
            </div>

            <form
              className="relative flex shrink-0 items-center gap-2 border-t border-gray-100 bg-white px-3 py-3 sm:px-4"
              onSubmit={(event) => {
                event.preventDefault();
                void submitComment(activeCommentsPost.id);
              }}
            >
              {replyingTo?.postId === activeCommentsPost.id && (
                <div className="absolute bottom-full left-4 mb-1 flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                  <span>Replying to {replyingTo.comment.author}</span>
                  <button type="button" onClick={() => setReplyingTo(null)} className="font-bold hover:text-gray-950" aria-label="Cancel reply">×</button>
                </div>
              )}
              <input
                type="text"
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder={replyingTo?.postId === activeCommentsPost.id ? `Reply to ${replyingTo.comment.author}...` : tr("addComment")}
                aria-label={replyingTo?.postId === activeCommentsPost.id ? `Reply to ${replyingTo.comment.author}` : tr("addComment")}
                className="min-w-0 flex-1 rounded-full bg-gray-100 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-gray-400"
              />
              <button
                type="button"
                onClick={() => recordingCommentPostId === activeCommentsPost.id ? stopVoiceComment() : void startVoiceComment(activeCommentsPost.id)}
                disabled={(recordingCommentPostId !== null && recordingCommentPostId !== activeCommentsPost.id) || (voiceCommentPostId !== null && voiceCommentPostId !== activeCommentsPost.id)}
                className="shrink-0 rounded-full bg-gray-100 p-3 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                aria-label={recordingCommentPostId === activeCommentsPost.id ? "Stop voice recording" : "Record voice comment"}
                title={recordingCommentPostId === activeCommentsPost.id ? "Stop recording" : "Record voice comment"}
              >
                {recordingCommentPostId === activeCommentsPost.id ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" /></svg>
                )}
              </button>
              <button
                type="submit"
                disabled={!commentText.trim() && !(voiceCommentPostId === activeCommentsPost.id && voiceCommentFile)}
                className="shrink-0 px-2 py-2 text-sm font-bold text-black disabled:text-gray-300"
              >
                {tr("post")}
              </button>
            </form>
          </section>
        </div>
      )}

      {shareDialogPost !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              shareSendingTo === null && !shareStoryBusy
            ) {
              setShareDialogPost(null);
              setShareStatus("");
              if (storyShareDraft?.mediaUrl) URL.revokeObjectURL(storyShareDraft.mediaUrl);
              setStoryShareDraft(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-post-title"
            className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 id="share-post-title" className="text-base font-bold">
                {tr("sharePost")}
              </h2>

              <button
                type="button"
                aria-label={tr("closeShare")}
                onClick={() => {
                  if (shareSendingTo === null && !shareStoryBusy) {
                    setShareDialogPost(null);
                    setShareStatus("");
                    if (storyShareDraft?.mediaUrl) URL.revokeObjectURL(storyShareDraft.mediaUrl);
                    setStoryShareDraft(null);
                  }
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
              {shareMode === "options" ? (
                <div className="space-y-3">
                  <button type="button" disabled={shareSendingTo !== null || shareStoryBusy} onClick={() => void sharePostToStory(shareDialogPost)} className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 p-4 text-left transition hover:border-purple-300 hover:bg-purple-50 disabled:opacity-50">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 text-xl text-purple-700">◉</span>
                    <span><span className="block text-sm font-semibold">{shareStoryBusy ? "Sharing to story…" : "Share to story"}</span><span className="block text-xs text-gray-500">Add this post to your story for 24 hours</span></span>
                  </button>
                  <button type="button" onClick={() => setShareMode("friends")} className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 p-4 text-left transition hover:border-purple-300 hover:bg-purple-50">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 text-purple-700"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true"><circle cx="8" cy="8" r="3.2"/><circle cx="16" cy="8" r="3.2"/><path d="M1.5 19c.2-3.2 2.1-5 5-5h3c2.9 0 4.8 1.8 5 5v1h-13v-1Zm9 0c.2-3.2 2.1-5 5-5h2c2.9 0 4.8 1.8 5 5v1h-12v-1Z"/></svg></span>
                    <span><span className="block text-sm font-semibold">Share to friends</span><span className="block text-xs text-gray-500">Send this post in a VYBE message</span></span>
                  </button>
                  <button type="button" onClick={() => void copyPostLink(shareDialogPost)} className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 p-4 text-left transition hover:border-purple-300 hover:bg-purple-50">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.71-1.71"/></svg></span>
                    <span><span className="block text-sm font-semibold">Copy post link</span><span className="block text-xs text-gray-500">Copy a link to share outside VYBE</span></span>
                  </button>
                </div>
              ) : shareMode === "story-editor" && storyShareDraft ? (
                <div className="space-y-4">                  <button type="button" onClick={() => setShareMode("options")} className="text-sm font-semibold text-purple-700 hover:underline">← Back to sharing options</button>
                  <div className="relative mx-auto aspect-[9/16] max-h-[38dvh] overflow-hidden rounded-2xl bg-[#191326] shadow-inner">
                    {storyShareDraft.isVideo ? (
                      <video src={storyShareDraft.mediaUrl} muted playsInline controls className={`h-full w-full ${storyShareCrop === "cover" ? "object-cover" : "object-contain"}`} style={{ filter: ({ original: "none", warm: "sepia(.28) saturate(1.2)", cool: "hue-rotate(12deg) saturate(1.15)", mono: "grayscale(1)", vivid: "saturate(1.5) contrast(1.08)" })[storyShareTheme] }} />
                    ) : (
                      <img src={storyShareDraft.mediaUrl} alt="Story preview" className="h-full w-full object-contain" style={{ objectFit: storyShareCrop, filter: ({ original: "none", warm: "sepia(.28) saturate(1.2)", cool: "hue-rotate(12deg) saturate(1.15)", mono: "grayscale(1)", vivid: "saturate(1.5) contrast(1.08)" })[storyShareTheme] }} />
                    )}
                    {(storyShareCaption || storyShareDraft.postId) && <div className="pointer-events-none absolute inset-x-4 bottom-8 text-center"><span className="rounded-xl bg-black/50 px-3 py-2 text-sm font-semibold text-white shadow">{storyShareCaption || "Shared post"}</span></div>}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold">Crop</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["cover", "contain"] as const).map((crop) => <button key={crop} type="button" onClick={() => setStoryShareCrop(crop)} aria-pressed={storyShareCrop === crop} className={`rounded-xl border px-3 py-2 text-sm font-medium capitalize ${storyShareCrop === crop ? "border-purple-500 bg-purple-50 text-purple-800" : "border-gray-200"}`}>{crop === "cover" ? "Fill screen" : "Fit image"}</button>)}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold">Theme</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {(["original", "warm", "cool", "mono", "vivid"] as const).map((theme) => <button key={theme} type="button" onClick={() => setStoryShareTheme(theme)} aria-pressed={storyShareTheme === theme} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold capitalize ${storyShareTheme === theme ? "border-purple-500 bg-purple-50 text-purple-800" : "border-gray-200"}`}>{theme}</button>)}
                    </div>
                  </div>

                  <label className="block text-sm font-semibold">Add a caption
                    <textarea value={storyShareCaption} onChange={(event) => setStoryShareCaption(event.target.value.slice(0, 180))} maxLength={180} rows={2} placeholder="Write something…" className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm font-normal outline-none focus:border-purple-400" />
                  </label>

                  <button type="button" onClick={() => void publishStoryDraft()} disabled={shareStoryBusy} className="w-full rounded-xl bg-purple-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-800 disabled:opacity-60">{shareStoryBusy ? "Posting story…" : "Post story"}</button>
                </div>
              ) : (
                <>
                  <button type="button" onClick={() => setShareMode("options")} className="text-sm font-semibold text-purple-700 hover:underline">← Back to sharing options</button>
                  <label htmlFor="share-friend-search" className="block text-sm font-semibold">{tr("sendFriend")}</label>
                  <input id="share-friend-search" type="search" value={shareSearch} onChange={(event) => setShareSearch(event.target.value)} placeholder={tr("searchPeople")} className="w-full rounded-full bg-gray-100 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-gray-400" />
                  <div className="max-h-[45dvh] space-y-1 overflow-y-auto overscroll-contain">
                    {shareLoading && <p className="py-4 text-center text-sm text-gray-500">{tr("loadingPeople")}</p>}
                    {!shareLoading && filteredShareProfiles.length === 0 && <p className="py-4 text-center text-sm text-gray-500">{shareProfiles.length === 0 ? tr("noProfiles") : tr("noMatches")}</p>}
                    {!shareLoading && filteredShareProfiles.map((profile) => (
                      <div key={profile.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-gray-50">
                        {profile.avatar_url ? <img src={profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700">{(profile.display_name || profile.username || "?").charAt(0).toUpperCase()}</div>}
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{profile.display_name || profile.username || "VYBE user"}</p>{profile.username && <p className="truncate text-xs text-gray-500">@{profile.username.replace(/^@/, "")}</p>}</div>
                        <button type="button" disabled={shareSendingTo !== null} onClick={() => void sendPostToFriend(profile)} className="shrink-0 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold transition hover:bg-gray-100 disabled:opacity-50">{shareSendingTo === profile.id ? tr("sending") : tr("send")}</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {shareStatus && <p role="status" className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">{shareStatus}</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function createSimulatedNotification(
  type: "like" | "comment",
  postId: number,
  detail: string
) {
  try {
    const saved = localStorage.getItem(NOTIFICATIONS_KEY);
    const notifications: SimulatedNotification[] = saved ? JSON.parse(saved) : [];

    const actor = simulatedUsers[type === "like" ? 0 : 1];

    const notification: SimulatedNotification = {
      id: Date.now(),
      type,
      icon: type === "like" ? "heart" : "message",
      user: actor.user,
      action:
        type === "like"
          ? "liked your post."
          : "commented on your post.",
      detail,
      time: "Just now",
      unread: true,
      avatar: actor.avatar,
      postId,
    };

    localStorage.setItem(
      NOTIFICATIONS_KEY,
      JSON.stringify([notification, ...notifications])
    );

    window.dispatchEvent(new Event("project-one-notifications-updated"));
  } catch (error) {
    console.error("Could not create simulated notification:", error);
  }
}

const simulatedUsers = [
  {
    user: "Amara Okafor",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces",
  },
  {
    user: "Daniel James",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces",
  },
];
