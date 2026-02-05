import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

const ideaInput = document.getElementById('idea-input');
const canvas = document.getElementById('canvas');
const submitIdeaButton = document.getElementById('submit-idea');
const trashCan = document.getElementById('trash-can'); // Reference to the trash can

let isDragging = false;
let draggedIdea = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// Helper to check if an idea is over the trash can
function isOverTrashCan(ideaDiv, trashCanDiv) {
    const ideaRect = ideaDiv.getBoundingClientRect();
    const trashRect = trashCanDiv.getBoundingClientRect();

    return !(
        ideaRect.right < trashRect.left ||
        ideaRect.left > trashRect.right ||
        ideaRect.bottom < trashRect.top ||
        ideaRect.top > trashRect.bottom
    );
}

function onMouseDown(e) {
    if (e.button !== 0) return; // Only left mouse button

    draggedIdea = IDEAS.find(idea => idea.div === e.target);
    if (!draggedIdea) return;

    isDragging = true;
    draggedIdea.div.style.cursor = 'grabbing';
    draggedIdea.div.style.zIndex = 101; // Bring to front

    // Pause animation for the dragged idea
    draggedIdea.pausedVx = draggedIdea.vx; // Store original vx
    draggedIdea.pausedVy = draggedIdea.vy; // Store original vy
    draggedIdea.vx = 0;
    draggedIdea.vy = 0;

    // Calculate offset
    const rect = draggedIdea.div.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    e.preventDefault(); // Prevent default drag behavior (e.g., image ghosting)
}

function onMouseMove(e) {
    if (!isDragging || !draggedIdea) return;

    // Update position
    draggedIdea.x = e.clientX - dragOffsetX;
    draggedIdea.y = e.clientY - dragOffsetY;
    draggedIdea.div.style.transform = `translate(${draggedIdea.x}px, ${draggedIdea.y}px)`;

    // Check for trash can hover
    if (isOverTrashCan(draggedIdea.div, trashCan)) {
        trashCan.classList.add('trash-can-hover');
    } else {
        trashCan.classList.remove('trash-can-hover');
    }
}

function onMouseUp(e) {
    if (!isDragging || !draggedIdea) return;

    isDragging = false;
    draggedIdea.div.style.cursor = 'grab';
    draggedIdea.div.style.zIndex = ''; // Reset z-index

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    if (isOverTrashCan(draggedIdea.div, trashCan)) {
        // Delete idea from Firebase
        remove(ref(database, `ideas/${draggedIdea.key}`));
    } else {
        // Resume animation
        draggedIdea.vx = draggedIdea.pausedVx;
        draggedIdea.vy = draggedIdea.pausedVy;
    }

    trashCan.classList.remove('trash-can-hover');
    draggedIdea = null;
}

// Firebase Configuration (REPLACE WITH YOUR OWN CONFIG)
const firebaseConfig = {
  apiKey: "AIzaSyA0qJK-HHAQq3gMycw6XhFq12M_Ghch_JY",
  authDomain: "idea-flow-96127.firebaseapp.com",
  databaseURL: "https://idea-flow-96127-default-rtdb.firebaseio.com",
  projectId: "idea-flow-96127",
  storageBucket: "idea-flow-96127.firebasestorage.app",
  messagingSenderId: "943449839762",
  appId: "1:943449839762:web:cda7e64421a213586f2e4b",
  measurementId: "G-1GBYVBG88D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const ideasRef = ref(database, 'ideas'); // Reference to the 'ideas' path in your database

const IDEAS = []; // Array to store all active idea objects
const IDEA_BASE_SPEED = 2; // Base speed for ideas
const IDEA_SIZE = 50; // Approximate size of an idea for collision detection

function renderIdeaFromFirebaseData(ideaData, firebaseKey) {
    const ideaDiv = document.createElement('div');
    ideaDiv.classList.add('idea');
    ideaDiv.textContent = ideaData.text; // Display the text
    ideaDiv.dataset.firebaseKey = firebaseKey; // Store Firebase key on the DOM element
    ideaDiv.style.cursor = 'grab'; // Add grab cursor

    // Generate new random x, y for initial rendering position (as requested)
    const x = Math.random() * (canvas.offsetWidth - ideaDiv.offsetWidth);
    const y = Math.random() * (canvas.offsetHeight - ideaDiv.offsetHeight);
    
    canvas.appendChild(ideaDiv);

    // Attach mousedown listener for dragging
    ideaDiv.addEventListener('mousedown', onMouseDown);

    const ideaObject = {
        div: ideaDiv,
        x: x, // Use newly generated random x
        y: y, // Use newly generated random y
        vx: ideaData.vx, // Use velocity from Firebase
        vy: ideaData.vy, // Use velocity from Firebase
        key: firebaseKey // Store Firebase key in the idea object
    };
    IDEAS.push(ideaObject);
}

// Listen for new ideas added to Firebase
onChildAdded(ideasRef, (snapshot) => {
    const ideaData = snapshot.val();
    const ideaKey = snapshot.key; // Get the unique key generated by Firebase
    renderIdeaFromFirebaseData(ideaData, ideaKey);
});

// Listen for ideas removed from Firebase
onChildRemoved(ideasRef, (snapshot) => {
    const removedKey = snapshot.key;
    const index = IDEAS.findIndex(idea => idea.key === removedKey);
    if (index !== -1) {
        IDEAS[index].div.remove(); // Remove from DOM
        IDEAS.splice(index, 1); // Remove from local array
    }
});

function submitIdeaHandler() {
    const ideaText = ideaInput.value.trim();
    
    if (ideaText !== '') {
        pushIdeaToFirebase(ideaText); // Call the function to push to Firebase
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

function pushIdeaToFirebase(text) {
    // Generate random initial position (these will be stored but re-randomized on render)
    const x = Math.random() * (canvas.offsetWidth - IDEA_SIZE);
    const y = Math.random() * (canvas.offsetHeight - IDEA_SIZE);
    
    // Set random velocity
    const angle = Math.random() * 2 * Math.PI; // Random angle in radians
    const speed = IDEA_BASE_SPEED + (Math.random() * 2); // Random speed between IDEA_BASE_SPEED and IDEA_BASE_SPEED + 2
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    
    const ideaData = {
        text: text,
        x: x, // Stored, but will be re-randomized on render
        y: y, // Stored, but will be re-randomized on render
        vx: vx,
        vy: vy
    };

    push(ideasRef, ideaData); // Push data to Firebase
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
