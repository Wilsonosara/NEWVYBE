
"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../../utils/supabase/client";
import { useLanguage } from "../LanguageProvider";
import type { Language } from "../LanguageProvider";
import { usePosts } from "../PostContext";
import ContactAvatarIcon from "../ContactAvatarIcon";
import ExploreMediaTile from "./ExploreMediaTile";
import type { Post, PostMedia } from "../../lib/posts";

type Person = {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatarUrl: string | null;
};

type BlockRelationship = {
  blocker_id: string;
  blocked_id: string;
};

type SearchPostRow = {
  id: number;
  user_id: string;
  author: string;
  username: string;
  content: string;
  world: string;
  likes: number;
  comments: number;
  video_views?: number | null;
  media_path: string | null;
  media_type: "image" | "video" | null;
  media_name: string | null;
  media_items: PostMedia[] | null;
  created_at: string;
};

const translations: Record<Language, Record<string, string>> = {
  en: {
    discover: "Discover your next interest",
    explore: "Explore",
    allContent: "All",
    intro: "Find your people, discover new worlds, and join conversations happening across VYBE.",
    searchPlaceholder: "Search any user, post or video...",
    searchLabel: "Search any user, post or video",
    clear: "Clear",
    worlds: "Explore worlds",
    worldsDescription: "Find the space that interests you.",
    sports: "Sports",
    sportsDescription: "Football, team communities, matchday and banter",
    social: "Social",
    socialDescription: "Everyday posts, entertainment, gaming and creators",
    learn: "Learn",
    career: "Career",
    careerDescription: "Learning, technology, business and opportunities",
    trending: "Trending topics",
    trendingDescription: "Explore conversations by topic.",
    topics: "Topics",
    posts: "posts",
    noTrending: "No trending topics match your search.",
    searchResults: "Search results",
    peopleToDiscover: "People to discover",
    peopleDescription: "Find VYBE members by name or username.",
    seeMore: "See more",
    loadingPeople: "Loading VYBE members...",
    blockCheckError: "We couldn't verify blocked accounts. Please refresh the page before discovering members.",
    loadPeopleError: "We couldn't load users. Please check your connection and try again.",
    accountLoadError: "Some account information could not be loaded. Please refresh the page.",
    openProfile: "Open {name}'s profile",
    you: "You",
    pleaseWait: "Please wait...",
    following: "Following",
    follow: "Follow",
    noMatchingPeople: "No matching members found.",
    noPeople: "No discoverable members yet.",
    tryAnother: "Try another username or display name.",
    membersAppear: "Members with a saved username will appear here.",
    loginToFollow: "Please log in to follow other members.",
    blockedFollow: "You cannot follow this member because a block relationship exists.",
    unfollowError: "We couldn't unfollow this member. Please try again.",
    followError: "We couldn't follow this member. Please try again.",
    dismiss: "Dismiss",
    conversationTitle: "Your next conversation starts here.",
    conversationDescription: "Find your people, explore your interests, and join conversations across VYBE.",
    createPost: "Create a post",
    member: "VYBE member",
  },
  fr: {
    discover: "Découvrez votre prochain centre d’intérêt",
    explore: "Explorer",
    allContent: "Tout",
    intro: "Trouvez votre communauté, découvrez de nouveaux univers et rejoignez les conversations sur VYBE.",
    searchPlaceholder: "Rechercher une personne, une publication ou une vidéo...",
    searchLabel: "Rechercher une personne, une publication ou une vidéo",
    clear: "Effacer",
    worlds: "Explorer les univers",
    worldsDescription: "Trouvez l’espace qui vous intéresse.",
    sports: "Sports",
    sportsDescription: "Football, communautés d’équipes, matchs et débats",
    social: "Social",
    socialDescription: "Publications, divertissement, jeux et créateurs",
    learn: "Apprendre",
    career: "Carrière",
    careerDescription: "Apprentissage, technologie, affaires et opportunités",
    trending: "Sujets tendance",
    trendingDescription: "Explorez les conversations par sujet.",
    topics: "Sujets",
    posts: "publications",
    noTrending: "Aucun sujet tendance ne correspond à votre recherche.",
    searchResults: "Résultats de recherche",
    peopleToDiscover: "Personnes à découvrir",
    peopleDescription: "Trouvez des membres de VYBE par nom ou nom d’utilisateur.",
    seeMore: "Voir plus",
    loadingPeople: "Chargement des membres de VYBE...",
    blockCheckError: "Impossible de vérifier les comptes bloqués. Actualisez la page avant de découvrir des membres.",
    loadPeopleError: "Impossible de charger les utilisateurs. Vérifiez votre connexion et réessayez.",
    accountLoadError: "Certaines informations du compte n’ont pas pu être chargées. Actualisez la page.",
    openProfile: "Ouvrir le profil de {name}",
    you: "Vous",
    pleaseWait: "Veuillez patienter...",
    following: "Abonné(e)",
    follow: "Suivre",
    noMatchingPeople: "Aucun membre correspondant trouvé.",
    noPeople: "Aucun membre à découvrir pour le moment.",
    tryAnother: "Essayez un autre nom ou nom d’utilisateur.",
    membersAppear: "Les membres ayant un nom d’utilisateur apparaîtront ici.",
    loginToFollow: "Connectez-vous pour suivre d’autres membres.",
    blockedFollow: "Vous ne pouvez pas suivre ce membre en raison d’un blocage.",
    unfollowError: "Impossible de ne plus suivre ce membre. Réessayez.",
    followError: "Impossible de suivre ce membre. Réessayez.",
    dismiss: "Fermer",
    conversationTitle: "Votre prochaine conversation commence ici.",
    conversationDescription: "Trouvez votre communauté, explorez vos intérêts et échangez sur VYBE.",
    createPost: "Créer une publication",
    member: "Membre de VYBE",
  },
  es: {
    discover: "Descubre tu próximo interés",
    explore: "Explorar",
    allContent: "Todo",
    intro: "Encuentra a tu gente, descubre nuevos mundos y únete a las conversaciones de VYBE.",
    searchPlaceholder: "Busca usuarios, publicaciones o videos...",
    searchLabel: "Busca usuarios, publicaciones o videos",
    clear: "Borrar",
    worlds: "Explorar mundos",
    worldsDescription: "Encuentra el espacio que te interesa.",
    sports: "Deportes",
    sportsDescription: "Fútbol, comunidades de equipos, partidos y debates",
    social: "Social",
    socialDescription: "Publicaciones, entretenimiento, videojuegos y creadores",
    learn: "Aprender",
    career: "Carrera",
    careerDescription: "Aprendizaje, tecnología, negocios y oportunidades",
    trending: "Temas populares",
    trendingDescription: "Explora conversaciones por tema.",
    topics: "Temas",
    posts: "publicaciones",
    noTrending: "Ningún tema popular coincide con tu búsqueda.",
    searchResults: "Resultados de búsqueda",
    peopleToDiscover: "Personas por descubrir",
    peopleDescription: "Encuentra miembros de VYBE por nombre o usuario.",
    seeMore: "Ver más",
    loadingPeople: "Cargando miembros de VYBE...",
    blockCheckError: "No pudimos verificar las cuentas bloqueadas. Actualiza la página antes de descubrir miembros.",
    loadPeopleError: "No pudimos cargar los usuarios. Comprueba tu conexión e inténtalo de nuevo.",
    accountLoadError: "No se pudo cargar parte de la información de la cuenta. Actualiza la página.",
    openProfile: "Abrir el perfil de {name}",
    you: "Tú",
    pleaseWait: "Espera...",
    following: "Siguiendo",
    follow: "Seguir",
    noMatchingPeople: "No se encontraron miembros coincidentes.",
    noPeople: "Todavía no hay miembros para descubrir.",
    tryAnother: "Prueba con otro nombre o usuario.",
    membersAppear: "Aquí aparecerán los miembros con un nombre de usuario guardado.",
    loginToFollow: "Inicia sesión para seguir a otros miembros.",
    blockedFollow: "No puedes seguir a este miembro porque existe un bloqueo.",
    unfollowError: "No pudimos dejar de seguir a este miembro. Inténtalo de nuevo.",
    followError: "No pudimos seguir a este miembro. Inténtalo de nuevo.",
    dismiss: "Cerrar",
    conversationTitle: "Tu próxima conversación empieza aquí.",
    conversationDescription: "Encuentra a tu gente, explora tus intereses y conversa en VYBE.",
    createPost: "Crear publicación",
    member: "Miembro de VYBE",
  },
  pt: {
    discover: "Descubra seu próximo interesse",
    explore: "Explorar",
    allContent: "Tudo",
    intro: "Encontre sua comunidade, descubra novos mundos e participe das conversas no VYBE.",
    searchPlaceholder: "Pesquise pessoas, publicações ou vídeos...",
    searchLabel: "Pesquise pessoas, publicações ou vídeos",
    clear: "Limpar",
    worlds: "Explorar mundos",
    worldsDescription: "Encontre o espaço que interessa a você.",
    sports: "Esportes",
    sportsDescription: "Futebol, comunidades de times, jogos e debates",
    social: "Social",
    socialDescription: "Publicações, entretenimento, jogos e criadores",
    learn: "Aprender",
    career: "Carreira",
    careerDescription: "Aprendizado, tecnologia, negócios e oportunidades",
    trending: "Assuntos em alta",
    trendingDescription: "Explore conversas por assunto.",
    topics: "Assuntos",
    posts: "publicações",
    noTrending: "Nenhum assunto em alta corresponde à sua busca.",
    searchResults: "Resultados da busca",
    peopleToDiscover: "Pessoas para conhecer",
    peopleDescription: "Encontre membros do VYBE pelo nome ou usuário.",
    seeMore: "Ver mais",
    loadingPeople: "Carregando membros do VYBE...",
    blockCheckError: "Não foi possível verificar as contas bloqueadas. Atualize a página antes de descobrir membros.",
    loadPeopleError: "Não foi possível carregar os usuários. Verifique sua conexão e tente novamente.",
    accountLoadError: "Não foi possível carregar algumas informações da conta. Atualize a página.",
    openProfile: "Abrir o perfil de {name}",
    you: "Você",
    pleaseWait: "Aguarde...",
    following: "Seguindo",
    follow: "Seguir",
    noMatchingPeople: "Nenhum membro correspondente foi encontrado.",
    noPeople: "Ainda não há membros para descobrir.",
    tryAnother: "Tente outro nome ou usuário.",
    membersAppear: "Membros com nome de usuário salvo aparecerão aqui.",
    loginToFollow: "Entre na sua conta para seguir outros membros.",
    blockedFollow: "Você não pode seguir este membro porque existe um bloqueio.",
    unfollowError: "Não foi possível deixar de seguir este membro. Tente novamente.",
    followError: "Não foi possível seguir este membro. Tente novamente.",
    dismiss: "Fechar",
    conversationTitle: "Sua próxima conversa começa aqui.",
    conversationDescription: "Encontre sua comunidade, explore seus interesses e participe das conversas no VYBE.",
    createPost: "Criar publicação",
    member: "Membro do VYBE",
  },
  ar: {
    discover: "اكتشف اهتمامك القادم",
    explore: "استكشف",
    allContent: "الكل",
    intro: "اعثر على مجتمعك، واكتشف عوالم جديدة، وانضم إلى المحادثات على VYBE.",
    searchPlaceholder: "ابحث عن مستخدم أو منشور أو فيديو...",
    searchLabel: "البحث عن مستخدم أو منشور أو فيديو",
    clear: "مسح",
    worlds: "استكشف العوالم",
    worldsDescription: "اعثر على المساحة التي تهمك.",
    sports: "الرياضة",
    sportsDescription: "كرة القدم ومجتمعات الفرق ويوم المباراة والنقاشات",
    social: "اجتماعي",
    socialDescription: "المنشورات والترفيه والألعاب وصنّاع المحتوى",
    learn: "تعلّم",
    career: "المهنة",
    careerDescription: "التعلّم والتقنية والأعمال والفرص",
    trending: "المواضيع الرائجة",
    trendingDescription: "استكشف المحادثات حسب الموضوع.",
    topics: "المواضيع",
    posts: "منشور",
    noTrending: "لا توجد مواضيع رائجة تطابق بحثك.",
    searchResults: "نتائج البحث",
    peopleToDiscover: "أشخاص لاكتشافهم",
    peopleDescription: "اعثر على أعضاء VYBE بالاسم أو اسم المستخدم.",
    seeMore: "عرض المزيد",
    loadingPeople: "جارٍ تحميل أعضاء VYBE...",
    blockCheckError: "تعذّر التحقق من الحسابات المحظورة. حدّث الصفحة قبل اكتشاف الأعضاء.",
    loadPeopleError: "تعذّر تحميل المستخدمين. تحقق من اتصالك وحاول مرة أخرى.",
    accountLoadError: "تعذّر تحميل بعض معلومات الحساب. حدّث الصفحة.",
    openProfile: "فتح الملف الشخصي لـ {name}",
    you: "أنت",
    pleaseWait: "يرجى الانتظار...",
    following: "تتابعه",
    follow: "متابعة",
    noMatchingPeople: "لم يتم العثور على أعضاء مطابقين.",
    noPeople: "لا يوجد أعضاء لاكتشافهم بعد.",
    tryAnother: "جرّب اسمًا أو اسم مستخدم آخر.",
    membersAppear: "سيظهر هنا الأعضاء الذين لديهم اسم مستخدم محفوظ.",
    loginToFollow: "سجّل الدخول لمتابعة الأعضاء الآخرين.",
    blockedFollow: "لا يمكنك متابعة هذا العضو بسبب وجود حظر.",
    unfollowError: "تعذّر إلغاء متابعة هذا العضو. حاول مرة أخرى.",
    followError: "تعذّرت متابعة هذا العضو. حاول مرة أخرى.",
    dismiss: "إغلاق",
    conversationTitle: "تبدأ محادثتك القادمة من هنا.",
    conversationDescription: "اعثر على مجتمعك واستكشف اهتماماتك وانضم إلى المحادثات على VYBE.",
    createPost: "إنشاء منشور",
    member: "عضو في VYBE",
  },
  ha: {
    discover: "Gano abin da zai ja hankalinka na gaba",
    explore: "Bincika",
    allContent: "Duka",
    intro: "Nemo mutanen da suka dace da kai, gano sababbin duniyoyi, kuma shiga tattaunawar VYBE.",
    searchPlaceholder: "Nemo mai amfani, rubutu ko bidiyo...",
    searchLabel: "Nemo mai amfani, rubutu ko bidiyo",
    clear: "Share",
    worlds: "Bincika duniyoyi",
    worldsDescription: "Nemo wurin da ya fi jan hankalinka.",
    sports: "Wasanni",
    sportsDescription: "Ƙwallon ƙafa, ƙungiyoyi, ranar wasa da muhawara",
    social: "Zamantakewa",
    socialDescription: "Rubuce-rubuce, nishaɗi, wasanni da masu ƙirƙira",
    learn: "Koyo",
    career: "Sana'a",
    careerDescription: "Koyo, fasaha, kasuwanci da damammaki",
    trending: "Batutuwa masu tasowa",
    trendingDescription: "Bincika tattaunawa bisa batu.",
    topics: "Batutuwa",
    posts: "rubuce-rubuce",
    noTrending: "Babu batun da ya dace da bincikenka.",
    searchResults: "Sakamakon bincike",
    peopleToDiscover: "Mutanen da za ka iya sani",
    peopleDescription: "Nemo membobin VYBE da suna ko sunan mai amfani.",
    seeMore: "Duba ƙari",
    loadingPeople: "Ana loda membobin VYBE...",
    blockCheckError: "Ba a iya tabbatar da asusun da aka toshe ba. Sabunta shafin kafin binciken membobi.",
    loadPeopleError: "Ba a iya loda masu amfani ba. Duba haɗin intanet ka sake gwadawa.",
    accountLoadError: "Ba a iya loda wasu bayanan asusu ba. Sabunta shafin.",
    openProfile: "Buɗe bayanan {name}",
    you: "Kai",
    pleaseWait: "Jira kaɗan...",
    following: "Kana bi",
    follow: "Bi",
    noMatchingPeople: "Ba a sami membobin da suka dace ba.",
    noPeople: "Babu membobin da za a gano tukuna.",
    tryAnother: "Gwada wani suna ko sunan mai amfani.",
    membersAppear: "Membobin da suka adana sunan mai amfani za su bayyana a nan.",
    loginToFollow: "Shiga asusunka domin bin sauran membobi.",
    blockedFollow: "Ba za ka iya bin wannan memba ba saboda akwai toshewa.",
    unfollowError: "Ba a iya daina bin wannan memba ba. Sake gwadawa.",
    followError: "Ba a iya bin wannan memba ba. Sake gwadawa.",
    dismiss: "Rufe",
    conversationTitle: "Sabuwar tattaunawarka tana farawa a nan.",
    conversationDescription: "Nemo mutanenka, bincika abubuwan da kake so, kuma shiga tattaunawar VYBE.",
    createPost: "Ƙirƙiri rubutu",
    member: "Memba na VYBE",
  },
  yo: {
    discover: "Ṣàwárí ohun tuntun tó máa wù ọ́",
    explore: "Ṣàwárí",
    allContent: "Gbogbo",
    intro: "Wá àwọn ènìyàn rẹ, ṣàwárí àwọn ayé tuntun, kí o sì darapọ̀ mọ́ ìjíròrò lórí VYBE.",
    searchPlaceholder: "Wá aṣàmúlò, ìfìwéránṣẹ́ tàbí fídíò...",
    searchLabel: "Wá aṣàmúlò, ìfìwéránṣẹ́ tàbí fídíò",
    clear: "Pa rẹ́",
    worlds: "Ṣàwárí àwọn ayé",
    worldsDescription: "Wá ibi tó bá ohun tó fẹ́ràn mu.",
    sports: "Eré ìdárayá",
    sportsDescription: "Bọ́ọ̀lù, àwùjọ ẹgbẹ́, ọjọ́ eré àti ìjíròrò",
    social: "Àwùjọ",
    socialDescription: "Àwọn ìfìwéránṣẹ́, eré ìnàjú, eré kọ̀ǹpútà àti àwọn olùṣẹ̀dá",
    learn: "Kọ́ ẹ̀kọ́",
    career: "Iṣẹ́",
    careerDescription: "Ẹ̀kọ́, ìmọ̀ ẹ̀rọ, òwò àti àǹfààní",
    trending: "Àwọn àkòrí tó gbajúmọ̀",
    trendingDescription: "Ṣàwárí ìjíròrò nípa àkòrí.",
    topics: "Àwọn àkòrí",
    posts: "ìfìwéránṣẹ́",
    noTrending: "Kò sí àkòrí tó bá ìwárí rẹ mu.",
    searchResults: "Àbájáde ìwárí",
    peopleToDiscover: "Àwọn ènìyàn láti mọ̀",
    peopleDescription: "Wá àwọn ọmọ ẹgbẹ́ VYBE nípa orúkọ tàbí orúkọ aṣàmúlò.",
    seeMore: "Wo sí i",
    loadingPeople: "A ń gbé àwọn ọmọ ẹgbẹ́ VYBE wọlé...",
    blockCheckError: "A kò lè ṣàyẹ̀wò àwọn àkọọ́lẹ̀ tí a dí. Sọ ojú ìwé di tuntun kí o tó wá àwọn ọmọ ẹgbẹ́.",
    loadPeopleError: "A kò lè gbé àwọn aṣàmúlò wọlé. Ṣàyẹ̀wò ìsopọ̀ rẹ kí o sì tún gbìyànjú.",
    accountLoadError: "A kò lè gbé díẹ̀ lára ìwífún àkọọ́lẹ̀ wọlé. Sọ ojú ìwé di tuntun.",
    openProfile: "Ṣí ojú ìwé {name}",
    you: "Ìwọ",
    pleaseWait: "Dúró díẹ̀...",
    following: "O ń tẹ̀lé",
    follow: "Tẹ̀lé",
    noMatchingPeople: "A kò rí ọmọ ẹgbẹ́ tó bá ìwárí mu.",
    noPeople: "Kò sí ọmọ ẹgbẹ́ láti ṣàwárí síbẹ̀.",
    tryAnother: "Gbìyànjú orúkọ mìíràn.",
    membersAppear: "Àwọn ọmọ ẹgbẹ́ tó ní orúkọ aṣàmúlò tí a fipamọ́ yóò hàn níbí.",
    loginToFollow: "Wọlé láti lè tẹ̀lé àwọn ọmọ ẹgbẹ́ mìíràn.",
    blockedFollow: "O kò lè tẹ̀lé ọmọ ẹgbẹ́ yìí nítorí ìdíwọ́ kan wà.",
    unfollowError: "A kò lè dá títẹ̀lé ọmọ ẹgbẹ́ yìí dúró. Gbìyànjú lẹ́ẹ̀kan sí i.",
    followError: "A kò lè tẹ̀lé ọmọ ẹgbẹ́ yìí. Gbìyànjú lẹ́ẹ̀kan sí i.",
    dismiss: "Pa",
    conversationTitle: "Ìjíròrò tuntun rẹ bẹ̀rẹ̀ níbí.",
    conversationDescription: "Wá àwọn ènìyàn rẹ, ṣàwárí ohun tó wù ọ́, kí o sì darapọ̀ mọ́ ìjíròrò lórí VYBE.",
    createPost: "Ṣẹ̀dá ìfìwéránṣẹ́",
    member: "Ọmọ ẹgbẹ́ VYBE",
  },
  ig: {
    discover: "Chọpụta ihe ọhụrụ ga-amasị gị",
    explore: "Chọpụta",
    allContent: "Ha niile",
    intro: "Chọta ndị gị, chọpụta ụwa ọhụrụ, ma sonyere mkparịta ụka na VYBE.",
    searchPlaceholder: "Chọọ onye ọrụ, ozi ma ọ bụ vidiyo...",
    searchLabel: "Chọọ onye ọrụ, ozi ma ọ bụ vidiyo",
    clear: "Hichapụ",
    worlds: "Chọpụta ụwa dị iche iche",
    worldsDescription: "Chọta ebe masịrị gị.",
    sports: "Egwuregwu",
    sportsDescription: "Bọọlụ, obodo ndị otu, ụbọchị egwuregwu na mkparịta ụka",
    social: "Mmekọrịta",
    socialDescription: "Ozi, ihe ntụrụndụ, egwuregwu na ndị okike",
    learn: "Mụta ihe",
    career: "Ọrụ",
    careerDescription: "Mmụta, teknụzụ, azụmahịa na ohere",
    trending: "Isiokwu ndị na-ewu ewu",
    trendingDescription: "Chọpụta mkparịta ụka site n’isiokwu.",
    topics: "Isiokwu",
    posts: "ozi",
    noTrending: "Enweghị isiokwu na-ewu ewu dabara na ọchụchọ gị.",
    searchResults: "Nsonaazụ ọchụchọ",
    peopleToDiscover: "Ndị ị ga-amata",
    peopleDescription: "Chọta ndị otu VYBE site n’aha ma ọ bụ aha njirimara.",
    seeMore: "Hụkwuo",
    loadingPeople: "A na-ebunye ndị otu VYBE...",
    blockCheckError: "Anyị enweghị ike ịchọpụta akaụntụ ndị egbochiri. Megharịa ibe ahụ tupu ịchọọ ndị otu.",
    loadPeopleError: "Anyị enweghị ike ibunye ndị ọrụ. Lelee njikọ gị ma nwaa ọzọ.",
    accountLoadError: "Enweghị ike ibunye ụfọdụ ozi akaụntụ. Megharịa ibe ahụ.",
    openProfile: "Mepee profaịlụ {name}",
    you: "Gị",
    pleaseWait: "Biko chere...",
    following: "Ị na-eso",
    follow: "Soro",
    noMatchingPeople: "Ahụghị onye otu dabara na ọchụchọ ahụ.",
    noPeople: "Enweghị ndị otu ị ga-achọpụta ugbu a.",
    tryAnother: "Nwaa aha ma ọ bụ aha njirimara ọzọ.",
    membersAppear: "Ndị otu nwere aha njirimara echekwara ga-apụta ebe a.",
    loginToFollow: "Banye ka ị soro ndị otu ndị ọzọ.",
    blockedFollow: "Ị gaghị eso onye otu a n'ihi na e nwere mgbochi.",
    unfollowError: "Anyị enweghị ike ịkwụsị iso onye otu a. Biko nwaa ọzọ.",
    followError: "Anyị enweghị ike iso onye otu a. Biko nwaa ọzọ.",
    dismiss: "Mechie",
    conversationTitle: "Mkparịta ụka ọhụrụ gị na-amalite ebe a.",
    conversationDescription: "Chọta ndị gị, chọpụta ihe masịrị gị ma sonyere mkparịta ụka na VYBE.",
    createPost: "Mepụta ozi",
    member: "Onye otu VYBE",
  },
};

