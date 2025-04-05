const mineflayer = require('mineflayer');
const express = require('express');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalFollow } = goals;
const app = express();
const port = process.env.PORT || 3000;

const botUsernames = ['iWadlessV2', 'MujluPuding', 'MuzluSupangle', 'MujluOralet', 'Dukkan', 'PuddingMaster', 'HatayLahmacunu', 'BandirmaVapuru', 'TostMakinesi'];
const bots = [];

botUsernames.forEach((username, index) => {
  createBotInstance(username, index);
});

function createBotInstance(username, index) {
  const config = {
    botAccount: {
      username,
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
          { text: "/tekblok", delay: 10 },
          { text: "/tekblok", delay: 5 },
          { text: "/tpa EymanBey", delay: 10 },
          { text: "", delay: 5 }
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
  let attacking = false;
  let currentFollowTarget = "EymanBey";
  const entityHealth = {};

  function startBot() {
    bot = mineflayer.createBot({
      host: config.server.ip,
      port: config.server.port,
      username: config.botAccount.username,
      password: config.botAccount.password,
      version: config.server.version,
      auth: config.botAccount.type
    });

    bots.push(bot);
    bot.loadPlugin(pathfinder);

    bot.on('spawn', () => {
      console.log(`[${username}] Bot bağlandı!`);

      if (config.utils.autoAuth.enabled) {
        bot.chat(`/login ${config.utils.autoAuth.password}`);
        console.log(`[${username}] Otomatik giriş: /login ${config.utils.autoAuth.password}`);
      }

      if (config.utils.chatMessages.enabled) {
        config.utils.chatMessages.messages.forEach((messageObj) => {
          setInterval(() => {
            bot.chat(messageObj.text);
            console.log(`[${username}] Gönderildi: ${messageObj.text}`);
          }, messageObj.delay * 1000);
        });
      }

      if (config.utils.antiAfk.enabled) {
        setInterval(() => {
          if (attacking || bot.pathfinder.isMoving()) return;
          const moveDirections = ['forward', 'back', 'left', 'right'];
          const randomDirection = moveDirections[Math.floor(Math.random() * moveDirections.length)];
          bot.setControlState(randomDirection, true);
          setTimeout(() => {
            bot.setControlState(randomDirection, false);
          }, 500);
          console.log(`[${username}] ${randomDirection} yönüne hareket etti.`);
        }, 10000);
      }

      followEymanBey();
    });

    bot.on('message', (jsonMsg) => {
      const message = jsonMsg.toString();
      if (config.chatLog) console.log(`[${username}] ${message}`);

      const qwRegex = /\bqw\b\s+(\w+)/i;
      const match = message.match(qwRegex);

      if (match) {
        const targetName = match[1];
        const tryFollow = () => {
          const targetEntity = bot.players[targetName]?.entity;

          if (targetEntity) {
            currentFollowTarget = targetName;
            console.log(`\x1b[32m[${username}] ${targetName} takip ediliyor (qw komutu algılandı).\x1b[0m`);
            followEntity(targetEntity);

            setTimeout(() => {
              console.log(`\x1b[33m[${username}] 15 saniye sona erdi. EymanBey tekrar takip ediliyor.\x1b[0m`);
              currentFollowTarget = "EymanBey";
              followEymanBey();
            }, 15000);
          } else {
            console.log(`[${username}] qw ile belirtilen oyuncu (${targetName}) görünür değil, bekleniyor...`);
            setTimeout(tryFollow, 1000);
          }
        };

        tryFollow();
      }

      if (message.includes("EymanBey")) {
        const mentionedPlayers = Object.keys(bot.players).filter(p =>
          p !== "EymanBey" && message.includes(p)
        );

        if (mentionedPlayers.length > 0) {
          const targetName = mentionedPlayers[0];
          const targetEntity = bot.players[targetName]?.entity;

          if (targetEntity && targetEntity.type === 'player') {
            console.log(`[${username}] EymanBey sohbet mesajında ${targetName} dedi. Bot saldırıyor!`);
            attackEntity(targetEntity);
          } else {
            console.log(`[${username}] Sohbette geçen oyuncu ${targetName} bulundu ama görünür değil.`);
          }
        }
      }
    });

    bot.on('entitySpawn', (entity) => {
      if (entity.type === 'mob' || entity.type === 'player') {
        entityHealth[entity.id] = entity.health;
      }
    });

    bot.on('entityHurt', (entity) => {
      if (!entity || !entity.position) return;
      const previousHealth = entityHealth[entity.id] ?? entity.health;
      const currentHealth = entity.health;
      entityHealth[entity.id] = currentHealth;

      const eymanBey = bot.players['EymanBey']?.entity;
      if (!eymanBey || !entity) return;

      const distance = eymanBey.position.distanceTo(entity.position);
      const entityIsTargetable = entity.type === 'mob' || entity.type === 'player';

      if (distance < 5 && previousHealth >= currentHealth && entityIsTargetable && !attacking) {
        console.log(`[${username}] EymanBey saldırdı: ${entity.name}. Bot saldırıyor...`);
        attackEntity(entity);
      }
    });

    bot.on('end', () => {
      console.log(`[${username}] Bot bağlantısı kesildi. Yeniden bağlanacak...`);
      setTimeout(startBot, config.utils.autoReconnectDelay);
    });
  }

  function followEymanBey() {
    const eymanEntity = bot.players['EymanBey']?.entity;
    if (!eymanEntity) {
      console.log(`[${username}] EymanBey bulunamadı veya görünür değil.`);
      setTimeout(followEymanBey, 3000);
      return;
    }

    followEntity(eymanEntity);
  }

  function followEntity(entity) {
    if (!entity) return;

    const mcData = require('minecraft-data')(bot.version);
    const defaultMove = new Movements(bot, mcData);
    bot.pathfinder.setMovements(defaultMove);

    const followGoal = new GoalFollow(entity, 2 + Math.random() * 2); // Rastgele mesafe eklenmiş
    bot.pathfinder.setGoal(followGoal, true);

    const followInterval = setInterval(() => {
      if (!entity.isValid || currentFollowTarget !== entity.username) {
        clearInterval(followInterval);
        return;
      }

      const offsetX = (Math.random() - 0.5) * 1.5;
      const offsetZ = (Math.random() - 0.5) * 1.5;
      const offsetPosition = entity.position.offset(offsetX, 0, offsetZ);
      const offsetGoal = new goals.GoalNear(offsetPosition.x, offsetPosition.y, offsetPosition.z, 1.5);
      bot.pathfinder.setGoal(offsetGoal);
    }, 2000);
  }

  function attackEntity(entity) {
    if (!entity) return;
    attacking = true;

    bot.pathfinder.setGoal(null);
    bot.lookAt(entity.position.offset(0, entity.height, 0), true, () => {
      const interval = setInterval(() => {
        if (entity.isValid) {
          bot.attack(entity);
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(interval);
        attacking = false;
        followEymanBey();
      }, 15000);
    });
  }

  startBot();
}

// Web Arayüzü
app.get('/', (req, res) => {
  const statuses = bots.map(bot =>
    bot.username ? `${bot.username} => Takip edilen: ${bot._customFollowTarget || 'Bilinmiyor'}` : "Bağlanıyor..."
  );
  res.send(statuses.join('<br>'));
});

app.listen(port, () => {
  console.log(`Web arayüzü ${port} portunda aktif.`);
});
