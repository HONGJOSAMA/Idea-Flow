import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, onChildRemoved, remove } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-database.js";

const ideaInput = document.getElementById('idea-input');
const canvas = document.getElementById('canvas');
const submitIdeaButton = document.getElementById('submit-idea');
const trashCan = document.getElementById('trash-can'); // Reference to the trash can

let currentMode = 'bounce'; // 'bounce' 또는 'piano'
const modeToggleButton = document.getElementById('mode-toggle');

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

// 아이디어 생성/렌더링 시 스타일 적용 함수
function applyModeStyle(ideaObject) {
    const { div } = ideaObject;
    div.classList.remove('piano-white', 'piano-black');

    if (currentMode === 'piano') {
        // 50% 확률로 흑/백 결정
        const isBlack = Math.random() > 0.5;
        div.classList.add(isBlack ? 'piano-black' : 'piano-white');
        
        // 오른쪽에서 왼쪽으로 흐르도록 속도 고정 (음수 vx)
        ideaObject.vx = -(Math.random() * 2 + 2); 
        ideaObject.vy = 0; // 수평 이동
        ideaObject.y = Math.random() * (canvas.offsetHeight - 100); // 무작위 높이 고정
    } else {
        // 기본 모드로 돌아올 때 속도 재부여
        const angle = Math.random() * 2 * Math.PI;
        const speed = IDEA_BASE_SPEED + (Math.random() * 2);
        ideaObject.vx = Math.cos(angle) * speed;
        ideaObject.vy = Math.sin(angle) * speed;
    }
}

function renderIdeaFromFirebaseData(ideaData, firebaseKey) {    // Prevent duplicate rendering if idea already exists in IDEAS array
    if (IDEAS.some(idea => idea.key === firebaseKey)) {
        return;
    }

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
    applyModeStyle(ideaObject);
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

modeToggleButton.addEventListener('click', () => {
    currentMode = currentMode === 'bounce' ? 'piano' : 'bounce';
    
    if (currentMode === 'piano') {
        modeToggleButton.textContent = 'Piano Mode';
        modeToggleButton.classList.add('active');
    } else {
        modeToggleButton.textContent = 'Flow Mode'; // 버튼 이름 변경
        modeToggleButton.classList.remove('active');
    }
    
    IDEAS.forEach(idea => applyModeStyle(idea));
});

function pushIdeaToFirebase(text) {
    const angle = Math.random() * 2 * Math.PI;
    const speed = IDEA_BASE_SPEED + (Math.random() * 2);
    
    const ideaData = {
        text: text,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed
    };

    push(ideasRef, ideaData); 
    // 여기서 직접 렌더링하지 않습니다. onChildAdded가 대신 처리합니다.
}

let lastTime = 0; // For calculating deltaTime

function updateIdeaMovement(ideaObject, deltaTime) {
    if (isDragging && draggedIdea === ideaObject) return; // 드래그 중엔 물리 연산 중지

    const ideaDiv = ideaObject.div;
    let { x, y, vx, vy } = ideaObject;

    x += vx * deltaTime * 0.01;
    y += vy * deltaTime * 0.01;

    if (currentMode === 'piano') {
        // Piano Mode: 왼쪽 끝으로 사라지면 오른쪽에서 다시 등장
        if (x + ideaDiv.offsetWidth < 0) {
            x = canvas.offsetWidth;
            // 등장할 때 높이를 살짝 변경해 가독성 확보
            y = Math.random() * (canvas.offsetHeight - 100);
        }
    } else {
        // 기존 Bounce Mode 로직 (벽 튕기기)
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
        
        // 위치 보정 (화면 밖 탈출 방지)
        x = Math.max(0, Math.min(x, canvas.offsetWidth - ideaDiv.offsetWidth));
        y = Math.max(0, Math.min(y, canvas.offsetHeight - ideaDiv.offsetHeight));
    }

    ideaObject.x = x;
    ideaObject.y = y;
    ideaObject.vx = vx;
    ideaObject.vy = vy;
    ideaDiv.style.transform = `translate(${x}px, ${y}px)`;
}

// 아이디어 간 충돌 감지 함수
function checkIdeaCollisions() {
    for (let i = 0; i < IDEAS.length; i++) {
        for (let j = i + 1; j < IDEAS.length; j++) {
            const a = IDEAS[i];
            const b = IDEAS[j];

            const rectA = a.div.getBoundingClientRect();
            const rectB = b.div.getBoundingClientRect();

            // 사각형 충돌 판정
            if (rectA.left < rectB.right &&
                rectA.right > rectB.left &&
                rectA.top < rectB.bottom &&
                rectA.bottom > rectB.top) {
                
                // 부딪히면 속도 교환 (튕기는 효과)
                const tempVx = a.vx;
                const tempVy = a.vy;
                a.vx = b.vx;
                a.vy = b.vy;
                b.vx = tempVx;
                b.vy = tempVy;

                // 겹침 방지를 위해 살짝 밀어냄
                a.x += a.vx * 2;
                a.y += a.vy * 2;
            }
        }
    }
}

function update(deltaTime) {
    // This function can be extended later to handle different movement modes
    for (let i = 0; i < IDEAS.length; i++) {
        updateIdeaMovement(IDEAS[i], deltaTime);
    }
    // Bounce 모드일 때만 서로 충돌하게 함
    if (currentMode === 'bounce') {
        checkIdeaCollisions();
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