function mapSearchPost(row: SearchPostRow): Post {
  const mediaItems = Array.isArray(row.media_items) ? row.media_items : [];
  const fallbackMedia: PostMedia[] = row.media_path
    ? [{ mediaId: row.media_path, mediaType: row.media_type ?? "image", mediaName: row.media_name ?? "Post media" }]
    : [];
  const items = mediaItems.length ? mediaItems : fallbackMedia;
  const first = items[0];
  return {
    id: Number(row.id), author: row.author, username: row.username, authorId: row.user_id,
    content: row.content, world: row.world, likes: Number(row.likes ?? 0), comments: Number(row.comments ?? 0), views: Number(row.video_views ?? 0), time: row.created_at,
    ...(first ? { mediaId: first.mediaId, mediaType: first.mediaType, mediaName: first.mediaName } : {}),
    ...(items.length ? { mediaItems: items } : {}),
  };
}

export default function ExplorePage() {
  const { language } = useLanguage();
  const c = translations[language] ?? translations.en;
  const { posts } = usePosts();

  const [search, setSearch] = useState("");
  const [searchPosts, setSearchPosts] = useState<Post[]>([]);
  const [searchPostsLoading, setSearchPostsLoading] = useState(false);
  const [searchPostsError, setSearchPostsError] = useState("");
  const [shuffledFeedPosts, setShuffledFeedPosts] = useState<Post[]>([]);
  const shuffledFeedSignatureRef = useRef("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [blocksLoaded, setBlocksLoaded] = useState(false);
  const [blockLoadError, setBlockLoadError] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [peopleError, setPeopleError] = useState("");
  const [followBusyIds, setFollowBusyIds] = useState<string[]>([]);
  const [followError, setFollowError] = useState("");

  const categories = [
    { name: c.sports, href: "/app/sports" },
    { name: c.career, href: "/app/career" },
    { name: c.social, href: "/app" },
  ];

  useEffect(() => {
    const onViewsUpdated = (event: Event) => {
      const { postId, views } = (event as CustomEvent<{ postId: number; views: number }>).detail ?? {};
      if (typeof postId !== "number" || typeof views !== "number") return;
      const updateViews = (post: Post) => post.id === postId ? { ...post, views } : post;
      setSearchPosts((current) => current.map(updateViews));
      setShuffledFeedPosts((current) => current.map(updateViews));
    };
    window.addEventListener("project-one-video-views-updated", onViewsUpdated);
    return () => window.removeEventListener("project-one-video-views-updated", onViewsUpdated);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAccountAndFollowing() {
      const supabase = createClient();

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          if (!cancelled) {
            setCurrentUserId("");
            setFollowingIds([]);
            setBlockedIds([]);
            setBlockLoadError(false);
            setBlocksLoaded(true);
          }
          return;
        }

        if (!cancelled) setCurrentUserId(user.id);

        const { data: blockRows, error: blockError } = await supabase
          .from("blocked_users")
          .select("blocker_id, blocked_id")
          .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

        if (blockError) {
          if (!cancelled) {
            setBlockLoadError(true);
            setBlockedIds([]);
          }
          throw blockError;
        }

        const relatedAccountIds = new Set<string>();

        ((blockRows ?? []) as BlockRelationship[]).forEach(
          (relationship) => {
            if (relationship.blocker_id === user.id) {
              relatedAccountIds.add(relationship.blocked_id);
            }

            if (relationship.blocked_id === user.id) {
              relatedAccountIds.add(relationship.blocker_id);
            }
          }
        );

        if (!cancelled) {
          setBlockedIds(Array.from(relatedAccountIds));
          setBlockLoadError(false);
          setBlocksLoaded(true);
        }

        const { data, error } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id);

        if (error) throw error;

        if (!cancelled) {
          setFollowingIds(
            (data ?? [])
              .map((item) => item.following_id)
              .filter((id) => !relatedAccountIds.has(id))
          );
        }
      } catch (error) {
        console.error(
          "Could not load account, blocks, or following relationships:",
          error
        );

        if (!cancelled) {
          setFollowError(c.accountLoadError);
          setPeople([]);
          setBlocksLoaded(true);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }

    void loadAccountAndFollowing();

    return () => {
      cancelled = true;
    };
  }, [c.accountLoadError]);

  useEffect(() => {
    let cancelled = false;

    async function loadPeople() {
      if (authLoading || !blocksLoaded) return;

      setPeopleLoading(true);
      setPeopleError("");

      if (blockLoadError) {
        setPeople([]);
        setPeopleError(c.blockCheckError);
        setPeopleLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const searchTerm = search.trim().replace(/[,%()]/g, " ").trim();

        let query = supabase
          .from("profiles")
          .select("id, username, display_name, bio, avatar_url")
          .not("username", "is", null)
          .order("display_name", { ascending: true })
          .limit(30);

        if (searchTerm) {
          query = query.or(
            `username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;

        const results: Person[] = (data ?? [])
          .filter(
            (profile) =>
              typeof profile.username === "string" &&
              profile.username.trim().length > 0 &&
              !blockedIds.includes(profile.id)
          )
          .map((profile) => {
            const username = profile.username!.trim().replace(/^@/, "");
            const name = profile.display_name?.trim() || username;

            return {
              id: profile.id,
              name,
              username,
              bio: profile.bio || c.member,
              avatarUrl: profile.avatar_url,
            };
          });

        if (!cancelled) setPeople(results);
      } catch (error) {
        console.error("Could not load VYBE users:", error);

        if (!cancelled) {
          setPeople([]);
          setPeopleError(c.loadPeopleError);
        }
      } finally {
        if (!cancelled) setPeopleLoading(false);
      }
    }

    void loadPeople();

    return () => {
      cancelled = true;
    };
  }, [
    search,
    currentUserId,
    blockedIds,
    authLoading,
    blocksLoaded,
    blockLoadError,
    c.blockCheckError,
    c.loadPeopleError,
    c.member,
  ]);

  useEffect(() => {
    const term = search.trim().replace(/[,%()_*]/g, " ").replace(/\s+/g, " ").trim();
    if (!term || authLoading || !blocksLoaded || blockLoadError) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearchPostsLoading(true);
      setSearchPostsError("");
      void (async () => {
        try {
          const supabase = createClient();
          const filters = [
            `content.ilike.%${term}%`,
            `author.ilike.%${term}%`,
            `username.ilike.%${term}%`,
            `media_name.ilike.%${term}%`,
          ];
          if (/\bvideos?\b/i.test(term)) filters.push("media_type.eq.video");
          const query = supabase.from("posts")
            .select("id,user_id,author,username,content,world,likes,comments,video_views,media_path,media_type,media_name,media_items,created_at")
            .or(filters.join(","))
            .order("created_at", { ascending: false })
            .limit(60);
          const { data, error } = await query;
          if (error) throw error;
          if (!cancelled) {
            const matches = ((data ?? []) as SearchPostRow[])
              .filter((row) => row.user_id !== currentUserId && !blockedIds.includes(row.user_id))
              .map(mapSearchPost);
            setSearchPosts(matches);
          }
        } catch (error) {
          console.error("Could not search Explore posts:", error);
          if (!cancelled) {
            setSearchPosts([]);
            setSearchPostsError("Could not search posts. Please try again.");
          }
        } finally {
          if (!cancelled) setSearchPostsLoading(false);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, authLoading, blocksLoaded, blockLoadError, currentUserId, blockedIds]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const signature = `${currentUserId}|${blockedIds.join(",")}|${posts.map((post) => post.id).join(",")}`;
      if (shuffledFeedSignatureRef.current === signature) return;
      shuffledFeedSignatureRef.current = signature;
      const available = posts.filter((post) => post.authorId !== currentUserId && !blockedIds.includes(post.authorId ?? ""));
      for (let index = available.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [available[index], available[randomIndex]] = [available[randomIndex], available[index]];
      }
      if (active) setShuffledFeedPosts(available);
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [posts, currentUserId, blockedIds]);

  async function toggleFollow(person: Person) {
    if (!currentUserId) {
      setFollowError(c.loginToFollow);
      return;
    }

    if (person.id === currentUserId) return;

    if (blockedIds.includes(person.id)) {
      setFollowError(c.blockedFollow);
      return;
    }

    if (followBusyIds.includes(person.id)) return;

    setFollowError("");
    setFollowBusyIds((previous) => [...previous, person.id]);

    const supabase = createClient();
    const isFollowing = followingIds.includes(person.id);

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", person.id);

        if (error) throw error;

        setFollowingIds((previous) =>
          previous.filter((id) => id !== person.id)
        );
      } else {
        const { error } = await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: person.id,
        });

        if (error) throw error;

        setFollowingIds((previous) =>
          previous.includes(person.id)
            ? previous
            : [...previous, person.id]
        );
      }

      window.dispatchEvent(new Event("project-one-follows-updated"));
    } catch (error) {
      console.error("Could not update follow relationship:", error);
      setFollowError(isFollowing ? c.unfollowError : c.followError);
    } finally {
      setFollowBusyIds((previous) =>
        previous.filter((id) => id !== person.id)
      );
    }
  }

  const postsForGrid = useMemo(() => {
    if (blockLoadError) return [];
    const source = search.trim() ? searchPosts : shuffledFeedPosts;
    return source;
  }, [search, searchPosts, shuffledFeedPosts, blockLoadError]);

  const exploreTiles = useMemo(() => postsForGrid.map((post) => {
    const latestPost = posts.find((candidate) => candidate.id === post.id);
    const postWithLatestViews = latestPost ? { ...post, views: latestPost.views ?? post.views } : post;
    const mediaItems = post.mediaItems?.length
      ? post.mediaItems
      : post.mediaId && post.mediaType
        ? [{ mediaId: post.mediaId, mediaType: post.mediaType, mediaName: post.mediaName || "Post media" }]
        : [];
    const media = mediaItems.length ? mediaItems[(post.id + mediaItems.length) % mediaItems.length] : null;
    return { post: postWithLatestViews, media };
  }), [postsForGrid, posts]);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 px-3 pb-2 pt-3 backdrop-blur sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-4 py-3 transition focus-within:border-[#7d80e8] focus-within:bg-white">
            <svg className="h-5 w-5 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
            <input type="search" value={search} onChange={(event) => { const value = event.target.value; setSearch(value); if (!value.trim()) { setSearchPosts([]); setSearchPostsLoading(false); setSearchPostsError(""); } }} placeholder={c.searchPlaceholder} aria-label={c.searchLabel} className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400" />
            {search && <button type="button" onClick={() => { setSearch(""); setSearchPosts([]); setSearchPostsLoading(false); setSearchPostsError(""); }} className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-900" aria-label={c.clear}>{c.clear}</button>}
          </div>
          <nav aria-label="Explore worlds" className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {categories.map((category) => <Link key={category.name} href={category.href} className="shrink-0 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-200">{category.name}</Link>)}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-1.5 pb-8 pt-3 sm:px-6 sm:pt-5">
        {search.trim() && <section className="mb-4" aria-label="People search results">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-gray-800">People</h2>
            <Link href="/app/connect" className="text-xs font-semibold text-gray-500">{c.seeMore} →</Link>
          </div>
          {peopleLoading || authLoading || !blocksLoaded ? <p className="px-1 py-3 text-sm text-gray-500">{c.loadingPeople}</p> : peopleError ? <p className="px-1 py-3 text-sm text-gray-500">{peopleError}</p> : people.length ? <div className="flex gap-3 overflow-x-auto pb-2">
            {people.slice(0, 12).map((person) => {
              const profileHref = `/app/profile?id=${encodeURIComponent(person.id)}`;
              const isFollowing = followingIds.includes(person.id);
              const isOwnProfile = person.id === currentUserId;
              const isBusy = followBusyIds.includes(person.id);
              return <div key={person.id} className="flex w-32 shrink-0 flex-col items-center rounded-2xl border border-gray-100 bg-white p-3 text-center">
                <Link href={profileHref} aria-label={c.openProfile.replace("{name}", person.name)} className="mb-2 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gray-100 text-gray-500">
                  {person.avatarUrl ? <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" /> : <ContactAvatarIcon className="h-6 w-6" />}
                </Link>
                <Link href={profileHref} className="w-full truncate text-xs font-semibold text-gray-900">{person.name}</Link>
                <span className="mt-0.5 w-full truncate text-[10px] text-gray-400">@{person.username}</span>
                <button type="button" onClick={() => void toggleFollow(person)} disabled={!currentUserId || isOwnProfile || isBusy || blockedIds.includes(person.id)} className="mt-2 rounded-full border border-gray-200 px-3 py-1 text-[10px] font-semibold text-gray-700 disabled:opacity-50">
                  {isOwnProfile ? c.you : isBusy ? c.pleaseWait : isFollowing ? c.following : c.follow}
                </button>
              </div>;
            })}
          </div> : <p className="px-1 py-3 text-sm text-gray-500">{c.noMatchingPeople}</p>}
        </section>}

        {followError && <p role="alert" className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{followError}<button type="button" onClick={() => setFollowError("")} className="ml-2 font-semibold underline">{c.dismiss}</button></p>}
        {blockLoadError && <p role="alert" className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{c.blockCheckError}</p>}
        {searchPostsError && <p role="alert" className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{searchPostsError}</p>}
        {searchPostsLoading && <p className="px-2 py-4 text-sm text-gray-500">Searching posts and videos…</p>}

        {!blockLoadError && (exploreTiles.length ? <div className="grid grid-cols-3 gap-1.5 sm:gap-3" aria-label="Discover posts and videos">
          {exploreTiles.map(({ post, media }) => <ExploreMediaTile key={post.id} post={post} media={media} allPosts={exploreTiles} />)}
        </div> : !searchPostsLoading && <div className="py-16 text-center text-sm text-gray-500">{search.trim() ? "No posts or videos matched your search." : posts.length ? "No posts in this category yet." : "Loading posts…"}</div>)}
      </div>
    </main>
  );
}
