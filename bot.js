//Express Server
// + 
//LI Bot

//Thoughts for L.I.
//Consider another thumbnail size optimized for msgr size... thumbnails too small, originals too big (2MB?)
//Need urls for events!
//'You may also like' - would be good
//implementing facebook 'instant articles'

'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
var messengerButton = "<html><head><title>Facebook Messenger Bot</title></head><body><h3>Facebook Messenger Bot Example</h3>This is a bot based on Messenger Platform QuickStart. Find more details <a href=\"https://developers.facebook.com/docs/messenger-platform/guides/quick-start\">here</a><br><hr><p><a href=\"https://gomix.com/#!/remix/messenger-bot/ca73ace5-3fff-4b8f-81c5-c64452145271\"><img src=\"https://gomix.com/images/background-light/remix-on-gomix.svg\"></a></p><p><a href=\"https://gomix.com/#!/project/messenger-bot\">View Code</a></p></body></html>";


//

const parseXML = require('xml2js').parseString;
var fetch = require('node-fetch');
var find = require('array.prototype.find');
//var filter = require('array.prototype.filter');

const liBaseURL = "http://api.leedsinspired.co.uk/1.0/"
const liEventsURL = "events.xml?key="
const listCategoriesUrl = "categories.xml?key="
const liAPIKey = process.env.LI_APIKEY
const apiKey = liAPIKey;



let fetchedAllEventsXML = {};

let fetchedAllEventsJSON = {};

let fetchedAllCategoriesXML = {};

let fetchedAllCategoriesJSON = {};

const codedInstructionRegexp = /([e|c|o])(_)\w+/;


let asleep = true;

















// The rest of the code implements the routes for our Express server.
let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Webhook validation
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }
});

// Display the web page
app.get('/', function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(messengerButton);
  res.end();
});

