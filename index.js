const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} = require("@whiskeysockets/baileys");

const PHONE = (process.env.MOLE_PHONE_NUMBER || "")
  .replace(/\D/g, "");

let reconnecting = false;

async function startMOLE() {
  console.log("[MOLE] Memulai koneksi...");
  console.log("[MOLE] Nomor tersedia:", PHONE.length > 0);
  const { state, saveCreds } =
    await useMultiFileAuthState("auth_info");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    console.log("[MOLE] Status koneksi:", connection);

    if (
      connection === "connecting" &&
      !state.creds.registered &&
      !sock.pairingRequested
    ) {
      sock.pairingRequested = true;

      if (!PHONE) {
        console.error(
          "MOLE_PHONE_NUMBER belum diatur di Environment variables FadeHost."
        );
        return;
      }

      try {
        const code = await sock.requestPairingCode(PHONE);
        console.log("================================");
        console.log("MOLE PAIRING CODE:", code);
        console.log("Masukkan kode ini di WhatsApp.");
        console.log("================================");
      } catch (error) {
        sock.pairingRequested = false;
        console.error("Pairing gagal:", error.message);
      }
    }

    if (connection === "open") {
      console.log("MOLE berhasil terhubung ke WhatsApp!");
    }

    if (connection === "close" && !reconnecting) {
      const status = lastDisconnect?.error?.output?.statusCode;
      console.log("Koneksi ditutup. Status:", status);

      if (status !== DisconnectReason.loggedOut) {
        reconnecting = true;
        setTimeout(() => {
          reconnecting = false;
          startMOLE().catch(console.error);
        }, 5000);
      } else {
        console.error("Sesi logout. Pairing ulang diperlukan.");
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
        msg.message.imageMessage?.caption ||
        "";

      if (text.trim().toLowerCase() === ".menu") {
        await sock.sendMessage(jid, {
          text: [
            "╭━━━「 MOLE 」━━━╮",
            "",
            "🎮 GRUP MABAR MOBILE LEGENDS",
            "",
            "📜 PERATURAN GRUP",
            "1. Hormati sesama member.",
            "2. Hindari spam chat.",
            "3. Dilarang mengirim konten NSFW.",
            "4. Dilarang melakukan scam.",
            "5. Jangan memancing keributan.",
            "6. Jangan menyebarkan data pribadi.",
            "7. Patuhi arahan admin.",
            "",
            "Mabar santai, tetap saling menghargai!",
            "╰━━━━━━━━━━━━━━━━╯",
          ].join("\n"),
        });
      }
    }
  });
}

startMOLE().catch((error) => {
  console.error("MOLE gagal dijalankan:", error);
  process.exit(1);
});
