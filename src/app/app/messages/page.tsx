"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "../../../../utils/supabase/client";
import { useLanguage, type Language } from "../LanguageProvider";
import { useOnlinePresence } from "../PresenceProvider";
import { useDirectCall } from "./useDirectCall";
import ContactAvatarIcon from "../ContactAvatarIcon";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  last_seen_at: string | null;
};

type DirectMessage = {
  id: number;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
  edited_at: string | null;
  reply_to_id: number | null;
};

type DirectMessageReaction = { id: number; message_id: number; user_id: string; emoji: string };

type MessageParts = {
  text: string;
  imageUrl: string | null;
  postId: string | null;
  audioPath: string | null;
};

type MessageNotification = {
  id: number;
  user_id: string;
  actor_id: string | null;
  type: string;
  read_at: string | null;
};

const EMOJI_OPTIONS = `😀 😃 😄 😁 😆 😅 😂 🤣 🥲 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🫡 🤫 🫠 🤥 😶 😐 😑 😬 🫨 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 👹 👺 🤡 💩 👻 💀 ☠️ 👽 👾 🤖 🎃 😺 😸 😹 😻 😼 😽 🙀 😿 😾 🙈 🙉 🙊 💋 💌 💘 💝 💖 💗 💓 💞 💕 💟 ❣️ 💔 ❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🤎 🖤 🩶 🤍 💯 💢 💥 💫 💦 💨 🕳️ 💣 💬 👁️‍🗨️ 🗨️ 🗯️ 💭 💤 👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦 👶 🧒 👦 👧 🧑 👱 👨 🧔 👩 🧓 👴 👵 🙍 🙎 🙅 🙆 💁 🙋 🧏 🙇 🤦 🤷 👮 🕵️ 💂 🥷 👷 🤴 👸 👳 👲 🧕 🤵 👰 🤰 🫃 🫄 🤱 👼 🎅 🤶 🧑‍🎄 🦸 🦹 🧙 🧚 🧛 🧜 🧝 🧞 🧟 💆 💇 🚶 🧍 🧎 🏃 💃 🕺 🕴️ 👯 🧖 🧗 🤺 🏇 ⛷️ 🏂 🏌️ 🏄 🚣 🏊 ⛹️ 🏋️ 🚴 🚵 🤸 🤼 🤽 🤾 🤹 🧘 🛀 🛌 🧑‍⚕️ 🧑‍🎓 🧑‍🏫 🧑‍⚖️ 🧑‍🌾 🧑‍🍳 🧑‍🔧 🧑‍💼 🧑‍🔬 🧑‍🎤 🧑‍🚀 🧑‍🚒`.split(" ");
EMOJI_OPTIONS.push(...`🐵 🐒 🦍 🦧 🐶 🐕 🦮 🐕‍🦺 🐩 🐺 🦊 🦝 🐱 🐈 🦁 🐯 🐅 🐆 🐴 🫎 🫏 🐎 🦄 🦓 🦌 🦬 🐮 🐂 🐃 🐄 🐷 🐖 🐗 🐽 🐏 🐑 🐐 🐪 🐫 🦙 🦒 🐘 🦣 🦏 🦛 🐭 🐁 🐀 🐹 🐰 🐇 🐿️ 🦫 🦔 🦇 🐻 🐨 🐼 🦥 🦦 🦨 🦘 🦡 🐾 🦃 🐔 🐓 🐣 🐤 🐥 🐦 🐧 🕊️ 🦅 🦆 🦢 🦉 🦤 🪶 🦩 🦚 🦜 🪽 🐦‍⬛ 🪿 🐸 🐊 🐢 🦎 🐍 🐲 🐉 🦕 🦖 🐳 🐋 🐬 🦭 🐟 🐠 🐡 🦈 🐙 🐚 🪸 🪼 🦀 🦞 🦐 🦑 🦪 🐌 🦋 🐛 🐜 🐝 🪲 🐞 🦗 🪳 🕷️ 🕸️ 🦂 🦟 🪰 🪱 🦠 💐 🌸 💮 🪷 🏵️ 🌹 🥀 🌺 🌻 🌼 🌷 🪻 🌱 🪴 🌲 🌳 🌴 🌵 🌾 🌿 ☘️ 🍀 🍁 🍂 🍃 🪹 🪺 🍄 🪾 🌰 🦀 🌍 🌎 🌏 🌐 🌑 🌒 🌓 🌔 🌕 🌖 🌗 🌘 🌙 🌚 🌛 🌜 🌝 🌞 🌟 ⭐ 🌠 ☀️ 🌤️ ⛅ 🌥️ ☁️ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ ⛄ 🌬️ 💨 🌪️ 🌫️ 🌈 ☔ 💧 💦 🌊 🔥 🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🫒 🥑 🍆 🥔 🥕 🌽 🌶️ 🫑 🥒 🥬 🥦 🧄 🧅 🥜 🫘 🌰 🍞 🥐 🥖 🫓 🥨 🥯 🥞 🧇 🧀 🍖 🍗 🥩 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🫔 🥙 🧆 🥚 🍳 🥘 🍲 🫕 🥣 🥗 🍿 🧈 🧂 🥫 🍱 🍘 🍙 🍚 🍛 🍜 🍝 🍠 🍢 🍣 🍤 🍥 🥮 🍡 🥟 🥠 🥡 🦪 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🥧 🍫 🍬 🍭 🍮 🍯 🍼 🥛 ☕ 🫖 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🍾 🧊 🥄 🍴 🍽️ 🥢 🧂 ⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🪇 🎷 🎺 🪗 🎸 🪕 🎻 🪈 🪉 🎮 🕹️ 🎲 ♟️ 🧩 🧸 🪅 🪩 🪆 🃏 🀄 🎴 🎯 🪄 🪅 🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🛺 🚲 🛴 🛹 🛼 🚏 🛣️ 🛤️ 🛢️ ⛽ 🛞 🚨 🚥 🚦 🛑 🚧 ⚓ 🛟 ⛵ 🚤 🛳️ ⛴️ 🛥️ 🚢 ✈️ 🛩️ 🛫 🛬 🪂 💺 🚁 🚟 🚠 🚡 🚀 🛸 🛰️ 🧳 ⌛ ⏳ ⌚ ⏰ 🕰️ 🕛 🕧 🕐 🕜 🕑 🕝 🕒 🕞 🕓 🕟 🕔 🕠 🕕 🕡 🕖 🕢 🕗 🕣 🕘 🕤 🕙 🕥 🕚 🕦 🌑 🌒 🌓 🌔 🌕 🌖 🌗 🌘 🧭 🗺️ 🗿 🗽 🗼 🏰 🏯 🏟️ 🎡 🎢 🎠 ⛲ ⛱️ 🏖️ 🏝️ 🏜️ 🌋 ⛰️ 🏔️ 🗻 🏕️ 🏞️ 🏟️ 🏛️ 🏗️ 🧱 🪨 🪵 🛖 🏘️ 🏚️ 🏠 🏡 🏢 🏣 🏤 🏥 🏦 🏨 🏩 🏪 🏫 🏬 🏭 🏯 🏰 💒 🗾 🛝 🛣️ 🛤️ 🗺️ 🎑 🏞️ 🌅 🌄 🌠 🎇 🎆 🌇 🌆 🏙️ 🌃 🌌 🌉 🌁 🧳 🎒 🧵 🪡 🧶 🪢 👓 🕶️ 🥽 🥼 🦺 👔 👕 👖 🧣 🧤 🧥 🧦 👗 👘 🥻 🩱 🩲 🩳 👙 👚 🪭 👛 👜 👝 🛍️ 🎒 🩴 👞 👟 🥾 🥿 👠 👡 🩰 👢 👑 👒 🎩 🎓 🧢 🪖 ⛑️ 📿 💄 💍 💎 🔇 🔈 🔉 🔊 📢 📣 📯 🔔 🔕 🎼 🎵 🎶 🎙️ 🎚️ 🎛️ 🎤 🎧 📻 🎷 🪗 🎸 🎹 🎺 🎻 🥁 📱 📲 ☎️ 📞 📟 📠 🔋 🪫 🔌 💻 🖥️ 🖨️ ⌨️ 🖱️ 🖲️ 💽 💾 💿 📀 🧮 🎥 🎞️ 📽️ 🎬 📺 📷 📸 📹 📼 🔍 🔎 🕯️ 💡 🔦 🏮 🪔 📔 📕 📖 📗 📘 📙 📚 📓 📒 📃 📜 📄 📰 🗞️ 📑 🔖 🏷️ 💰 🪙 💴 💵 💶 💷 💸 💳 🧾 💹 ✉️ 📧 📨 📩 📤 📥 📦 📫 📪 📬 📭 📮 🗳️ ✏️ ✒️ 🖋️ 🖊️ 🖌️ 🖍️ 📝 💼 📁 📂 🗂️ 📅 📆 🗒️ 🗓️ 📇 📈 📉 📊 📋 📌 📍 📎 🖇️ 📏 📐 ✂️ 🗃️ 🗄️ 🗑️ 🔒 🔓 🔏 🔐 🔑 🗝️ 🔨 🪓 ⛏️ ⚒️ 🛠️ 🗡️ ⚔️ 💣 🪃 🏹 🛡️ 🪚 🔧 🪛 🔩 ⚙️ 🗜️ ⚖️ 🦯 🔗 ⛓️ 🪝 🧰 🧲 🪜 🧪 🧫 🧬 🔬 🔭 📡 💉 🩸 💊 🩹 🩺 🩻 🚪 🛗 🪞 🪟 🛏️ 🛋️ 🪑 🚽 🪠 🚿 🛁 🪤 🪒 🧴 🧷 🧹 🧺 🧻 🪣 🧼 🫧 🪥 🧽 🧯 🛒 🚬 ⚰️ 🪦 ⚱️ 🧿 🪬 🗿 🪧 🪪 🏧 🚮 🚰 ♿ 🚹 🚺 🚻 🚼 🚾 🛂 🛃 🛄 🛅 ⚠️ 🚸 ⛔ 🚫 🚳 🚭 🚯 🚱 🚷 📵 🔞 ☢️ ☣️ ⬆️ ↗️ ➡️ ↘️ ⬇️ ↙️ ⬅️ ↖️ ↕️ ↔️ ↩️ ↪️ ⤴️ ⤵️ 🔃 🔄 🔙 🔚 🔛 🔜 🔝 🛐 ⚛️ 🕉️ ✡️ ☸️ ☯️ ✝️ ☦️ ☪️ ☮️ 🕎 🔯 🪯 ♈ ♉ ♊ ♋ ♌ ♍ ♎ ♏ ♐ ♑ ♒ ♓ ⛎ 🔀 🔁 🔂 ▶️ ⏩ ⏭️ ⏯️ ◀️ ⏪ ⏮️ 🔼 ⏫ 🔽 ⏬ ⏸️ ⏹️ ⏺️ ⏏️ 🎦 🔅 🔆 📶 🛜 📳 📴 ♀️ ♂️ ⚧️ ✖️ ➕ ➖ ➗ 🟰 ♾️ ‼️ ⁉️ ❓ ❔ ❕ ❗ 〰️ 💱 💲 ⚕️ ♻️ ⚜️ 🔱 📛 🔰 ⭕ ✅ ☑️ ✔️ ❌ ❎ ➰ ➿ 〽️ ✳️ ✴️ ❇️ ©️ ®️ ™️ #️⃣ *️⃣ 0️⃣ 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 🔟 🔠 🔡 🔢 🔣 🔤 🆎 🅰️ 🅱️ 🆑 🆒 🆓 ℹ️ 🆔 Ⓜ️ 🆕 🆖 🅾️ 🆗 🅿️ 🆘 🆙 🆚 🈁 🈂️ 🈷️ 🈶 🈯 🉐 🈹 🈚 🈲 🉑 🈸 🈴 🈳 ㊗️ ㊙️ 🈺 🈵 🔴 🟠 🟡 🟢 🔵 🟣 🟤 ⚫ ⚪ 🟥 🟧 🟨 🟩 🟦 🟪 🟫 ⬛ ⬜ ◼️ ◻️ ◾ ◽ ▪️ ▫️ 🔶 🔷 🔸 🔹 🔺 🔻 💠 🔘 🔳 🔲`.split(" "));

