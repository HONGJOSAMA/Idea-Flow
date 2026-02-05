const ideaInput = document.getElementById('idea-input');
const canvas = document.getElementById('canvas');

ideaInput.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const direction = ideaInput.value.toLowerCase().trim();
        
        if (['up', 'down', 'left', 'right'].includes(direction)) {
            createIdea(direction);
            ideaInput.value = '';
        }
    }
});

function createIdea(direction) {
    const idea = document.createElement('div');
    idea.classList.add('idea');
    idea.classList.add(`move-${direction}`);
    
    canvas.appendChild(idea);
    
    setTimeout(() => {
        idea.remove();
    }, 2000); // Remove the element after the animation completes (2s)
}