// Message processing
app.post('/webhook', function (req, res) {
  console.log(req.body);
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {
    
    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {


        if (event.message) {

          console.log('msg received');

          if (event.message.quick_reply){
              receivedQuickReply(event);
          }

          else {
            console.log('text msg received');
            receivedMessage(event);
        }
        } else if (event.postback) {
          receivedPostback(event);   
        } 

         else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});

// Incoming events handling
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:", 
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {
    // If we receive a text message, check to see if it matches a keyword
    // and send back the template example. Otherwise, just echo the text we received.



    //First, check if the bot was asleep.

    //If so:
    //1a - Buy some time (respond after 1s), while....
    //1b - Initiate the app (fetch, parse, crunch, cache)
    //1c - App initiation sets asleep flag to false

    //2 - run query when ready


    if (codedInstructionRegexp.test(messageText)){
      instructionDecoder(messageText, senderID);
    }

    else if (messageText.toLowerCase() === 'hi' || 
            messageText.toLowerCase() ==='hey' ||
            messageText.toLowerCase()=== 'hello' ||
            messageText.toLowerCase()=== 'yo')
            {
      sendTextMessage(senderID, 'Hi! There\'s tons going on in Leeds.');
      sendTextMessage(senderID, 'I\'m here to help you find stuff. Let\'s get started...');      
      setTimeout(function(){ listHeadlineCats(senderID); }, 2000);
      
    }
    else {
      //probably not the best way to do this.
      //turn 'FindCatFromString' into something bigger, to also search event titles?
      findCatFromString(messageText, senderID);
    }
        
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}


function receivedQuickReply(event){
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

//{"quick_reply":{"payload":"c_id_11"},"mid":"mid.1485549458046:2a923e1978","seq":53123,"text":"Workshop"}

  var payload = event.message.quick_reply.payload.toString();


  // console.log("Received postback for user %d and page %d with payload '%s' " +   "at %d", senderID, recipientID, payload, timeOfPostback);

  if (codedInstructionRegexp.test(payload)){
    console.log('quick reply was encoded instruction!');
    instructionDecoder(payload, senderID);
  }

}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " +   "at %d", senderID, recipientID, payload, timeOfPostback);

  if (codedInstructionRegexp.test(payload)){
    //console.log('the payload was an instruction!')
    instructionDecoder(payload, senderID);
  }
  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  //sendTextMessage(senderID, "Postback called: " + payload);
}

//////////////////////////
// Sending helpers
//////////////////////////
function sendTextMessage(recipientId, messageText) {
  console.log('sending a message');
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

//This is just a functon to list some of the more popular categories. Useful for the welcome screen, for example.
function listHeadlineCats(senderID) {
  //film[16], music[5], visual art[1], craft[3], sport[14], comedy[27]
  let headlineCategoryIDs = [16,5,1,3,14,27];

  let headlineCategories = [];



  for (var i = 0; i < headlineCategoryIDs.length; i++) {
    let foundCat = fetchedAllCategoriesJSON.find(category => category.category_id.trim() == headlineCategoryIDs[i]);
    headlineCategories.push(foundCat);
  }
  sendGenreBubbles(senderID, headlineCategories, 'welcome');

}

function sendGenreBubbles(recipientId, cats, purpose, firstCat){

  console.log(cats);

  let arrayOfGenreBubbles = [];

  for (var i = cats.length - 1; i >= 0; i--) {

    let payload = "e_cat_" + cats[i].category_id;

    if(purpose == 'narrow'){
      payload = "e_cat_" + firstCat + "_" + cats[i].category_id;
    }


      let thisGenre = {content_type: "text",
                    title: cats[i].category_title,
                    payload: payload };

      arrayOfGenreBubbles.push(thisGenre);

    
  }

  let messageText = 'Explore more...';

  if(purpose == 'narrow'){
    messageText = 'Let\'s narrow it down...'
  }

  if(purpose == 'welcome'){
    messageText = 'What kind of thing are you interested in?'
  }


  console.log(arrayOfGenreBubbles);



  var messageData = {
      recipient: {
        id: recipientId
      },
      message:{
      text:messageText,
      quick_replies:arrayOfGenreBubbles
    }

  }

callSendAPI(messageData);

}



function sendEventCard(recipientId, cards, start, catID){

  //Here I'll need to do some magic to check if a single object or array of objects!

  //Or do I need to??

  let startCard = 0;
  let length = 9;


  if(start){
    startCard = parseInt(start, 10);
  }

    //console.log('cards.length: '+ cards.length + ', startCard: ' + startCard+ ', length: ' + length  + ', catId: '+ catID);
    let offset = (length + startCard);
    let remainingEvents = (cards.length - offset);

    //console.log('remaining = '+cards.length + '-' + '\(' + length + '+' + startCard + ') = ' + remainingEvents);


  if (cards.length){
    console.log('ooh theres more than one');

    let arrayOfEventCards = [];

    for (var i = start; i < offset; i++) {

      let imgurl = '';

      if (typeof cards[i].image_thumbnail !== undefined){

        imgurl = cards[i].image_thumbnail;
        imgurl = imgurl.replace(/ /g,"%20");

        }

      else {
         imgurl = "http://www.leedsinspired.co.uk/sites/all/themes/li/logo.png";
      }

      let thisEvent = {
            title: cards[i].event_title,
            subtitle: cards[i].place_title,
            item_url: "https://www.google.com",               
            image_url: imgurl,
            buttons: [{
              type: "postback",
              title: "Read more",
              payload: "e_id_"+ cards[i].event_id
            }, {
              type: "postback",
              title: "More like this...",
              payload: "e_id_" + cards[i].event_id+"_cats"
            }],
          };
      arrayOfEventCards.push(thisEvent);
      };

      let remainingEvents = cards.length - (length + startCard);

      let showMoreCardsCard = {
            title: 'There\'s ' + remainingEvents + ' more events in this category' ,
            subtitle: "keep exploring...",
            item_url: "https://www.google.com",               
            image_url: "http://www.leedsinspired.co.uk/sites/all/themes/li/logo.png",
            buttons: [{
              type: "postback",
              title: "Show more ▶",
              payload: "e_cat_"+ catID+"_cards_"+(startCard + length)
            }, {
              type: "postback",
              title: "Narrow my search ▼",
              payload: "e_cat_" + catID + "_othercats"
            }],
          };

        arrayOfEventCards.push(showMoreCardsCard);

       var messageData = {
        recipient: {
          id: recipientId
        },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "generic",
              elements: arrayOfEventCards
            }
          }
        }
      };  

    callSendAPI(messageData);

  }

  else {


    let card = cards;

    let imgurl = '';

    if (card.image_thumbnail !== ''){

        imgurl = card.image_thumbnail;
        imgurl = imgurl.replace(/ /g,"%20");

        }

      else {
        imgurl = "http://www.leedsinspired.co.uk/sites/all/themes/li/logo.png";
      }


    var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: card.event_title,
            subtitle: card.place_title,
            item_url: "https://www.google.com/",               
            image_url: imgurl,
            buttons: [{
              type: "postback",
              title: "Read more",
              payload: "e_id_"+ card.event_id
            }, {
              type: "postback",
              title: "More like this...",
              payload: "e_id_" + card.event_id+"_cats"
            }],
          }]
        }
      }
    }
  };  

    callSendAPI(messageData);

}

  



}



