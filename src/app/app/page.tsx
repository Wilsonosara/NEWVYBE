
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../utils/supabase/client";
import { usePosts } from "./PostContext";
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

type FeedProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

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
    deletePost,
    deleteComment,
  } = usePosts();

  const [likedPosts, setLikedPosts] = useState<number[]>([]);
  const [dislikedPosts, setDislikedPosts] = useState<number[]>([]);
  const [reactionCounts, setReactionCounts] = useState<Record<number, { likes: number; dislikes: number }>>({});
  const [reactionStatus, setReactionStatus] = useState<{ postId: number; message: string } | null>(null);
  const [savedPosts, setSavedPosts] = useState<number[]>([]);
  const [interactionsLoaded, setInteractionsLoaded] = useState(false);
  const [likesLoaded, setLikesLoaded] = useState(false);
  const [pendingLikePost, setPendingLikePost] = useState<number | null>(null);
  const [pendingSavePosts, setPendingSavePosts] = useState<number[]>([]);
  const [saveStatus, setSaveStatus] = useState("");
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
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
  const [shareProfiles, setShareProfiles] = useState<ShareProfile[]>([]);
  const [shareSearch, setShareSearch] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareSendingTo, setShareSendingTo] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState("");

  const [moreOptions, setMoreOptions] = useState<number | null>(null);
  const [highlightedPost, setHighlightedPost] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState<number | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);

  // Profile avatars are loaded from Supabase for every author in the feed.
  const [feedProfilesById, setFeedProfilesById] = useState<
    Record<string, FeedProfile>
  >({});
  const [feedProfilesByUsername, setFeedProfilesByUsername] = useState<
    Record<string, FeedProfile>
  >({});
  const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);

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

        setMyAvatarUrl(
          user?.id ? profilesById[user.id]?.avatar_url ?? null : null
        );
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
      supabase.from("post_likes").select("post_id"),
      supabase.from("post_dislikes").select("post_id"),
    ]);

    if (allLikesResult.error) throw allLikesResult.error;
    if (allDislikesResult.error) throw allDislikesResult.error;

    const counts: Record<number, { likes: number; dislikes: number }> = {};
    for (const row of allLikesResult.data ?? []) {
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

    const postId = Number(postParam);

    if (!Number.isSafeInteger(postId) || postId <= 0) return;

    const matchingPostExists = posts.some((post) => post.id === postId);
    if (!matchingPostExists) return;

    const timer = window.setTimeout(() => {
      const postElement = document.getElementById(`post-${postId}`);

      if (postElement) {
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
      await addComment(postId, cleanComment, audioFile ?? undefined);
      createSimulatedNotification(
        "comment",
        postId,
        cleanComment || "Voice comment"
      );
      setCommentText("");
      clearVoiceComment();
    } catch (error) {
      setCommentError(
        error instanceof Error ? error.message : "Could not add your comment."
      );
    }
  };

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
      const postUrl = getShareUrl(postId);
      const post = posts.find((item) => item.id === postId);

      let postContent = post?.content ?? "";
      let mediaPath = post?.mediaId ?? "";
      let mediaType = post?.mediaType ?? "";

      const { data: databasePost, error: postLookupError } = await supabase
        .from("posts")
        .select("content, media_path, media_type, media_name")
        .eq("id", postId)
        .maybeSingle();

      if (postLookupError) {
        console.warn(
          "Could not retrieve the post's database media details:",
          postLookupError
        );
      } else if (databasePost) {
        if (typeof databasePost.content === "string") {
          postContent = databasePost.content;
        }

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

      const preview = postContent.trim()
        ? postContent.trim().slice(0, 180)
        : tr("postPreview");

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
        `${tr("checkPost")}\n${preview}\n${postUrl}`,
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

  return (
    <main className="min-h-screen min-w-0 bg-white text-black">
      <div className="mx-auto w-full max-w-2xl min-w-0 px-3 pb-6 pt-3 sm:px-5 sm:pt-5">
        <header className="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
          <Link href="/app" className="text-2xl font-black tracking-tight">
            VYBE<span className="text-gray-400">.</span>
          </Link>

          <Link
            href="/app/create"
            aria-label={tr("createPost")}
            title={tr("createPost")}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gray-800 transition hover:bg-gray-100"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <path d="M12 8v8M8 12h8" />
            </svg>
          </Link>
        </header>

        <section className="mb-6 border-b border-gray-100 pb-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">{tr("stories")}</h2>
            <span className="text-xs text-gray-400">{tr("happening")}</span>
          </div>

          <div className="min-w-0">
            <Stories />
          </div>
        </section>

        <section className="mb-6 border-b border-gray-100 pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/app/profile"
              aria-label={tr("yourProfile")}
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-lg font-bold text-black"
            >
              {myAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={myAvatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                "G"
              )}
            </Link>

            <Link
              href="/app/create"
              className="flex h-11 min-w-0 flex-1 items-center rounded-full bg-gray-100 px-4 text-sm text-gray-500 transition hover:bg-gray-200"
            >
              {tr("sharePlaceholder")}
            </Link>

            <Link
              href="/app/create"
              aria-label={tr("addMedia")}
              title={tr("addMedia")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-gray-100"
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
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </Link>
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

          {posts.map((post) => {
            const isLiked = likedPosts.includes(post.id);
            const isDisliked = dislikedPosts.includes(post.id);
            const postReactionCounts = reactionCounts[post.id] ?? { likes: 0, dislikes: 0 };
            const isSaved = savedPosts.includes(post.id);
            const isSavePending = pendingSavePosts.includes(post.id);
            const postComments = allPostComments[post.id] || [];
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
                    ? "rounded-xl bg-yellow-50 ring-2 ring-yellow-300 ring-offset-4"
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
                  <div className="pb-3">
                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-900">
                      {post.content}
                    </p>
                  </div>
                )}

                <MediaDisplay
                  mediaId={post.mediaId}
                  mediaType={post.mediaType}
                  mediaName={post.mediaName}
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
                      onClick={() => void toggleLike(post.id)}
                      disabled={!likesLoaded || isLikePending}
                      aria-label={isLiked ? tr("unlikePost") : tr("likePost")}
                      aria-pressed={isLiked}
                      className={`flex items-center gap-1.5 text-sm transition disabled:opacity-50 ${
  isLiked
    ? "text-green-600 hover:text-green-700"
    : "text-gray-800 hover:text-green-600"
}`}
                    >
                      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
                        <path d="M1 21h4V9H1v12ZM23 10c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2Z" />
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
                        setOpenComments(
                          openComments === post.id ? null : post.id
                        );
                        setCommentText("");
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

                {openComments === post.id && (
                  <div className="mt-4 border-t border-gray-100 pt-4">
                    <div className="space-y-3">
                      {postComments.map((comment, index) => (
                        <div
                          key={`${post.id}-comment-${index}`}
                          className="text-sm"
                        >
                          {comment.userId ? (
                            <Link
                              href={`/app/profile?id=${encodeURIComponent(comment.userId)}`}
                              className="mr-2 font-bold hover:underline"
                            >
                              {comment.author}
                            </Link>
                          ) : (
                            <span className="mr-2 font-bold">
                              {comment.author}
                            </span>
                          )}
                          <span className="break-words text-gray-700">
                            {comment.content}
                          </span>
                          {comment.userId === currentUserId && (
                            <button
                              type="button"
                              onClick={() =>
                                void handleDeleteComment(post.id, comment.id)
                              }
                              disabled={deletingCommentId !== null}
                              className="ml-2 text-xs text-gray-500 hover:text-black hover:underline disabled:opacity-50"
                            >
                              {deletingCommentId === comment.id
                                ? "Deleting…"
                                : "Delete"}
                            </button>
                          )}
                          {comment.audioUrl && (
                            <div className="mt-2 max-w-full">
                              <p className="mb-1 text-xs font-medium text-gray-500">
                                {comment.username || `@${comment.author.replace(/^@/, "")}`}
                              </p>
                              <audio
                                controls
                                preload="none"
                                src={comment.audioUrl}
                                className="block h-10 max-w-full"
                                aria-label={`Voice comment by ${comment.username || comment.author}`}
                              />
                            </div>
                          )}
                        </div>
                      ))}

                      {postComments.length === 0 && (
                        <p className="text-sm text-gray-500">
                          {tr("firstComment")}
                        </p>
                      )}
                    </div>

                    {recordingCommentPostId === post.id && (
                      <p className="mt-3 text-xs text-gray-500" role="status">
                        Recording voice comment… Tap the microphone to stop.
                      </p>
                    )}

                    {voiceCommentPostId === post.id && voiceCommentUrl && (
                      <div className="mt-3 flex items-center gap-2">
                        <audio
                          controls
                          src={voiceCommentUrl}
                          className="h-10 min-w-0 flex-1"
                          aria-label="Preview voice comment"
                        />
                        <button
                          type="button"
                          onClick={clearVoiceComment}
                          className="px-2 py-2 text-sm text-gray-600 hover:text-black"
                          aria-label="Remove voice recording"
                        >
                          Remove
                        </button>
                      </div>
                    )}

                    {commentError && (
                      <p className="mt-2 text-xs text-red-600" role="alert">
                        {commentError}
                      </p>
                    )}

                    <form
                      className="mt-4 flex min-w-0 items-center gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void submitComment(post.id);
                      }}
                    >
                      <input
                        type="text"
                        value={commentText}
                        onChange={(event) => setCommentText(event.target.value)}
                        placeholder={tr("addComment")}
                        aria-label={tr("addComment")}
                        className="min-w-0 flex-1 rounded-full bg-gray-100 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-gray-400"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          recordingCommentPostId === post.id
                            ? stopVoiceComment()
                            : void startVoiceComment(post.id)
                        }
                        disabled={
                          (recordingCommentPostId !== null &&
                            recordingCommentPostId !== post.id) ||
                          (voiceCommentPostId !== null &&
                            voiceCommentPostId !== post.id)
                        }
                        className="shrink-0 rounded-full bg-gray-100 p-3 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        aria-label={
                          recordingCommentPostId === post.id
                            ? "Stop voice recording"
                            : "Record voice comment"
                        }
                        title={
                          recordingCommentPostId === post.id
                            ? "Stop recording"
                            : "Record voice comment"
                        }
                      >
                        {recordingCommentPostId === post.id ? (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5 fill-current"
                            aria-hidden="true"
                          >
                            <rect x="6" y="6" width="12" height="12" rx="2" />
                          </svg>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5 fill-none stroke-current"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <rect x="9" y="2" width="6" height="12" rx="3" />
                            <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
                          </svg>
                        )}
                      </button>

                      <button
                        type="submit"
                        disabled={
                          !commentText.trim() &&
                          !(voiceCommentPostId === post.id && voiceCommentFile)
                        }
                        className="shrink-0 px-2 py-2 text-sm font-bold text-black disabled:text-gray-300"
                      >
                        {tr("post")}
                      </button>
                    </form>
                  </div>
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

      {shareDialogPost !== null && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              shareSendingTo === null
            ) {
              setShareDialogPost(null);
              setShareStatus("");
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-post-title"
            className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 id="share-post-title" className="text-base font-bold">
                {tr("sharePost")}
              </h2>

              <button
                type="button"
                aria-label={tr("closeShare")}
                onClick={() => {
                  if (shareSendingTo === null) {
                    setShareDialogPost(null);
                    setShareStatus("");
                  }
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-gray-500 hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              <button
                type="button"
                onClick={() => void copyPostLink(shareDialogPost)}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition hover:bg-gray-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 13a5 5 0 0 0 7.07 0l3-3A5 5 0 0 0 13 2.93l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 11 21.07l1.71-1.71" />
                  </svg>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {tr("copyLink")}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {tr("directLink")}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const shareUrl = getShareUrl(shareDialogPost);

                  try {
                    if (navigator.share) {
                      await navigator.share({
                        title: "VYBE",
                        text: tr("checkPost"),
                        url: shareUrl,
                      });
                    } else {
                      await copyPostLink(shareDialogPost);
                    }
                  } catch (error) {
                    if (
                      !(error instanceof Error && error.name === "AbortError")
                    ) {
                      setShareStatus(tr("sharingUnavailable"));
                    }
                  }
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 p-3 text-left transition hover:bg-gray-50"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4" />
                  </svg>
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {tr("shareOutside")}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {tr("deviceSharing")}
                  </span>
                </span>
              </button>

              <div>
                <label
                  htmlFor="share-friend-search"
                  className="mb-2 block text-sm font-semibold"
                >
                  {tr("sendFriend")}
                </label>

                <input
                  id="share-friend-search"
                  type="search"
                  value={shareSearch}
                  onChange={(event) => setShareSearch(event.target.value)}
                  placeholder={tr("searchPeople")}
                  className="w-full rounded-full bg-gray-100 px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>

              <div className="max-h-52 space-y-1 overflow-y-auto">
                {shareLoading && (
                  <p className="py-4 text-center text-sm text-gray-500">
                    {tr("loadingPeople")}
                  </p>
                )}

                {!shareLoading && filteredShareProfiles.length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-500">
                    {shareProfiles.length === 0
                      ? tr("noProfiles")
                      : tr("noMatches")}
                  </p>
                )}

                {!shareLoading &&
                  filteredShareProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-gray-50"
                    >
                      {profile.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatar_url}
                          alt=""
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-700">
                          {(profile.display_name || profile.username || "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {profile.display_name ||
                            profile.username ||
                            "VYBE user"}
                        </p>

                        {profile.username && (
                          <p className="truncate text-xs text-gray-500">
                            @{profile.username.replace(/^@/, "")}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={shareSendingTo !== null}
                        onClick={() => void sendPostToFriend(profile)}
                        className="shrink-0 rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold transition hover:bg-gray-100 disabled:opacity-50"
                      >
                        {shareSendingTo === profile.id
                          ? tr("sending")
                          : tr("send")}
                      </button>
                    </div>
                  ))}
              </div>

              {shareStatus && (
                <p
                  role="status"
                  className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600"
                >
                  {shareStatus}
                </p>
              )}
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
