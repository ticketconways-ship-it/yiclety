const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config(); // Değişkenleri Railway/çevreden okumak için şart

// ELLE YAZILAN HER ŞEYİ SİLDİK, ARTIK DEĞİŞKENLERDEN OKUYOR
const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID; 

if (!token || !clientId || !guildId) {
    console.error("❌ HATA: Komut yüklemesi için gerekli değişkenler (TOKEN, CLIENT_ID, GUILD_ID) Railway panelinde eksik!");
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'komutlar');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[UYARI] ${filePath} dosyasında "data" veya "execute" eksik.`);
        }
    }
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`${commands.length} adet uygulama komutu yenileniyor.`);
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );
        console.log(`${data.length} adet uygulama komutu başarıyla yüklendi.`);
    } catch (error) {
        console.error("Komutlar yüklenirken hata oluştu:", error);
    }
})();
