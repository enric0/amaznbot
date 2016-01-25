
//REQUIRED MODULES
var TelegramBot = require('node-telegram-bot-api');
var fs = require('fs');
var aws = require("aws-lib");
var sqlite3 = require('sqlite3').verbose();

//http://stackoverflow.com/questions/10805125/how-to-remove-all-line-breaks-from-a-string
var token = fs.readFileSync("token", "utf8");
token=token.replace(/(\r\n|\n|\r)/gm,"");

var awscred = fs.readFileSync("aws", "utf8");
awscred = JSON.parse(awscred);

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

//CREATE DB AND TABLE
var db = new sqlite3.Database('db/amaznbot.db');
db.serialize(function() {
  db.run("CREATE TABLE IF NOT EXISTS users (user_id text primary key, lang text)");
});


console.log('BOT STARTED');


var newUserAlert = function(msg){
  var itemObj = {},
  itemsList = [];
  // RESULT User not defined
  itemObj.parse_mode = 'Markdown';
  itemObj.type = 'article';
  itemObj.id = 'id:' + (process.hrtime());
  var langChoice = '*Hi '+msg.from.first_name+'*, and welcome to amaznbot.'
                  +'\n\n Click -> @amaznbot and *set your language*'
                  +'\n    *Example:* _/lang it_ \n\n *Language:*\n'
                  + languagesList;
  itemObj.title = "Hi, "+msg.from.first_name+" please add a language @amaznbot";
  itemObj.description = "Click here for instructions";
  itemObj.message_text = langChoice;

  itemsList.push(itemObj);

  bot.answerInlineQuery(msg.id, itemsList);
}


var provideResult = function(msg,row){
  var fin = "";
  regions.forEach(function(o){if(o.id==row.lang){fin=o.code;}});
  console.log(fin)
  var options = {
    host: "webservices.amazon."+fin,
    version: "2011-08-01"
  };

  options.region=row.lang.toUpperCase();

  var prod = aws.createProdAdvClient(awscred.keyid, awscred.key, awscred.tag, options);


    if(msg.query.length<=0) {
      console.log("ZERO")
      var itemObj = {},
      itemsList = [];
      // RESULT
      itemObj.parse_mode = 'Markdown';
      itemObj.type = 'article';
      itemObj.id = 'id:' + (process.hrtime());
      itemObj.title = "Please add a term"
      itemObj.description = "I'm just here to remind you to add a default text";
      itemObj.message_text = "Please add a default language";

      itemsList.push(itemObj);

      bot.answerInlineQuery(msg.id, itemsList);
    }else{
      prod.call("ItemSearch", {
        SearchIndex: "All",
        Keywords: msg.query,
        ResponseGroup: "Offers,ItemAttributes,Images,Reviews"
      }, function (err, result) {
        if(result && result.Items && result.Items.Item){

          var itemsList = [];
          //console.log(JSON.stringify(result));
          result.Items.Item.forEach(function (item) {

            var itemObj = {};
            var keepaUrl = "https://dyn.keepa.com/pricehistory.png?asin=";
            var keepaDomain = "&domain=it";

            var msg_txt = '';
            if (item.CustomerReviews != null && item.CustomerReviews.IFrameURL)
              msg_txt += "[ test ](" + item.CustomerReviews.IFrameURL + ") ";
            else
              msg_txt += "[‌‌ ](" + item.LargeImage.URL + ")";

            msg_txt += "\n*" + item.ItemAttributes.Title + "*";
            //msg_txt+=" - [🌐]("+item.DetailPageURL+") ";
            //msg_txt+="\n\n"+args.star+" ⭐️";
            if (item.Offers != null && item.Offers.Offer != null && item.Offers.Offer.OfferListing != null) {
              msg_txt += "\n\n*Price*: " + item.Offers.Offer.OfferListing.Price.FormattedPrice + " - ";
              //console.log(prod.title+" - "+args.price.length)
              msg_txt += "_" + item.Offers.Offer.OfferListing.Availability + "_";
            }
            if (item.IsEligibleForPrime) {
              msg_txt += " - ✔️Prime"
            }

            if (item.OfferSummary.LowestNewPrice != null && item.OfferSummary.LowestNewPrice.Amount != 0) {
              msg_txt += "\n  *New:* " + item.OfferSummary.LowestNewPrice.FormattedPrice + " (" + item.OfferSummary.TotalNew + ")";
            }
            if (item.OfferSummary.LowestUsedPrice != null && item.OfferSummary.LowestUsedPrice.Amount != 0) {
              msg_txt += "\n  *Used:* " + item.OfferSummary.LowestUsedPrice.FormattedPrice + " (" + item.OfferSummary.TotalUsed + ")";
            }

            //msg_txt+="\n\n\[‌‌Price tracking by Keepa]("+keepaUrl+item.asin+keepaDomain+")";

            // description
            var desc = "";
            if (item.Offers.Offer != null && item.Offers.Offer.OfferListing != null) {
              desc += "Price: " + item.Offers.Offer.OfferListing.Price.FormattedPrice;
            }
            if (item.OfferSummary.LowestNewPrice != null)
              desc += " - New:" + item.OfferSummary.LowestNewPrice.FormattedPrice + " (" + item.OfferSummary.TotalNew + ")";
            if (item.IsEligibleForPrime == 1) {
              desc += " - ✔️Prime"
            }

            // RESULT
            itemObj.parse_mode = 'Markdown';
            itemObj.type = 'article';
            itemObj.id = 'id:' + (process.hrtime());
            itemObj.title = item.ItemAttributes.Title;
            itemObj.description = desc;
            itemObj.message_text = msg_txt;
            itemObj.thumb_url = item.SmallImage.URL;
            itemObj.thumb_width = 100;
            itemObj.thumb_height = 100;
            itemObj.disable_web_page_preview = false;

            itemsList.push(itemObj);
          });

          //bot.sendMessage(msg.chat.id, item.MediumImage.URL)
          console.log(msg)
          bot.answerInlineQuery(msg.id, itemsList);
        }
      })
    }
};


