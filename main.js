const canvas = document.getElementById('canvas');
const ideaInput = document.getElementById('idea-input');
const submitIdeaButton = document.getElementById('submit-idea');
const modeToggleButton = document.getElementById('mode-toggle');
const trashCan = document.getElementById('trash-can');

let currentMode = 'bounce';
let IDEAS = []; // const 대신 let으로 변경 (초기화 용이성)
const IDEA_BASE_SPEED = 1.5; // 애플스러운 부드러운 속도
let lastTime = 0;

// 1. 로컬 저장소 로직
function saveToLocal() {
    const data = IDEAS.map(i => ({
        text: i.div.textContent,
        x: i.x,
        y: i.y,
        vx: i.vx,
        vy: i.vy,
        modeClass: Array.from(i.div.classList).join(' ')
    }));
    localStorage.setItem('apple_canvas_final_v3', JSON.stringify(data));
}

function loadFromLocal() {
    const saved = localStorage.getItem('apple_canvas_final_v3');
    if (saved) {
        // [중요] 중복 방지: 로드 전 캔버스와 배열을 완전히 비웁니다.
        canvas.innerHTML = ''; 
        IDEAS = []; 
        
        const data = JSON.parse(saved);
        data.forEach(item => {
            createIdeaElement(item.text, item);
        });
    }
}

// 2. 아이디어 생성 함수
function createIdeaElement(text, savedData = null) {
    if (!text) return;

    const ideaDiv = document.createElement('div');
    ideaDiv.classList.add('idea');
    ideaDiv.textContent = text;
    canvas.appendChild(ideaDiv);

    const angle = Math.random() * 2 * Math.PI;
    const speed = IDEA_BASE_SPEED + (Math.random() * 1);

    const ideaObject = {
        div: ideaDiv,
        x: savedData ? savedData.x : Math.random() * (canvas.offsetWidth - 150),
        y: savedData ? savedData.y : Math.random() * (canvas.offsetHeight - 150),
        vx: savedData ? savedData.vx : Math.cos(angle) * speed,
        vy: savedData ? savedData.vy : Math.sin(angle) * speed,
    };
    
    if (savedData && savedData.modeClass) {
        ideaDiv.className = savedData.modeClass;
    } else {
        applyModeStyle(ideaObject);
    }
    
    ideaDiv.addEventListener('mousedown', (e) => onMouseDown(e, ideaObject));
    IDEAS.push(ideaObject);
}

// 3. 드래그 로직 (중복 트리거 방지를 위한 stopPropagation 추가)
let isDragging = false;
let draggedIdea = null;

function onMouseDown(e, ideaObj) {
    if (e.button !== 0) return;
    e.stopPropagation(); // 이벤트 전파 방지

    isDragging = true;
    draggedIdea = ideaObj;
    let lastX = e.clientX;
    let lastY = e.clientY;
    
    draggedIdea.div.style.zIndex = "1000";
    draggedIdea.vx = 0;
    draggedIdea.vy = 0;

    const onMouseMove = (mE) => {
        if (!isDragging || !draggedIdea) return;
        const dx = mE.clientX - lastX;
        const dy = mE.clientY - lastY;
        draggedIdea.x += dx;
        draggedIdea.y += dy;
        draggedIdea.vx = dx * 0.3; 
        draggedIdea.vy = dy * 0.3;
        lastX = mE.clientX;
        lastY = mE.clientY;
        draggedIdea.div.style.transform = `translate(${draggedIdea.x}px, ${draggedIdea.y}px)`;
        
        const overTrash = isOverTrashCan(draggedIdea.div, trashCan);
        trashCan.classList.toggle('trash-can-hover', overTrash);
    };

    const onMouseUp = () => {
        if (draggedIdea) {
            if (isOverTrashCan(draggedIdea.div, trashCan)) {
                draggedIdea.div.remove();
                IDEAS = IDEAS.filter(i => i !== draggedIdea);
                saveToLocal();
            }
            draggedIdea.div.style.zIndex = "1";
        }
        isDragging = false;
        draggedIdea = null;
        trashCan.classList.remove('trash-can-hover');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// 4. 물리 및 경계 처리
function updateIdeaMovement(ideaObject, deltaTime) {
    if (isDragging && draggedIdea === ideaObject) return;
    
    let { x, y, vx, vy, div } = ideaObject;
    x += vx * deltaTime * 0.06; 
    y += vy * deltaTime * 0.06;

    const w = div.offsetWidth;
    const h = div.offsetHeight;

    if (currentMode === 'piano') {
        if (x + w < 0) { x = canvas.offsetWidth; y = Math.random() * (canvas.offsetHeight - h); }
    } else {
        if (x + w > canvas.offsetWidth || x < 0) { vx *= -0.7; x = x < 0 ? 0 : canvas.offsetWidth - w; }
        if (y + h > canvas.offsetHeight || y < 0) { vy *= -0.7; y = y < 0 ? 0 : canvas.offsetHeight - h; }
    }

    ideaObject.x = x; ideaObject.y = y;
    ideaObject.vx = vx; ideaObject.vy = vy;
    div.style.transform = `translate(${x}px, ${y}px)`;
}

// 5. 초기화 및 실행 제어
function isOverTrashCan(div, trash) {
    const r1 = div.getBoundingClientRect(); const r2 = trash.getBoundingClientRect();
    return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
}

function applyModeStyle(idea) {
    idea.div.classList.remove('piano-white', 'piano-black');
    if (currentMode === 'piano') {
        idea.div.classList.add(Math.random() > 0.5 ? 'piano-black' : 'piano-white');
        idea.vx = -(1.5 + Math.random());
        idea.vy = 0;
    } else {
        const angle = Math.random() * 2 * Math.PI;
        idea.vx = Math.cos(angle) * IDEA_BASE_SPEED;
        idea.vy = Math.sin(angle) * IDEA_BASE_SPEED;
    }
}

// [해결책 3] 중복 이벤트 리스너 제거 및 단일화
const submitAction = (e) => {
    e.preventDefault();
    const text = ideaInput.value.trim();
    if (text) {
        createIdeaElement(text);
        ideaInput.value = '';
        saveToLocal();
    }
};

submitIdeaButton.onclick = submitAction;
ideaInput.onkeydown = (e) => { if (e.key === 'Enter') submitAction(e); };

modeToggleButton.onclick = () => {
    currentMode = currentMode === 'bounce' ? 'piano' : 'bounce';
    modeToggleButton.textContent = currentMode === 'piano' ? 'Piano Mode' : 'Flow Mode';
    modeToggleButton.classList.toggle('active', currentMode === 'piano');
    IDEAS.forEach(applyModeStyle);
    saveToLocal();
};

function animate(currentTime) {
    const deltaTime = Math.min(currentTime - lastTime, 100); 
    lastTime = currentTime;
    IDEAS.forEach(i => updateIdeaMovement(i, deltaTime));
    requestAnimationFrame(animate);
}

// 시작
loadFromLocal();
requestAnimationFrame(animate);