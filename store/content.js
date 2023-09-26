// Function to handle the click event
function handleButtonClick(event) {
    const clickedElement = event.target;
  
    // Get the inner text, ID, and class name of the clicked element
    const innerText = clickedElement.innerText;
    const elementId = clickedElement.id;
    const className = clickedElement.className;
  
    // Send the click data to the background script
    chrome.runtime.sendMessage({
      action: 'clickEvent',
      clickedElement: {
        innerText: innerText,
        id: elementId,
        className: className
      }
    });
  }
  
  // Attach the click event listener to the document
  document.addEventListener('click', handleButtonClick);