function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });  
}

// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port %s", server.address().port);
});








function findCatFromString(text, senderID){
  text = text.toLowerCase();

  let foundCat = [];

  let found = false;


  if(text.startsWith('show me ')){ 
    text = text.substring(8);
  };


  //First, check if it is itself a genre:
  if((text.substring(text.length - 1, text.length) === 's')){

    if (text != "exhibitions" && text != "galleries"){
      text = text.substring(0, text.length - 1);
      }
    } 

  foundCat = fetchedAllCategoriesJSON.find(category => category.category_title.toLowerCase() === text);

  if (foundCat != undefined) {
    found = true; 
    console.log('fail test 1')
    //instructionDecoder('e_cat_' + foundCat.category_id);
  }


  //If not, check if it *contains* a genre
  if(found == false){

    console.log('running test 2')

    for (var i = 0; i < fetchedAllCategoriesJSON.length; i++) {
      let cat_title = fetchedAllCategoriesJSON[i].category_title.toLowerCase();
      if (text.includes(cat_title)){
          foundCat = fetchedAllCategoriesJSON[i];

          found = true;

          break;
        }
      } 
    }

    if(found == false){
       console.log('nothing found');
    }

    else if (found == true) {
      console.log(foundCat.category_id + ": " + foundCat.category_title);
      instructionDecoder('e_cat_' + foundCat.category_id +'', senderID);

      //return(foundCat);
    }
}










// function findByCat(catID){

//   //A function that returns objects with a given category_id
//   //Has to work around some structural specialness whereby events with multiple cats are structured differently to those with only one.

//   //var justEvents = allEvents.response.objects.item;
//   let matchedEvents = [];

//   //Loop over all events
//   for (var i = fetchedAllEventsJSON.length - 1; i >= 0; i--) {

//     //Only run on it if it has categories.
//     if(fetchedAllEventsJSON[i].categories){

//       //Sometimes categories is an object. Sometimes an array of object.
//       //If it's only got one category, it's an object. If it's >1 it's an array

//       //Grab events
//       let eventCategories = fetchedAllEventsJSON[i].categories;

//       //Check if there's more than one
//       if(eventCategories.item.length){

//         //It has more than one, so loop over each
//         for (var j = eventCategories.item.length - 1; j >= 0; j--) {

//           if(eventCategories.item[j].category_id == catID) {
//             matchedEvents.push(fetchedAllEventsJSON[i]);
//           }
//         }
//       }

//       else {

//         //It only has one cat, so no need for the loop
//         if(eventCategories.item.category_id == catID) {
//           matchedEvents.push(fetchedAllEventsJSON[i]);
//         }
//       }
//     }
    
//   }

//   //console.table(matchedEvents);
  
//   return(matchedEvents);
// }



function findEventsByCategory(query, set) {


  return new Promise(function(resolve, reject){

    let matchingItems = [];

    //If what's received is a number, it's an ID:

    let setToFilter = [];

    if(!set){
      setToFilter = fetchedAllEventsJSON;
    }

    else{
      for (var k = 0; k < fetchedAllEventsJSON.length; k++) {

        if(fetchedAllEventsJSON[k].categories){

          for (var l = 0; l < fetchedAllEventsJSON[k].categories.item.length; l++) {
         
            if (fetchedAllEventsJSON[k].categories.item[l].category_id.trim() == set){
              setToFilter.push(fetchedAllEventsJSON[k]);
              }
            }
          }
        }
      }

    for (var k = 0; k < setToFilter.length; k++) {

      if(setToFilter[k].categories){

        for (var l = 0; l < setToFilter[k].categories.item.length; l++) {

          if (setToFilter[k].categories.item[l].category_id.trim() == query){
            matchingItems.push(setToFilter[k]);
            }
          }
        }
      }
  

  if(matchingItems.length === 0){
    reject();
  }

  else {
    resolve(matchingItems);

  }

  })
}







