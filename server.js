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
var prod = aws.createProdAdvClient(awscred.keyid, awscred.key, awscred.tag);

console.log('BOT STARTED');

/* Any kind of message */
bot.on('inline_query', function (msg) {
  console.log("inline_query: "+msg.query+" from: "+msg.from.id)
  if(msg.query.length>0){
    //console.log("query.length > 0")
    prod.call("ItemSearch", {SearchIndex: "All", Keywords: msg.query, Region:"it", ResponseGroup:"Offers,ItemAttributes,Images"}, function(err, result) {
      var itemsList = [];
      result.Items.Item.forEach(function(item){

        var itemObj = {};
        var keepaUrl = "https://dyn.keepa.com/pricehistory.png?asin=";
        var keepaDomain = "&domain=it";

        var msg_txt ='';
        msg_txt+="[‌‌ ]("+item.MediumImage.URL+")";
        msg_txt+="\n*"+item.ItemAttributes.Title+"*";
        msg_txt+=" - [🌐]("+item.DetailPageURL+") ";
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

        msg_txt+="\n\n\[‌‌Price tracking by Keepa]("+keepaUrl+item.asin+keepaDomain+")";

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

      bot.answerInlineQuery(msg.id, itemsList);
    })
  }
});

/*
function itemMsg(item){

  var itemObj = {};
  var keepaUrl = "https://dyn.keepa.com/pricehistory.png?asin=";
  var keepaDomain = "&domain=it";

  var msg_txt ='';
  msg_txt+="[‌‌ ]("+item.MediumImage.URL+")";
  msg_txt+="\n*"+item.ItemAttributes.Title+"*";
  msg_txt+=" - [🌐]("+item.DetailPageURL+") ";
  //msg_txt+="\n\n"+args.star+" ⭐️";
  if(item.IsEligibleForPrime==1){ msg_txt+=" - ✔️Prime"}
  msg_txt+="\n\n*Price*: "+item.Offers.Offer.OfferListing.Price.FormattedPrice+" - ";
  //console.log(prod.title+" - "+args.price.length)
  msg_txt+="_"+item.Offers.Offer.OfferListing.Availability"_";
  if(item.OfferSummary.LowestNewPrice.Amount!=0){
    msg_txt+="  *New:* "+item.OfferSummary.LowestNewPrice.FormattedPrice+ " ("+item.OfferSummary.TotalNew+")";
  }
  if(item.OfferSummary.LowestUsedPrice.Amount!=0){
    msg_txt+="  *Used:* "+item.OfferSummary.LowestUsedPrice.FormattedPrice+ " ("+item.OfferSummary.TotalUsed+")";
  }

  msg_txt+="\n\n\[‌‌Price tracking by Keepa]("+keepaUrl+item.asin+keepaDomain+")";

  // description
  var desc="";
  desc+="*Price:* "+item.Offers.Offer.OfferListing.Price.FormattedPrice;
  desc+=" - *New:*"+item.OfferSummary.LowestNewPrice.FormattedPrice+ " ("+item.OfferSummary.TotalNew+")";
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

  return result;
}


var itemsArr=[];

if(items.length==0){
  var itemObj = {};
  itemObj.parse_mode = 'Markdown';
  itemObj.type='article';
  itemObj.id= 'id:'+(process.hrtime());
//<<<<<<< HEAD
  itemObj.title = "Spiacente, nessun risultato disponibile";
  itemObj.message_text="Nessun risultato disponibile";
  itemObj.description = "\n Prova un altro termine di ricerca 😉";
  itemsArr.push(itemObj);
}else{
  var titleRe = /I clienti hanno/g;
  items.each(function(i, elem) {
    var itemObj={};
    var args={};
    var price, description;
    var item=$(this);
    itemObj.parse_mode = 'Markdown';
    itemObj.type='article';
    itemObj.id= 'id:'+(process.hrtime());
    itemObj.title=item.find('h2').text();
    if(itemObj.title!=null){
      if(titleRe.exec(itemObj.title)===null){ //check if is a wrong object
        // thumb
        itemObj.thumb_url=item.find('img').attr('src');
        itemObj.thumb_width = 100;
        itemObj.thumb_height = 100;
        itemObj.disable_web_page_preview=false;
        // Args
        args.asin = item.attr('data-asin');
        args.star = item.find('i[class*="a-icon-star"]').find('span[class*="a-icon-alt"]').text();
         //remove unnecessary text
         if(args.star.length>0){
           args.star = args.star.substring(0,args.star.indexOf("su")-1)+"/5"; //removes "su 5"
         }else{
           args.star = "nd";
         }

        args.price = [];
        //gets the various prices
        var j=0;
        item.find('[class*="a-link-normal"]').each(function(i,elem){
          var price = $(this).find('span[class*="a-color-price"]').first().text();
          //console.log(itemObj.title.substring(0,13)+' price: '+price)
          if(price.includes('EUR')){
            if(j>0){
              var txt = ($(this).text());
              var indComma = txt.indexOf(',')+3;
              var res = txt.slice(0,indComma)+" "; // trova la virgola ed aggiunge uno spazio dopo due decimali
              res += txt.slice(indComma,txt.length);
              args.price[j] = res;
              console.log(itemObj.title.substring(0,9)+" - price: "+price+" - j: "+j+"text: "+res)
            }else if(j==0){
              args.price[0]= (price);
              console.log(itemObj.title.substring(0,9)+" - price: "+price+" - j: "+j)
            }
            j++;
          }
        });
        //console.log(args.price)
        args.prime = item.find('span[class*="a-icon-alt"]').first().text();
        //console.log("price: "+args.price+" prime: "+args.prime);

        args.url = item.find('h2').parent().attr('href');

        itemObj.message_text=productMessage(itemObj, args);
        itemObj.description = "\nNuovo: "+args.price[0]+" - "+args.star+" ⭐️ - ";
        if(args.prime){ itemObj.description+="✔️"}

        itemsArr.push(itemObj);
      }
    }

  });
}
*/
