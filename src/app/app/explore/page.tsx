
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "../../../../utils/supabase/client";
import { useLanguage } from "../LanguageProvider";
import type { Language } from "../LanguageProvider";
import { usePosts } from "../PostContext";

type Person = {
  id: string;
  name: string;
  username: string;
  bio: string;
  initials: string;
};

type BlockRelationship = {
  blocker_id: string;
  blocked_id: string;
};

type Trend = {
  tag: string;
  keywords: string[];
};

const translations: Record<Language, Record<string, string>> = {
  en: {
    discover: "Discover your next interest",
    explore: "Explore",
    intro: "Find your people, discover new worlds, and join conversations happening across VYBE.",
    searchPlaceholder: "Search people, topics or communities...",
    searchLabel: "Search people, topics or communities",
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
    intro: "Trouvez votre communauté, découvrez de nouveaux univers et rejoignez les conversations sur VYBE.",
    searchPlaceholder: "Rechercher des personnes, sujets ou communautés...",
    searchLabel: "Rechercher des personnes, sujets ou communautés",
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
    intro: "Encuentra a tu gente, descubre nuevos mundos y únete a las conversaciones de VYBE.",
    searchPlaceholder: "Buscar personas, temas o comunidades...",
    searchLabel: "Buscar personas, temas o comunidades",
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
    intro: "Encontre sua comunidade, descubra novos mundos e participe das conversas no VYBE.",
    searchPlaceholder: "Buscar pessoas, assuntos ou comunidades...",
    searchLabel: "Buscar pessoas, assuntos ou comunidades",
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
    intro: "اعثر على مجتمعك، واكتشف عوالم جديدة، وانضم إلى المحادثات على VYBE.",
    searchPlaceholder: "ابحث عن أشخاص أو مواضيع أو مجتمعات...",
    searchLabel: "البحث عن أشخاص أو مواضيع أو مجتمعات",
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
    intro: "Nemo mutanen da suka dace da kai, gano sababbin duniyoyi, kuma shiga tattaunawar VYBE.",
    searchPlaceholder: "Nemo mutane, batutuwa ko al'ummomi...",
    searchLabel: "Nemo mutane, batutuwa ko al'ummomi",
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
    intro: "Wá àwọn ènìyàn rẹ, ṣàwárí àwọn ayé tuntun, kí o sì darapọ̀ mọ́ ìjíròrò lórí VYBE.",
    searchPlaceholder: "Wá ènìyàn, àkòrí tàbí àwùjọ...",
    searchLabel: "Wá ènìyàn, àkòrí tàbí àwùjọ",
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
    intro: "Chọta ndị gị, chọpụta ụwa ọhụrụ, ma sonyere mkparịta ụka na VYBE.",
    searchPlaceholder: "Chọọ ndị mmadụ, isiokwu ma ọ bụ obodo...",
    searchLabel: "Chọọ ndị mmadụ, isiokwu ma ọ bụ obodo",
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

const trends: Trend[] = [
  {
    tag: "#FootballTalk",
    keywords: ["footballtalk", "football", "soccer"],
  },
  {
    tag: "#TechCareers",
    keywords: ["techcareers", "tech careers", "technology", "tech", "career"],
  },
  {
    tag: "#MondayMotivation",
    keywords: ["mondaymotivation", "monday motivation", "motivation"],
  },
  {
    tag: "#GamingCommunity",
    keywords: [
      "gamingcommunity",
      "gaming",
      "gamer",
      "videogame",
      "video game",
    ],
  },
];

function postMatchesTrend(content: string, trend: Trend) {
  const normalizedContent = content.toLocaleLowerCase();

  return trend.keywords.some((keyword) =>
    normalizedContent.includes(keyword.toLocaleLowerCase())
  );
}

export default function ExplorePage() {
  const { language } = useLanguage();
  const c = translations[language] ?? translations.en;
  const { posts } = usePosts();

  const [search, setSearch] = useState("");
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

  const worlds = [
    { name: c.social, href: "/app" },
    { name: c.sports, href: "/app/sports" },
    { name: c.career, href: "/app/career" },
  ];

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
          .select("id, username, display_name, bio")
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

            const initials =
              name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part: string) => part[0])
                .join("")
                .toUpperCase() || "U";

            return {
              id: profile.id,
              name,
              username,
              bio: profile.bio || c.member,
              initials,
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

  const filteredTrends = trends.filter((trend) =>
    trend.tag.toLowerCase().includes(search.trim().toLowerCase())
  );

  function getTrendCount(trend: Trend) {
    return posts.filter((post) =>
      postMatchesTrend(post.content || "", trend)
    ).length;
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-gray-900 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-7">
          <p className="text-sm font-medium text-gray-500">{c.discover}</p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {c.explore}
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
            {c.intro}
          </p>
        </header>

        <div className="mb-8">
          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition focus-within:border-gray-400">
            <svg
              className="h-5 w-5 shrink-0 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="10.8" cy="10.8" r="6.8" />
              <path d="m16 16 5 5" />
            </svg>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={c.searchPlaceholder}
              aria-label={c.searchLabel}
              className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="shrink-0 text-xs font-medium text-gray-500 hover:text-gray-900"
                aria-label={c.clear}
              >
                {c.clear}
              </button>
            )}
          </div>
        </div>

        {/* Horizontal world buttons */}
        <section className="mb-10">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight">
              {c.worlds}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {c.worldsDescription}
            </p>
          </div>

          <nav
            aria-label={c.worlds}
            className="flex gap-3 overflow-x-auto pb-2"
          >
            {worlds.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="inline-flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
              >
                {item.name}
                <span className="ml-2 text-gray-400" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </nav>
        </section>

        {/* Trending topics */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {c.trending}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {c.trendingDescription}
              </p>
            </div>

            <span className="text-xs text-gray-400">{c.topics}</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {filteredTrends.length > 0 ? (
              filteredTrends.map((trend, index) => (
                <Link
                  key={trend.tag}
                  href={`/app/trending?topic=${encodeURIComponent(trend.tag)}`}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-400 ${
                    index !== 0 ? "border-t border-gray-100" : ""
                  }`}
                  aria-label={`View posts about ${trend.tag}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      {trend.tag}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {getTrendCount(trend).toLocaleString()} {c.posts}
                    </p>
                  </div>

                  <span className="text-lg text-gray-400" aria-hidden="true">
                    →
                  </span>
                </Link>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-gray-500">
                {c.noTrending}
              </p>
            )}
          </div>
        </section>

        {/* People to discover */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {search.trim() ? c.searchResults : c.peopleToDiscover}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {c.peopleDescription}
              </p>
            </div>

            <Link
              href="/app/connect"
              className="shrink-0 text-sm font-medium text-gray-700 hover:text-black"
            >
              {c.seeMore} →
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {peopleLoading || authLoading || !blocksLoaded ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">
                {c.loadingPeople}
              </p>
            ) : peopleError ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                {peopleError}
              </p>
            ) : people.length > 0 ? (
              people.map((person, index) => {
                const isFollowing = followingIds.includes(person.id);
                const isOwnProfile = person.id === currentUserId;
                const isBusy = followBusyIds.includes(person.id);

                const profileHref = `/app/profile?username=${encodeURIComponent(
                  person.username
                )}`;

                return (
                  <div
                    key={person.id}
                    className={`flex items-center gap-3 px-4 py-4 ${
                      index !== 0 ? "border-t border-gray-100" : ""
                    }`}
                  >
                    <Link
                      href={profileHref}
                      aria-label={c.openProfile.replace(
                        "{name}",
                        person.name
                      )}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
                    >
                      {person.initials}
                    </Link>

                    <div className="min-w-0 flex-1">
                      <Link
                        href={profileHref}
                        className="block truncate text-sm font-semibold text-gray-900 hover:underline"
                      >
                        {person.name}
                      </Link>

                      <Link
                        href={profileHref}
                        className="block truncate text-xs text-gray-400 hover:text-gray-600"
                      >
                        @{person.username}
                      </Link>

                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                        {person.bio}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void toggleFollow(person)}
                      disabled={
                        authLoading ||
                        !currentUserId ||
                        isOwnProfile ||
                        isBusy ||
                        blockedIds.includes(person.id)
                      }
                      className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isFollowing
                          ? "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {isOwnProfile
                        ? c.you
                        : isBusy
                          ? c.pleaseWait
                          : isFollowing
                            ? c.following
                            : c.follow}
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm font-medium text-gray-700">
                  {search.trim() ? c.noMatchingPeople : c.noPeople}
                </p>

                <p className="mt-2 text-xs leading-5 text-gray-400">
                  {search.trim() ? c.tryAnother : c.membersAppear}
                </p>
              </div>
            )}
          </div>

          {followError && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
            >
              {followError}

              <button
                type="button"
                onClick={() => setFollowError("")}
                className="ml-2 font-semibold underline"
              >
                {c.dismiss}
              </button>
            </p>
          )}
        </section>

        {/* Create post */}
        <section className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-7 text-center">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">
            {c.conversationTitle}
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
            {c.conversationDescription}
          </p>

          <Link
            href="/app/create"
            className="mt-5 inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
          >
            {c.createPost}
          </Link>
        </section>
      </div>
    </main>
  );
}
