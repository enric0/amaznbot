var TelegramBot = require('node-telegram-bot-api');

var fs = require('fs');
var aws = require("aws-lib");
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');


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

var userData={};

var options = {
  host: "webservices.amazon.",
  version: "2011-08-01"
};

options.host+=region;
options.region=region.toUpperCase();

var prod;

console.log('BOT STARTED');

var isUserNew = function(msg){
  //check if user is new
  var isnew;
  if(msg.id != "25419539"){
    console.log("user: "+msg.from.id+" is NEW")
    //scrivi sul database e mostra il messaggio
  }else{
    console.log("user: "+msg.from.id+" is NOT NEW")
    // retrieve information about region call api server
    prod = aws.createProdAdvClient(awscred.keyid, awscred.key, awscred.tag, options);
  }
}

/* Any kind of message */
bot.on('inline_query', function (msg) {

  /***************************** HOW IT WORKS *****************************
     Every time it receives a query it goes to read the user informations
     and retrieves the region than it creates the right ProdAdvClient and
     executes the query.
     */
  //isUserNew(msg);


  console.log("inline_query: "+msg.query+" - "+msg.query.length+" from: "+msg.from.id)
  if(msg.query.length<=0) {
    console.log("ZERO")
    var itemObj = {},
    itemsList = [];
    // RESULT
    itemObj.parse_mode = 'Markdown';
    itemObj.type = 'article';
    itemObj.id = 'id:' + (process.hrtime());
    itemObj.title = "Please add a default language"
    itemObj.description = "I'm just here to remind you to add a default text";
    itemObj.message_text = "Please add a default language";

    itemsList.push(itemObj);

    bot.answerInlineQuery(msg.id, itemsList);
  }else{
    console.log("TEST");
      //console.log("query.length > 0")
      prod.call("ItemSearch", {
        SearchIndex: "All",
        Keywords: msg.query,
        ResponseGroup: "Offers,ItemAttributes,Images,Reviews"
      }, function (err, result) {
        if(result && result.Items && result.Items.Item){

          var itemsList = [];
          console.log(JSON.stringify(result));
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

});