const translations: Record<Language, Record<string, string>> = {
  en: {
    title: "Messages",
    subtitle: "Your private conversations",
    unread: "unread messages",
    search: "Find people or messages...",
    searchLabel: "Search people and messages",
    loading: "Loading your messages...",
    blockedPreview: "You blocked this account",
    sharedImage: "Shared an image",
    sharedPost: "Shared a post",
    startConversation: "Start a conversation",
    message: "message",
    messages: "messages",
    noUsers: "No users found",
    noOtherUsers: "No other users yet",
    tryAnother: "Try another name or username.",
    otherUsers: "Other registered users will appear here.",
    tagline: "One platform. Many worlds.",
    privateConversation: "Private conversation",
    blockedTitle: "You blocked this account",
    blockedDescription:
      "You cannot send messages to this account while it remains blocked. You can manage your blocked accounts in settings.",
    manageBlocked: "Manage blocked accounts",
    startTitle: "Start the conversation",
    sendPrivate: "Send a private message to",
    openPost: "Open shared post",
    tapViewPost: "Tap to view this post",
    sent: "Sent",
    online: "Online",
    lastSeen: "Last seen",
    justNow: "just now",
    lastSeenUnavailable: "Last seen unavailable",
    writeMessage: "Write a message...",
    emoji: "Add emoji",
    sendMessage: "Send message",
    enterHint: "Press Enter to send · Shift + Enter for a new line",
    yourMessages: "Your messages",
    chooseUser: "Choose a registered user to start a private conversation.",
    findPeople: "Find people",
    stayConnected: "Stay connected",
    communityDescription:
      "Your private conversations bring your VYBE community closer.",
    projectOneUser: "VYBE user",
    projectOneMember: "VYBE member",
    backInbox: "Back to inbox",
    loginRequired: "Please log in to use private messages.",
    loadFailed: "Could not load messages. Please try again.",
    readUpdateFailed:
      "Messages opened, but unread notifications could not be updated.",
    blockedError:
      "This conversation is unavailable because one of these accounts has blocked the other.",
    privacyError: "This user isn't accepting new messages right now.",
    followRequired: "You need to follow this user before you can send them a message.",
    selfMessage: "You cannot send a message to your own account.",
    permissionError:
      "You don't have permission to send this message. The recipient's privacy settings may restrict it, or this conversation may be unavailable.",
    sessionExpired: "Your session may have expired. Please log in again.",
    sendFailed: "Your message could not be sent. Please try again.",
    unblockFirst: "You have blocked this account. Unblock it to resume messaging.",
    maxLength: "Messages must be 5,000 characters or fewer.",
    sessionLogin: "Your session has expired. Please log in again.",
    audioMessage: "Voice message",
    recordVoice: "Record voice message",
    stopRecording: "Stop recording",
    recordingVoice: "Recording voice message…",
    removeRecording: "Remove recording",
    call: "Start voice call",
    incomingCall: "Incoming voice call",
    calling: "Calling",
    ringingCall: "Ringing…",
    connectingCall: "Connecting call…",
    activeCall: "Voice call in progress",
    answerCall: "Answer",
    declineCall: "Decline",
    endCall: "End call",
    muteCall: "Mute",
    unmuteCall: "Unmute",
    speakerOn: "Speaker on",
    speakerOff: "Speaker off",
    noConversations: "No conversations yet",
    searchToStart: "Search for someone to start a private conversation.",
  },
  fr: {
    title: "Messages",
    subtitle: "Vos conversations privées",
    unread: "messages non lus",
    search: "Rechercher des personnes ou des messages...",
    searchLabel: "Rechercher des personnes et des messages",
    loading: "Chargement de vos messages...",
    blockedPreview: "Vous avez bloqué ce compte",
    sharedImage: "Image partagée",
    sharedPost: "Publication partagée",
    startConversation: "Commencer une conversation",
    message: "message",
    messages: "messages",
    noUsers: "Aucun utilisateur trouvé",
    noOtherUsers: "Aucun autre utilisateur pour le moment",
    tryAnother: "Essayez un autre nom ou nom d'utilisateur.",
    otherUsers: "Les autres utilisateurs inscrits apparaîtront ici.",
    tagline: "Une plateforme. Plusieurs univers.",
    privateConversation: "Conversation privée",
    blockedTitle: "Vous avez bloqué ce compte",
    blockedDescription:
      "Vous ne pouvez pas envoyer de messages à ce compte tant qu'il est bloqué. Gérez vos comptes bloqués dans les paramètres.",
    manageBlocked: "Gérer les comptes bloqués",
    startTitle: "Commencez la conversation",
    sendPrivate: "Envoyez un message privé à",
    openPost: "Ouvrir la publication partagée",
    tapViewPost: "Appuyez pour voir cette publication",
    sent: "Envoyé",
    online: "En ligne",
    lastSeen: "Vu pour la dernière fois",
    justNow: "à l’instant",
    lastSeenUnavailable: "Dernière présence inconnue",
    writeMessage: "Écrire un message...",
    sendMessage: "Envoyer le message",
    enterHint: "Entrée pour envoyer · Maj + Entrée pour un retour à la ligne",
    yourMessages: "Vos messages",
    chooseUser: "Choisissez un utilisateur inscrit pour commencer une conversation privée.",
    findPeople: "Trouver des personnes",
    stayConnected: "Restez connecté",
    communityDescription:
      "Vos conversations privées rapprochent la communauté VYBE.",
    projectOneUser: "Utilisateur VYBE",
    projectOneMember: "Membre VYBE",
    backInbox: "Retour à la boîte de réception",
    loginRequired: "Connectez-vous pour utiliser les messages privés.",
    loadFailed: "Impossible de charger les messages. Réessayez.",
    readUpdateFailed:
      "Conversation ouverte, mais les notifications non lues n'ont pas pu être mises à jour.",
    blockedError:
      "Cette conversation est indisponible car l'un de ces comptes a bloqué l'autre.",
    privacyError: "Cet utilisateur n'accepte pas de nouveaux messages pour le moment.",
    followRequired: "Vous devez suivre cet utilisateur avant de lui envoyer un message.",
    selfMessage: "Vous ne pouvez pas envoyer de message à votre propre compte.",
    permissionError:
      "Vous n'êtes pas autorisé à envoyer ce message. Les paramètres de confidentialité du destinataire peuvent le bloquer.",
    sessionExpired: "Votre session a peut-être expiré. Veuillez vous reconnecter.",
    sendFailed: "Votre message n'a pas pu être envoyé. Réessayez.",
    unblockFirst: "Vous avez bloqué ce compte. Débloquez-le pour reprendre la conversation.",
    maxLength: "Les messages ne doivent pas dépasser 5 000 caractères.",
    sessionLogin: "Votre session a expiré. Veuillez vous reconnecter.",
  },
  es: {
    title: "Mensajes",
    subtitle: "Tus conversaciones privadas",
    unread: "mensajes sin leer",
    search: "Buscar personas o mensajes...",
    searchLabel: "Buscar personas y mensajes",
    loading: "Cargando tus mensajes...",
    blockedPreview: "Has bloqueado esta cuenta",
    sharedImage: "Imagen compartida",
    sharedPost: "Publicación compartida",
    startConversation: "Iniciar una conversación",
    message: "mensaje",
    messages: "mensajes",
    noUsers: "No se encontraron usuarios",
    noOtherUsers: "Todavía no hay otros usuarios",
    tryAnother: "Prueba con otro nombre o nombre de usuario.",
    otherUsers: "Los demás usuarios registrados aparecerán aquí.",
    tagline: "Una plataforma. Muchos mundos.",
    privateConversation: "Conversación privada",
    blockedTitle: "Has bloqueado esta cuenta",
    blockedDescription:
      "No puedes enviar mensajes a esta cuenta mientras esté bloqueada. Puedes administrar tus cuentas bloqueadas en la configuración.",
    manageBlocked: "Administrar cuentas bloqueadas",
    startTitle: "Inicia la conversación",
    sendPrivate: "Envía un mensaje privado a",
    openPost: "Abrir publicación compartida",
    tapViewPost: "Toca para ver esta publicación",
    sent: "Enviado",
    online: "En línea",
    lastSeen: "Última vez",
    justNow: "ahora mismo",
    lastSeenUnavailable: "Última conexión desconocida",
    writeMessage: "Escribe un mensaje...",
    sendMessage: "Enviar mensaje",
    enterHint: "Pulsa Enter para enviar · Shift + Enter para una nueva línea",
    yourMessages: "Tus mensajes",
    chooseUser: "Elige un usuario registrado para iniciar una conversación privada.",
    findPeople: "Buscar personas",
    stayConnected: "Mantente conectado",
    communityDescription:
      "Tus conversaciones privadas acercan a la comunidad de VYBE.",
    projectOneUser: "Usuario de VYBE",
    projectOneMember: "Miembro de VYBE",
    backInbox: "Volver a la bandeja de entrada",
    loginRequired: "Inicia sesión para usar los mensajes privados.",
    loadFailed: "No se pudieron cargar los mensajes. Inténtalo de nuevo.",
    readUpdateFailed:
      "Conversación abierta, pero no se pudieron actualizar las notificaciones sin leer.",
    blockedError:
      "Esta conversación no está disponible porque una de estas cuentas ha bloqueado a la otra.",
    privacyError: "Este usuario no acepta mensajes nuevos en este momento.",
    followRequired: "Debes seguir a este usuario antes de enviarle un mensaje.",
    selfMessage: "No puedes enviar mensajes a tu propia cuenta.",
    permissionError:
      "No tienes permiso para enviar este mensaje. La configuración de privacidad del destinatario puede restringirlo.",
    sessionExpired: "Es posible que tu sesión haya caducado. Inicia sesión de nuevo.",
    sendFailed: "No se pudo enviar tu mensaje. Inténtalo de nuevo.",
    unblockFirst: "Has bloqueado esta cuenta. Desbloquéala para volver a enviar mensajes.",
    maxLength: "Los mensajes deben tener 5.000 caracteres o menos.",
    sessionLogin: "Tu sesión ha caducado. Inicia sesión de nuevo.",
  },
  pt: {
    title: "Mensagens",
    subtitle: "Suas conversas privadas",
    unread: "mensagens não lidas",
    search: "Encontrar pessoas ou mensagens...",
    searchLabel: "Pesquisar pessoas e mensagens",
    loading: "Carregando suas mensagens...",
    blockedPreview: "Você bloqueou esta conta",
    sharedImage: "Imagem compartilhada",
    sharedPost: "Publicação compartilhada",
    startConversation: "Iniciar uma conversa",
    message: "mensagem",
    messages: "mensagens",
    noUsers: "Nenhum usuário encontrado",
    noOtherUsers: "Ainda não há outros usuários",
    tryAnother: "Tente outro nome ou nome de usuário.",
    otherUsers: "Outros usuários registrados aparecerão aqui.",
    tagline: "Uma plataforma. Muitos mundos.",
    privateConversation: "Conversa privada",
    blockedTitle: "Você bloqueou esta conta",
    blockedDescription:
      "Você não pode enviar mensagens para esta conta enquanto ela estiver bloqueada. Gerencie suas contas bloqueadas nas configurações.",
    manageBlocked: "Gerenciar contas bloqueadas",
    startTitle: "Comece a conversa",
    sendPrivate: "Envie uma mensagem privada para",
    openPost: "Abrir publicação compartilhada",
    tapViewPost: "Toque para ver esta publicação",
    sent: "Enviada",
    online: "Online",
    lastSeen: "Visto pela última vez",
    justNow: "agora mesmo",
    lastSeenUnavailable: "Última presença indisponível",
    writeMessage: "Escreva uma mensagem...",
    sendMessage: "Enviar mensagem",
    enterHint: "Pressione Enter para enviar · Shift + Enter para uma nova linha",
    yourMessages: "Suas mensagens",
    chooseUser: "Escolha um usuário registrado para iniciar uma conversa privada.",
    findPeople: "Encontrar pessoas",
    stayConnected: "Mantenha-se conectado",
    communityDescription:
      "Suas conversas privadas aproximam a comunidade VYBE.",
    projectOneUser: "Usuário do VYBE",
    projectOneMember: "Membro do VYBE",
    backInbox: "Voltar à caixa de entrada",
    loginRequired: "Entre na sua conta para usar mensagens privadas.",
    loadFailed: "Não foi possível carregar as mensagens. Tente novamente.",
    readUpdateFailed:
      "Conversa aberta, mas não foi possível atualizar as notificações não lidas.",
    blockedError:
      "Esta conversa está indisponível porque uma das contas bloqueou a outra.",
    privacyError: "Este usuário não está aceitando novas mensagens agora.",
    followRequired: "Você precisa seguir este usuário antes de enviar uma mensagem.",
    selfMessage: "Você não pode enviar uma mensagem para sua própria conta.",
    permissionError:
      "Você não tem permissão para enviar esta mensagem. As configurações de privacidade do destinatário podem restringi-la.",
    sessionExpired: "Sua sessão pode ter expirado. Entre novamente.",
    sendFailed: "Não foi possível enviar sua mensagem. Tente novamente.",
    unblockFirst: "Você bloqueou esta conta. Desbloqueie-a para voltar a enviar mensagens.",
    maxLength: "As mensagens devem ter no máximo 5.000 caracteres.",
    sessionLogin: "Sua sessão expirou. Entre novamente.",
  },
  ar: {
    title: "الرسائل",
    subtitle: "محادثاتك الخاصة",
    unread: "رسائل غير مقروءة",
    search: "ابحث عن أشخاص أو رسائل...",
    searchLabel: "البحث عن أشخاص ورسائل",
    loading: "جارٍ تحميل رسائلك...",
    blockedPreview: "لقد حظرت هذا الحساب",
    sharedImage: "تمت مشاركة صورة",
    sharedPost: "تمت مشاركة منشور",
    startConversation: "ابدأ محادثة",
    message: "رسالة",
    messages: "رسائل",
    noUsers: "لم يتم العثور على مستخدمين",
    noOtherUsers: "لا يوجد مستخدمون آخرون حتى الآن",
    tryAnother: "جرّب اسمًا آخر أو اسم مستخدم آخر.",
    otherUsers: "سيظهر المستخدمون المسجلون الآخرون هنا.",
    tagline: "منصة واحدة. عوالم متعددة.",
    privateConversation: "محادثة خاصة",
    blockedTitle: "لقد حظرت هذا الحساب",
    blockedDescription:
      "لا يمكنك إرسال رسائل إلى هذا الحساب ما دام محظورًا. يمكنك إدارة الحسابات المحظورة من الإعدادات.",
    manageBlocked: "إدارة الحسابات المحظورة",
    startTitle: "ابدأ المحادثة",
    sendPrivate: "أرسل رسالة خاصة إلى",
    openPost: "فتح المنشور المشترك",
    tapViewPost: "اضغط لعرض هذا المنشور",
    sent: "تم الإرسال",
    online: "متصل",
    lastSeen: "آخر ظهور",
    justNow: "الآن",
    lastSeenUnavailable: "وقت آخر ظهور غير متاح",
    writeMessage: "اكتب رسالة...",
    sendMessage: "إرسال الرسالة",
    enterHint: "اضغط Enter للإرسال · Shift + Enter لسطر جديد",
    yourMessages: "رسائلك",
    chooseUser: "اختر مستخدمًا مسجلًا لبدء محادثة خاصة.",
    findPeople: "البحث عن أشخاص",
    stayConnected: "ابقَ على تواصل",
    communityDescription: "تقرّب محادثاتك الخاصة مجتمع VYBE.",
    projectOneUser: "مستخدم VYBE",
    projectOneMember: "عضو في VYBE",
    backInbox: "العودة إلى صندوق الوارد",
    loginRequired: "يرجى تسجيل الدخول لاستخدام الرسائل الخاصة.",
    loadFailed: "تعذر تحميل الرسائل. يرجى المحاولة مرة أخرى.",
    readUpdateFailed: "تم فتح المحادثة، لكن تعذر تحديث الإشعارات غير المقروءة.",
    blockedError: "هذه المحادثة غير متاحة لأن أحد الحسابين حظر الآخر.",
    privacyError: "هذا المستخدم لا يستقبل رسائل جديدة في الوقت الحالي.",
    followRequired: "يجب متابعة هذا المستخدم قبل إرسال رسالة إليه.",
    selfMessage: "لا يمكنك إرسال رسالة إلى حسابك الخاص.",
    permissionError: "ليس لديك إذن لإرسال هذه الرسالة. قد تمنع إعدادات خصوصية المستلم ذلك.",
    sessionExpired: "ربما انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.",
    sendFailed: "تعذر إرسال رسالتك. يرجى المحاولة مرة أخرى.",
    unblockFirst: "لقد حظرت هذا الحساب. أزل الحظر لاستئناف المراسلة.",
    maxLength: "يجب ألا تتجاوز الرسائل 5000 حرف.",
    sessionLogin: "انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.",
  },
  ha: {
    title: "Saƙonni",
    subtitle: "Hirarrakinku na sirri",
    unread: "saƙonnin da ba a karanta ba",
    search: "Nemo mutane ko saƙonni...",
    searchLabel: "Nemo mutane da saƙonni",
    loading: "Ana loda saƙonninku...",
    blockedPreview: "Kun toshe wannan asusun",
    sharedImage: "An raba hoto",
    sharedPost: "An raba rubutu",
    startConversation: "Fara hira",
    message: "saƙo",
    messages: "saƙonni",
    noUsers: "Ba a sami mai amfani ba",
    noOtherUsers: "Babu sauran masu amfani tukuna",
    tryAnother: "Gwada wani suna ko sunan mai amfani.",
    otherUsers: "Sauran masu amfani da suka yi rajista za su bayyana a nan.",
    tagline: "Dandali ɗaya. Duniyoyi da yawa.",
    privateConversation: "Hira ta sirri",
    blockedTitle: "Kun toshe wannan asusun",
    blockedDescription:
      "Ba za ku iya aika saƙonni zuwa wannan asusun ba yayin da yake a toshe. Kuna iya sarrafa asusun da kuka toshe a saituna.",
    manageBlocked: "Sarrafa asusun da aka toshe",
    startTitle: "Fara hirar",
    sendPrivate: "Aika saƙon sirri zuwa",
    openPost: "Buɗe rubutun da aka raba",
    tapViewPost: "Taɓa don duba wannan rubutu",
    sent: "An aika",
    online: "Yana kan layi",
    lastSeen: "An gan shi na ƙarshe",
    justNow: "yanzu-yanzu",
    lastSeenUnavailable: "Ba a san lokacin gani na ƙarshe ba",
    writeMessage: "Rubuta saƙo...",
    sendMessage: "Aika saƙo",
    enterHint: "Danna Enter don aikawa · Shift + Enter don sabon layi",
    yourMessages: "Saƙonninku",
    chooseUser: "Zaɓi mai amfani da ya yi rajista don fara hira ta sirri.",
    findPeople: "Nemo mutane",
    stayConnected: "Ku ci gaba da hulɗa",
    communityDescription: "Hirarrakinku na sirri suna kusantar da al'ummar VYBE.",
    projectOneUser: "Mai amfani da VYBE",
    projectOneMember: "Memba na VYBE",
    backInbox: "Koma akwatin saƙonni",
    loginRequired: "Da fatan za ku shiga don amfani da saƙonnin sirri.",
    loadFailed: "Ba a iya loda saƙonni ba. Ku sake gwadawa.",
    readUpdateFailed: "An buɗe hirar, amma ba a iya sabunta sanarwar da ba a karanta ba.",
    blockedError: "Ba a samun wannan hira saboda ɗaya daga cikin asusun ya toshe ɗayan.",
    privacyError: "Wannan mai amfani ba ya karɓar sababbin saƙonni a yanzu.",
    followRequired: "Dole ne ku bi wannan mai amfani kafin ku aika masa saƙo.",
    selfMessage: "Ba za ku iya aika saƙo zuwa asusunku ba.",
    permissionError: "Ba ku da izinin aika wannan saƙo. Saitunan sirrin mai karɓa na iya hana shi.",
    sessionExpired: "Wataƙila zaman ku ya ƙare. Ku sake shiga.",
    sendFailed: "Ba a iya aika saƙonku ba. Ku sake gwadawa.",
    unblockFirst: "Kun toshe wannan asusun. Ku cire toshewar don ci gaba da saƙo.",
    maxLength: "Saƙonni ba za su wuce haruffa 5,000 ba.",
    sessionLogin: "Zaman ku ya ƙare. Ku sake shiga.",
  },
  yo: {
    title: "Àwọn Ìfiránṣẹ́",
    subtitle: "Àwọn ìjíròrò àṣírí rẹ",
    unread: "àwọn ìfiránṣẹ́ tí a kò tíì kà",
    search: "Wá ènìyàn tàbí ìfiránṣẹ́...",
    searchLabel: "Wá ènìyàn àti ìfiránṣẹ́",
    loading: "Ó ń ṣí àwọn ìfiránṣẹ́ rẹ...",
    blockedPreview: "O ti dí àkọọ́lẹ̀ yìí lọ́wọ́",
    sharedImage: "A pín àwòrán",
    sharedPost: "A pín ìtẹ̀jáde",
    startConversation: "Bẹ̀rẹ̀ ìjíròrò",
    message: "ìfiránṣẹ́",
    messages: "ìfiránṣẹ́",
    noUsers: "A kò rí ẹnikẹ́ni",
    noOtherUsers: "Kò sí àwọn olùlò mìíràn síbẹ̀",
    tryAnother: "Gbìyànjú orúkọ mìíràn tàbí orúkọ olùlò.",
    otherUsers: "Àwọn olùlò mìíràn tí wọ́n forúkọ sílẹ̀ yóò hàn níbí.",
    tagline: "Pẹpẹ kan. Ọ̀pọ̀lọpọ̀ ayé.",
    privateConversation: "Ìjíròrò àṣírí",
    blockedTitle: "O ti dí àkọọ́lẹ̀ yìí lọ́wọ́",
    blockedDescription:
      "O kò lè fi ìfiránṣẹ́ ránṣẹ́ sí àkọọ́lẹ̀ yìí nígbà tí o bá dí i lọ́wọ́. O lè ṣàkóso àwọn àkọọ́lẹ̀ tí o dí ní àwọn ètò.",
    manageBlocked: "Ṣàkóso àwọn àkọọ́lẹ̀ tí a dí",
    startTitle: "Bẹ̀rẹ̀ ìjíròrò náà",
    sendPrivate: "Fi ìfiránṣẹ́ àṣírí ránṣẹ́ sí",
    openPost: "Ṣí ìtẹ̀jáde tí a pín",
    tapViewPost: "Tẹ̀ láti wo ìtẹ̀jáde yìí",
    sent: "Ti fi ránṣẹ́",
    online: "Lórí ayélujára",
    lastSeen: "Ìgbà tí a rí i gbẹ̀yìn",
    justNow: "sẹ́jú yìí",
    lastSeenUnavailable: "A kò mọ ìgbà tí a rí i gbẹ̀yìn",
    writeMessage: "Kọ ìfiránṣẹ́...",
    sendMessage: "Fi ìfiránṣẹ́ ránṣẹ́",
    enterHint: "Tẹ Enter láti fi ránṣẹ́ · Shift + Enter fún ìlà tuntun",
    yourMessages: "Àwọn ìfiránṣẹ́ rẹ",
    chooseUser: "Yan olùlò tí ó forúkọ sílẹ̀ láti bẹ̀rẹ̀ ìjíròrò àṣírí.",
    findPeople: "Wá ènìyàn",
    stayConnected: "Máa bá àwọn ènìyàn sọ̀rọ̀",
    communityDescription: "Àwọn ìjíròrò àṣírí rẹ ń mú àwùjọ VYBE sún mọ́ra.",
    projectOneUser: "Olùlò VYBE",
    projectOneMember: "Ọmọ ẹgbẹ́ VYBE",
    backInbox: "Padà sí àpótí ìfiránṣẹ́",
    loginRequired: "Jọ̀wọ́ wọlé láti lo àwọn ìfiránṣẹ́ àṣírí.",
    loadFailed: "A kò lè ṣí àwọn ìfiránṣẹ́. Jọ̀wọ́ tún gbìyànjú.",
    readUpdateFailed: "A ṣí ìjíròrò náà, ṣùgbọ́n a kò lè ṣe àtúnṣe àwọn ìfitónilétí tí a kò kà.",
    blockedError: "Ìjíròrò yìí kò sí nítorí pé ọ̀kan nínú àwọn àkọọ́lẹ̀ ti dí èkejì lọ́wọ́.",
    privacyError: "Olùlò yìí kò gba àwọn ìfiránṣẹ́ tuntun lọ́wọ́ báyìí.",
    followRequired: "O gbọdọ̀ tẹ̀lé olùlò yìí kí o tó lè fi ìfiránṣẹ́ ránṣẹ́ sí i.",
    selfMessage: "O kò lè fi ìfiránṣẹ́ ránṣẹ́ sí àkọọ́lẹ̀ tìrẹ.",
    permissionError: "O kò ní àṣẹ láti fi ìfiránṣẹ́ yìí ránṣẹ́. Àwọn ètò àṣírí olùgbà lè dí i.",
    sessionExpired: "Ó ṣeé ṣe kí àkókò ìwọlé rẹ ti parí. Jọ̀wọ́ tún wọlé.",
    sendFailed: "A kò lè fi ìfiránṣẹ́ rẹ ránṣẹ́. Jọ̀wọ́ tún gbìyànjú.",
    unblockFirst: "O ti dí àkọọ́lẹ̀ yìí lọ́wọ́. Tú u sílẹ̀ láti tún bẹ̀rẹ̀ ìfiránṣẹ́.",
    maxLength: "Àwọn ìfiránṣẹ́ kò gbọdọ̀ ju àmì 5,000 lọ.",
    sessionLogin: "Àkókò ìwọlé rẹ ti parí. Jọ̀wọ́ tún wọlé.",
  },
  ig: {
    title: "Ozi",
    subtitle: "Mkparịta ụka nzuzo gị",
    unread: "ozi a na-agụbeghị",
    search: "Chọọ ndị mmadụ ma ọ bụ ozi...",
    searchLabel: "Chọọ ndị mmadụ na ozi",
    loading: "A na-ebudata ozi gị...",
    blockedPreview: "Ị gbochiela akaụntụ a",
    sharedImage: "Ekekọrịtara onyonyo",
    sharedPost: "Ekekọrịta ozi",
    startConversation: "Malite mkparịta ụka",
    message: "ozi",
    messages: "ozi",
    noUsers: "Ahụghị onye ọrụ ọ bụla",
    noOtherUsers: "Enweghị ndị ọrụ ọzọ ugbu a",
    tryAnother: "Gbalịa aha ọzọ ma ọ bụ aha njirimara ọzọ.",
    otherUsers: "Ndị ọrụ ndị ọzọ debanyere aha ga-apụta ebe a.",
    tagline: "Otu ikpo okwu. Ọtụtụ ụwa.",
    privateConversation: "Mkparịta ụka nzuzo",
    blockedTitle: "Ị gbochiela akaụntụ a",
    blockedDescription:
      "Ị gaghị enwe ike iziga akaụntụ a ozi mgbe ọ ka nọ na ndepụta ndị ị gbochiri. Ị nwere ike ijikwa akaụntụ ndị ị gbochiri na ntọala.",
    manageBlocked: "Jikwaa akaụntụ ndị egbochiri",
    startTitle: "Malite mkparịta ụka ahụ",
    sendPrivate: "Zigara",
    openPost: "Mepee ozi ekekọrịtara",
    tapViewPost: "Pịa ka ị hụ ozi a",
    sent: "Ezipụla",
    online: "Ọ nọ n'ịntanetị",
    lastSeen: "Oge ikpeazụ a hụrụ ya",
    justNow: "ugbu a",
    lastSeenUnavailable: "Amaghị oge ikpeazụ a hụrụ ya",
    writeMessage: "Dee ozi...",
    sendMessage: "Zipu ozi",
    enterHint: "Pịa Enter ka izipu · Shift + Enter maka ahịrị ọhụrụ",
    yourMessages: "Ozi gị",
    chooseUser: "Họrọ onye ọrụ debanyere aha ka ịmalite mkparịta ụka nzuzo.",
    findPeople: "Chọọ ndị mmadụ",
    stayConnected: "Nọgide na-akpakọrịta",
    communityDescription: "Mkparịta ụka nzuzo gị na-eme ka obodo VYBE dịrị nso.",
    projectOneUser: "Onye ọrụ VYBE",
    projectOneMember: "Onye otu VYBE",
    backInbox: "Laghachi na igbe ozi",
    loginRequired: "Biko banye iji ozi nzuzo.",
    loadFailed: "Enweghị ike ibudata ozi. Biko nwaa ọzọ.",
    readUpdateFailed: "Emepeela mkparịta ụka ahụ, mana enweghị ike imelite ọkwa ozi a na-agụbeghị.",
    blockedError: "Mkparịta ụka a adịghị n'ihi na otu akaụntụ egbochiela nke ọzọ.",
    privacyError: "Onye ọrụ a anaghị anabata ozi ọhụrụ ugbu a.",
    followRequired: "Ị ga-eso onye ọrụ a tupu izigara ya ozi.",
    selfMessage: "Ị gaghị eziga ozi na akaụntụ nke gị.",
    permissionError: "Ị nweghị ikike izipu ozi a. Ntọala nzuzo onye nnata nwere ike igbochi ya.",
    sessionExpired: "O nwere ike ịbụ na oge nbanye gị agwụla. Biko banye ọzọ.",
    sendFailed: "Enweghị ike izipu ozi gị. Biko nwaa ọzọ.",
    unblockFirst: "Ị gbochiela akaụntụ a. Wepụ ihe mgbochi ahụ ka i wee malite izipu ozi ọzọ.",
    maxLength: "Ozi agaghị agafe mkpụrụedemede 5,000.",
    sessionLogin: "Oge nbanye gị agwụla. Biko banye ọzọ.",
  },
};

