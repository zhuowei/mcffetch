"use strict";
var Request = require("request").Request;

var timers = require("timers");
//var simpleStorage = require("simple-storage");

var {Cc, Ci} = require("chrome");
var domParser = Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);

console.log("mcffetch: I'm alive!");

var usedNumbers = {};

var maxThreadId = 1252581;

var xhrRequests = [];

var failedIds = [];
var fetchedIds = [];

var fetchedCount = 0;

var targetFetchCount = 1000;

var fetchInProgress = true;

var threadDescriptions = [];

function fetchNewRandomThread() {
	var threadId = Math.floor(Math.random() * maxThreadId);
	while (usedNumbers[threadId]) {
		console.log("mcffetch: generated id " + threadId + " has been fetched already; generating new one.");
		threadId = Math.floor(Math.random() * maxThreadId);
	}
	usedNumbers[threadId] = true;
	console.log("mcffetch: Fetching post " + threadId + " (" + fetchedCount + " of " + targetFetchCount + ")");
	fetchThread(threadId);
	fetchedCount++;
}

function fetchThread(threadId) {
	var threadRequest = Request({
		url: generateUrlForThread(threadId),
		onComplete: function(response) {
			threadLoaded(threadId, response);
		}
	});
	threadRequest.get();
}

function generateUrlForThread(threadId) {
	//return "http://localhost:8000/herp/" + threadId + "-derp/"
	return "http://www.minecraftforum.net/topic/" + threadId + "-redirect/"
}

function threadLoaded(threadId, response) {
	if (!fetchInProgress) return;
	if (response.status == 403 || response.status == 404) {
		failedIds.push(threadId);
		console.log("mcffetch: " + response.status + " on " + threadId);
	} else if (response.status >= 400 && response.status < 600) {
		console.log("mcffetch: " + response.status + "on " + threadId + ". This should not happen!");
	} else {
		fetchedIds.push(threadId);
		console.log("mcffetch: success on " + threadId);
		parseSuccessFetch(threadId, response);
	}
	onwardsAndUpwards();
}

function parseSuccessFetch(threadId, response) {
	var threadDocument;
	var threadDescriptor;
	try {
		threadDocument = domParser.parseFromString(response.text, "text/html");
	
		var numReplies = threadDocument.getElementsByClassName("ipsType_sectiontitle clear clearfix")[0].children[0].textContent.trim();
		var threadDescriptor = {
			title: threadDocument.getElementsByClassName("ipsType_pagetitle").textContent,
			id: threadId,
			info: threadDocument.getElementsByClassName("desc lighter blend_links").textContent,
			replies: numReplies == "No replies to this topic" ? 0: parseInt(numReplies),
			firstPostLength: threadDocument.getElementsByClassName("post entry-content")[0].textContent.trim().length
		};
		console.log(JSON.stringify(threadDescriptor));
		threadDescriptions.push(threadDescriptor);
	} catch (e) {}
}

function onwardsAndUpwards() {
	if (fetchedCount < targetFetchCount) {
		timers.setTimeout(fetchNewRandomThread, 1000);
	} else {
		doneFetching();
	}
}

function doneFetching() {
	if (!fetchInProgress) return;
	console.log("mcffetch: Finished fetching at " + new Date().toString());
	console.log("Fetched " + fetchedCount + " threads.");
	console.log("Success: " + fetchedIds.length);
	console.log(fetchedIds);
	console.log("errors: " + failedIds.length);
	console.log(failedIds);

	console.log("Successful thread infos:");
	console.log(JSON.stringify(threadDescriptions));
	fetchInProgress = false;
}


console.log("Start fetching with 2 simultaneous requests on " + new Date().toString()); 

fetchNewRandomThread();
fetchNewRandomThread();
