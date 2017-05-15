var chalk = require('chalk');
var mineflayer = require('mineflayer');
var navigatePlugin = require('mineflayer-navigate')(mineflayer);
var vec3 = mineflayer.vec3;

var bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : 'Simple Fisher',
  password: process.argv[5],
  verbose: true
});

navigatePlugin(bot);

bot.chatAddPattern(/^(?:\[[^\]]*\] )?([^ :]*) ?: (.*)$/, "chat", "Plugin chat");
bot.chatAddPattern(/^\[ ?([^ ]*) -> me ?] (.*)$/, "whisper", "Plugin whisper");
var status = 'idle';
var master = 'username';
var spot;

var stdin = process.openStdin();

//allow you to input chat through console.
stdin.addListener('data', function(d) {
  var command = d.toString().trim().split(' ');
  switch(true){
    case /^quit$/.test(command):
    bot.quit();
    process.exit();
    break;
    case /^players$/.test(command):
    console.log(bot.players);
    console.log(bot.players.map(function(element){
      return element.username;
    }).join(', '));
    break;
    default:
    bot.chat(d.toString().trim());
    break;
  }
});

bot.on('message', function(jsonMsg){
  if(jsonMsg.extra != undefined){
      var output = jsonMsg.extra.map(function(element){
        if(element.text != undefined){
          return element.text;
        }else {
          return;
        }
      }).join('');
      var patt1 = RegExp('joined the game');
      var patt2 = RegExp('left the game');
      if(patt1.test(output) == true || patt2.test(output) == true){
        console.log(chalk.red(output));
      }else {
        console.log(chalk.green('=>') + chalk.bold(output));
      }
  }
});

/*bot.on('message', function(jsonMsg){
  if(jsonMsg.extra != undefined){
    if(jsonMsg.extra.length >= 2){
      console.log(jsonMsg.extra[jsonMsg.extra.length - 2].text + jsonMsg.extra[jsonMsg.extra.length - 1].text);
    } else{
      var command = jsonMsg.extra[jsonMsg.extra.length - 1].text.split();
      if(/^joined the game/.test(command) || /^left the game/.test(command)){
        console.log(jsonMsg.extra[jsonMsg.extra.length - 1].text, 'color:DAA520');
      }
      console.log(jsonMsg.extra[jsonMsg.extra.length - 1].text);
    }
  }
});*/

bot.on('end', function(){
  console.log('Disconected from server...');
});

bot.on('soundEffectHeard', function(soundName, position, volume, pitch){
  if(soundName == 'random.splash'){
    if(bot.position.x == position.x || bot.position.z == position.z){
      //the splash must be on the same x or z position meaning its the bots rods
      bot.activateItem();
      //the bot has a fish, if it has 64 deposit it into a chest
      var fish = bot.inventory.items().filter(({ id }) => id === 349);
      var amount = bot.inventory.count(fish.type);
      if(amount >= 64){
        var depoChest = bot.findBlock({
          point: bot.position,
          matching: 54,
          maxDistance: 16
        });
        //navigate to chest and deposit at end of navigation
        status = 'depositing';
        bot.navigate.to(vec3(depoChest[0].position.x, depoChest[0].position.y + 1, depoChest[0].position.z));
      } else{
        //the bot has less than 64 fish
        fish();
      }
    }
  }
});

bot.on('arrived', function(){
  switch(status){
    case 'getting rod':
    var trapChest = bot.findBLock({
      point: bot.position,
      matching: 146,
      maxDistance: 16
    });
    var chest = bot.openChest(trapChest[0]);
    chest.on('open', function(){
      var availableRods = chest.count(364, null);
      if(availableRods === 0){
        bot.chat('/msg ' + master + ' The chest is out of rods. Refill it.');
        while(availableRods < 1){
          //loop the searching for rods until one apears
          setInterval(function(){
            availableRods = chest.count(364, null);
          }, 3000);
        }
      }
      chest.withdraw(364, null, 1, function(){
        fish();
      });
    });
    break;
    case 'depositing':
    var depoChest = bot.findBlock({
      point: bot.position,
      matching: 54,
      maxDistance: 16
    });
    var chest = bot.openChest(depoChest[0]);
    chest.on('open', function(){
      //need to deposit any fish in the inventory
      var fish = bot.inventory.items().filter(({ id }) => id === 349);
      var amount = bot.inventory.count(fish.type);
      chest.deposit(349, null, amount, function(){
        chest.close();
      });
    });
    fish();
    break;
    case 'moving':
    fish();
    break;
  }
});

bot.on('whisper', function(username, message){
  console.log(username + ': ' + message);
  if(username === bot.username) return;
  if(username === master){
    var command = message.split(' ');
    switch(true){
      case /^tp$/.test(message):
      bot.chat('/tpr ' + master);
      break;
      case /^fish$/.test(message):
      spot = vec3(bot.players[master].entity.position);
      fish();
      break;
    }
  }
});

bot.on('chat', function(username, message){
  var command = message.split(' ');
  switch(true){
    case /^welcome/.test(message):
    bot.chat('Hi');
    break;
  }
});

function fish(){
  if(bot.position != spot){
    status = 'moving';
    bot.navigate.to(spot);
  }
  //Standing on block near water. Chest is nearby too.
  //get fishing direction.
  var water = bot.findBlock({
    point: spot,
    matching: 9,
    maxDistance: 8
  });
  //assuming the water is level with bot.
  var waterDirection = vec3(water[0].x + 0.5, water[0].y + 2.5, water[0].z + 0.5);
  bot.lookAt(waterDirection);
  if(rod() = true){
    //now equiped a rod
    bot.activateItem();
  } else{
    //getting a rod
    return;
  }
}

function rod(){
  //this function checks for rods and equips it.
  var [ rod ] = bot.inventory.items().filter(({ id }) => id === 346);
  if(!rod){
    //need a rod, look for nearest trap chest which will have a rod
    var trapChest = bot.findBLock({
      point: bot.position,
      matching: 146,
      maxDistance: 16
    });
    status = 'getting rod';
    bot.navigate.to(vec3(trapChest[0].x, trapChest[0].y + 1, trapChest[0].z));
    return false;
  } else{
    bot.equip(rod, 'hand', function(){
      return true;
    });
  }
}