function getMessageParts(content: string): MessageParts {
  const imageMarker = content.match(
    /\[\[PROJECT_ONE_SHARED_IMAGE:(https?:\/\/[^\]]+)\]\]/
  );

  const postMarker = content.match(
    /\[\[PROJECT_ONE_SHARED_POST:(\d+)\]\]/
  );

  const postUrl = content.match(
    /(?:https?:\/\/[^\s]+)?\/app\?[^ \n]*\bpost=(\d+)(?:[&#][^\s]*)?/
  );

  const relativePostUrl = content.match(
    /\/app\?[^ \n]*\bpost=(\d+)(?:[&#][^\s]*)?/
  );
  const audioMarker = content.match(/\[\[VYBE_DIRECT_AUDIO:([^\]]+)\]\]/);

  const postId =
    postMarker?.[1] ?? postUrl?.[1] ?? relativePostUrl?.[1] ?? null;

  const text = content
    .replace(/\n?\[\[VYBE_DIRECT_AUDIO:[^\]]+\]\]/, "")
    .replace(/\n?\[\[PROJECT_ONE_SHARED_IMAGE:https?:\/\/[^\]]+\]\]/, "")
    .replace(/\n?\[\[PROJECT_ONE_SHARED_POST:\d+\]\]/, "")
    .replace(/(^|\n)[^\n]*\/app\?[^\s\n]*\bpost=\d+[^\n]*(?=\n|$)/g, "$1")
    .trim();

  return {
    text,
    imageUrl: imageMarker?.[1] ?? null,
    postId,
    audioPath: audioMarker?.[1] ?? null,
  };
}

