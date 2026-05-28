const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// BURAYA KENDİ BİLGİLERİNİ GİR
const token = 'MTUwOTIzODUzNTIwOTg4MTYwMA.GcYLGR.Rzq2xS2hv_6vKCnlT0mqJyL_g2rHghC1cvcGwE';
const clientId = '1509238535209881600';
const guildId =  '1509207186092458194'; 
const commands = [];
const commandsPath = path.join(__dirname, 'komutlar');
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
        console.error(error);
    }
})();