function listSetCategories(set){
//Use when there are loads of events in a category, to let you filter it further
//Takes in a set of events
//Spits out an array of categories (id + name)
//then whatever receives it can look at how many there are and decide what format of message to send it as

  let foundCategories = [];

  //Loop through the set
  for (var k = 0; k < fetchedAllEventsJSON.length; k++) {

    if(fetchedAllEventsJSON[k].categories){

      for (var l = 0; l < fetchedAllEventsJSON[k].categories.item.length; l++) {

        if (fetchedAllEventsJSON[k].categories.item[l].category_id.trim() == set){
          //At this point we've got an event with the category.

          //Now re-loop through it
          for (var m = 0; m < fetchedAllEventsJSON[k].categories.item.length; m++) {

            //don't want duplicates, so checking if it's already in the array:
            //should be possible to replace this with es6 magic, but doesn't seem to work.
            //e.g. [...new Set(foundCategories)];
            let alreadycaptured = false;

            for (var n = 0; n < foundCategories.length; n++) {

              if(foundCategories[n].category_id == fetchedAllEventsJSON[k].categories.item[m].category_id.trim()){
                alreadycaptured = true;
              }
            }

            if(alreadycaptured == false){
              foundCategories.push({category_id: fetchedAllEventsJSON[k].categories.item[m].category_id.trim(), category_title: fetchedAllEventsJSON[k].categories.item[m].category_title.trim()});
              }
            }
          }
        }
      }
    }

    return(foundCategories);
}










//Improved!

//find things by ID
//e_id_NNNN
//c_id_NNNN

//find events by cat
//e_cat_NN

//list an event's categories:
//e_id_NNNN_cats




//Not done:
//list the other categories of events within a category
//e_cat_NN_othercats

//keep showing more cards, starting at an offset
//e_cat_NN_cards_N

//list events with two categories
//e_cat_NN_NN


function instructionDecoder(receivedMessage, senderID){

  let msgToSend = "";
  
  
  console.log('running instructionDecoder with: ' + receivedMessage);

  //Receives Message object

  //this will need pulling from receivedMessage, but for testing is hardcoded for now:
  let messageContent = receivedMessage;


  
  //Check if it's a codified message:

  if(codedInstructionRegexp.test(messageContent)){

    let codedInstructionArray = messageContent.split('_');

    if(codedInstructionArray[0] === 'e'){

      if(codedInstructionArray[1] === 'id'){

        if(codedInstructionArray[3] === 'cats') {
          //e_id_NN_cats
          //i.e. return the categories related to that event

          let foundEvent = fetchedAllEventsJSON.find(event => event.event_id === codedInstructionArray[2]);
          let foundEventCategories = foundEvent.categories.item;

          sendGenreBubbles(senderID, foundEventCategories);

          }

        else {
          //e_id_NNNN
          //i.e. just a search for a sepcific event (by ID)
          let foundEvent = fetchedAllEventsJSON.find(event => event.event_id === codedInstructionArray[2]);


          if(foundEvent === undefined){
            //console.log(foundItem);
            sendTextMessage(senderID, 'Something went wrong. We couldn\'t find the event you were looking for');
            }

          else {
            sendEventCard(senderID, foundEvent);
          }
          
          }
        }


      if (codedInstructionArray[1] === 'cat'){


          //Not done:
          //list the other categories of events within a category
          //e_cat_NN_othercats

          
          

          

        if(codedInstructionArray[3]){



          if (codedInstructionArray[3] === 'cards'){
            //e_cat_NN_cards_N
            //keep showing more cards, starting at an offset

            findEventsByCategory(codedInstructionArray[2])
            .then(function(foundItems){

              sendEventCard(senderID, foundItems, codedInstructionArray[4], codedInstructionArray[2]);
            },

            //Do this if findEventsByCategory promise rejects
            function(){
            }

          )
            
          }

          else if (codedInstructionArray[3] === 'othercats'){
            //e_cat_NN_othercats
            //list the other categories of events within a category

            let otherCategories = listSetCategories(codedInstructionArray[2]).slice(0,5);

            sendGenreBubbles(senderID, otherCategories, 'narrow', codedInstructionArray[2] );
            
           }


          else if(!isNaN(codedInstructionArray[3])) {
            console.log('it was a number');
            //e_cat_NN_NN
            //list events with two categories

            findEventsByCategory(codedInstructionArray[3], codedInstructionArray[2])
              .then(function(foundItems){

                let cat1Title = fetchedAllCategoriesJSON.find(category => category.category_id === codedInstructionArray[2]).category_title;
                let cat2Title = fetchedAllCategoriesJSON.find(category => category.category_id === codedInstructionArray[3]).category_title;

                let quickmsg = 'There are ' + foundItems.length + ' events that are both '+ cat1Title + ' and ' + cat2Title;

                sendTextMessage(senderID, quickmsg);

                sendEventCard(senderID, foundItems, 0, codedInstructionArray[3]);

              },

              //Do this if findEventsByCategory promise rejects
              function(){
              }

            )
          }

          }



        else {

          //e_cat_NN

          findEventsByCategory(codedInstructionArray[2])
            .then(function(foundItems){

              let foundCat = fetchedAllCategoriesJSON.find(category => category.category_id === codedInstructionArray[2]);


             console.log(foundCat);



              let catTitle = foundCat.category_title;

              let quickmsg = 'There are ' + foundItems.length + ' '+ catTitle + ' events';

              sendTextMessage(senderID, quickmsg);

              sendEventCard(senderID, foundItems, 0, codedInstructionArray[2]);
            },

            //Do this if findEventsByCategory promise rejects
            function(){
            }

          )

          
          }

        }


      } 


    else if(codedInstructionArray[0] === 'c'){

      if(codedInstructionArray[1] === 'id'){

        if(codedInstructionArray[3] === 'othercats'){
          //e_cat_NN_othercats
          //list the other categories of the events within a specific category

          }

        else {

           let foundCategory = fetchedAllCategoriesJSON.find(category => category.category_id === codedInstructionArray[2]);
          }

        }

    } 











  }

  else {
    console.log('couldn\'t handle this request, sadly!');
  }



}




