function getFriendlyMessageError(
  error: unknown,
  t: (key: string) => string
): string {
  const rawMessage =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : "";

  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes("messaging is unavailable") ||
    normalized.includes("blocked") ||
    normalized.includes("users_have_blocked_each_other")
  ) {
    return t("blockedError");
  }

  if (
    normalized.includes("not accepting new messages") ||
    normalized.includes("does not accept messages") ||
    normalized.includes("message privacy")
  ) {
    return t("privacyError");
  }

  if (
    normalized.includes("must follow this user") ||
    normalized.includes("follow this user before messaging")
  ) {
    return t("followRequired");
  }

  if (
    normalized.includes("cannot message yourself") ||
    normalized.includes("cannot send a message to yourself")
  ) {
    return t("selfMessage");
  }

  if (
    normalized.includes("row-level security") ||
    normalized.includes("permission denied")
  ) {
    return t("permissionError");
  }

  if (
    normalized.includes("jwt expired") ||
    normalized.includes("session expired") ||
    normalized.includes("not authenticated")
  ) {
    return t("sessionExpired");
  }

  return rawMessage || t("sendFailed");
}

EMOJI_OPTIONS.push(...`🇳🇬 🇺🇸 🇬🇧 🇨🇦 🇬🇭 🇰🇪 🇿🇦 🇫🇷 🇩🇪 🇧🇷 🇯🇵 🇨🇳 🇮🇳 🇦🇺 🇮🇹 🇪🇸 🇲🇽 🇪🇬 🇹🇷 🇸🇦 🇦🇪 🇳🇿 🇵🇹 🇳🇱 🇸🇪 🇳🇴 🇩🇰 🇫🇮 🇮🇪 🇨🇭 🇦🇷 🇨🇴 🇵🇭 🇸🇬 🇹🇭 🇵🇰 🇧🇩 🇺🇦 🇷🇺 🇰🇷 🇮🇱 🇯🇲 🇹🇿 🇺🇬 🇨🇲 🇸🇳 🇪🇹 🇿🇼 🇲🇦 🇹🇳 🇩🇿 🇵🇱 🇬🇷 🇧🇪 🇦🇹 🇨🇱 🇵🇪 🇻🇪 🇨🇺 🇭🇹 🇵🇦 🇨🇷 🇬🇹 🇭🇳 🇸🇻 🇩🇴 🇵🇷 🏳️ 🏴 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️`.split(" "));

