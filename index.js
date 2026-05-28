// ticket_full_fixed.js
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType,
  AttachmentBuilder,
} = require("discord.js");
require("./keepAlive");
const fs = require("fs");
const path = require("path");
const htmlTranscripts = require("discord-html-transcripts");

// Railway / Bulut sistemleri için geçici (/tmp) klasörünü kullanmak çökmenin önüne geçer
const ticketCounterPath = path.join("/tmp", "ticketCounter.json");

function getNextTicketNumber() {
  let data = { last: 0 };

  try {
    if (fs.existsSync(ticketCounterPath)) {
      data = JSON.parse(fs.readFileSync(ticketCounterPath, "utf8"));
    }
  } catch (e) {
    console.error("Sayaç dosyası okunurken hata oluştu, sıfırdan başlanıyor:", e);
  }

  data.last += 1;

  try {
    fs.writeFileSync(ticketCounterPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Railway dosya yazma izni hatası engellendi. Detay:", e);
    // Eğer disk tamamen kilitliyse botun crash olmaması için rastgele bir numara üretip devam etmesini sağlıyoruz
    return Math.floor(Math.random() * 8999) + 1000;
  }

  return data.last;
}


// ---- CONFIG ----
require("dotenv").config();
const token = process.env.TOKEN;
const adminRoleId = "1509239350884302918";
const logChannelId = "1509232649204666479";

// ---- KATEGORİ ID'LERİ ----
const CATEGORY_SUPPORT = "1509238826902487160"; // -Destek
const CATEGORY_GAME = "1509238852332818573"; // - Basvuru
// ---- KATEGORİLER (emoji + label) ----
const names = {
  support_ticket: {
    emoji: "<:cekic:1509239478445936760>",
    label: "Destek & Şikayet",
  },
  game_ticket: {
    emoji: "<:destek:1509239545722568965>",
    label: "Başvuru",
  },
};

// ---- SELECT MENU VALUE -> CATEGORY MAP ----
const map = {
  support_ticket: CATEGORY_SUPPORT,
  game_ticket: CATEGORY_GAME,
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

// === HELPERS ===
function buildTicketEmbed(
  user,
  categoryKey,
  createdAtUnix = Math.floor(Date.now() / 1000),
  status = "<a:loading:1509239782826442803>  Yetkili Bekliyor"
) {
  const embed = new EmbedBuilder()
    .setColor("#d41f1f")
    .setTitle(`${names[categoryKey]?.label || "Diğer"} Kategorili Destek!`)
    .setDescription(
      `**<@${user.id}>** kullanıcısı <t:${createdAtUnix}:R> tarihinde destek talebi oluşturdu.`
    )
    .addFields(
      { name: "Oluşturan Kullanıcı:", value: `${user.tag}` },
      { name: "Kategori:", value: `${names[categoryKey]?.label || "Diğer"}` },
      { name: "Durum:", value: status }
    )
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: "Conways #Kingdom Ticket | " })
    .setTimestamp();

  return embed;
}

function buildTicketButtons(disabledClaim = false) {
  const claim = new ButtonBuilder()
    .setCustomId("claim_ticket")
    .setLabel("Yetkili - Sahiplen")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("<a:putin:1509240212314652782>")
    .setDisabled(disabledClaim);

  const adminClose = new ButtonBuilder()
    .setCustomId("admin_close_ticket")
    .setLabel("Yetkili - Kapat")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("<:BlackOff:1509240394028945532>");

  const userClose = new ButtonBuilder()
    .setCustomId("user_close_ticket")
    .setLabel("Oyuncu - Kapat")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("<:BlackOff:1509240394028945532>");

  return new ActionRowBuilder().addComponents(claim, adminClose, userClose);
}

// === READY ===
client.once("ready", () => {
  console.log(`✅ ${client.user.tag} olarak giriş yapıldı!`);
  client.user.setActivity("Conways #Kingdom", { type: 0 });
});

// === PANEL KOMUTU ===
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  if (msg.content === "!sendticketpanel") {
    if (
      !msg.member.roles.cache.has(adminRoleId) &&
      !msg.member.permissions.has(PermissionsBitField.Flags.Administrator)
    )
      return msg.reply("❌ Yetkin yok.");

    const embed = new EmbedBuilder()
      .setTitle("Destek Sistemi")
      .setDescription("🎫 Aşağıdan kategori seçerek ticket oluşturabilirsiniz.")
      .setColor("#d41f1f");

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_category_select")
      .setPlaceholder("🎫 Ticket Açmak İçin Kategori Seçiniz")
      .addOptions([
        {
          label: "Destek, Bug & Teknik Sorunlar",
          value: "support_ticket",
          emoji: { id: "1509239478445936760", animated: true, name: "Levs" },
        },
        {
          label: "Oyun İçi Sorunlar & Rol Hataları",
          value: "game_ticket",
          emoji: { id: "1509239545722568965", animated: true, name: "Controller" },
        },
        {
          label: "Seçimi Sıfırla",
          value: "reset_selection",
          emoji: "🔄",
        },
      ]);

    const row = new ActionRowBuilder().addComponents(menu);
    await msg.channel.send({ embeds: [embed], components: [row] });
  }
});
// === TICKET COOLDOWN ===
const ticketCooldown = new Map();
const TICKET_COOLDOWN_MS = 3 * 60 * 1000; // 3 dakika

