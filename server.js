
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

var trad = fs.readFileSync("language.json", "utf8");
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

var reFastSearch = /^\.(br|ca|cn|fr|de|in|it|jp|mx|es|uk|us)\s(.+)/;

var languagesList = "";
regions.forEach(function(region){
  languagesList+="\n    *"+region.id+"* - "+region.name;
});

var dlang = "us";

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
  var langChoice = '*'+trad[dlang].hi+msg.from.first_name+'*,'
                  + trad[dlang].welcome
                  + languagesList;
  itemObj.title = trad[dlang].hi+", "+msg.from.first_name+" "+trad[dlang].addLang;
  itemObj.description = trad[dlang].clickInstruction;
  itemObj.message_text = langChoice;

  itemsList.push(itemObj);

  bot.answerInlineQuery(msg.id, itemsList,{"cache_time" : 0, "is_personal":true});
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
      console.log("ZERO SEARCH")
      var itemObj = {},
      itemsList = [];
      // RESULT
      itemObj.parse_mode = 'Markdown';
      itemObj.type = 'article';
      itemObj.id = 'id:' + (process.hrtime());
      itemObj.title = msg.from.first_name+", "+trad[row.lang].queryZeroTitle;
      itemObj.description = trad[row.lang].queryZeroDesc;
      itemObj.message_text = trad[row.lang].queryZeroTxt;

      itemsList.push(itemObj);

      bot.answerInlineQuery(msg.id, itemsList, {"cache_time" : 600,  "is_personal":true});
    }else{
      prod.call("ItemSearch", {
        SearchIndex: "All",
        Keywords: msg.query,
        ResponseGroup: "Offers,ItemAttributes,Images,Reviews"
      }, function (err, result) {
        if(result && result.Items && result.Items.Item && result.Items.Item.length>0){

          var itemsList = [];
          //console.log(JSON.stringify(result));
          result.Items.Item.forEach(function (item) {

            var itemObj = {};
            var keepaUrl = "https://dyn.keepa.com/pricehistory.png?asin=";
            var keepaDomain = "&domain="+row.lang;
            //var gsmarena = "http://www.gsmarena.com/results.php3?sQuickSearch=yes&sName=";

            var msg_txt = '';
            //console.log(item);
            if(item.LargeImage && item.LargeImage.URL)
              msg_txt += "[‌‌ ](" + item.LargeImage.URL + ")";

            msg_txt += "\n*"+item.ItemAttributes.Title+"*";
            msg_txt += "\n▶️ [ Detail ]("+item.DetailPageURL+")";
            if(item.CustomerReviews && item.CustomerReviews.IFrameURL)
              msg_txt += "\n⭐️[ Reviews ]("+item.DetailPageURL+")";
            //msg_txt+=" - [🌐]("+item.DetailPageURL+") ";
            //msg_txt+="\n\n"+args.star+" ⭐️";
            if (item.Offers && item.Offers.Offer && item.Offers.Offer.OfferListing) {
              msg_txt += "\n\n*"+trad[row.lang].price+"*: " + item.Offers.Offer.OfferListing.Price.FormattedPrice;
              //console.log(prod.title+" - "+args.price.length)
              if (item.Offers &&  item.Offers.Offer && item.Offers.Offer.OfferListing && item.Offers.Offer.OfferListing.IsEligibleForPrime) {
                //console.log("PRIME")
                msg_txt += " - ✓Prime"
              }
              msg_txt += "\n  _" + item.Offers.Offer.OfferListing.Availability + "_";
            }

            //console.log(item.Offers);
            msg_txt += "\n"
            if (item.OfferSummary && item.OfferSummary.LowestNewPrice && item.OfferSummary.LowestNewPrice.Amount) {
              msg_txt += "\n*"+trad[row.lang].new+":* " + item.OfferSummary.LowestNewPrice.FormattedPrice + " (" + item.OfferSummary.TotalNew + ")";
            }
            if (item.OfferSummary && item.OfferSummary.LowestUsedPrice && item.OfferSummary.LowestUsedPrice.Amount) {
              msg_txt += "\n*"+trad[row.lang].used+":* " + item.OfferSummary.LowestUsedPrice.FormattedPrice + " (" + item.OfferSummary.TotalUsed + ")";
            }

            var feature_txt = '';
            if(item.ItemAttributes.Feature){
              feature_txt += "\n\n*Features*"
              if(item.ItemAttributes.Feature.length>0){
                for(var i=0;i<item.ItemAttributes.Feature.length;i++){
                  feature_txt += "\n🔹"+item.ItemAttributes.Feature[i];
                }
              }
            }
            feature_txt = feature_txt.substring(0,150);
            feature_txt+="\n ...";
            console.log("feature.length: "+feature_txt.length);

            msg_txt+="\n\n [‌‌Price tracking by Keepa]("+keepaUrl+item.ASIN+keepaDomain+")";
            /*if(item.ItemAttributes.ProductTypeName=="PHONE"){
              var gsma_query = msg.query;
              gsma_query.replace(/\s/g, '+');
              msg_txt+="\n\n [‌‌GSMArena info]("+gsmarena+gsma_query+")"
            }*/

            ///// DESCRIPTION //////
            var desc = "";
            /*if (item.Offers && item.Offers.Offer != null && item.Offers.Offer.OfferListing != null) {
              desc += trad[row.lang].price+": " + item.Offers.Offer.OfferListing.Price.FormattedPrice;
            }*/
            if (item.OfferSummary && item.OfferSummary.LowestNewPrice)
              desc += trad[row.lang].new+":" + item.OfferSummary.LowestNewPrice.FormattedPrice + " (" + item.OfferSummary.TotalNew + ")";
            if (item.OfferSummary && item.OfferSummary.LowestUsedPrice && item.OfferSummary.LowestUsedPrice.Amount) {
              desc += " - "+trad[row.lang].used+": " + item.OfferSummary.LowestUsedPrice.FormattedPrice + " (" + item.OfferSummary.TotalUsed + ")";
            }
            if (item.Offers &&  item.Offers.Offer && item.Offers.Offer.OfferListing && item.Offers.Offer.OfferListing.IsEligibleForPrime) {
              desc += " ✓Prime"
            }

            // RESULT
            itemObj.parse_mode = 'Markdown';
            itemObj.type = 'article';
            itemObj.id = 'id:' + (process.hrtime());
            itemObj.title = item.ItemAttributes.Title;
            itemObj.description = desc;
            console.log("desc.length: "+desc.length)
            //itemObj.url = item.DetailPageURL;
            var txt=msg_txt;
            txt+=feature_txt;
            itemObj.message_text = txt;
            console.log(txt);
            console.log("txt.length: "+txt.length)

            if(item.SmallImage && item.SmallImage.URL)
              itemObj.thumb_url = item.SmallImage.URL;
            itemObj.url = item.DetailPageURL;
            itemObj.hide_url = true;
            itemObj.thumb_width = 150;
            itemObj.thumb_height = 150;
            itemObj.disable_web_page_preview = false;

            itemsList.push(itemObj);
          });

          //bot.sendMessage(msg.chat.id, item.MediumImage.URL)
          //console.log(msg)
          bot.answerInlineQuery(msg.id, itemsList, {"cache_time" : 30,  "is_personal":true});
        }else{
          console.log("no item found")
          console.log("ZERO SEARCH")
          var itemObj = {},
          itemsList = [];
          // RESULT
          itemObj.parse_mode = 'Markdown';
          itemObj.type = 'article';
          itemObj.id = 'id:' + (process.hrtime());
          itemObj.title = "No results 😔"//;msg.from.first_name+", "+trad[row.lang].queryZeroTitle;
          itemObj.description = "I'm sorry but there are no results";//[row.lang].queryZeroDesc;
          itemObj.message_text = 'No results';//trad[row.lang].queryZeroTxt;


          itemsList.push(itemObj);
          bot.answerInlineQuery(msg.id, itemsList, {"cache_time" : 600,  "is_personal":true});
        }

      });
    }
};

