const { 
  SlashCommandBuilder, 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  PermissionsBitField 
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Destek ve başvuru panelini gönderir."),

  async execute(interaction) {
    // Sadece yönetici yetkisi olanların bu komutu kullanmasını istiyorsan bu kontrol kalabilir
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ 
        content: "❌ Bu komutu kullanmak için `Yönetici` yetkisine sahip olmalısın.", 
        ephemeral: true 
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("Conways #Kingdom - Destek Sistemi")
      .setDescription(
        "🎫 Sunucumuzla ilgili işlemler için aşağıdan uygun kategoriyi seçerek destek talebi oluşturabilirsiniz.\n\n" +
        "🟢 **Başvuru:** Ekip veya yetkili başvuruları için form doldurmanızı sağlar.\n" +
        "🔵 **Destek & Şikayet:** Sunucu içi sorunlar ve şikayetleriniz için yetkililerle görüşmenizi sağlar."
      )
      .setColor("#d41f1f")
      .setFooter({ text: "Conways #Kingdom | Kategori Seçiniz" })
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_category_select")
      .setPlaceholder("🎫 Ticket Açmak İçin Kategori Seçiniz")
      .addOptions([
        {
          label: "Başvuru",
          value: "game_ticket", // 🟢 index.js'deki Başvuru kategorisini (CATEGORY_GAME) tetikler
          emoji: { id: "1509239478445936760", animated: true } // Çekiç emojisi
        },
        {
          label: "Destek & Şikayet",
          value: "support_ticket", // 🔵 index.js'deki Destek kategorisini (CATEGORY_SUPPORT) tetikler
          emoji: { id: "1509239545722568965", animated: true } // Destek emojisi
        },
        {
          label: "Seçimi Sıfırla",
          value: "reset_selection",
          emoji: "🔄"
        }
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    // Komutu kullandıktan sonra kanala paneli gönderir
    await interaction.reply({
      embeds: [embed],
      components: [row]
    }).catch(err => console.error("Ticket komutunda mesaj gönderilemedi:", err));
  },
};
