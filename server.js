var TelegramBot = require('node-telegram-bot-api');

var fs = require('fs');
var aws = require("aws-lib");


//http://stackoverflow.com/questions/10805125/how-to-remove-all-line-breaks-from-a-string
var token = fs.readFileSync("token", "utf8");
token=token.replace(/(\r\n|\n|\r)/gm,"");

var awscred = fs.readFileSync("aws", "utf8");
awscred = JSON.parse(awscred);

// Setup polling way
var bot = new TelegramBot(token, {polling: true});

var options = {
  host: "webservices.amazon.es",
  region: "ES",
  version: "2011-08-01"
};
var prod = aws.createProdAdvClient(awscred.keyid, awscred.key, awscred.tag, options);

console.log('BOT STARTED');

/* Any kind of message */
bot.on('inline_query', function (msg) {
  console.log("inline_query: "+msg.query+" from: "+msg.from.id)
  if(msg.query.length>0){
    //console.log("query.length > 0")
    prod.call("ItemSearch", {SearchIndex: "All", Keywords: msg.query, ResponseGroup:"Offers,ItemAttributes,Images,Reviews"}, function(err, result) {
      var itemsList = [];
      console.log(JSON.stringify(result));
      result.Items.Item.forEach(function(item){

        var itemObj = {};
        var keepaUrl = "https://dyn.keepa.com/pricehistory.png?asin=";
        var keepaDomain = "&domain=it";

        var msg_txt ='';
        if(item.CustomerReviews!=null && item.CustomerReviews.IFrameURL)
          msg_txt+="[ test ]("+item.CustomerReviews.IFrameURL+") ";
        else
          msg_txt+="[‌‌ ]("+item.LargeImage.URL+")";

        msg_txt+="\n*"+item.ItemAttributes.Title+"*";
        //msg_txt+=" - [🌐]("+item.DetailPageURL+") ";
        //msg_txt+="\n\n"+args.star+" ⭐️";
        if(item.Offers!=null && item.Offers.Offer!=null && item.Offers.Offer.OfferListing!=null){
          msg_txt+="\n\n*Price*: "+item.Offers.Offer.OfferListing.Price.FormattedPrice+" - ";
          //console.log(prod.title+" - "+args.price.length)
          msg_txt+="_"+item.Offers.Offer.OfferListing.Availability+"_";
        }
        if(item.IsEligibleForPrime){ msg_txt+=" - ✔️Prime"}

        if(item.OfferSummary.LowestNewPrice!=null && item.OfferSummary.LowestNewPrice.Amount!=0){
          msg_txt+="\n  *New:* "+item.OfferSummary.LowestNewPrice.FormattedPrice+ " ("+item.OfferSummary.TotalNew+")";
        }
        if(item.OfferSummary.LowestUsedPrice!=null && item.OfferSummary.LowestUsedPrice.Amount!=0){
          msg_txt+="\n  *Used:* "+item.OfferSummary.LowestUsedPrice.FormattedPrice+ " ("+item.OfferSummary.TotalUsed+")";
        }

        //msg_txt+="\n\n\[‌‌Price tracking by Keepa]("+keepaUrl+item.asin+keepaDomain+")";

        // description
        var desc="";
        if(item.Offers.Offer!=null && item.Offers.Offer.OfferListing!=null){
          desc+="Price: "+item.Offers.Offer.OfferListing.Price.FormattedPrice;
        }
        if(item.OfferSummary.LowestNewPrice!=null)
          desc+=" - New:"+item.OfferSummary.LowestNewPrice.FormattedPrice+ " ("+item.OfferSummary.TotalNew+")";
        if(item.IsEligibleForPrime==1){ desc+=" - ✔️Prime"}

        // RESULT
        itemObj.parse_mode = 'Markdown';
        itemObj.type='article';
        itemObj.id= 'id:'+(process.hrtime());
        itemObj.title = item.ItemAttributes.Title;
        itemObj.description = desc;
        itemObj.message_text= msg_txt;
        itemObj.thumb_url = item.SmallImage.URL;
        itemObj.thumb_width = 100;
        itemObj.thumb_height = 100;
        itemObj.disable_web_page_preview=false;

        itemsList.push(itemObj);
      });
      
      //bot.sendMessage(msg.chat.id, item.MediumImage.URL)
      console.log(msg)
      bot.answerInlineQuery(msg.id, itemsList);
    })
  }
});
