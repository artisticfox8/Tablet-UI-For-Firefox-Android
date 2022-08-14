var previousTabObject;
//for tabs which are loaded after the 
var tabOrderModifications = {}; //{tabId: insertAfterId}

//both trueActiveTabId and activeTabId have their place
var activeTabId = 0;
var trueActiveTabId = 0; //always the real tab active tab id

browser.tabs.query({active:true}).then(function(tabs){
	let tab = tabs[0];
	activeTabId = tab.id;
});
function handleMessage(request, sender) { //message from tab //sendResponse
	//from tab bar iframe
	if(request.action === "translateYhackOff"){
		//to the content script
		browser.tabs.sendMessage(sender.tab.id, {action: "translateYhackOff"});
	}
	//from tab bar iframe
	if(request.action === "translateYhackOn"){
		//to the content script
		browser.tabs.sendMessage(sender.tab.id, {action: "translateYhackOn"});
	}


	//On Windows, this works, on Android it produces a correct position on the tab it was opened from, but not on other tabs
		//So, the idea is to store an object of tab position modifications, because 
		//getAllTabs has a different tab order
			//tab order depends on the order the tabs are being loaded
				//NOT to their position on the tab bar
					//(if you swipe left on the native adressbar, you will load a new tab (which was browsed during a previous session) and it will open to the right) 
						//if you swipe right, that new tab loaded will also load to the right

			//this all stems from the fact, that tabs which are not loaded, are not available with browser.tabs.query({})
			// => So store an object with tab order modifications

	//activeTabOnRightClickChangeHack and activeTabOnRightClickChangeHackOff work on Android
	if(request.action === "activeTabOnRightClickChangeHack"){
		//OK, this UI hack works, it positions the new tab to the right of right clicked tab
		//netřeba nějak resetovat, protože při dalším tab switch se activeTabId přehodí na správnou hodnotu: tohle je prostě fix pro otevírání z tab baru 
		console.log(request.tabID);
		
		activeTabId = parseInt(request.tabID);
	}
	//from touchstart on content.js (user interacts with the page, not the tab bar)
	if(request.action === "activeTabOnRightClickChangeHackOff"){
		activeTabId = parseInt(trueActiveTabId);
	}

	//if activeTabOnRightClickChangeHack is activated, and the user CLOSES THE MENU, withou opening a new tab,
	//the new tab is created next to the => fixed with activeTabOnRightClickChangeHackOff
	if(request.action === "switchTab"){
		browser.tabs.update(parseInt(request.tabID), {active: true}).then(function(){
			//tell the frame that it has been switched to works but if yo switch to a tab which starts with about, it gives an error
			//good this fix works
			browser.tabs.get(parseInt(request.tabID)).then(function(tab){
				if(tab.url.startsWith("about:")){
				}else{
						browser.tabs.sendMessage(parseInt(request.tabID), {action: "switchedToThisTab", ID: request.tabID})
				}
			});
			//browser.tabs.sendMessage(parseInt(request.tabID), {action: "switchedToThisTab", ID: request.tabID})

		});	
	}
	if(request.action === "createTab"){
		//on Windows browser.tabs.create({}); opens the browser about:newtab tab page
		//on Android, it opens about:blank
		//if the user clicks the adressbar on that new tab, he could navigate to a different page
		//but the about:blank will still be open
		//=> So, a temporary fix is to open google.com instead
		browser.tabs.create({url:"https://www.google.com"});
	}

	if(request.action === "closeTab"){ //Add tab selected styling to tab browser will navigate to after this
		let removing = browser.tabs.remove(parseInt(request.tabID));
		removing.then(function(e){ // integer or integer array)
			//add a response so other tabs know
			browser.tabs.query({}).then(function(tabs){
				console.log(tabs); 
				for (var i = 0; i < tabs.length; i++) {
					//still althought new tab query Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
						if(parseInt(tabs[i].id) != request.tabID){
							let xd= browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "tabClosed", ID: request.tabID});
							xd.catch(err=> console.log(err));
						}
						
					}
				});

		});
		

	}
	if(request.action === "backButton"){
		console.log("back");
		//TODO: add tab description update IF NEEDED: ON PAGES LIKE GITHUB.COM, when the whole page isn't reloaded
		browser.tabs.goBack(); //tabId : The ID of the tab to navigate. Defaults to the active tab of the current window.

	}

	if(request.action === "forwardButton"){
		browser.tabs.goForward();
	}
	console.log(request.action);

	if(request.action === "reloadButton"){
		browser.tabs.reload();
	}

	if(request.action === "getAllTabs"){
		//EUREKA! WORKS! followed https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage#examples for correct promise based
		return browser.tabs.query({}).then(function(panely){
			console.log("sender",sender.tab);
			//testing 
			panely.adresat = sender.tab.id; //add info, where this is sent -> that tab will be higlighted

			panely.tabOrderMods = tabOrderModifications;

			return panely;
			//sendResponse(panely); //sends undefined wtf

		});

		//LETS SEE IF THIS BS WORKS AT ALL //i t Does
		//sendResponse("guccidjfdsfbsdwefsfdfd") //that worked (function parameters were (request, sender, sendResponse)

	}

}