/********************
 *      INLINE      *
 ********************/

bot.on('inline_query', function (msg) {
  /***************************** HOW IT WORKS *****************************
     Every time it receives a query it goes to read the user informations
     and retrieves the region than it creates the right ProdAdvClient and
     executes the query.
     */
  console.log("inline_query: "+msg.query+" - "+msg.query.length+" from: "+msg.from.id)

  db.serialize(function() {
    db.get("SELECT user_id,lang FROM users WHERE user_id=?",msg.from.id, function(err, row) {
      // the user is new
      if(row==undefined){
        newUserAlert(msg);
      }else{
        // if exists go and does the search then gives back the results
        provideResult(msg,row)
      }
    });
  });
});


/********************
 *     SETTINGS     *
 ********************/

bot.onText(/\/lang (.+)/, function (msg, match) {
  var fromId = msg.from.id;
  if(regionsId.indexOf(match[1])>-1){
    setLang(msg.from.id, match[1])
  }else{
    bot.sendMessage(fromId, "*Language NOT present* 😞, choose from:\n"+ languagesList, {"parse_mode":"Markdown"});
  }
});

bot.onText(/\/help/, function (msg, match) {
  var fromId = msg.from.id;
  bot.sendMessage(fromId, "*How to use @amaznbot* \n TBD", {"parse_mode":"Markdown"});
});

bot.onText(/\/about/, function (msg, match) {
  var fromId = msg.from.id;
  bot.sendMessage(fromId, "*Made with* <3 by two humans ", {"parse_mode":"Markdown"});
});

var setLang = function(userid, lang){
  console.log(userid, "user: "+userid+" lang: "+lang);
  //var stmt = db.prepare();
  db.run("INSERT INTO users VALUES ($id,$lang)", {
    $id: userid,
    $lang: lang
  }, function(err){
    if(err){
      db.run("UPDATE users SET lang = $lang WHERE user_id = $id", {
        $id: userid,
        $lang: lang
      });
    }else{
      console.log("User info inserted")
    }
  });
  //stmt.finalize();
}