// === INTERACTIONS ===
client.on("interactionCreate", async (interaction) => {
  try {
    // === MENU SEÇİMİ ===
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "ticket_category_select"
    ) {
      await interaction.deferReply({ ephemeral: true }).catch(() => {});
      const choice = interaction.values[0];
      const userId = interaction.user.id;
const now = Date.now();

if (ticketCooldown.has(userId)) {
  const lastTime = ticketCooldown.get(userId);
  const remaining = TICKET_COOLDOWN_MS - (now - lastTime);

  if (remaining > 0) {
    const seconds = Math.ceil(remaining / 1000);
    return interaction.editReply({
      content: `⏳ Ticket açmadan önce **${seconds} saniye** beklemelisin.`,
      ephemeral: true,
    });
  }
}

if (choice === "reset_selection") {
  await interaction.editReply({
    content: "🔄 Seçiminiz sıfırlandı, yeni kategori seçebilirsiniz.",
    ephemeral: true,
  });
  return;
}

const parentId = map[choice]; // ✅ HATA BURADAYDI

const member = interaction.member;
const displayName = member.nickname || interaction.user.username;

const ticketNumber = getNextTicketNumber();


const safeName = `${displayName} - ${ticketNumber}`
  .toLowerCase()
  .replace(/[^a-z0-9 -]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 90);

const channel = await interaction.guild.channels.create({
  name: safeName,
  type: ChannelType.GuildText,
  parent: parentId || null,
  topic: interaction.user.id,
  permissionOverwrites: [
    {
      id: interaction.guild.roles.everyone,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    },
    {
      id: adminRoleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
      ],
    },
  ],
});


      const createdAtUnix = Math.floor(Date.now() / 1000);
      const embed = buildTicketEmbed(interaction.user, choice, createdAtUnix);
      const buttons = buildTicketButtons(false);

      await channel.send({
        content: `${names[choice]?.emoji || "<a:craft_fragment_rainbow32:1434935911954645144>"}  **<@${interaction.user.id}>**`,
        embeds: [embed],
        components: [buttons],
      });

      if (parentId === CATEGORY_GAME) {
        const formText = 
          "**Conways Başvuru**\n" +
          "İsim :\n\n" +
          "Yaş :\n\n" +
          "Kaç FPS alıyorsunuz ? :\n\n" +
          "Pov alabilir misin ?\n\n" +
          "Günlük ne kadar aktif olabilirsiniz ? :\n\n" +
          "FiveM saatiniz kaç ? :\n\n" +
          "3 ile 5 arası kill pow :\n\n" +
          "Referansın varmı :";
        
        await channel.send({ content: formText });
      }

      await interaction.editReply({
        content: `<a:Verify:1509249210845888512> Ticket oluşturuldu: <#${channel.id}>`,
      });
      return;
    }
    

    // === BUTTONLAR ===
    if (interaction.isButton()) {
      const { customId, channel, member } = interaction;
      const isAdmin =
        member.roles.cache.has(adminRoleId) ||
        member.permissions.has(PermissionsBitField.Flags.Administrator);

      // ✅ SAHİPLEN
      if (customId === "claim_ticket") {
        if (!isAdmin)
          return interaction.reply({
            content: "❌ Bu butona sadece yetkililer tıklayabilir.",
            ephemeral: true,
          });
        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        const fetched = await channel.messages.fetch({ limit: 50 });
        const ticketMsg =
          fetched.find((m) => m.pinned && m.embeds.length) ||
          fetched.find((m) => m.embeds.length);
        if (ticketMsg && ticketMsg.embeds.length) {
          const oldEmbed = EmbedBuilder.from(ticketMsg.embeds[0]);
          const fields = oldEmbed.data.fields || [];
          const createdAtUnix = Math.floor(
            new Date(oldEmbed.data.timestamp).getTime() / 1000
          );
          const elapsed = Math.floor(Date.now() / 1000) - createdAtUnix;
          const minutes = Math.floor(elapsed / 60);
          const seconds = elapsed % 60;

          const newFields = fields.map((f) => {
            if (f.name === "Durum:" || f.name === "Durum") {
              return {
                name: "Durum",
                value: `<a:putin:1509240212314652782> Yetkili Sahiplendi — <@${member.id}>\n<a:P_clock68:1509249617634525236> ${minutes} dakika ${seconds} saniyede sahiplendi.`,
              };
            }
            return f;
          });

          const updatedEmbed = new EmbedBuilder()
            .setColor("#00ff88")
            .setTitle(oldEmbed.data.title)
            .setDescription(oldEmbed.data.description)
            .addFields(newFields)
            .setThumbnail(
              member.user.displayAvatarURL({ dynamic: true }) ||
                oldEmbed.data.thumbnail?.url
            )
            .setFooter({
              text: "Conways Ticket | ",
            })
            .setTimestamp();

          await ticketMsg.edit({ embeds: [updatedEmbed] });
        }

        const webhook = await channel.createWebhook({
          name: "Conways SYSTEM'S",
          avatar: member.user.displayAvatarURL({ extension: "png", size: 1024 }),
        });
        await webhook.send({
          content: ` <a:32h_hello:1509241173842067566> Merhaba, ben <@${interaction.user.id}>. Size nasıl yardımcı olabilirim?`,
        });

        await interaction.editReply({
          content: "✅ Ticket başarıyla sahiplendi.",
        });
        return;
      }

 // 🔒 ADMIN CLOSE
if (customId === "admin_close_ticket") {

  if (!isAdmin)
    return interaction.reply({
      content: "❌ Bu işlemi sadece yetkililer yapabilir.",
      ephemeral: true,
    });

  const logChannel = interaction.guild.channels.cache.get(logChannelId);
  if (logChannel) {
    await sendReadableTranscript(channel, logChannel, interaction.user);
  }

  await interaction.reply({
    content: "🔒 Ticket 5 saniye içinde kapatılıyor...",
    ephemeral: true,
  });

  setTimeout(() => channel.delete().catch(() => {}), 5000);
  return;
}
// 🔒 USER CLOSE
if (customId === "user_close_ticket") {

  const ownerId = channel.topic;
  if (interaction.user.id !== ownerId && !isAdmin)
    return interaction.reply({
      content: "❌ Bu ticketı kapatmaya yetkiniz yok.",
      ephemeral: true,
    });

  const logChannel = interaction.guild.channels.cache.get(logChannelId);
  if (logChannel) {
    await sendReadableTranscript(channel, logChannel, interaction.user);
  }

  await interaction.reply({
    content: "🔒 Ticket 5 saniye içinde kapatılıyor...",
    ephemeral: true,
  });

  setTimeout(() => channel.delete().catch(() => {}), 5000);
  return;
}

    }
  } catch (err) {
    console.error("Interaction error:", err);
  }
});


