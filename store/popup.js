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



document.addEventListener('DOMContentLoaded', function() {
  var submitButton = document.getElementById('submitBtn');
  submitButton.addEventListener('click', submitEmail);
});

function submitEmail() {
  var emailInput = document.getElementById('emailInput');
  var email = emailInput.value;

  console.log('Email to be submitted:', email);

  // Send a message to the background script to store the email and retrieve the userId
  chrome.runtime.sendMessage({ action: 'storeEmail', email: email }, function(response) {
    console.log('Response from background:', response);

    if (response && response.success) {
      // Reset the email input field
      chrome.runtime.sendMessage({ action: 'startTracking' });
      emailInput.value = '';

      // Display a success message to the user
      var successMessage = document.getElementById('successMessage');
      successMessage.textContent = 'Email successfully submitted!';
    } else {
      // Display an error message to the user
      var errorMessage = document.getElementById('errorMessage');
      errorMessage.textContent = 'Error submitting email. Please try again.';
    }
  });
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action === 'getUserInfo') {
    // Retrieve the user ID from the local storage
    var userId = localStorage.getItem('userId');

    // Send the user ID back to the background script
    sendResponse({ userId: userId });
  } else if (message.action === 'setUserInfo') {
    // Store the user ID in the local storage
    localStorage.setItem('userId', message.userId);

    // Send a success response back to the background script
    sendResponse({ success: true });
  }

  // Return true to indicate that the response will be sent asynchronously
  return true;
});


  
  
  


  