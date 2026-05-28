const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    PermissionsBitField,
    AttachmentBuilder,
} = require('discord.js');

const bannerFile = new AttachmentBuilder('./conways.webp', {
    name: 'conways.webp'
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Destek sistemi panelini gönderir.')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {

        try {

            await interaction.deferReply({ ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle('Ticket Sistemi')
                .setDescription(
                    '<:conway:1509248142594539611> **Destek Sistemi Hakkında:**\n' +
                    'Lütfen sorununuz ile **eşleşen başlığı** seçerek destek talebi açınız..\n\n' 
                )
                .setColor('#000000')
                .setImage('attachment://conways.webp')
                .setFooter({
                    text: 'Conways #Kingdom Ticket´s'
                });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_category_select')
                .setPlaceholder('🎫 Ticket Açmak İçin Kategori Seçiniz')
                .addOptions([
                    {
                        label: 'Başvuru',
                        description: 'Ekibe Başvuruda Bulunmak İçin Açınınız.',
                        value: 'game_ticket',
                        emoji: { id: '1509239545722568965', animated: false, name: 'yardim' }
                    },
                    {
                        label: 'Destek & Şikayet',
                        description: 'Ekip İçi Destek Ve Şikayet İçin Açınız',
                        value: 'support_ticket',
                        emoji: { id: '1509239478445936760', animated: false, name: 'yardim' }
                    },
                    {
                        label: 'Seçimi Sıfırla',
                        description: 'Yapılan seçimi iptal eder.',
                        value: 'reset_selection',
                        emoji: { id: '1509246873129582703', animated: false, name: 'yardim' }
                    },
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.channel.send({
                embeds: [embed],
                components: [row],
                files: [bannerFile],
            });

            await interaction.editReply({
                content: '✅ Ticket paneli gönderildi.'
            });

        } catch (error) {

            console.error('Ticket paneli gönderilirken hata:', error);

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: '❌ Hata oluştu.'
                }).catch(() => {});
            }
        }
    },
};
