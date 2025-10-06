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

// Function to highlight input box
function highlightInput(input) {
    // Add highlight styles
    input.style.border = "2px solid #ff6b6b";
    input.style.boxShadow = "0 0 10px rgba(255, 107, 107, 0.3)";
    input.style.backgroundColor = "#fff5f5";
    
    // Focus the input
    input.focus();
    
    // Remove highlight after 2 seconds
    setTimeout(() => {
        input.style.border = "";
        input.style.boxShadow = "";
        input.style.backgroundColor = "";
    }, 2000);
}

// Function to navigate to search results page - SIMPLIFIED VERSION
function navigateToSearchResults(query, input) {
    if (!query || query.trim() === '') {
        highlightInput(input);
        return;
    }
    
    // Only include the search query parameter
    window.location.href = `/search-app-results?q=${encodeURIComponent(query.trim())}`;
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
        const searchBarType = searchConfigDiv ? searchConfigDiv.getAttribute('data-search-bar') : null;
        const selectedCollections = searchConfigDiv ? 
            JSON.parse(searchConfigDiv.getAttribute('data-selected-collections') || '[]') : [];
        const selectedFieldsSearch = searchConfigDiv ? 
            JSON.parse(searchConfigDiv.getAttribute('data-selected-fields-search') || '[]') : [];
        
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

        // === Add result-page div click handler ===
        const resultPageDiv = document.querySelector("#result-page");
        if (resultPageDiv) {
            resultPageDiv.style.cursor = "pointer";
            resultPageDiv.addEventListener("click", () => {
                const currentQuery = input.value.trim();
                navigateToSearchResults(currentQuery, input);
            });
        }

        // === Add search trigger click handlers (same as View All)
        // Use delegated handler to cover late-inserted elements
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            // Support new button id `#search-input` and legacy classes
            const trigger = target.closest('#search-input, .searchIcon-Container, .searchiconcontainer');
            if (trigger) {
                e.preventDefault();
                const latestQuery = input.value.trim();
                navigateToSearchResults(latestQuery, input);
            }
        });
        
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
                border: 1px solid transparent !important; /* base border so focus state is visible */
                text-transform: capitalize !important;
                white-space: normal;
            }

            .searchsuggestionbox .suggestion-item:hover {
                background-color: #f3f8ff; /* lighter hover */
            }
            .searchsuggestionbox .suggestion-item:focus,
            .searchsuggestionbox .suggestion-item[aria-selected="true"] {
                outline: none !important; /* suppress default thin focus line */
                background-color: #eaf2ff !important; /* much lighter active */
                color: #111111 !important; /* readable on light bg */
                border-color: #bcd6ff !important; /* subtle border */
                box-shadow: 0 0 0 2px rgba(13,110,253,0.15) !important; /* softer glow */
            }
            .searchsuggestionbox .suggestion-item:focus-visible {
                outline: none !important;
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
            suggestionBox.setAttribute('role', 'listbox');
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
                            const displayText = toTitleCase(cleanText);
                            const url = `/search-app-results?q=${encodeURIComponent(cleanText)}`;
                            // tabindex makes items reachable via Tab; role for a11y
                            return `<div class="suggestion-item" role="option" tabindex="0" data-url="${url}" data-query="${encodeURIComponent(cleanText)}">${displayText}</div>`;
                        })
                        .join("");

                    const suggestionItems = suggestionBox.querySelectorAll('.suggestion-item');
                    suggestionItems.forEach(item => {
                        item.addEventListener('click', () => {
                            const url = item.getAttribute("data-url");
                            window.location.href = url;
                        });
                        // Allow selecting with Enter/Space when focused
                        item.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                const url = item.getAttribute('data-url');
                                window.location.href = url;
                            }
                        });
                        item.addEventListener('focus', () => {
                            suggestionItems.forEach(i => i.setAttribute('aria-selected', 'false'));
                            item.setAttribute('aria-selected', 'true');
                            item.scrollIntoView({ block: 'nearest' });
                        });
                        item.addEventListener('blur', () => {
                            item.setAttribute('aria-selected', 'false');
                        });
                    });

                    // Keyboard navigation from the input
                    input.addEventListener('keydown', (e) => {
                        if ((e.key === 'ArrowDown' || e.key === 'Tab') && suggestionItems.length > 0) {
                            // Move focus to the first suggestion
                            suggestionItems[0].focus();
                            e.preventDefault();
                        }
                    }, { once: true });
                    
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
                    
                    viewAllLink.addEventListener("click", () => {
                        const latestQuery = input.value.trim();
                        navigateToSearchResults(latestQuery, input);
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

        // Roving focus between suggestion items with ArrowUp/ArrowDown and Tab/Shift+Tab
        suggestionBox.addEventListener('keydown', (e) => {
            const items = Array.from(suggestionBox.querySelectorAll('.suggestion-item'));
            if (items.length === 0) return;

            const currentIndex = items.findIndex(el => el === document.activeElement);
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % items.length;
                items[nextIndex].focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevIndex = (currentIndex - 1 + items.length) % items.length;
                items[prevIndex].focus();
            } else if (e.key === 'Escape') {
                suggestionBox.style.display = 'none';
                input.focus();
            }
        });
    }
});
