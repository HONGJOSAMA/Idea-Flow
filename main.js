const canvas = document.getElementById('canvas');
const ideaInput = document.getElementById('idea-input');
const submitIdeaButton = document.getElementById('submit-idea');
const modeToggleButton = document.getElementById('mode-toggle');
const trashCan = document.getElementById('trash-can');

let currentMode = 'bounce';
const IDEAS = [];
const IDEA_BASE_SPEED = 2;
let lastTime = 0;

// 1. 로컬 저장소 로직 (개인 전용)
function saveToLocal() {
    const data = IDEAS.map(i => ({
        text: i.div.textContent,
        x: i.x,
        y: i.y,
        vx: i.vx,
        vy: i.vy,
        shadowColor: i.div.style.boxShadow.split(' ').pop() // 저장 시 그림자 색상 유지
    }));
    localStorage.setItem('my_private_ideas', JSON.stringify(data));
}

function loadFromLocal() {
    const saved = localStorage.getItem('my_private_ideas');
    if (saved) {
        JSON.parse(saved).forEach(item => {
            // 불러올 때는 이미 저장된 데이터가 있으므로 savedData로 전달
            createIdeaElement(item.text, item);
        });
    }
}

// 2. 아이디어 생성 통합 함수 (중복 차단의 핵심)
function createIdeaElement(text, savedData = null) {
    const ideaDiv = document.createElement('div');
    ideaDiv.classList.add('idea');
    ideaDiv.textContent = text;
    
    // 힙한 랜덤 섀도우 설정
    const colors = ['#00f0ff', '#ff00f5', '#dbff00'];
    const color = savedData?.shadowColor || colors[Math.floor(Math.random() * colors.length)];
    ideaDiv.style.boxShadow = `5px 5px 0px ${color}`;
    
    canvas.appendChild(ideaDiv);

    // 속도 및 위치 설정 (저장된 데이터가 있으면 그것을 우선 사용)
    const angle = Math.random() * 2 * Math.PI;
    const speed = IDEA_BASE_SPEED + (Math.random() * 2);

    const ideaObject = {
        div: ideaDiv,
        x: savedData ? savedData.x : Math.random() * (canvas.offsetWidth - 150),
        y: savedData ? savedData.y : Math.random() * (canvas.offsetHeight - 150),
        vx: savedData ? savedData.vx : Math.cos(angle) * speed,
        vy: savedData ? savedData.vy : Math.sin(angle) * speed,
        lastMouseX: 0,
        lastMouseY: 0
    };

    ideaDiv.addEventListener('mousedown', (e) => onMouseDown(e, ideaObject));
    IDEAS.push(ideaObject);

    // 저장된 데이터가 없을 때만 모드 스타일을 적용 (새로 생성하는 경우)
    if (!savedData) {
        applyModeStyle(ideaObject);
    } else {
        // 불러온 데이터는 즉시 위치 반영
        ideaDiv.style.transform = `translate(${ideaObject.x}px, ${ideaObject.y}px)`;
    }
}

// 3. 드래그 및 관성 물리
let isDragging = false;
let draggedIdea = null;

function onMouseDown(e, ideaObj) {
    if (e.button !== 0) return;
    isDragging = true;
    draggedIdea = ideaObj;
    draggedIdea.lastMouseX = e.clientX;
    draggedIdea.lastMouseY = e.clientY;
    draggedIdea.div.style.cursor = 'grabbing';
    draggedIdea.vx = 0;
    draggedIdea.vy = 0;

    const onMouseMove = (mE) => {
        if (!isDragging || !draggedIdea) return;
        const dx = mE.clientX - draggedIdea.lastMouseX;
        const dy = mE.clientY - draggedIdea.lastMouseY;
        draggedIdea.x += dx;
        draggedIdea.y += dy;
        draggedIdea.vx = dx * 0.5; // 던지는 힘 조절
        draggedIdea.vy = dy * 0.5;
        draggedIdea.lastMouseX = mE.clientX;
        draggedIdea.lastMouseY = mE.clientY;
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
            saveToLocal();
        }
        trashCan.classList.remove('trash-can-hover');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        draggedIdea = null;
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// 4. 벽 충돌 및 서로 충돌 로직
function updateIdeaMovement(ideaObject, deltaTime) {
    if (isDragging && draggedIdea === ideaObject) return;
    let { x, y, vx, vy, div } = ideaObject;
    x += vx * deltaTime * 0.01;
    y += vy * deltaTime * 0.01;

    if (currentMode === 'piano') {
        if (x + div.offsetWidth < 0) {
            x = canvas.offsetWidth;
            y = Math.random() * (canvas.offsetHeight - 100);
        }
    } else {
        if (x + div.offsetWidth > canvas.offsetWidth || x < 0) vx *= -1;
        if (y + div.offsetHeight > canvas.offsetHeight || y < 0) vy *= -1;
    }

    ideaObject.x = x; ideaObject.y = y;
    ideaObject.vx = vx; ideaObject.vy = vy;
    div.style.transform = `translate(${x}px, ${y}px)`;
}

function checkIdeaCollisions() {
    for (let i = 0; i < IDEAS.length; i++) {
        for (let j = i + 1; j < IDEAS.length; j++) {
            const a = IDEAS[i]; const b = IDEAS[j];
            const rA = a.div.getBoundingClientRect(); const rB = b.div.getBoundingClientRect();

            if (rA.left < rB.right && rA.right > rB.left && rA.top < rB.bottom && rA.bottom > rB.top) {
                [a.vx, b.vx] = [b.vx * 1.1, a.vx * 1.1]; // 튕길 때 살짝 가속 (힙한 느낌)
                [a.vy, b.vy] = [b.vy * 1.1, a.vy * 1.1];
                a.x += a.vx; a.y += a.vy; // 겹침 방지
            }
        }
    }
}

// 5. 초기화 및 이벤트 리스너
function isOverTrashCan(div, trash) {
    const r1 = div.getBoundingClientRect(); const r2 = trash.getBoundingClientRect();
    return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
}

function applyModeStyle(idea) {
    idea.div.classList.remove('piano-white', 'piano-black');
    if (currentMode === 'piano') {
        idea.div.classList.add(Math.random() > 0.5 ? 'piano-black' : 'piano-white');
        idea.vx = -(Math.random() * 2 + 3); idea.vy = 0;
    } else {
        const angle = Math.random() * 2 * Math.PI;
        idea.vx = Math.cos(angle) * 3; idea.vy = Math.sin(angle) * 3;
    }
}

modeToggleButton.addEventListener('click', () => {
    currentMode = currentMode === 'bounce' ? 'piano' : 'bounce';
    modeToggleButton.textContent = currentMode === 'piano' ? 'Piano Mode' : 'Flow Mode';
    modeToggleButton.classList.toggle('active', currentMode === 'piano');
    IDEAS.forEach(applyModeStyle);
    saveToLocal();
});

// 입력 핸들러 통합 (중복 실행 방지)
function submitAction() {
    const text = ideaInput.value.trim();
    if (text) {
        createIdeaElement(text);
        ideaInput.value = '';
        saveToLocal();
    }
}

submitIdeaButton.addEventListener('click', submitAction);
ideaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        submitAction();
    }
});

function animate(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    IDEAS.forEach(i => updateIdeaMovement(i, deltaTime));
    if (currentMode === 'bounce') checkIdeaCollisions();
    requestAnimationFrame(animate);
}

loadFromLocal();
requestAnimationFrame(animate);