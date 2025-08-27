
 // Generate or get visitor ID
async function getOrCreateVisitorId() {
    let visitorId = localStorage.getItem('visitorId');
    if (!visitorId) {
        visitorId = crypto.randomUUID();
        localStorage.setItem('visitorId', visitorId);
    }
    return visitorId;
}

// Check if the token has expired
function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp && payload.exp < Math.floor(Date.now() / 1000);
    } catch (e) {
        return true;
    }
}

// Get or fetch visitor session token
async function getVisitorSessionToken() {
    try {
        const existingToken = localStorage.getItem('visitorSessionToken');
        if (existingToken && !isTokenExpired(existingToken)) {
            console.log("Using existing token from localStorage");
            return existingToken;
        }

        const visitorId = await getOrCreateVisitorId();
        const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];
        console.log("Current Hostname for get visitorId: ", siteName);

        const response = await fetch('https://search-server.long-rain-28bb.workers.dev/api/visitor-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                visitorId,
                userAgent: navigator.userAgent,
                siteName,
            }),
        });

        if (!response.ok) throw new Error('Failed to fetch visitor session token');

        const data = await response.json();
        localStorage.setItem('visitorSessionToken', data.token);
        return data.token;
    } catch (error) {
        console.error('Error getting visitor session token:', error);
        return null;
    }
}

  document.addEventListener('DOMContentLoaded', function () {
    
    if (window.location.pathname === '/search-app-results') return;
    
   
    const input = document.querySelector(".searchformwrapper input[type='text']");
   
 // === Only run suggestion + redirect logic if .searchformwrapper input exists ===
  if (input) {
    

  input.placeholder = "Search here";
  input.style.borderRadius = "8px"; // (your existing style)

    
    const searchConfigDiv = document.querySelector("#search-config");
    
    
   
   


   


    // === Result Type Behavior ===
    
    const searchBarType = searchConfigDiv.getAttribute('data-search-bar');
    const selectedCollections = JSON.parse(searchConfigDiv.getAttribute('data-selected-collections') || '[]');
    const selectedFieldsSearch = JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-search') || '[]');
    
      const collectionsParam = encodeURIComponent(JSON.stringify(selectedCollections));
    const fieldsSearchParam = encodeURIComponent(JSON.stringify(selectedFieldsSearch));

   
    
    // === Search Bar Display Mode ===
    if (searchBarType === "Icon") {
      // Hide form, show icon
      input.style.display = "none";
      const iconContainer = document.querySelector(".searchiconcontainer");
      if (!iconContainer) {
        console.error("'.searchiconcontainer' element not found.");
        return;
      }

      iconContainer.style.cursor = "pointer";
      iconContainer.style.display = ""; // Show icon

      iconContainer.addEventListener("click", () => {
        input.style.display = "";
        iconContainer.style.display = "none";
        input.focus();
      });
    } else {
      // Expanded: show form, hide icon if exists
      input.style.display = "";
      const iconContainer = document.querySelector(".searchiconcontainer");
      if (iconContainer) iconContainer.style.display = "none";
    }

    
    // Inject styles dynamically for suggestions

   function sanitizeText(text) {
  const div = document.createElement("div");
  div.innerHTML = text;
  return div.textContent || div.innerText || "";
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  );
}
   
const style = document.createElement("style");
style.textContent = `
 .searchsuggestionbox {
    position: absolute;
    top: 100%;
    left: 0;
    background: white;
    border: 1px solid #ccc;
    max-height: 200px;
    overflow-y: auto;
    width: 100%;
    display: none;
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  .searchsuggestionbox .suggestion-item {
    padding: 8px;
    cursor: pointer;
    color: black !important;
    font-size: 12px !important;
    font-family: 'Inter', 'Arial', sans-serif !important;
    line-height: 1.4;
    background: white !important;
    border: none !important;
    text-transform: capitalize !important;
    white-space: normal;
  }

  .searchsuggestionbox .suggestion-item:hover {
    background-color: #eee;
  }
  .searchsuggestionbox .view-all-link {
    padding: 10px;
    text-align: center;
    font-weight: bold;
    color: #0073e6 !important;
    cursor: pointer;
    border-top: 1px solid #eee;
    background: #fafafa;
    font-family: Arial, sans-serif !important;
    font-size: 16px !important;
  }
`;
document.head.appendChild(style);


    
    let suggestionBox = document.querySelector(".searchsuggestionbox");

if (!suggestionBox) {
  suggestionBox = document.createElement("div");
  suggestionBox.className = "searchsuggestionbox";
  input.parentNode.style.position = "relative";
  input.parentNode.appendChild(suggestionBox);
}

input.addEventListener("input", async () => {
  const query = input.value.trim();
  if (!query) {
    suggestionBox.style.display = "none";
    suggestionBox.innerHTML = "";
    return;
  }

  

  try {
    const siteName = window.location.hostname.replace(/^www\./, '').split('.')[0];
    const url = `https://search-server.long-rain-28bb.workers.dev/api/suggestions?query=${encodeURIComponent(query)}&siteName=${encodeURIComponent(siteName)}&collections=${collectionsParam}&searchFields=${fieldsSearchParam}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");

    const data = await response.json();

    if (data.suggestions && data.suggestions.length > 0) {
      suggestionBox.style.display = "block";
      suggestionBox.innerHTML = data.suggestions
  .map((s, i) => {
    const cleanText = sanitizeText(s);
    const displayText = toTitleCase(cleanText); // consistent styling
    const url = data.detailUrls?.[i] || `/search-results?q=${encodeURIComponent(cleanText)}`;
    return `<div class="suggestion-item" data-url="${url}">${displayText}</div>`;
  })
  .join("");


      suggestionBox.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
          const url = item.getAttribute("data-url");
          window.location.href = url;
        });
      });
      
    
// "View All" link
const viewAllLink = document.createElement("div");
viewAllLink.className = "view-all-link";
viewAllLink.textContent = "View All";
viewAllLink.style.cssText = `
  padding: 10px;
  text-align: center;
  font-weight: bold;
  color: #0073e6;
  cursor: pointer;
  border-top: 1px solid #eee;
  background: #fafafa;
`;
// viewAllLink.addEventListener("click", () => {
//   window.location.href = `/search-app-results?q=${encodeURIComponent(query)}`;
// });

     viewAllLink.addEventListener("click", () => {
  const latestQuery = input.value.trim();
  window.location.href = `/search-app-results?q=${encodeURIComponent(latestQuery)}`;
});

// Append View All link inside the suggestion box
suggestionBox.appendChild(viewAllLink);
suggestionBox.style.display = "block";


    } else {
      suggestionBox.style.display = "none";
      suggestionBox.innerHTML = "";
    }

  } catch (err) {
    console.error("Failed to fetch suggestions:", err);
    suggestionBox.style.display = "none";
    suggestionBox.innerHTML = "";
  }
});

  }

 
  });

