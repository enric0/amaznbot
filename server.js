
/********************
 *     INIT         *
 ********************/

//REQUIRED MODULES
var TelegramBot = require('node-telegram-bot-api');
var fs = require('fs');
var aws = require("aws-lib");
var sqlite3 = require('sqlite3').verbose();
var amaznbotFunctions=require('amaznbot-functions');

//http://stackoverflow.com/questions/10805125/how-to-remove-all-line-breaks-from-a-string
var token = fs.readFileSync("token", "utf8");
token=token.replace(/(\r\n|\n|\r)/gm,"");

var awscred = fs.readFileSync("aws", "utf8");
awscred = JSON.parse(awscred);

var trad = fs.readFileSync("translations/translations.json", "utf8");
trad = JSON.parse(trad);

// Setup polling way
var bot = new TelegramBot(token, {polling: true});

// REGION
var regions = [
                {
                  "id"   : "br" ,
                  "name" : "Brazil",
                  "code" : "br"
                },
                {
                  "id"   : "ca" ,
                  "name" : "Canada",
                  "code" : "ca"
                },
                {
                  "id"   : "cn",
                  "name" : "China",
                  "code" : "cn"
                },
                {
                  "id"   : "fr",
                  "name" : "France",
                  "code" : "fr"
                },
                {
                  "id"   : "de",
                  "name" : "Germany",
                  "code" : "de"
                },
                {
                  "id"   : "in",
                  "name" : "India",
                  "code" : "in"
                },
                {
                  "id"   : "it",
                  "name" : "Italia",
                  "code" : "it"
                },
                {
                  "id"   : "jp",
                  "name" : "Japan",
                  "code" : "co.jp"
                },
                {
                  "id"   : "mx",
                  "name" : "Mexico",
                  "code" : "com.mx"
                },
                {
                  "id"   : "es",
                  "name" : "Spain",
                  "code" : "es"
                },
                {
                  "id"   : "uk",
                  "name" : "United Kingdom",
                  "code" : "co.uk"
                },
                {
                  "id"   : "us",
                  "name" : "United Sates",
                  "code" : "com"
                }
              ];

var regionsId = [];
regions.forEach(function(o){
  regionsId.push(o.id);
});

var languagesList = "";
regions.forEach(function(region){
  languagesList+="\n    *"+region.id+"* - "+region.name;
});

var dlang = "us";

//CREATE DB AND TABLE
var db = new sqlite3.Database('db/amaznbot.db');
db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS users (user_id text primary key, lang text)");
  db.run("CREATE TABLE IF NOT EXISTS user_queries (id INTEGER PRIMARY KEY   AUTOINCREMENT, user text references users(user_id), query text , ts DATETIME DEFAULT CURRENT_TIMESTAMP)");
});


console.log('AMAZON BOT Starded');


/********************
 *      INLINE      *
 ********************/

var reFastSearch = /^[./](br|ca|cn|fr|de|in|it|jp|mx|es|uk|us)\s(.+)/;
var reFastLoc = /^[./]loc\s(br|ca|cn|fr|de|in|it|jp|mx|es|uk|us)/;


bot.on('inline_query', function (msg) {
  /***************************** HOW IT WORKS *****************************
     Every time it receives a query it goes to read the user informations
     and retrieves the region than it creates the right ProdAdvClient and
     executes the query.
     */
  console.log("inline_query: "+msg.query+" - "+msg.query.length+" from: "+msg.from.id)

  // Check if the query is a fast search
  var re_res = reFastSearch.exec(msg.query);
  if(re_res){ //it's a fast search
    console.log("lang: "+re_res[1]+" - search: "+re_res[2]);
    msg.query = re_res[2];
    var row = { lang:re_res[1],user_id:msg.from.id}
    amaznbotFunctions.provideResult(msg,row,regions,trad,aws,awscred,bot,db);
  }else{
    var re_loc = reFastLoc.exec(msg.query);
    console.log(re_loc)
    if(re_loc){
      console.log("Changing loc")
      amaznbotFunctions.setLang(msg,re_loc[1],true,db,bot,trad)
    }else{
      console.log("Not changing");
      db.serialize(function() {
        db.get("SELECT user_id,lang FROM users WHERE user_id=?",msg.from.id, function(err, row) {
          // the user is new
          if(row==undefined){
            amaznbotFunctions.newUserAlert(msg,regionsId,trad,bot,languagesList);
          }else{
            // if exists go and does the search then gives back the results
            amaznbotFunctions.provideResult(msg,row,regions,trad,aws,awscred,bot,db);
          }
        });
      });
    }
  }
});

bot.on('chosen_inline_result', function (res) {
  if(languagesList.indexOf(res.result_id)>0)
    amaznbotFunctions.setLoc(res,res.result_id,db);
  console.log("id: "+res.result_id+" from: "+res.from.id+" query:"+res.query);
});

/********************
 *     SETTINGS     *
 ********************/

bot.onText(/\/loc (.+)/, function (msg, match) {
  var fromId = msg.chat.id;
  if(regionsId.indexOf(match[1])>-1){
    amaznbotFunctions.setLang(msg, match[1],false,db,bot,trad);
  }else{
    bot.sendMessage(fromId, "*Language NOT present* 😞, choose from:\n"+ languagesList, {"parse_mode":"Markdown"});
  }
});

bot.onText(/\/help/, function (msg, match) {
  var fromId = msg.chat.id;
  db.serialize(function() {
    db.get("SELECT user_id,lang FROM users WHERE user_id=?",msg.from.id, function(err, row) {
      // the user is new
      if(row==undefined){
        bot.sendMessage(fromId, trad[dlang].howTo, {"parse_mode":"Markdown"});
      }else{
        // if exists go and does the search then gives back the results
        bot.sendMessage(fromId, trad[row.lang].howTo, {"parse_mode":"Markdown"});
      }
    });
  });
});

bot.onText(/\/about/, function (msg, match) {
  var fromId = msg.chat.id;
  bot.sendMessage(fromId, "*Made with* <3 by two humans ", {"parse_mode":"Markdown"});
});