//Make a generic data getter.
//Use promises.
function getLIData(querytype){

  var urlToQuery = "";

  var numberOfFetches = 2;
  var successfulFetches = 0;

    return new Promise(function(resolve, reject){


        //Go Get Events:
          const eventsUrl = liBaseURL + "events.xml?key=" + liAPIKey;

          request(eventsUrl, function (error, response, body){

            //console.log("[Heading to URL: " + eventsUrl + "]");
          
            if (response){
              console.log("[Server response (getting events)\: " + response.statusCode + "]"); 
            }

            if (error){
              console.log("Error trying to get to the LI server");
              reject();
            }

            //Successfully connected, so resolve the promise:
            if (!error && response.statusCode == 200) {
              fetchedAllEventsXML = body;
              successfulFetches ++;
              if(successfulFetches === numberOfFetches){
                resolve();
              }
            }

            //Something went wrong, so reject the promise:
            else {
              reject(errorurl);
            }

          });


        //Go Get Categories:
          const categoriesUrl = liBaseURL + "categories.xml?key=" + liAPIKey;

          request(categoriesUrl, function (error, response, body){

            //console.log("[Heading to URL: " + categoriesUrl + "]");
          
            if (response){
              console.log("[Server response (from getting categories)\: " + response.statusCode + "]"); 
            }

            if (error){
              console.log("Error trying to get to the LI server");
              reject();
            }

            //Successfully connected, so resolve the promise:
            if (!error && response.statusCode == 200) {
              fetchedAllCategoriesXML = body;
              successfulFetches ++;
              if(successfulFetches === numberOfFetches){
                resolve();
              }
            }

            //Something went wrong, so reject the promise:
            else {
              reject();
              //reject(errorurl);
            }




          });


          
    });
}



function convertXMLSToJs(){


  parseXML(fetchedAllEventsXML,{explicitArray: false}, function (err, result) {
        fetchedAllEventsJSON = result.response.objects.item;
      });

  parseXML(fetchedAllCategoriesXML,{explicitArray: false}, function (err, result) {
    fetchedAllCategoriesJSON = result.response.objects.item;
  });

  normalizeEventCategories();

  //Good place to put some bonus tests to check that the JSONs contain what we want.
  //i.e. not server errors.

}