export default function MessagesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { language } = useLanguage();
  const { isOnline, isReady: presenceReady } = useOnlinePresence();

  const c = translations[language] ?? translations.en;
  const t = (key: string) => c[key] ?? translations.en[key] ?? key;

  const [myId, setMyId] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeStoryUserIds, setActiveStoryUserIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({});
  const [selectedUserId, setSelectedUserId] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [reactions, setReactions] = useState<DirectMessageReaction[]>([]);
  const [replyTo, setReplyTo] = useState<DirectMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [reactionPickerId, setReactionPickerId] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [voiceMessageFile, setVoiceMessageFile] = useState<File | null>(null);
  const [voiceMessageUrl, setVoiceMessageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showInbox, setShowInbox] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const bottomRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceMessageUrlRef = useRef<string | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const { call: directCall, callError, remoteStream, muted: callMuted, toggleMute, startCall, answerCall, endCall } = useDirectCall(supabase, myId);
  const [speakerOn, setSpeakerOn] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!error) return;
    const timeout = window.setTimeout(() => setError(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [error]);

  const totalUnread = useMemo(
    () => Object.values(unreadByUser).reduce((sum, count) => sum + count, 0),
    [unreadByUser]
  );

  const loadData = useCallback(
    async (userId: string) => {
      const [
        profilesResult,
        storiesResult,
        messagesResult,
        notificationsResult,
        blockedResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, last_seen_at")
          .neq("id", userId)
          .order("display_name", { ascending: true }),

        supabase
          .from("stories")
          .select("user_id")
          .gt("expires_at", new Date().toISOString()),

        supabase
          .from("direct_messages")
          .select(
            "id, sender_id, recipient_id, content, created_at, delivered_at, read_at, edited_at, reply_to_id"
          )
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .order("created_at", { ascending: true }),

        supabase
          .from("notifications")
          .select("id,user_id,actor_id,type,read_at")
          .eq("user_id", userId)
          .eq("type", "message")
          .is("read_at", null),

        supabase
          .from("blocked_users")
          .select("blocked_id")
          .eq("blocker_id", userId),
      ]);

      if (profilesResult.error) {
        throw new Error(profilesResult.error.message);
      }

      if (messagesResult.error) {
        throw new Error(messagesResult.error.message);
      }

      if (notificationsResult.error) {
        throw new Error(notificationsResult.error.message);
      }

      if (blockedResult.error) {
        throw new Error(
          `Could not load your blocked accounts: ${blockedResult.error.message}`
        );
      }

      const counts: Record<string, number> = {};

      for (const notification of (notificationsResult.data ??
        []) as MessageNotification[]) {
        if (notification.actor_id) {
          counts[notification.actor_id] =
            (counts[notification.actor_id] ?? 0) + 1;
        }
      }

      setProfiles(profilesResult.data ?? []);
      if (storiesResult.error) {
        console.error("Could not load active story indicators:", storiesResult.error);
        setActiveStoryUserIds([]);
      } else {
        setActiveStoryUserIds([...new Set((storiesResult.data ?? []).map((story) => story.user_id))]);
      }
      setMessages(messagesResult.data ?? []);
      const messageIds = ((messagesResult.data ?? []) as DirectMessage[]).map((item) => item.id);
      if (messageIds.length) {
        const { data: reactionRows, error: reactionError } = await supabase
          .from("direct_message_reactions")
          .select("id, message_id, user_id, emoji")
          .in("message_id", messageIds);
        if (reactionError) console.error("Could not load message reactions:", reactionError);
        setReactions((reactionRows ?? []) as DirectMessageReaction[]);
      } else {
        setReactions([]);
      }

      const incomingMessageIds = ((messagesResult.data ?? []) as DirectMessage[])
        .filter((item) => item.recipient_id === userId && !item.delivered_at)
        .map((item) => item.id);

      if (incomingMessageIds.length > 0) {
        const { error: deliveryError } = await supabase.rpc(
          "mark_direct_messages_delivered",
          { p_message_ids: incomingMessageIds }
        );

        if (deliveryError) {
          console.error("Could not mark messages as delivered:", deliveryError);
        }
      }
      setBlockedIds(
        (blockedResult.data ?? []).map(
          (item: { blocked_id: string }) => item.blocked_id
        )
      );
      setUnreadByUser(counts);
    },
    [supabase]
  );

  const markConversationAsRead = useCallback(
    async (userId: string, otherUserId: string) => {
      if (!userId || !otherUserId) return;

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("actor_id", otherUserId)
        .eq("type", "message")
        .is("read_at", null);

      if (updateError) {
        console.error(
          "Could not mark conversation notifications as read:",
          updateError
        );
        setError(t("readUpdateFailed"));
        return;
      }

      setUnreadByUser((current) => ({
        ...current,
        [otherUserId]: 0,
      }));

      window.dispatchEvent(new Event("project-one-notifications-updated"));
    },
    // Translation changes must not alter notification behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [supabase]
  );

  const markMessageNotificationsAsRead = useCallback(async (userId: string) => {
    if (!userId) return;
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("type", "message")
      .is("read_at", null);

    if (updateError) {
      console.error("Could not clear unread message notifications:", updateError);
      return;
    }

    setUnreadByUser({});
    window.dispatchEvent(new Event("project-one-notifications-updated"));
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        setLoading(true);
        setError("");

        const { data, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!data.user) {
          throw new Error(t("loginRequired"));
        }

        if (!active) return;

        const userId = data.user.id;
        setMyId(userId);

        await loadData(userId);
        await markMessageNotificationsAsRead(userId);

        if (!active) return;

        const params = new URLSearchParams(window.location.search);
        const requestedUser = params.get("user");

        if (requestedUser && requestedUser !== userId) {
          setSelectedUserId(requestedUser);
          setShowInbox(false);
          const { error: readError } = await supabase.rpc(
            "mark_direct_messages_read",
            { p_sender_id: requestedUser }
          );

          if (readError) {
            console.error("Could not mark messages as read:", readError);
          }

          await markConversationAsRead(userId, requestedUser);
        }
      } catch (err) {
        console.error("Could not load messages:", err);

        if (active) {
          setError(
            err instanceof Error ? err.message : t("loadFailed")
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void initialize();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, loadData, markConversationAsRead, markMessageNotificationsAsRead]);

  useEffect(() => {
    if (!myId) return;

    const refresh = () => {
      void loadData(myId).catch((err: unknown) => {
        console.error("Could not refresh messages:", err);
      });
    };

    const messagesChannel = supabase
      .channel(`direct-messages-${myId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
        },
        refresh
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel(`message-notifications-${myId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${myId}`,
        },
        refresh
      )
      .subscribe();

    const profilesChannel = supabase
      .channel(`message-profile-status-${myId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        refresh
      )
      .subscribe();
    const refreshTimer = window.setInterval(refresh, 60_000);

    return () => {
      window.clearInterval(refreshTimer);
      void supabase.removeChannel(messagesChannel);
      void supabase.removeChannel(notificationsChannel);
      void supabase.removeChannel(profilesChannel);
    };
  }, [myId, supabase, loadData]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedUserId]);

  const selectedProfile = profiles.find(
    (profile) => profile.id === selectedUserId
  );

  const hasBlockedSelectedUser = blockedIds.includes(selectedUserId);

  const currentMessages = messages.filter(
    (item) =>
      (item.sender_id === myId && item.recipient_id === selectedUserId) ||
      (item.sender_id === selectedUserId && item.recipient_id === myId)
  );
  const callPeerProfile = directCall
    ? profiles.find((profile) => profile.id === directCall.peerId)
    : undefined;

  const conversations = useMemo(() => {
    return profiles
      .map((profile) => {
        const theirMessages = messages.filter(
          (item) =>
            (item.sender_id === myId && item.recipient_id === profile.id) ||
            (item.sender_id === profile.id && item.recipient_id === myId)
        );

        const latest = theirMessages[theirMessages.length - 1];

        return {
          profile,
          latest,
          count: theirMessages.length,
          unread: unreadByUser[profile.id] ?? 0,
          blocked: blockedIds.includes(profile.id),
        };
      })
      .filter(({ profile, latest }) => {
        const query = search.trim().toLowerCase();

        if (!query) return Boolean(latest);

        return (
          (profile.display_name ?? "").toLowerCase().includes(query) ||
          (profile.username ?? "").toLowerCase().includes(query) ||
          (latest?.content ?? "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const aTime = a.latest ? new Date(a.latest.created_at).getTime() : 0;
        const bTime = b.latest ? new Date(b.latest.created_at).getTime() : 0;

        return bTime - aTime;
      });
  }, [profiles, messages, myId, search, unreadByUser, blockedIds]);

  useEffect(() => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    audio.srcObject = remoteStream;
    audio.muted = !speakerOn;
    if (remoteStream) void audio.play().catch(() => undefined);
  }, [remoteStream, speakerOn]);

  useEffect(() => () => {
    if (voiceRecorderRef.current?.state === "recording") voiceRecorderRef.current.stop();
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (voiceMessageUrlRef.current) URL.revokeObjectURL(voiceMessageUrlRef.current);
  }, []);

  function displayName(profile: Profile) {
    return (
      profile.display_name?.trim() ||
      profile.username?.trim() ||
      t("projectOneUser")
    );
  }

  function usernameLabel(profile: Profile) {
    const username = profile.username?.trim();

    if (!username) return t("projectOneMember");

    return username.startsWith("@") ? username : `@${username}`;
  }

  function openStoryFromMessages(userId: string) {
    window.sessionStorage.setItem("project-one-open-story-user", userId);
    router.push("/app");
  }

  function insertEmoji(emoji: string) {
    const input = messageInputRef.current;
    if (!input) {
      setMessage((current) => `${current}${emoji}`);
      setShowEmojiPicker(false);
      return;
    }
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const next = `${message.slice(0, start)}${emoji}${message.slice(end)}`;
    setMessage(next);
    setShowEmojiPicker(false);
    requestAnimationFrame(() => {
      input.focus();
      const cursor = start + emoji.length;
      input.setSelectionRange(cursor, cursor);
    });
  }

  function formatTime(date: string) {
    const localeByLanguage: Record<Language, string> = {
      en: "en",
      fr: "fr-FR",
      es: "es-ES",
      pt: "pt-PT",
      ar: "ar",
      ha: "ha",
      yo: "yo",
      ig: "ig",
    };

    return new Date(date).toLocaleTimeString(localeByLanguage[language] ?? "en", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function presenceLabel(profile: Profile) {
    if (isOnline(profile.id)) return t("online");
    if (!profile.last_seen_at) return t("lastSeenUnavailable");

    const ageInSeconds = Math.max(
      0,
      Math.floor((now - new Date(profile.last_seen_at).getTime()) / 1000)
    );

    if (!Number.isFinite(ageInSeconds)) return t("lastSeenUnavailable");
    if (ageInSeconds < 60) return `${t("lastSeen")} ${t("justNow")}`;

    const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
      ["minute", 60],
      ["hour", 60 * 60],
      ["day", 24 * 60 * 60],
      ["week", 7 * 24 * 60 * 60],
      ["month", 30 * 24 * 60 * 60],
      ["year", 365 * 24 * 60 * 60],
    ];
    let unit = units[0][0];
    let divisor = units[0][1];

    for (const [candidateUnit, candidateDivisor] of units) {
      if (ageInSeconds >= candidateDivisor) {
        unit = candidateUnit;
        divisor = candidateDivisor;
      }
    }

    const localeByLanguage: Record<Language, string> = {
      en: "en",
      fr: "fr-FR",
      es: "es-ES",
      pt: "pt-PT",
      ar: "ar",
      ha: "ha",
      yo: "yo",
      ig: "ig",
    };
    const relativeTime = new Intl.RelativeTimeFormat(
      localeByLanguage[language] ?? "en",
      { numeric: "auto" }
    ).format(-Math.floor(ageInSeconds / divisor), unit);

    return `${t("lastSeen")} ${relativeTime}`;
  }

  async function openConversation(userId: string) {
    setSelectedUserId(userId);
    setShowInbox(false);
    setError("");
    setMessage("");
    setReplyTo(null);

    const { error: readError } = await supabase.rpc(
      "mark_direct_messages_read",
      { p_sender_id: userId }
    );

    if (readError) {
      console.error("Could not mark messages as read:", readError);
    }

    await markConversationAsRead(myId, userId);
  }

  function openSharedPost(postId: string) {
    if (!/^\d+$/.test(postId)) return;

    router.push(`/app?post=${encodeURIComponent(postId)}`);
  }

  async function saveMessageEdit(item: DirectMessage) {
    const content = editDraft.trim();
    if (!content || !myId) return;
    setError("");
    const editedAt = new Date().toISOString();
    const { error: updateError } = await supabase.from("direct_messages")
      .update({ content, edited_at: editedAt }).eq("id", item.id).eq("sender_id", myId);
    if (updateError) { setError(updateError.message); return; }
    setMessages((current) => current.map((row) => row.id === item.id ? { ...row, content, edited_at: editedAt } : row));
    setEditingMessageId(null);
    setEditDraft("");
  }

  async function deleteMessage(item: DirectMessage) {
    if (!myId || !window.confirm("Delete this message?")) return;
    const { error: deleteError } = await supabase.from("direct_messages")
      .delete().eq("id", item.id).eq("sender_id", myId);
    if (deleteError) { setError(deleteError.message); return; }
    setMessages((current) => current.filter((row) => row.id !== item.id));
    setReactions((current) => current.filter((row) => row.message_id !== item.id));
  }

  async function toggleReaction(messageId: number, emoji: string) {
    if (!myId) return;
    const existing = reactions.find((row) => row.message_id === messageId && row.user_id === myId && row.emoji === emoji);
    if (existing) {
      const { error: deleteError } = await supabase.from("direct_message_reactions").delete().eq("id", existing.id).eq("user_id", myId);
      if (deleteError) { setError(deleteError.message); return; }
      setReactions((current) => current.filter((row) => row.id !== existing.id));
    } else {
      const { data, error: insertError } = await supabase.from("direct_message_reactions")
        .insert({ message_id: messageId, user_id: myId, emoji }).select("id, message_id, user_id, emoji").single();
      if (insertError) { setError(insertError.message); return; }
      setReactions((current) => [...current, data as DirectMessageReaction]);
    }
    setReactionPickerId(null);
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = message.trim();

    if (!selectedUserId || (!content && !voiceMessageFile) || sending) return;

    if (hasBlockedSelectedUser) {
      setError(t("unblockFirst"));
      return;
    }

    if (content.length > 5000) {
      setError(t("maxLength"));
      return;
    }

    setSending(true);
    setError("");
    let uploadedAudioPath: string | null = null;

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authData.user || authData.user.id !== myId) {
        throw new Error(t("sessionLogin"));
      }

      let storedContent = content;
      if (voiceMessageFile) {
        const extension = voiceMessageFile.type.includes("mp4") ? "m4a" : "webm";
        uploadedAudioPath = `${myId}/messages/${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(uploadedAudioPath, voiceMessageFile, {
            upsert: false,
            contentType: voiceMessageFile.type || "audio/webm",
          });
        if (uploadError) throw uploadError;
        storedContent = [`[[VYBE_DIRECT_AUDIO:${uploadedAudioPath}]]`, content].filter(Boolean).join("\n");
      }

      const { error: insertError } = await supabase
        .from("direct_messages")
        .insert({
          sender_id: myId,
          recipient_id: selectedUserId,
          content: storedContent,
          reply_to_id: replyTo?.id ?? null,
        });

      if (insertError) throw insertError;

      setMessage("");
      setReplyTo(null);
      if (voiceMessageUrlRef.current) URL.revokeObjectURL(voiceMessageUrlRef.current);
      voiceMessageUrlRef.current = null;
      setVoiceMessageUrl(null);
      setVoiceMessageFile(null);
      await loadData(myId);
    } catch (err) {
      if (uploadedAudioPath) {
        await supabase.storage.from("post-media").remove([uploadedAudioPath]);
      }
      console.error("Could not send message:", err);
      setError(getFriendlyMessageError(err, t));
    } finally {
      setSending(false);
    }
  }

  async function startVoiceRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice messages are not supported in this browser.");
      return;
    }
    try {
      if (voiceMessageUrlRef.current) URL.revokeObjectURL(voiceMessageUrlRef.current);
      voiceMessageUrlRef.current = null;
      setVoiceMessageUrl(null);
      setVoiceMessageFile(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      voiceChunksRef.current = [];
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      voiceRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 0) {
          const extension = blob.type.includes("mp4") ? "m4a" : "webm";
          setVoiceMessageFile(new File([blob], `voice-message.${extension}`, { type: blob.type }));
          const previewUrl = URL.createObjectURL(blob);
          voiceMessageUrlRef.current = previewUrl;
          setVoiceMessageUrl(previewUrl);
        } else {
          setError("No audio was captured. Please record again.");
        }
        voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
        voiceStreamRef.current = null;
        voiceRecorderRef.current = null;
        setRecordingVoice(false);
      };
      recorder.onerror = () => {
        setError("Recording stopped unexpectedly. Please try again.");
        voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
        voiceStreamRef.current = null;
        voiceRecorderRef.current = null;
        setRecordingVoice(false);
      };
      recorder.start();
      setRecordingVoice(true);
    } catch (recordError) {
      setError(recordError instanceof Error ? recordError.message : "Could not start voice recording.");
    }
  }

  function stopVoiceRecording() {
    if (voiceRecorderRef.current?.state === "recording") voiceRecorderRef.current.stop();
  }

  function clearVoiceMessage() {
    if (voiceMessageUrlRef.current) URL.revokeObjectURL(voiceMessageUrlRef.current);
    voiceMessageUrlRef.current = null;
    setVoiceMessageUrl(null);
    setVoiceMessageFile(null);
  }

  return (
    <div className="flex h-[calc(100dvh-5rem)] min-h-[500px] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white md:h-[calc(100vh-3rem)]">
      <div className="flex min-h-0 flex-1">
        <aside
          className={`${
            showInbox ? "flex" : "hidden"
          } w-full flex-col border-r border-gray-200 md:flex md:w-[340px] md:shrink-0 lg:w-[380px]`}
        >
          <div className="border-b border-gray-100 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-950">
                  {t("title")}
                </h1>
                <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
              </div>

              {totalUnread > 0 && (
                <span
                  aria-label={`${totalUnread} ${t("unread")}`}
                  title={`${totalUnread} ${t("unread")}`}
                  className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-2 text-xs font-bold text-white"
                >
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>

            <div className="relative mt-5">
              <svg
                viewBox="0 0 24 24"
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m16 16 4 4" strokeLinecap="round" />
              </svg>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t("search")}
                aria-label={t("searchLabel")}
                className="h-11 w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">
                {t("loading")}
              </p>
            ) : conversations.length > 0 ? (
              conversations.map(({ profile, latest, count, unread, blocked }) => {
                const hasActiveStory = activeStoryUserIds.includes(profile.id);
                const latestParts = latest
                  ? getMessageParts(latest.content)
                  : null;

                const preview = blocked
                  ? t("blockedPreview")
                  : latest
                    ? latestParts?.text ||
                      (latestParts?.imageUrl
                        ? t("sharedImage")
                        : latestParts?.postId
                          ? t("sharedPost")
                          : latestParts?.audioPath
                            ? t("audioMessage")
                          : "")
                    : `${usernameLabel(profile)} · ${t("startConversation")}`;

                return (
                  <div
                    key={profile.id}
                    onClick={() => void openConversation(profile.id)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void openConversation(profile.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-4 text-left transition hover:bg-gray-50 ${
                      selectedUserId === profile.id ? "bg-gray-50" : "bg-white"
                    }`}
                  >
                    <div className={`relative h-12 w-12 shrink-0 rounded-full ${hasActiveStory ? "bg-gradient-to-tr from-amber-400 via-fuchsia-600 to-purple-700" : "bg-gray-100 ring-1 ring-gray-200"}`} aria-label={hasActiveStory ? "Active story" : undefined}>
                      {hasActiveStory && (
                        <button type="button" onClick={(event) => { event.stopPropagation(); openStoryFromMessages(profile.id); }} aria-label={`View ${displayName(profile)}'s story`} title={`View ${displayName(profile)}'s story`} className="absolute inset-0 z-10 rounded-full" />
                      )}
                      <div className={`absolute overflow-hidden rounded-full bg-white ${hasActiveStory ? "pointer-events-none inset-[3px] border-2 border-white" : "inset-0"}`}>
                        {profile.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profile.avatar_url}
                            alt=""
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center"><ContactAvatarIcon className="h-6 w-6 text-gray-400" /></span>
                        )}
                      </div>

                      {unread > 0 && (
                        <span
                          aria-label={`${unread} ${t("unread")}`}
                          className="absolute -right-0.5 -top-0.5 z-20 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-600"
                        />
                      )}

                      {presenceReady && isOnline(profile.id) && (
                        <span
                          aria-label={t("online")}
                          title={t("online")}
                          className="absolute -bottom-0.5 -right-0.5 z-20 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-500"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`truncate text-sm ${
                            unread > 0
                              ? "font-extrabold text-gray-950"
                              : "font-semibold text-gray-950"
                          }`}
                        >
                          {displayName(profile)}
                        </p>

                        <div className="flex shrink-0 items-center gap-2">
                          {latest && (
                            <span className="text-[11px] text-gray-400">
                              {formatTime(latest.created_at)}
                            </span>
                          )}

                          {unread > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                              {unread > 99 ? "99+" : unread}
                            </span>
                          )}
                        </div>
                      </div>

                      <p
                        className={`mt-1 truncate text-xs ${
                          unread > 0
                            ? "font-semibold text-gray-800"
                            : "text-gray-500"
                        }`}
                      >
                        {preview}
                      </p>

                      {presenceReady && (
                        <p className="mt-1 truncate text-[10px] text-gray-400">
                          {presenceLabel(profile)}
                        </p>
                      )}

                      {count > 0 && (
                        <p className="mt-1 text-[10px] text-gray-400">
                          {count} {count === 1 ? t("message") : t("messages")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-semibold text-gray-800">
                  {search ? t("noUsers") : t("noConversations")}
                </p>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  {search ? t("tryAnother") : t("searchToStart")}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-5 py-3">
            <p className="text-center text-xs text-gray-400">{t("tagline")}</p>
          </div>
        </aside>

        <main
          className={`${
            showInbox ? "hidden" : "flex"
          } min-w-0 flex-1 flex-col md:flex`}
        >
          {selectedProfile ? (
            <>
              <header className="flex min-h-[76px] items-center gap-3 border-b border-gray-200 px-4 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => setShowInbox(true)}
                  aria-label={t("backInbox")}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 md:hidden"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path
                      d="m15 18-6-6 6-6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div className={`relative h-10 w-10 shrink-0 rounded-full ${activeStoryUserIds.includes(selectedProfile.id) ? "bg-gradient-to-tr from-amber-400 via-fuchsia-600 to-purple-700" : "bg-gray-100"}`}>
                  {activeStoryUserIds.includes(selectedProfile.id) && (
                    <button type="button" onClick={() => openStoryFromMessages(selectedProfile.id)} aria-label={`View ${displayName(selectedProfile)}'s story`} title={`View ${displayName(selectedProfile)}'s story`} className="absolute inset-0 z-10 rounded-full" />
                  )}
                  <div className={`absolute overflow-hidden rounded-full bg-white ${activeStoryUserIds.includes(selectedProfile.id) ? "pointer-events-none inset-[2px] border-2 border-white" : "inset-0"}`}>
                    {selectedProfile.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedProfile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center"><ContactAvatarIcon className="h-5 w-5 text-gray-400" /></span>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-gray-950">
                    <Link
                      href={`/app/profile?id=${encodeURIComponent(selectedProfile.id)}`}
                      className="hover:underline"
                    >
                      {displayName(selectedProfile)}
                    </Link>
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {usernameLabel(selectedProfile)}
                  </p>
                  {presenceReady && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                      {isOnline(selectedProfile.id) && (
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 rounded-full bg-green-500"
                        />
                      )}
                      {presenceLabel(selectedProfile)}
                    </p>
                  )}
                </div>
                {currentMessages.length > 0 && !hasBlockedSelectedUser && !directCall && (
                  <button
                    type="button"
                    onClick={() => void startCall(selectedProfile.id, displayName(selectedProfile))}
                    aria-label={t("call")}
                    title={t("call")}
                    className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50"
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5.5 4.5h3l1.5 4-2 1.5a14 14 0 0 0 6 6l1.5-2 4 1.5v3A2 2 0 0 1 17.4 20C10 19.6 4.4 14 4 6.6a2 2 0 0 1 1.5-2.1Z" />
                    </svg>
                  </button>
                )}
              </header>

              {hasBlockedSelectedUser ? (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-gray-50 px-6 py-12 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white ring-1 ring-gray-200">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-8 w-8 text-gray-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="m5.6 5.6 12.8 12.8" strokeLinecap="round" />
                    </svg>
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-gray-900">
                    {t("blockedTitle")}
                  </h3>

                  <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                    {t("blockedDescription")}
                  </p>

                  <Link
                    href="/app/settings/blocked"
                    className="mt-5 inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100"
                  >
                    {t("manageBlocked")}
                  </Link>
                </div>
              ) : (
                <>
                  <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-white px-4 py-5 sm:px-6 sm:py-6">
                    <div className="flex justify-center">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-gray-500">
                        {t("privateConversation")}
                      </span>
                    </div>

                    {currentMessages.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-8 w-8 text-gray-500"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path
                              d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>

                        <h3 className="mt-4 text-base font-semibold text-gray-900">
                          {t("startTitle")}
                        </h3>

                        <p className="mt-1 max-w-xs text-sm text-gray-500">
                          {t("sendPrivate")} {displayName(selectedProfile)}.
                        </p>
                      </div>
                    ) : (
                      currentMessages.map((item) => {
                        const mine = item.sender_id === myId;
                        const messageParts = getMessageParts(item.content);

                        return (
                          <div
                            key={item.id}
                            id={`direct-message-${item.id}`}
                            className={`flex ${
                              mine ? "justify-end" : "justify-start"
                            }`}
                          >
                            <div className="max-w-[85%] sm:max-w-[75%]">
                              <div
                                className={`overflow-hidden rounded-[22px] px-4 py-3 text-sm leading-6 ${
                                  mine
                                    ? "rounded-br-md bg-[#f3f3f1] text-gray-800"
                                    : "rounded-bl-md bg-gray-100 text-gray-900"
                                }`}
                              >
                                {item.reply_to_id && (() => {
                                  const replied = currentMessages.find((row) => row.id === item.reply_to_id);
                                  return replied ? <button type="button" onClick={() => document.getElementById(`direct-message-${replied.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })} className="mb-2 block max-w-full border-l-2 border-violet-400 pl-2 text-left text-xs text-gray-500"><span className="font-semibold">{replied.sender_id === myId ? "You" : displayName(selectedProfile)}</span><span className="block truncate">{getMessageParts(replied.content).text || "Media"}</span></button> : null;
                                })()}
                                {editingMessageId === item.id ? (
                                  <div className="min-w-52">
                                    <textarea value={editDraft} onChange={(event) => setEditDraft(event.target.value)} rows={2} maxLength={5000} autoFocus className="w-full resize-y rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none focus:border-violet-400" />
                                    <div className="mt-1 flex justify-end gap-2 text-xs">
                                      <button type="button" onClick={() => setEditingMessageId(null)} className="text-gray-500">Cancel</button>
                                      <button type="button" onClick={() => void saveMessageEdit(item)} className="font-semibold text-violet-700">Save</button>
                                    </div>
                                  </div>
                                ) : <>
                                {messageParts.text && (
                                  <p className="whitespace-pre-wrap break-words">
                                    {messageParts.text}
                                  </p>
                                )}
                                </>}

                                {messageParts.postId && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openSharedPost(messageParts.postId!)
                                    }
                                    className="mt-2 flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 text-left transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
                                    aria-label={t("openPost")}
                                  >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                                      <svg
                                        viewBox="0 0 24 24"
                                        className="h-5 w-5 text-gray-700"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                      >
                                        <rect
                                          x="3"
                                          y="3"
                                          width="18"
                                          height="18"
                                          rx="3"
                                        />
                                        <circle cx="8.5" cy="8.5" r="1.5" />
                                        <path d="m21 15-5-5L5 21" />
                                      </svg>
                                    </span>

                                    <span className="min-w-0 flex-1">
                                      <span className="block text-sm font-semibold text-gray-900">
                                        {t("sharedPost")}
                                      </span>
                                      <span className="mt-0.5 block text-xs text-gray-500">
                                        {t("tapViewPost")}
                                      </span>
                                    </span>

                                    <svg
                                      viewBox="0 0 24 24"
                                      className="h-4 w-4 shrink-0 text-gray-400"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="1.8"
                                    >
                                      <path
                                        d="M7 17 17 7M8 7h9v9"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  </button>
                                )}

                                {messageParts.imageUrl && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={messageParts.imageUrl}
                                    alt={t("sharedImage")}
                                    loading="lazy"
                                    className="mt-2 max-h-80 w-full rounded-xl object-contain"
                                  />
                                )}
                                {messageParts.audioPath && (
                                  <audio
                                    controls
                                    preload="metadata"
                                    src={supabase.storage.from("post-media").getPublicUrl(messageParts.audioPath).data.publicUrl}
                                    aria-label={t("audioMessage")}
                                    className="mt-2 max-w-full"
                                  />
                                )}
                              </div>

                              <div className={`mt-1 flex flex-wrap items-center gap-1 px-1 ${mine ? "justify-end" : "justify-start"}`}>
                                {Object.entries(reactions.filter((row) => row.message_id === item.id).reduce<Record<string, DirectMessageReaction[]>>((groups, row) => { (groups[row.emoji] ??= []).push(row); return groups; }, {})).map(([emoji, rows]) => (
                                  <button key={emoji} type="button" onClick={() => void toggleReaction(item.id, emoji)} aria-label={`${emoji} ${rows.length}`} className={`rounded-full border px-2 py-0.5 text-xs ${rows.some((row) => row.user_id === myId) ? "border-violet-300 bg-violet-50" : "border-gray-200 bg-white"}`}>{emoji} {rows.length}</button>
                                ))}
                                <button type="button" onClick={() => setReactionPickerId(reactionPickerId === item.id ? null : item.id)} className="rounded-full px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100" aria-label="React to message">☺</button>
                                <button type="button" onClick={() => { setReplyTo(item); messageInputRef.current?.focus(); }} className="rounded-full px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100">Reply</button>
                                {mine && messageParts.text && !messageParts.imageUrl && !messageParts.postId && !messageParts.audioPath && (
                                  <>
                                    <button type="button" onClick={() => { setEditingMessageId(item.id); setEditDraft(messageParts.text); }} className="rounded-full px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100">Edit</button>
                                    <button type="button" onClick={() => void deleteMessage(item)} className="rounded-full px-2 py-0.5 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600">Delete</button>
                                  </>
                                )}
                                {reactionPickerId === item.id && <span className="flex rounded-full border border-gray-200 bg-white px-1 shadow-sm">{["👍", "❤️", "😂", "😮", "😢", "🔥"].map((emoji) => <button key={emoji} type="button" onClick={() => void toggleReaction(item.id, emoji)} className="p-1 text-base hover:bg-gray-100" aria-label={`React ${emoji}`}>{emoji}</button>)}</span>}
                              </div>

                              <p
                                className={`mt-1 px-1 text-[10px] text-gray-400 ${
                                  mine ? "text-right" : "text-left"
                                }`}
                              >
                                {formatTime(item.created_at)}
                                {item.edited_at && <span className="ml-1">· edited</span>}
                                {mine && (
                                  <span
                                    className={`ml-1.5 inline-flex font-semibold ${
                                      item.read_at
                                        ? "text-green-600"
                                        : "text-gray-400"
                                    }`}
                                    title={
                                      item.read_at
                                        ? "Seen"
                                        : item.delivered_at
                                          ? "Delivered"
                                          : t("sent")
                                    }
                                    aria-label={
                                      item.read_at
                                        ? "Seen"
                                        : item.delivered_at
                                          ? "Delivered"
                                          : t("sent")
                                    }
                                  >
                                    {item.read_at ? "✓✓" : item.delivered_at ? "✓✓" : "✓"}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}

                    <div ref={bottomRef} />
                  </div>

                  <div className="border-t border-gray-200 bg-white px-3 py-3 sm:px-5 sm:py-4">
                    {recordingVoice && (
                      <p role="status" className="mb-2 text-xs font-medium text-red-600">{t("recordingVoice")}</p>
                    )}
                    {voiceMessageUrl && (
                      <div className="mb-3 flex items-center gap-2 rounded-xl bg-gray-50 p-2">
                        <audio controls src={voiceMessageUrl} aria-label={t("audioMessage")} className="min-w-0 flex-1" />
                        <button type="button" onClick={clearVoiceMessage} aria-label={t("removeRecording")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-200" title={t("removeRecording")}>×</button>
                      </div>
                    )}
                    {replyTo && (
                      <div className="mb-2 flex items-center gap-3 rounded-xl border-l-2 border-violet-500 bg-violet-50 px-3 py-2 text-xs text-gray-700">
                        <span className="min-w-0 flex-1 truncate"><strong>Replying to {replyTo.sender_id === myId ? "yourself" : displayName(selectedProfile)}</strong><span className="block truncate">{getMessageParts(replyTo.content).text || "Media"}</span></span>
                        <button type="button" onClick={() => setReplyTo(null)} className="px-2 py-1 text-gray-500" aria-label="Cancel reply">×</button>
                      </div>
                    )}
                    {showEmojiPicker && (
                      <div className="mb-2 max-h-52 overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white p-2 shadow-lg" role="group" aria-label={t("emoji")}>
                        <div className="grid grid-cols-8 gap-1">
                        {EMOJI_OPTIONS.map((emoji, index) => (
                          <button key={`${emoji}-${index}`} type="button" onClick={() => insertEmoji(emoji)} className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-gray-100" aria-label={`${t("emoji")} ${emoji}`}>
                            {emoji}
                          </button>
                        ))}
                        </div>
                      </div>
                    )}

                    <form
                      onSubmit={sendMessage}
                      className="flex items-end gap-2 sm:gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => recordingVoice ? stopVoiceRecording() : void startVoiceRecording()}
                        disabled={sending || hasBlockedSelectedUser}
                        aria-label={recordingVoice ? t("stopRecording") : t("recordVoice")}
                        title={recordingVoice ? t("stopRecording") : t("recordVoice")}
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-50 ${recordingVoice ? "border-red-200 bg-red-50 text-red-600" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}
                      >
                        {recordingVoice ? (
                          <span className="h-3.5 w-3.5 rounded-sm bg-current" />
                        ) : (
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="9" y="2" width="6" height="12" rx="3" />
                            <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8" />
                          </svg>
                        )}
                      </button>
                      <textarea
                        ref={messageInputRef}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            !event.shiftKey &&
                            !event.nativeEvent.isComposing
                          ) {
                            event.preventDefault();
                            event.currentTarget.form?.requestSubmit();
                          }
                        }}
                        placeholder={t("writeMessage")}
                        aria-label={t("writeMessage")}
                        rows={1}
                        maxLength={5000}
                        className="max-h-32 min-h-12 min-w-0 flex-1 resize-y rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm !text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white"
                        style={{ WebkitTextFillColor: "currentColor", opacity: 1 }}
                      />

                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker((visible) => !visible)}
                        disabled={hasBlockedSelectedUser}
                        aria-label={t("emoji")}
                        title={t("emoji")}
                        aria-expanded={showEmojiPicker}
                        className="flex h-12 w-10 shrink-0 items-center justify-center rounded-full text-2xl text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                      >
                        😊
                      </button>

                      <button
                        type="submit"
                        disabled={(!message.trim() && !voiceMessageFile) || recordingVoice || sending}
                        aria-label={t("sendMessage")}
                        title={t("sendMessage")}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-[#f3f3f1] text-gray-800 transition hover:bg-[#eaeae7] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {sending ? (
                          <span className="text-xs">...</span>
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path
                              d="m22 2-7 20-4-9-9-4Z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M22 2 11 13"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </button>
                    </form>

                    <p className="mt-2 hidden text-center text-[10px] text-gray-400 sm:block">
                      {t("enterHint")}
                    </p>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-200">
                <svg
                  viewBox="0 0 24 24"
                  className="h-9 w-9 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h2 className="mt-6 text-xl font-bold text-gray-950">
                {t("yourMessages")}
              </h2>

              <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
                {t("chooseUser")}
              </p>

              <button
                type="button"
                onClick={() => setShowInbox(true)}
                className="mt-6 rounded-xl border border-gray-200 bg-[#f3f3f1] px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-[#eaeae7] md:hidden"
              >
                {t("findPeople")}
              </button>
            </div>
          )}
        </main>

        <aside className="hidden w-[260px] shrink-0 flex-col items-center justify-center border-l border-gray-200 bg-gray-50 px-6 text-center xl:flex">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-gray-200">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 text-gray-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 3v18m9-9H3" strokeLinecap="round" />
            </svg>
          </div>

          <h3 className="mt-4 text-sm font-semibold text-gray-900">
            {t("stayConnected")}
          </h3>

          <p className="mt-2 text-xs leading-5 text-gray-500">
            {t("communityDescription")}
          </p>
        </aside>
      </div>

      {(error || callError) && (
        <div className="fixed right-4 top-4 z-[120] w-[min(24rem,calc(100vw-2rem))]" aria-live="assertive">
          {error && <div role="alert" className="mb-2 flex items-start gap-3 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700 shadow-xl"><span className="min-w-0 flex-1">{error}</span><button type="button" onClick={() => setError("")} className="shrink-0 text-lg leading-none text-gray-500" aria-label="Dismiss error">×</button></div>}
          {callError && <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm text-amber-800 shadow-xl"><span className="min-w-0 flex-1">{callError}</span></div>}
        </div>
      )}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" aria-label={t("activeCall")} />
      {directCall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={t(directCall.status === "incoming" ? "incomingCall" : directCall.status === "active" ? "activeCall" : "calling")}>
          <section className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5.5 4.5h3l1.5 4-2 1.5a14 14 0 0 0 6 6l1.5-2 4 1.5v3A2 2 0 0 1 17.4 20C10 19.6 4.4 14 4 6.6a2 2 0 0 1 1.5-2.1Z" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-950">{callPeerProfile ? displayName(callPeerProfile) : directCall.peerName}</h2>
            <p className="mt-1 text-sm text-gray-500">{t(directCall.status === "incoming" ? "incomingCall" : directCall.status === "active" ? "activeCall" : directCall.status === "connecting" ? "connectingCall" : directCall.status === "ringing" ? "ringingCall" : "calling")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {directCall.status === "incoming" && (
                <button type="button" onClick={() => void answerCall()} className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700">{t("answerCall")}</button>
              )}
              {(directCall.status === "active" || directCall.status === "connecting") && (
                <>
                  <button type="button" onClick={toggleMute} aria-pressed={callMuted} className={`flex min-w-20 flex-col items-center gap-1 rounded-2xl px-4 py-3 text-xs font-semibold ${callMuted ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}>
                    <span className="text-lg" aria-hidden="true">{callMuted ? "🔇" : "🎙️"}</span>{t(callMuted ? "unmuteCall" : "muteCall")}
                  </button>
                  <button type="button" onClick={() => setSpeakerOn((enabled) => !enabled)} aria-pressed={speakerOn} className={`flex min-w-20 flex-col items-center gap-1 rounded-2xl px-4 py-3 text-xs font-semibold ${speakerOn ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"}`}>
                    <span className="text-lg" aria-hidden="true">{speakerOn ? "🔊" : "🔈"}</span>{t(speakerOn ? "speakerOn" : "speakerOff")}
                  </button>
                </>
              )}
              <button type="button" onClick={() => void endCall(directCall.status === "incoming" ? "decline" : "end")} className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700">{t(directCall.status === "incoming" ? "declineCall" : "endCall")}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
