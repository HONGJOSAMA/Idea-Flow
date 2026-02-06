const ideaInput = document.getElementById('idea-input');
const canvas = document.getElementById('canvas');
const submitIdeaButton = document.getElementById('submit-idea');
const modeToggleButton = document.getElementById('mode-toggle');
const trashCan = document.getElementById('trash-can');

let currentMode = 'bounce';
const IDEAS = [];
const IDEA_BASE_SPEED = 2;

// --- 로컬 저장소 로직 ---
function saveToLocal() {
    const data = IDEAS.map(i => ({
        text: i.div.textContent,
        x: i.x,
        y: i.y,
        vx: i.vx,
        vy: i.vy,
        modeClass: Array.from(i.div.classList).filter(c => c !== 'idea').join(' ') // 'idea' 클래스 제외
    }));
    localStorage.setItem('my_private_ideas', JSON.stringify(data));
}

function loadFromLocal() {
    const saved = localStorage.getItem('my_private_ideas');
    if (saved) {
        const data = JSON.parse(saved);
        data.forEach(item => createIdeaElement(item.text, item));
    }
}

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

// --- 아이디어 생성 로직 (중복 방지를 위해 통합) ---
function createIdeaElement(text, savedData = null) {
    const ideaDiv = document.createElement('div');
    ideaDiv.classList.add('idea');
    ideaDiv.textContent = text;
    canvas.appendChild(ideaDiv);

    const angle = Math.random() * 2 * Math.PI;
    const speed = IDEA_BASE_SPEED + (Math.random() * 2);

    const ideaObject = {
        div: ideaDiv,
        x: savedData && savedData.x !== undefined ? savedData.x : Math.random() * (canvas.offsetWidth - 100),
        y: savedData && savedData.y !== undefined ? savedData.y : Math.random() * (canvas.offsetHeight - 100),
        vx: savedData && savedData.vx !== undefined ? savedData.vx : Math.cos(angle) * speed,
        vy: savedData && savedData.vy !== undefined ? savedData.vy : Math.sin(angle) * speed,
        lastMouseX: 0,
        lastMouseY: 0
    };

    if (savedData && savedData.modeClass) {
        savedData.modeClass.split(' ').forEach(cls => {
            if (cls) ideaDiv.classList.add(cls);
        });
    }

    ideaDiv.addEventListener('mousedown', (e) => onMouseDown(e, ideaObject));
    IDEAS.push(ideaObject);
    applyModeStyle(ideaObject);
}

// --- 드래그 로직 (관성 추가) ---
let isDragging = false;
let draggedIdea = null;

function onMouseDown(e, ideaObj) {
    if (e.button !== 0) return;
    isDragging = true;
    draggedIdea = ideaObj;
    
    // 드래그 시작 시 위치 기록
    draggedIdea.lastMouseX = e.clientX;
    draggedIdea.lastMouseY = e.clientY;
    
    draggedIdea.div.style.cursor = 'grabbing';
    // 드래그 시작 시 속도 0으로 초기화
    draggedIdea.vx = 0;
    draggedIdea.vy = 0;

    const onMouseMove = (moveEvent) => {
        if (!isDragging || !draggedIdea) return;
        
        // 마우스 이동 속도 계산 (마지막 위치와 현재 위치의 차이)
        const dx = moveEvent.clientX - draggedIdea.lastMouseX;
        const dy = moveEvent.clientY - draggedIdea.lastMouseY;
        
        draggedIdea.x += dx;
        draggedIdea.y += dy;
        
        // 관성을 위해 현재 이동량을 속도로 비축
        draggedIdea.vx = dx * 0.5; 
        draggedIdea.vy = dy * 0.5;

        draggedIdea.lastMouseX = moveEvent.clientX;
        draggedIdea.lastMouseY = moveEvent.clientY;
        
        draggedIdea.div.style.transform = `translate(${draggedIdea.x}px, ${draggedIdea.y}px)`;
        
        if (isOverTrashCan(draggedIdea.div, trashCan)) trashCan.classList.add('trash-can-hover');
        else trashCan.classList.remove('trash-can-hover');
    };

    const onMouseUp = () => {
        isDragging = false;
        if (draggedIdea) {
            draggedIdea.div.style.cursor = 'grab';
            if (isOverTrashCan(draggedIdea.div, trashCan)) {
                draggedIdea.div.remove();
                IDEAS.splice(IDEAS.indexOf(draggedIdea), 1);
            }
            saveToLocal(); // 변경사항 저장
        }
        trashCan.classList.remove('trash-can-hover');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        draggedIdea = null;
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault(); // 기본 드래그 동작 방지
}

// --- 기존 핸들러 수정 ---
function submitIdeaHandler() {
    const text = ideaInput.value.trim();
    if (text) {
        createIdeaElement(text); // 로컬에서 즉시 생성 (Firebase push 제거)
        ideaInput.value = '';
        saveToLocal(); // 변경사항 저장
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
    saveToLocal(); // 모드 변경 시에도 저장
});

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

loadFromLocal();

// Start the animation loop
requestAnimationFrame(animate);

