var tabBarPosition = "bottom";
var tabBarHeight = "50";

function load(){
	//sometimes I get two tab bars on a page (now obvious when playing with tab bar placement (one at the top, one at the bottom)), so first check if there is an element already
	//if there is, remove it and inject a new one
	if(document.getElementById("iframekontejner") !== null){
		let wrapperDiv = document.getElementById("iframekontejner");
		while(wrapperDiv.firstChild) wrapperDiv.removeChild(wrapperDiv.firstChild)
		wrapperDiv.remove()
	}
	var div = document.createElement('div');
	if(tabBarPosition == "top"){
		div.style = "position:fixed;top:0px;left:0px;width:100%;z-index:9999" // + "height:" + tabBarHeight + "px";
	}else{
		div.style = "position:fixed;bottom:0px;left:0px;width:100%;z-index:9999";
	}
	div.id = "iframekontejner";
	div.style.height = tabBarHeight + "px"; //"50px";
	var iframe = document.createElement('iframe');
	iframe.src = chrome.runtime.getURL("tab bar v6.html");
	iframe.id = "tabframe154";

	//but for debugging purposes I want to have it a bit higher to see elements underneath in the gap between the tab bar and the bottom of the screen
	iframe.style = "z-index: 9999;width:100%;height:100%"; //height:46px //changed height to be larger from 33px to 55px //position:fixed

//GOOOD: IT WORKS ON GITHUB NOW, GITHUB doesn't see the iframe, so it doesn't block it 
	// const maindiv = document.createElement('div')
	let shadowParent = div.attachShadow({mode:'closed'}); //maindiv
	shadowParent.appendChild(iframe);
	//HUGE THING I OVERLOOKED IN ROB WU's answer is that you append the iframe to the documentElement
	document.documentElement.appendChild(div);//maindiv


//THIS CODE WORKS, BUT SOME PAGES (like github) DELETE THE IFRAME => let's hide the iframe using code above
	// div.appendChild(iframe);
	// document.body.appendChild(div);
}

//IDEA: move next position fixed or position sticky element using transform: translateY(50px) to solve tab bar overlapping page content
load();

//The stylesheet approach worked on Windows, but not on Firefox Android 

// var stylesheet = document.createElement("style");
// stylesheet.innerText = styles;
// document.body.appendChild(stylesheet); //head

//So, switching to using document.body.style, which is the way to add styles in js
//document.body.style.transform = "translateY(50px)"

function handleMessages(request, sender, sendResponse){
	if(request.action == "getFaviconUrl"){ //getThatFavicon
		let url = getFaviconURL();
		//return url; //return didnt work here for some reason
		//NOW WITH sendResponse IT WORKS
		sendResponse(url);
	}
	if(request.action === "updateTabBarPos"){
		 if(request.place == "top"){

		 	tabBarPosition = "top";

		 	console.log("updateTabBarPos TOPP");
		 	document.getElementById("iframekontejner").style.top = "0px";
		 	document.getElementById("iframekontejner").style.bottom = "";

		 	if("height" in request){
		 		tabBarHeight = request.height;
		 		document.getElementById("iframekontejner").style.height = request.height + "px";
		 	}
		 	document.body.style.transform = "translateY(" + tabBarHeight + "px)";

		 }else{
		 	if(request.place == "bottom"){
		 		tabBarPosition = "bottom";
		 		console.log("updateTabBarPos BOTTOM");
		 		document.body.style.transform = "translateY(0px)"; //initial //what sure works is translateY(0px)
		 		document.getElementById("iframekontejner").style.top = "";
			 	document.getElementById("iframekontejner").style.bottom = "0px";
		 	}
		 }
	}
	if(request.action == "tabBarHeightMod"){
		//modifying this height to 100 or 500 shifts the tab bar up, interestingly
		//document.getElementById("iframekontejner").style.height = request.height + "px";

		document.getElementById("iframekontejner").style.height = request.height + "px";

		if(tabBarPosition == "top"){
			tabBarHeight = request.height;
			document.body.style.transform = "translateY(" + request.height + "px)";
		}

	}
	if(request.action === "reload"){
		//alert("reload") //for example on store.google.com
		if("height" in request){
			//alert(request.height); //now 60, as I used window. in that setTimeout
			tabBarHeight = request.height;
		}
		//add a check if our tab bar was removed
		//if not, reload is not needed 
		//(to reduce unnecessary reloads on dictionary.cambridge.com)
		//works
		let tabBar = document.getElementById("iframekontejner");
		if(tabBar == null){
			load();
		}
		//load(); //a lot of unnecessary reloads on dictionary.cambridge.com
	}
	if(request.action === "translateYhackOff"){
		console.log("received")
		document.body.style.transform = "translateY(0px)"
		//stylesheet.disabled = true;
	}
	if(request.action === "translateYhackOn"){
		console.log("received")
		document.body.style.transform = "translateY("+ tabBarHeight + "px)"
		//stylesheet.disabled = false;
	}
}
browser.runtime.onMessage.addListener(handleMessages);


//WORKS

//improve it, so the activeTabOnRightClickChangeHackOff message is not sent when it is not needed
//there is no better event as a mouseenter equivalent on touchscreens
document.addEventListener("touchstart", function(event) {
	//tell the openNewTab5.js that the user is not in the tab bar UI, and continues to use a website
	//document.body.style.background = "gold";

	browser.runtime.sendMessage({action: "activeTabOnRightClickChangeHackOff"});
});

//mouseout works when the user enters the iframe
// document.addEventListener("mouseout", function(event) {
// 	//tell the openNewTab5.js that the user is not in the tab bar UI, and continues to use a website
// 	document.body.style.background = "gold";
// 	browser.runtime.sendMessage({action: "activeTabOnRightClickChangeHackOff"});
// });

//that was a bug caused by alert() in the mouseenter function: while MDN says it fires once when the mouse goes over the element (as opposed to mouseover), in reality it fires after any mouse movement => 
//mouseenter works
document.body.addEventListener("mouseenter", function(event) {
	console.log("mouseenter")
	//tell the openNewTab5.js that the user is not in the tab bar UI, and continues to use a website
	// event.target.style.color = "purple" //works
	browser.runtime.sendMessage({action: "activeTabOnRightClickChangeHackOff"});
});

function getFaviconURL(){
	let url = ""
	try{
		//this is null on google.com for example
		url = document.querySelector("link[rel*='icon']").href;
	}catch{
		//works on google.com
		url = window.location.origin + "/favicon.ico";
	}
	return url;
}