var fastSearchResult = function(msg,lang){
  console.log("fastSearchResult: "+msg.query+" - "+(msg.query.length>0))
  var fin;
  regions.forEach(function(o){if(o.id==lang){fin=o.code;}});

  var options = {
    host: "webservices.amazon."+fin,
    version: "2011-08-01"
  };

  options.region=lang.toUpperCase();

  var prod = aws.createProdAdvClient(awscred.keyid, awscred.key, awscred.tag, options);
  console.log("FIN: "+"it")



    if(msg.query.length<=0) {
      console.log("ZERO")
      var itemObj = {},
      itemsList = [];
      // RESULT
      itemObj.parse_mode = 'Markdown';
      itemObj.type = 'article';
      itemObj.id = 'id:' + (process.hrtime());
      itemObj.title = trad[lang].queryZeroTitle;
      itemObj.description = trad[lang].queryZeroDesc;
      itemObj.message_text = trad[lang].queryZeroTxt;

      itemsList.push(itemObj);

      bot.answerInlineQuery(msg.id, itemsList, {"cache_time" : 10});
    }else{
      //console.log("calling product search")
      prod.call("ItemSearch", {
        SearchIndex: "All",
        Keywords: msg.query,
        ResponseGroup: "Offers,ItemAttributes,Images,Reviews"
      }, function (err, result) {
        //console.log("result")
        if(result && result.Items && result.Items.Item && result.Items.Item && result.Items.Item.length>0){

          var itemsList = [];
          //console.log(JSON.stringify(result));
          result.Items.Item.forEach(function (item) {

            var itemObj = {};
            var keepaUrl = "https://dyn.keepa.com/pricehistory.png?asin=";
            var keepaDomain = "&domain=it";

            var msg_txt = '';

            if(item.LargeImage && item.LargeImage.URL)
              msg_txt += "[‌‌ ](" + item.LargeImage.URL + ")";

            msg_txt += "\n*" + item.ItemAttributes.Title + "*";
            //console.log(item.ItemAttributes);

            //msg_txt+=" - [🌐]("+item.DetailPageURL+") ";
            //msg_txt+="\n\n"+args.star+" ⭐️";
            if (item.Offers && item.Offers.Offer && item.Offers.Offer.OfferListing && item.Offers.Offer.OfferListing.Price) {
              msg_txt += "\n\n*"+trad[lang].price+"*: " + item.Offers.Offer.OfferListing.Price.FormattedPrice + " - ";
              //console.log(prod.title+" - "+args.price.length)
              msg_txt += "_" + item.Offers.Offer.OfferListing.Availability + "_";
            }
            if (item.IsEligibleForPrime) {
              msg_txt += " - ✔️Prime"
            }

            if (item.OfferSummary && item.OfferSummary.LowestNewPrice && item.OfferSummary.LowestNewPrice.Amount) {
              msg_txt += "\n  *"+trad[lang].new+":* " + item.OfferSummary.LowestNewPrice.FormattedPrice + " (" + item.OfferSummary.TotalNew + ")";
            }
            if (item.OfferSummary && item.OfferSummary.LowestUsedPrice && item.OfferSummary.LowestUsedPrice.Amount) {
              msg_txt += "\n  *"+trad[lang].used+":* " + item.OfferSummary.LowestUsedPrice.FormattedPrice + " (" + item.OfferSummary.TotalUsed + ")";
            }

            //msg_txt+="\n\n\[‌‌Price tracking by Keepa]("+keepaUrl+item.asin+keepaDomain+")";

            ///// DESCRIPTION
            var desc = "";
            if (item.Offers && item.Offers.Offer && item.Offers.Offer.OfferListing ) {
              desc += trad[lang].price+": " + item.Offers.Offer.OfferListing.Price.FormattedPrice;
            }
            if (item.OfferSummary && item.OfferSummary.LowestNewPrice)
              desc += " - "+trad[lang].new+":" + item.OfferSummary.LowestNewPrice.FormattedPrice + " (" + item.OfferSummary.TotalNew + ")";
            if (item.IsEligibleForPrime == 1) {
              desc += " - ✔️Prime"
            }

            // RESULT
            itemObj.parse_mode = 'Markdown';
            itemObj.type = 'article';
            itemObj.id = 'id:' + (process.hrtime());
            itemObj.title = item.ItemAttributes.Title;
            itemObj.description = desc.substring(0,511);
            itemObj.message_text = msg_txt;
            if(item.SmallImage && item.SmallImage.URL)
              itemObj.thumb_url = item.SmallImage.URL;
            else
              itemObj.thumb_url = "";
            itemObj.thumb_width = 100;
            itemObj.thumb_height = 100;
            itemObj.disable_web_page_preview = false;

            itemsList.push(itemObj);
          });

          //bot.sendMessage(msg.chat.id, item.MediumImage.URL)
          //console.log(msg)
          bot.answerInlineQuery(msg.id, itemsList, {"cache_time" : 100});
        }else{
          //console.log("no item found")
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

  // Check if the query is a fast search
  var re_res = reFastSearch.exec(msg.query);
  if(re_res){ //it's a fast search
    console.log("lang: "+re_res[1]+" - search: "+re_res[2]);
    msg.query = re_res[2];
    fastSearchResult(msg,re_res[1])
  }else{
    console.log("Not fast search");
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
  }
});

bot.on('chosen_inline_result', function (res) {
  console.log("id: "+res.result_id+" from: "+res.from.id+" query:"+res.query)
});


/********************
 *     SETTINGS     *
 ********************/

bot.onText(/\/lang (.+)/, function (msg, match) {
  var fromId = msg.chat.id;
  if(regionsId.indexOf(match[1])>-1){
    setLang(msg, match[1])
  }else{
    bot.sendMessage(fromId, "*Language NOT present* 😞, choose from:\n"+ languagesList, {"parse_mode":"Markdown"});
  }
});

bot.onText(/\/help/, function (msg, match) {
  var fromId = msg.chat.id;
  bot.sendMessage(fromId, "*How to use @amaznbot* \n TBD", {"parse_mode":"Markdown"});
});

bot.onText(/\/about/, function (msg, match) {
  var fromId = msg.chat.id;
  bot.sendMessage(fromId, "*Made with* <3 by two humans ", {"parse_mode":"Markdown"});
});

var setLang = function(msg, lang){
  var userid = msg.from.id;
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
    }
    bot.sendMessage(msg.chat.id, trad[lang].langSelected+" "+lang, {"parse_mode":"Markdown"});
  });
}