//Fix for pages like github (which use history api to when going between pages - iframe is not reloaded by default (as content scripts are only reset on new complete pageload ))
//github doesn't like iframes, outputs: Security Error: Content at https://github.com/mozilla/mozilla-central may not load or link to moz-extension://6b99713d-fe4d-4ccb-9dc9-f152888c2de6/tab%20bar%20v4.html.
//and deletes the iframe
//SO, LET'S EXPERIMENT WITH HIDDEN SHADOW DOM //
//TL:DR works 80% of the time, when you navigate a github repo without reloading any of the URLs; when you do reload a page on github, it's not gonna load when you navigate the repo//
function requestToContentScript(details){
	console.log("URL updated using History API")
	//WORKS, but sometimes Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist.
	//So maybe run this after say 50ms

	//apparently this line caused Content Security Policy: The page’s settings blocked the loading of a resource at eval (“script-src”).
	//although I called the browser.tabs.sendMessage FUNCTION, not any kind of string lol
	//So wrapping it in function(){}
	setTimeout(function(e){browser.tabs.sendMessage(parseInt(details.tabId), {action: "reload"})}, 50);
	//browser.tabs.sendMessage(parseInt(details.tabId), {action: "reload"});
}

browser.webNavigation.onHistoryStateUpdated.addListener(requestToContentScript);


browser.runtime.onMessage.addListener(handleMessage);


function activeTabChanged(activeInfo){
	//The ID of the tab that has become active
	//stores the id in a global var
	activeTabId = activeInfo.tabId;
	trueActiveTabId = activeInfo.tabId;
}

browser.tabs.onActivated.addListener(activeTabChanged);
//Add tab updates
//When new tab is opened using right click for example
//READ THE DOCS!!!!!!!!!!!!!!!!!!!!!!!!!!!!! this function has THREE parameters
function shareWithContentScripts(tabId, changeInfo, tab){
	//OK, this gets logged
	//TODO: filter isn't supported on Android: by default browser.tabs.onUpdated reports changes of any kind: url, tab switch, status (ie if ant tab is loading), audible, etc
  var changedStuff = {action: "tabCreated", ID: parseInt(tabId)}
	if("url" in changeInfo){
		changedStuff.url = changeInfo.url;
	}
	if("title" in changeInfo){
		changedStuff.title = changeInfo.title;
	}

	//activeTabId sent, so new tab insert after activeTabId
	//for Android - store the position of these newly opened tabs, because getAllTabs positions them differently (already explained in openNewTab js)
	//so it's OK: tabs can't be moved in Android and tabIds are unique per session
	if(String(tabId) in tabOrderModifications){
		//tabId already, there, tab exists
		//the only data updated are the title and url properties
		//the tab position stays the same
	}else{
		//that tab is always inserted after a tab with a certain id
		tabOrderModifications[tabId] = activeTabId;
		
	}
	console.warn("tabOrderModifications",tabOrderModifications);

	console.log("fewwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdatedtabs.onUpdated")
	browser.tabs.query({status: "complete"}).then(function(tabs){ //added status: "complete"
				//console.log(tabs);
				console.log(changeInfo); 
			for (var i = 0; i < tabs.length; i++) {
				if(tabs[i].url.startsWith("about:")){
					//do nothing
				}else{
					//if statement so that we don't send the UI update info to the new tab, which is polling getAllTabs anyways
					if(tabs[i].id != tabId){

							//already in getAllTabs: also lets send the tab its id, so it knows its own id
							//changedStuff.yourID = tabs[i].id;

							let activeTabIndeks = 0;
							console.error("real tab.index", tab.index);
		
							changedStuff.activeTabID = activeTabId;
								console.log("sending to right tabs " + tab.title);
								let xd= browser.tabs.sendMessage(parseInt(tabs[i].id), changedStuff);
								//let xd= browser.tabs.sendMessage(parseInt(tabs[i].id), {action: "tabCreated", ID: parseInt(tabId), title: changeInfo.title, url: changeInfo.url}); //apparently title should be changeInfo title

								//interestingly, this line in background console worked: let xd= browser.tabs.sendMessage(parseInt("48"), {action: "tabCreated", ID: 67, title: "gefrwefegfqwreffddgfbfwdsfeffbefs", url: "example.com"}); 
							
								xd.catch(err=> console.log(err));
							//});
								
							//});
					}else{
						//MOVE THIS TO getAllTabs
						//tab modifications need to be sent only to that tab that is gonna poll getAllTabs
						//changedStuff.tabOrderMods = tabOrderModifications;

					}
				}
							
						//}
			}
	});
}

//a bunch of these events are fired before all tabs are even loaded, so register this listener only after all iframes have been loaded)

//To filter out tab switch
//Wow, gets seems to get rid of errors on startup : But filter it's not supported on Android
// const filter = {
// 	properties: ["url","title"] //added title to filter (changeInfo only includes the properties here) //So work around without using filter to make it compatible with Android
// }

//Experiment with navigation.onCompleted
//not really, because there is no way how to get tab title
//web navigation supports tab.url and tab.id
//so then get tab title using browser.tabs.get(tab.id)
// chrome.webNavigation.onCompleted.addListener(function(tab) {
//     if(tab.frameId==0){ //only main page navigation change, not iframe navigation change

    	
//     }
// });

browser.tabs.onUpdated.addListener(shareWithContentScripts); //,filter //IDEA: how about using navigation.onCompleted