function load(){
	var div = document.createElement('div');
	div.style = "position:fixed;top:0px;left:0px;width:100%;z-index:9999";
	div.id = "iframekontejner";
	var iframe = document.createElement('iframe');
	iframe.src = chrome.runtime.getURL("tab bar v6.html");
	iframe.id = "tabframe154";
	iframe.style = "z-index: 9999;position:sticky;width:100%;height:46px"; //changed height to be larger from 33px to 55px //position:fixed

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

function handleMessages(request){
	if(request.action === "reload"){
		load();
	}
	if(request.action === "translateYhackOff"){
		console.log("received")
		styleSheet.disabled = true;
	}
	if(request.action === "translateYhackOn"){
		console.log("received")
		styleSheet.disabled = false;
	}
}
browser.runtime.onMessage.addListener(handleMessages);


//Wrong: Chrome and Firefox has a bug that doesn't fix elements with position:fixed if: you use CSS3 transform in any element, and/or
//see the documentElement comment 
const styles = `body{
	transform: translateY(50px); 
}
`;

var styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.body.appendChild(styleSheet); //head

//WORKS
document.addEventListener("touchstart", function(event) {
	//tell the openNewTab5.js that the user is not in the tab bar UI, and continues to use a website
	//document.body.style.background = "gold";
	browser.runtime.sendMessage({action: "activeTabOnRightClickChangeHackOff"});
});