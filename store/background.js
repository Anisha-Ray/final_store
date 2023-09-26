importScripts('firebase-app.js');
importScripts('firebase-database.js');

var firebaseConfig = {
    apiKey: "AIzaSyBqaPR0wVUXYnD1KUhaeTXT2RlfUWvK_n8",
    authDomain: "chrome-store-1f206.firebaseapp.com",
    databaseURL: "https://chrome-store-1f206-default-rtdb.firebaseio.com",
    projectId: "chrome-store-1f206",
    storageBucket: "chrome-store-1f206.appspot.com",
    assmessagingSenderId: "66744701444",
    appId: "1:66744701444:web:570a5ed9a2105663859b51"
  };

  
firebase.initializeApp(firebaseConfig);
var database = firebase.database();



var userId = null;
var tabData = {};

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'storeEmail') {
    var email = message.email;

    // Check if the user already exists in the database based on the email
    var usersRef = database.ref('user');
    usersRef
      .orderByChild('email')
      .equalTo(email)
      .once('value')
      .then(function(snapshot) {
        if (snapshot.exists()) {
          // User already exists, retrieve the userId
          userId = Object.keys(snapshot.val())[0];
          sendResponse({ success: true, userId: userId });
        } else {
          // User doesn't exist, create a new user
          var newUserRef = usersRef.push({ email: email });
          userId = newUserRef.key;
          sendResponse({ success: true, userId: userId });
        }
      })
      .catch(function(error) {
        console.error('Error storing/retrieving email:', error);
        sendResponse({ success: false });
      });

    return true;
  } else if (message.action === 'startTracking') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0) {
        var tab = tabs[0];
        var url = tab.url;
        console.log("testing " +tab.id);

        if (url && url.startsWith('http')) {
    
          tabData[tab.id] = {
            url: url,
            startTime: new Date(),
            endTime: null,
            duration: 0,
            clickCount: 0,
            clicks: []
          };

          storeURL(url, formatDate(tabData[tab.id].startTime),formatDate( tabData[tab.id].endTime), formatDuration(tabData[tab.id].duration));
        }
      }
    });
  } else if (message.action === 'stopTracking') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0) {
        var tab = tabs[0];
        var tabId = tab.id;

        if (tabData.hasOwnProperty(tabId)) {
          tabData[tabId].endTime = new Date();//.toLocaleString();
          tabData[tabId].duration += calculateDuration(tabData[tabId].startTime, tabData[tabId].endTime);

          var url = tabData[tabId].url;
          var startTime = tabData[tabId].startTime;
          var endTime = tabData[tabId].endTime;
          var duration = tabData[tabId].duration;
          var clickCount = tabData[tabId].clickCount;
          var clicks = tabData[tabId].clicks;

          storeURL(url, formatDate(startTime), formatDate(endTime), formatDuration(duration), clickCount, clicks);

          delete tabData[tabId];
        }
      }
    });
  } else if (message.action === 'clickEvent') {
    if (tabData.hasOwnProperty(sender.tab.id)) {
      if (!tabData[sender.tab.id].clicks) {
        tabData[sender.tab.id].clicks = []; // Initialize clicks array if not already present
      }
      var clickedElement = message.clickedElement;
      if (clickedElement) {
        tabData[sender.tab.id].clickCount++;
        tabData[sender.tab.id].clicks.push(clickedElement);
      }
    }
  }
});


// Function to start periodic updates for the active tab
async function startPeriodicUpdates(tabId) {
  const updateInterval = 5000; // 5 seconds

  async function updateTabData() {
    if (tabData.hasOwnProperty(tabId)) {
      const currentTab = tabData[tabId];
      console.log(currentTab);
      currentTab.endTime = new Date();//.toLocaleString();
      currentTab.duration += calculateDuration(currentTab.startTime, currentTab.endTime);

      await stopTrackingAndStore(
        currentTab.url,
        formatDate(currentTab.startTime),
        formatDate(currentTab.endTime),
        formatDuration(currentTab.duration),
        currentTab.clickCount,
        currentTab.clicks
      );

      // Reset start time for the next update
      currentTab.startTime = new Date();//.toLocaleString();

      // Schedule the next update
      setTimeout(updateTabData, updateInterval);
    }
  }

  // Start the periodic updates for the active tab
  await updateTabData();
}


chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  if (changeInfo.status === 'complete' && tab.url.startsWith('http')) {
    if (tabData.hasOwnProperty(tabId)) {
      // Update the URL when it changes within the same tab
      tabData[tabId].url = tab.url;
      tabData[tabId].endTime = new Date();
      tabData[tabId].duration += calculateDuration(tabData[tabId].startTime,tabData[tabId].endTime);
    } else {
      // New tab, add it to tabData
      tabData[tabId] = {
        url: tab.url,
        startTime: new Date(),//.toLocaleString(),
        endTime: null,
        duration: 0,
        clickCount: 0,
        clicks: [],
      };

      console.log('New tab:', tabData[tabId]);
    }

    // Start periodic updates for the active tab
    if (tab.active) {
      startPeriodicUpdates(tabId);
    }
  }
});