const { Collection } = require("discord.js");

client.commands = new Collection();

// komutlar klasörünü oku
const commandsPath = path.join(__dirname, "komutlar");
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

// slash command handler
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(err);
    if (!interaction.replied) {
      await interaction.reply({ content: "Hata oluştu.", ephemeral: true });
    }
  }
});

// ===== OKUNABİLİR + GÖRSEL (HTML) TRANSCRIPT =====
async function sendReadableTranscript(channel, logChannel, closingUser) {
  try {
    const attachment = await htmlTranscripts.createTranscript(channel, {
      limit: -1,
      fileName: `transcript-${channel.name}.html`,
      minusTemplate: false,
      hydrate: true,
      saveImages: true
    });

    const ownerId = channel.topic;
    let ownerMention = "Bilinmiyor";
    if (ownerId && /^\d+$/.test(ownerId)) {
      ownerMention = `<@${ownerId}>`;
    }

    const logEmbed = new EmbedBuilder()
      .setColor("#2f3136")
      .setTitle("🎫 Ticket Kapatıldı (Transcript)")
      .setDescription(`Kapatılan talebe ait tüm konuşma geçmişi ekteki dosyaya güvenli bir şekilde aktarıldı.`)
      .addFields(
        { name: "Kanal Adı:", value: `\`${channel.name}\``, inline: true },
        { name: "Ticket Sahibi:", value: ownerMention, inline: true },
        { name: "Kapatan Yetkili/Oyuncu:", value: `<@${closingUser.id}>`, inline: true },
        { name: "Kapatılma Zamanı:", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
      )
      .setFooter({ text: "Conways #Kingdom Log Sistemi" })
      .setTimestamp();

    await logChannel.send({
      embeds: [logEmbed],
      files: [attachment],
    });

  } catch (error) {
    console.error("Transcript oluşturulurken hata çıktı:", error);
    await logChannel.send({ content: `❌ **${channel.name}** için transkript dosyası oluşturulamadı.` }).catch(() => {});
  }
}

// BULUTTA ANLIK OLARAK YAKALANMAYAN HATALARI TUTARAK BOTUN TAMAMEN KAPANMASINI (CRASH) ENGELLER
process.on("unhandledRejection", (reason, p) => {
  console.log(" [Gözetleme] Yakalanamayan Reddedilme:", reason, p);
});
process.on("uncaughtException", (err, origin) => {
  console.log(" [Gözetleme] Yakalanamayan İstisna:", err, origin);
});

client.login(token);
