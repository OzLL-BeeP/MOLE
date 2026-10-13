const pino = require("pino");

async function startMOLE() {
  const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
  } = await import("@whiskeysockets/baileys");

  const { state, saveCreds } =
    await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("MOLE berhasil terhubung ke WhatsApp!");
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;

      console.log("Koneksi terputus:", code);

      if (code !== DisconnectReason.loggedOut) {
        setTimeout(() => startMOLE(), 5000);
      } else {
        console.log("Sesi logout. Login ulang diperlukan.");
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const jid = msg.key.remoteJid;
      if (!jid || jid === "status@broadcast") continue;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

      if (text.trim().toLowerCase() === ".menu") {
        await sock.sendMessage(jid, {
          text: [
            "╭━━━「 MOLE 」━━━╮",
            "",
            "🎮 Grup Mabar Mobile Legends",
            "",
            "📜 GROUP RULES",
            "1. Hormati sesama member.",
            "2. Hindari spam chat.",
            "3. Dilarang mengirim konten NSFW.",
            "4. Dilarang menipu atau melakukan scam.",
            "5. Jangan memancing keributan.",
            "6. Jangan menyebarkan data pribadi.",
            "7. Patuhi arahan admin.",
            "",
            "Have fun & respect each other!",
            "╰━━━━━━━━━━━━━━╯",
          ].join("\n"),
        });
      }
    }
  });
}

startMOLE().catch((err) => {
  console.error("MOLE gagal dijalankan:", err);
  process.exit(1);
});
