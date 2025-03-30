document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    const modelSelectBtn = document.getElementById('modelSelectBtn');
    const selectedModelNameSpan = document.getElementById('selectedModelName');
    const modelDropdownList = document.getElementById('modelDropdownList');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const messageInput = document.getElementById('messageInput');
    const voiceBtn = document.getElementById('voiceBtn');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessagesContainer = document.getElementById('chatMessages');
    const mainContent = document.getElementById('mainContent');
    const speechStatus = document.getElementById('speechStatus');

    // --- State Variables ---
    let currentModel = null;
    let isListening = false;
    let lastBotResponseText = ''; // **** Store last bot response text ****

    // --- Web Speech API Setup ---
    // (Speech Recognition setup remains the same as previous version)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false; recognition.lang = 'en-US';
        recognition.interimResults = false; recognition.maxAlternatives = 1;
        recognition.onresult = (event) => { const transcript = event.results[event.results.length - 1][0].transcript.trim(); messageInput.value = transcript; updateSpeechStatus(''); handleSendMessage(); };
        recognition.onerror = (event) => { console.error('Speech recognition error:', event.error, event.message); let errorMessage = `Speech Error: ${event.error}`; if (event.error === 'not-allowed' || event.error === 'service-not-allowed') { errorMessage = 'Microphone access denied. Please allow permissions.'; } else if (event.error === 'no-speech') { errorMessage = 'No speech detected. Please try again.'; } else if (event.error === 'network') { errorMessage = 'Network error during speech recognition.'; } else { errorMessage = `Speech Error: ${event.error}. ${event.message || ''}`; } updateSpeechStatus(errorMessage); };
        recognition.onstart = () => { isListening = true; voiceBtn.classList.add('listening'); updateSpeechStatus('Listening...'); };
        recognition.onend = () => { isListening = false; voiceBtn.classList.remove('listening'); if (speechStatus.textContent === 'Listening...') updateSpeechStatus(''); };
    } else { console.warn('Speech Recognition API not supported.'); voiceBtn.disabled = true; voiceBtn.title = "Speech not supported"; }


    // --- Event Listeners ---
    // (Event listeners remain the same as previous version)
    modelSelectBtn.addEventListener('click', (event) => { event.stopPropagation(); modelDropdownList.classList.toggle('show'); });
    document.addEventListener('click', (event) => { if (!modelSelectBtn.contains(event.target) && !modelDropdownList.contains(event.target)) modelDropdownList.classList.remove('show'); });
    themeToggleBtn.addEventListener('click', () => { document.body.classList.toggle('dark-mode'); const icon = themeToggleBtn.querySelector('i'); if (document.body.classList.contains('dark-mode')) { icon.classList.remove('fa-moon'); icon.classList.add('fa-sun'); } else { icon.classList.remove('fa-sun'); icon.classList.add('fa-moon'); } });
    sendBtn.addEventListener('click', handleSendMessage);
    messageInput.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSendMessage(); } });
    voiceBtn.addEventListener('click', () => { if (!SpeechRecognition) { updateSpeechStatus('Speech not supported.'); return; } if (isListening) { recognition.stop(); } else { if (!currentModel) { alert("Select model first."); updateSpeechStatus('Select model.'); return; } try { updateSpeechStatus(''); recognition.start(); } catch (error) { console.error("Error starting speech:", error); if (error.name === 'NotAllowedError') { updateSpeechStatus('Mic access denied.'); } else { updateSpeechStatus('Could not start mic.'); } } } });

    // --- Core Functions ---

    function handleSendMessage() {
        const messageText = messageInput.value.trim();
        if (!currentModel) { alert("Select model first."); return; }
        if (!messageText) { console.log('Empty message.'); return; }
        addMessageToChat('user', messageText);
        messageInput.value = '';
        // Call API - it will now use the stored lastBotResponseText for context
        callChatApi(currentModel, messageText);
    }

    async function fetchModels() {
        // (fetch logic remains the same)
        const apiUrl = 'http://127.0.0.1:5000/models';
        modelDropdownList.innerHTML = '<div class="dropdown-loading">Loading models...</div>';
        modelDropdownList.classList.remove('show');
        try { const response = await fetch(apiUrl); if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); const data = await response.json(); if (data && Array.isArray(data.models)) { populateModelDropdown(data.models); } else { throw new Error('Invalid data format received.'); } }
        catch (error) { console.error('Error fetching models:', error); modelDropdownList.innerHTML = `<div class="dropdown-error">Failed to load. ${error.message}</div>`; }
    }

    function populateModelDropdown(models) {
        // (populate logic remains the same, including default selection)
        modelDropdownList.innerHTML = ''; if (models.length === 0) { modelDropdownList.innerHTML = '<div class="dropdown-loading">No models found.</div>'; return; }
        models.forEach(modelName => { const item = document.createElement('button'); item.textContent = modelName; item.title = modelName; item.addEventListener('click', () => { selectedModelNameSpan.textContent = modelName; selectedModelNameSpan.title = modelName; currentModel = modelName; modelDropdownList.classList.remove('show'); lastBotResponseText = ''; /* Clear context on model change */ console.log('Model selected:', currentModel); }); modelDropdownList.appendChild(item); });
        if(models.length > 0 && !currentModel){ selectedModelNameSpan.textContent = models[0]; selectedModelNameSpan.title = models[0]; currentModel = models[0]; console.log('Default model selected:', currentModel); }
    }

    async function callChatApi(model, userInput) {
        const apiUrl = 'http://127.0.0.1:5000/chat';
        const loadingMessageId = addMessageToChat('bot', 'Thinking', true);

        // Prepare request body with context
        const requestBody = {
            model: model,
            user_input: userInput,
            context: lastBotResponseText || '' // Use stored context or empty string
        };
        console.log("Sending to API:", requestBody); // Log the request body for debugging

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify(requestBody) // Send the updated body
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API Error: ${response.status} - ${errorText || response.statusText}`);
            }

            const data = await response.json();

            // **** Store the successful response text for next context ****
            lastBotResponseText = data.response || '';

            // Update the UI
            updateBotMessage(loadingMessageId, data.response, data.latency);

        } catch (error) {
            console.error('Error calling chat API:', error);
            // Don't update lastBotResponseText on error
            updateBotMessage(loadingMessageId, `Error: ${error.message || 'Could not get response.'}`, null, true);
        }
    }

    function addMessageToChat(sender, text, isLoading = false) {
        // (addMessageToChat logic remains the same)
        const messageId = `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`; const messageDiv = document.createElement('div'); messageDiv.id = messageId; messageDiv.classList.add('chat-message', `${sender}-message`); if (isLoading) messageDiv.classList.add('loading-message'); const contentDiv = document.createElement('div'); contentDiv.classList.add('message-content'); if (sender === 'bot' && !isLoading) { const pre = document.createElement('pre'); pre.textContent = text; contentDiv.appendChild(pre); } else { contentDiv.textContent = text; } messageDiv.appendChild(contentDiv); chatMessagesContainer.appendChild(messageDiv); scrollMessageIntoView(messageDiv); return messageId;
    }

    function updateBotMessage(messageId, text, latency, isError = false) {
         // (updateBotMessage logic remains the same)
         const messageDiv = document.getElementById(messageId); if (!messageDiv) return; messageDiv.classList.remove('loading-message'); const contentDiv = messageDiv.querySelector('.message-content'); if (!contentDiv) return; contentDiv.innerHTML = ''; if (isError) { messageDiv.classList.add('error-message'); contentDiv.textContent = text; } else { const pre = document.createElement('pre'); pre.textContent = text; contentDiv.appendChild(pre); if (latency) { const latencySpan = document.createElement('span'); latencySpan.classList.add('message-latency'); latencySpan.textContent = `(Latency: ${latency})`; messageDiv.appendChild(latencySpan); } } scrollMessageIntoView(messageDiv);
    }

    function scrollMessageIntoView(element) {
        // (scrollMessageIntoView logic remains the same)
        if (element && typeof element.scrollIntoView === 'function') { setTimeout(() => { element.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 0); } else { console.warn("Could not scroll element into view:", element); scrollToBottom(); }
    }
    function scrollToBottom() { mainContent.scrollTop = mainContent.scrollHeight; } // Fallback
    function updateSpeechStatus(message) { speechStatus.textContent = message; }

    // --- Initial Actions ---
    fetchModels();

});