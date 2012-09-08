//
// Host Page Code
//
// This section is for managing the selection form elements and posting of
// Privly-type links to those form elements.
//
// The script follows this flow of events
// 1. When the user right clicks the page it fires the contextmenu event
// 2. The script records the target node
// 3. If the user selects the context menu for Privly, background.js 
// sends a message to this script to freeze posting. This prevents future 
// right clicks from changing the destination node.
// 4. Finally, background.js will message this scrit the Privly URL 
// to drop into the original form element.
//

// Where the Privly URL will be placed is remembered by the contextmenu event
var privlyUrlReceiptNode = undefined;
document.addEventListener( "contextmenu", function(evt) {
  if (!pendingPost) {
    privlyUrlReceiptNode = evt.target;
  }
})

// Variable used to indicate whether there is a pending pending operation
var pendingPost = false;

// Accepts Privly URL from the background.js script
chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    
    // drop the Privly URL into the form element
    if ( request.privlyUrl !== undefined && 
         privlyUrlReceiptNode !== undefined && 
         pendingPost) {
      
      // Focus the DOM Node, then fire keydown and keypress events
      privlyUrlReceiptNode.focus();
      var keydownEvent = document.createEvent("KeyboardEvent"); 
      keydownEvent.initKeyboardEvent('keydown', true, true, window, 0, 
                              false, 0, false, 0, 0); 
      privlyUrlReceiptNode.dispatchEvent(keydownEvent);
      var keypressEvent = document.createEvent("KeyboardEvent"); 
      keypressEvent.initKeyboardEvent('keypress', true, true, window, 0, 
                              false, 0, false, 0, 0); 
      privlyUrlReceiptNode.dispatchEvent(keypressEvent);
      
      // Some sites need time to execute form initialization 
      // callbacks following focus and keydown events.
      // One example includes Facebook.com's wall update
      // form and message page.
      setTimeout(function(){
        
        privlyUrlReceiptNode.value = request.privlyUrl;
        privlyUrlReceiptNode.textContent = request.privlyUrl;
        
        var event = document.createEvent("KeyboardEvent"); 
        event.initKeyboardEvent('keyup', true, true, window, 
                                0, false, 0, false, 0, 0); 
        privlyUrlReceiptNode.dispatchEvent(event);
        
        privlyUrlReceiptNode = undefined;
        pendingPost = false;
      },500);
      
    }
    
    // It will not change the posting location until the last post completes
    // background.js can cancel the last pendingPost by messaging 
    // pendingPost: false
    if(request.pendingPost !== undefined) {
      pendingPost = request.pendingPost;
    }
  });

//
// Posting Application Code
//
// This event listener is only used by applications that have been opened by
// background.js to generate a Privly URL.
// For more information: 
// https://github.com/privly/privly-organization/wiki/Viewing-and-Posting-Applications
//

// Send the extension the URL for posting to the host page
document.addEventListener('PrivlyUrlEvent', function(evt) {
  chrome.extension.sendMessage({privlyUrl: evt.target.getAttribute("privlyUrl")}, function(response) {
  });
});