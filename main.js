const ideaInput = document.getElementById('idea-input');
const canvas = document.getElementById('canvas');
const submitIdeaButton = document.getElementById('submit-idea');

const IDEAS = []; // Array to store all active idea objects
const IDEA_BASE_SPEED = 2; // Base speed for ideas
const IDEA_SIZE = 50; // Approximate size of an idea for collision detection

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
    const ideaDiv = document.createElement('div');
    ideaDiv.classList.add('idea');
    ideaDiv.textContent = text; // Display the text
    
    // Set initial random position
    const x = Math.random() * (canvas.offsetWidth - IDEA_SIZE);
    const y = Math.random() * (canvas.offsetHeight - IDEA_SIZE);
    
    // Set random velocity
    const angle = Math.random() * 2 * Math.PI; // Random angle in radians
    const speed = IDEA_BASE_SPEED + (Math.random() * 2); // Random speed between IDEA_BASE_SPEED and IDEA_BASE_SPEED + 2
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    canvas.appendChild(ideaDiv);

    const ideaObject = {
        div: ideaDiv,
        x: x,
        y: y,
        vx: vx,
        vy: vy
    };
    IDEAS.push(ideaObject);
}

let lastTime = 0; // For calculating deltaTime

function updateIdeaMovement(ideaObject, deltaTime) {
    const ideaDiv = ideaObject.div;
    let { x, y, vx, vy } = ideaObject;

    // Update position
    x += vx * deltaTime * 0.01; // Scale velocity by deltaTime for frame-rate independence
    y += vy * deltaTime * 0.01;

    // Boundary collision detection
    const divWidth = ideaDiv.offsetWidth;
    const divHeight = ideaDiv.offsetHeight;

    // Right boundary
    if (x + divWidth > canvas.offsetWidth) {
        x = canvas.offsetWidth - divWidth;
        vx *= -1; // Reverse horizontal velocity
    }
    // Left boundary
    if (x < 0) {
        x = 0;
        vx *= -1; // Reverse horizontal velocity
    }
    // Bottom boundary
    if (y + divHeight > canvas.offsetHeight) {
        y = canvas.offsetHeight - divHeight;
        vy *= -1; // Reverse vertical velocity
    }
    // Top boundary
    if (y < 0) {
        y = 0;
        vy *= -1; // Reverse vertical velocity
    }

    // Update the ideaObject's properties
    ideaObject.x = x;
    ideaObject.y = y;
    ideaObject.vx = vx;
    ideaObject.vy = vy;

    // Apply updated position to the DOM element
    ideaDiv.style.transform = `translate(${x}px, ${y}px)`;
}

function update(deltaTime) {
    // This function can be extended later to handle different movement modes
    for (let i = 0; i < IDEAS.length; i++) {
        updateIdeaMovement(IDEAS[i], deltaTime);
    }
}

function animate(currentTime) {
    if (!lastTime) lastTime = currentTime;
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    update(deltaTime);
    requestAnimationFrame(animate);
}

// Start the animation loop
requestAnimationFrame(animate);
