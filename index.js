const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

let botConnected = false;

const config = {
  botAccount: {
    username: "iWadlessV2",
    password: "fake3",
    type: "legacy"
  },
  server: {
    ip: "play.reborncraft.pw",
    port: 25565,
    version: "1.19.3"
  },
  utils: {
    autoAuth: {
      enabled: true,
      password: "fake3"
    },
    chatMessages: {
      enabled: true,
      messages: [      
        { text: "/skyblock", delay: 10 },
        { text: "/skyblock", delay: 5 },
        { text: "/tpa EymanBey", delay: 10 },                  
        { text: "/", delay: 15 }
      ]
    },
    antiAfk: {
      enabled: true
    },
    autoReconnect: true,
    autoReconnectDelay: 5000
  },
  position: {
    enabled: true,
    x: 100,
    y: 64,
    z: 100
  },
  chatLog: true
};

let bot;

// ===> Takip fonksiyonu
function followPlayer(playerName) {
  const updateFollow = () => {
    const target = bot.players[playerName]?.entity;
    if (!target) {
      console.log(`${playerName} bulunamadı veya görünür değil.`);
      return;
    }
    const goal = new goals.GoalFollow(target, 2); // 2 blok yakınlıkta takip et
    bot.pathfinder.setGoal(goal, true);
  };

  // İlk takip başlatma
  updateFollow();

  // Belirli aralıklarla takip hedefini güncelle (örneğin oyuncu ışınlanırsa vs.)
  setInterval(updateFollow, 3000);
}

// ===> Botu başlat
function startBot() {
  bot = mineflayer.createBot({
    host: config.server.ip,
    port: config.server.port,
    username: config.botAccount.username,
    password: config.botAccount.password,
    version: config.server.version,
    auth: config.botAccount.type
  });

  // ===> Pathfinder eklentisini yükle
  bot.loadPlugin(pathfinder);

  bot.on('spawn', () => {
    console.log('Bot bağlandı!');
    botConnected = true;

    // ===> Pathfinder hareket ayarları
    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    // ===> Otomatik giriş
    if (config.utils.autoAuth.enabled) {
      bot.chat(`/login ${config.utils.autoAuth.password}`);
      console.log(`Otomatik giriş: /login ${config.utils.autoAuth.password}`);
    }

    // ===> Otomatik mesajlar
    if (config.utils.chatMessages.enabled) {
      config.utils.chatMessages.messages.forEach((messageObj) => {
        setInterval(() => {
          bot.chat(messageObj.text);
          console.log(`Gönderildi: ${messageObj.text}`);
        }, messageObj.delay * 1000);
      });
    }

    // ===> Anti-AFK sistemi
    if (config.utils.antiAfk.enabled) {
      setInterval(() => {
        const directions = ['forward', 'back', 'left', 'right'];
        const dir = directions[Math.floor(Math.random() * directions.length)];
        bot.setControlState(dir, true);
        setTimeout(() => {
          bot.setControlState(dir, false);
        }, 500);
        console.log(`Bot ${dir} yönüne hareket etti.`);
      }, 10000);
    }

    // ===> Oyuncuyu takip et
    followPlayer("EymanBey");
  });

  // ===> Sohbet mesajlarını dinle
  bot.on('message', (message) => {
    if (config.chatLog) console.log(message.toString());
  });

  // ===> Bot bağlantısı kesilirse yeniden başlat
  bot.on('end', () => {
    console.log('Bot bağlantısı kesildi. Yeniden bağlanacak...');
    botConnected = false;
    setTimeout(startBot, config.utils.autoReconnectDelay);
  });

  // ===> Hata dinleyici
  bot.on('error', (err) => {
    console.log(`Hata oluştu: ${err.message}`);
  });
}

// ===> Botu başlat
startBot();

// ===> Web sunucusu
app.get('/', (req, res) => {
  if (botConnected) {
    res.send('Bot başarıyla bağlandı ve sohbetleri dinliyor.');
  } else {
    res.send('Bot bağlantı kurmaya çalışıyor...');
  }
});

app.listen(port, () => {
  console.log(`Sunucu ${port} numaralı bağlantı noktasında yürütülüyor.`);
});
