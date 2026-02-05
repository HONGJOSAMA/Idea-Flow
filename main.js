const ideaInput = document.getElementById('idea-input');
const canvas = document.getElementById('canvas');
const submitIdeaButton = document.getElementById('submit-idea');

function submitIdeaHandler() {
    const ideaText = ideaInput.value.trim();
    
    if (ideaText !== '') {
        createIdea(ideaText);
        ideaInput.value = '';
    }
}

ideaInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        submitIdeaHandler();
    }
});

submitIdeaButton.addEventListener('click', submitIdeaHandler);

function createIdea(text) {
    const idea = document.createElement('div');
    idea.classList.add('idea');
    idea.textContent = text; // Display the text
    
    // Position the idea randomly for now, or based on some logic if defined later
    idea.style.left = `${Math.random() * (canvas.offsetWidth - 100)}px`;
    idea.style.top = `${Math.random() * (canvas.offsetHeight - 50)}px`;
    
    canvas.appendChild(idea);
    
    // For now, ideas will persist. Remove timeout for general ideas.
    // setTimeout(() => {
    //     idea.remove();
    // }, 2000); 
}