// Move the code from chrome.tabs.onUpdated to chrome.tabs.onRemoved
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
  if (tabData.hasOwnProperty(tabId)) {
    tabData[tabId].endTime = new Date();//.toLocaleString();
    tabData[tabId].duration += calculateDuration(tabData[tabId].startTime, tabData[tabId].endTime);

    var url = tabData[tabId].url;
    var startTime = tabData[tabId].startTime;
    var endTime = tabData[tabId].endTime;
    var duration = tabData[tabId].duration;
    var clickCount = tabData[tabId].clickCount;
    var clicks = tabData[tabId].clicks;

    storeURL(url,formatDate( startTime),formatDate( endTime), formatDuration(duration), clickCount, clicks);

    delete tabData[tabId];
  }
});

function stopTrackingAndStore(tabId) {
  if (tabData.hasOwnProperty(tabId)) {
    var currentTab = tabData[tabId];
    currentTab.endTime = new Date();//.toLocaleString();
    currentTab.duration += calculateDuration(currentTab.startTime, currentTab.endTime);

    // Append the visit details to the visits array or create a new array if it doesn't exist
    var visit = {
      url: currentTab.url,
      date: new Date(),//.toLocaleDateString(),
      startTime:formatDate( currentTab.startTime),
      endTime:formatDate( currentTab.endTime),
      duration: formatDuration(currentTab.duration),
      clickCount: currentTab.clickCount,
      clicks: currentTab.clicks
    };

    if (!currentTab.visits) {
      currentTab.visits = [];
    }
    currentTab.visits.push(visit);

    // Update the database with the updated "visits" array
    storeURL(
      currentTab.url,
      currentTab.visits
    );

    // Remove the tab data as the tracking for this tab is complete
    delete tabData[tabId];
  }
}

function storeURL(url, startTime, endTime, duration, clickCount, clicks) {
  if (userId) {
    var urlsRef = database.ref('user/' + userId + '/urls');
    var currentDate = new Date().toLocaleDateString();
    var urlDate = url + '_' + currentDate;

    urlsRef
      .orderByChild('url_date')
      .equalTo(urlDate)
      .once('value')
      .then(function(snapshot) {
        if (snapshot.exists()) {
   
            // Update the existing entry for the same URL and date
          snapshot.forEach(function(childSnapshot) {
            var key = childSnapshot.key;
            var visits = childSnapshot.val().visits || [];

            // Find the visit with the same start time
            var visitToUpdate = visits.find(function(visit) {
              return visit.url === url && visit.startTime === startTime;
            });

            if (visitToUpdate) {
              // Update existing visit's endTime and duration
              visitToUpdate.endTime =formatDate( endTime);
              visitToUpdate.duration = formatDuration(duration);


              var formattedStartTime = formatDate(startTime);
             var formattedendTime = formatDate(endTime);
             var formattedDuration = formatDuration(duration);
            } else {
              // Add a new visit entry
              visits.push({
                url: url,
                date: currentDate,
                startTime:formatDate( startTime),
                endTime:formatDate( endTime),
                duration:formatDuration( duration),
                clickCount: clickCount,
                clicks: clicks
              });
            }

            // Update the visits array
            urlsRef.child(key).update({ visits: visits });
          });
        } else {
          // If a record with the same URL and date doesn't exist, create a new record with an array
          urlsRef.push({
            url: url,
            date: currentDate,
            url_date: urlDate,
            visits: [
              {
                url: url,
                date: currentDate,
                startTime: startTime,
                endTime: endTime,
                duration: duration,
                clickCount: clickCount,
                clicks: clicks
              }
            ]
          });
        }
      })
      .catch(function(error) {
        console.error('Error storing URL in Firebase:', error);
      });
  }
}

  


  

function calculateDuration(starTtime, endTime) {
  return endTime - starTtime;
}

function formatDuration(duration) {
  var date = new Date(duration);

  var hours = Math.floor(duration / (1000 * 60 * 60));
  var minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
  var seconds = Math.floor((duration % (1000 * 60)) / 1000);


  return padZero(hours) + ':' + padZero(minutes) + ':' + padZero(seconds);
  
}

function formatDate(startTime) {
  var date = new Date(startTime);
  var year = date.getFullYear();
  var month = String(date.getMonth()+1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  var hours = String(date.getHours()).padStart(2, '0');
  var minutes = String(date.getMinutes()).padStart(2, '0');
  var seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}


function padZero(number) {
  return (number < 10 ? '0' : '') + number;
}


  
  