//This is unused.
function listCategories(order, start, amount){

  let categoriesAlphabetised = {};
  let categoriesAlphabetisedNames = [];

  console.log("initiating listCategories :)");

  //Quick easy test: 
  let listOfCategories = fetchedAllCategoriesJSON.map(category =>  category.category_title + ": " + category.category_id);
  //console.log(listOfCategories);


if(order === 'alphabetical'){

  categoriesAlphabetised = fetchedAllCategoriesJSON.sort((lastOne, nextOne) => {
      return lastOne.category_title > nextOne.category_title ? 1 : -1;
    });

  categoriesAlphabetisedNames = fetchedAllCategoriesJSON.map(category =>  category.category_title + ':' + category.category_id);

  }

  //Need to do some logic here so that it can handle not having starts/amounts passed in.

  
  if (start && amount){

    //console.log(start);
    let end = start + amount;
    console.log(categoriesAlphabetisedNames.slice(start, end));
  }

  else {
    console.log(categoriesAlphabetised);
  }
  

  if (start && amount){

    //console.log(start);
  let end = start + amount;
  return categoriesAlphabetised.slice(start, end);
  }

  else {
    return categoriesAlphabetised;
  }


}






function normalizeEventCategories(){
  //Normalize the way that categories are structured so that they are always an array. Do this crunching once to take the strain off subsequent requests...

  //Useful to cleanly do stuff to a smaller subset of categories.
  //e.g. produce cards / bubbles containing category data.

  for (var i = fetchedAllEventsJSON.length - 1; i >= 0; i--) {

    //Only run on it if it has categories.
    if(fetchedAllEventsJSON[i].categories){

      //Sometimes categories is an object. Sometimes an array of object.
      //If it's only got one category, it's an object. If it's >1 it's an array


      //Check if there's only one
      let eventCategories = fetchedAllEventsJSON[i].categories;
      if(! eventCategories.item.length){

        //Make an object
        let eventCategoriesObject = {};
        eventCategoriesObject = eventCategories.item;
        fetchedAllEventsJSON[i].categories.item = [eventCategoriesObject];
      }
    }
    
  }

  console.log('[event categories structure has been normalized]');
}



//Gets Data, and makes JSON array with it.

//Should be fired only when conversation starts.


function megaGetter(){

  // console.log("initiating megaGetter");


  getLIData('events')
    .then(function(){


      convertXMLSToJs();

      console.log("[xml data has been fetched and converted to JS Now for some tests:]");

      //These are instructions that will actually be called from elsewhere. 
      //For now they are here. Partly because we need to wait for data to be collected and transformed

      //let foundEvent = findItem('event', 'event_id', '27157');

      //console.log("📢 title: " + foundEvent.event_title);
      //console.log("📢 venue: " + foundEvent.place_title);

      //let foundCategory = findItem('category', 'category_id', '16');

      //console.log("📢 cat: " + foundCategory.category_title);


      //listCategories('alphabetical',2,4);

      //listCategories('alphabetical');

      //console.log('now running the instruction decoder');
      //instructionDecoder('e_id_27157');
      //instructionDecoder('c_id_24');
      //instructionDecoder('e_cat_3');
    },


    //Do this if getLIDataPromise promise rejects
    function(errorurl){
        console.log('Error loading ' + errorurl)
    }

  )

}









//Test instructionDecoder

//instructionDecoder();























//Test 1: 
// console.log('Test 1: list categories: ');

//megaGetter();





//Test 2: Scheduled function calls :)
//http://stackoverflow.com/questions/12309019/javascript-how-to-do-something-every-full-hour

function scheculed_refresh(){

    let executionTime = new Date();
    console.log("🙌scheduled refresh just ran🙌" + executionTime.getHours() + ":" + executionTime.getMinutes() + ":" + executionTime.getSeconds() );
    
    //Once executed, start a new countdown for the next trigger of this function:
    megaGetter();
    countDownToAPIPull();

}

function countDownToAPIPull(){
    console.log('making a new interval');


    if(initialFetch === true){
      initialFetch = false;
      scheculed_refresh();
    }

    else {
      var today = new Date();
      var tommorow = new Date(today.getFullYear(),today.getMonth(),today.getDate()+1);
      var timeToMidnight = (tommorow-today);
      console.log('Next fetch will be at midnight, (or in ' + (((timeToMidnight/100)/60)/60) + 'hours)' );
      var timer = setTimeout(scheculed_refresh,timeToMidnight);
  }
}












//On startup, we want to fetch data. But for subsequently, we don't.

let initialFetch = true;




countDownToAPIPull();