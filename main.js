const canvas = document.getElementById('canvas');
const ideaInput = document.getElementById('idea-input');
const submitIdeaButton = document.getElementById('submit-idea');
const modeToggleButton = document.getElementById('mode-toggle');
const trashCan = document.getElementById('trash-can');

let currentMode = 'bounce';
let IDEAS = []; // const 대신 let으로 변경 (초기화 용이성)
const IDEA_BASE_SPEED = 2;
let lastTime = 0;

// 1. 로컬 저장소 로직
function saveToLocal() {
    const data = IDEAS.map(i => ({
        text: i.div.textContent,
        x: i.x,
        y: i.y,
        vx: i.vx,
        vy: i.vy,
        modeClass: Array.from(i.div.classList).filter(c => c.startsWith('piano-')).join(' ')
    }));
    localStorage.setItem('apple_ideas_v2', JSON.stringify(data));
}

function loadFromLocal() {
    const saved = localStorage.getItem('apple_ideas_v2');
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
    const ideaDiv = document.createElement('div');
    ideaDiv.classList.add('idea');
    ideaDiv.textContent = text;
    canvas.appendChild(ideaDiv);

    const angle = Math.random() * 2 * Math.PI;
    const speed = IDEA_BASE_SPEED + (Math.random() * 2);

    const ideaObject = {
        div: ideaDiv,
        // savedData가 있으면 정확히 그 위치에, 없으면 랜덤 위치에 생성
        x: savedData ? savedData.x : Math.random() * (canvas.offsetWidth - 150),
        y: savedData ? savedData.y : Math.random() * (canvas.offsetHeight - 150),
        vx: savedData ? savedData.vx : Math.cos(angle) * speed,
        vy: savedData ? savedData.vy : Math.sin(angle) * speed,
    };
    
    // 저장된 스타일 복구
    if (savedData && savedData.modeClass) {
        ideaDiv.className = `idea ${savedData.modeClass}`;
    } else {
        applyModeStyle(ideaObject);
    }
    
    ideaDiv.style.transform = `translate(${ideaObject.x}px, ${ideaObject.y}px)`;
    ideaDiv.addEventListener('mousedown', (e) => onMouseDown(e, ideaObject));
    
    IDEAS.push(ideaObject);
}

// 3. 드래그 로직 (중간 생략 없이 견고하게 유지)
let isDragging = false;
let draggedIdea = null;

function onMouseDown(e, ideaObj) {
    if (e.button !== 0) return;
    isDragging = true;
    draggedIdea = ideaObj;
    let lastMouseX = e.clientX;
    let lastMouseY = e.clientY;
    
    draggedIdea.div.style.cursor = 'grabbing';
    draggedIdea.vx = 0;
    draggedIdea.vy = 0;

    const onMouseMove = (mE) => {
        if (!isDragging || !draggedIdea) return;
        const dx = mE.clientX - lastMouseX;
        const dy = mE.clientY - lastMouseY;
        draggedIdea.x += dx;
        draggedIdea.y += dy;
        draggedIdea.vx = dx * 0.4; // 관성 계수
        draggedIdea.vy = dy * 0.4;
        lastMouseX = mE.clientX;
        lastMouseY = mE.clientY;
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
                IDEAS = IDEAS.filter(i => i !== draggedIdea);
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

// 4. 물리 연산
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
        // 벽 튕기기 로직 (애플 스타일의 부드러운 튕김)
        if (x + div.offsetWidth > canvas.offsetWidth || x < 0) {
            vx *= -0.8; // 반발 계수 적용
            x = x < 0 ? 0 : canvas.offsetWidth - div.offsetWidth;
        }
        if (y + div.offsetHeight > canvas.offsetHeight || y < 0) {
            vy *= -0.8;
            y = y < 0 ? 0 : canvas.offsetHeight - div.offsetHeight;
        }
    }

    ideaObject.x = x; ideaObject.y = y;
    ideaObject.vx = vx; ideaObject.vy = vy;
    div.style.transform = `translate(${x}px, ${y}px)`;
}

// 5. 초기화 및 이벤트
function isOverTrashCan(div, trash) {
    const r1 = div.getBoundingClientRect(); const r2 = trash.getBoundingClientRect();
    return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
}

function applyModeStyle(idea) {
    idea.div.classList.remove('piano-white', 'piano-black');
    if (currentMode === 'piano') {
        idea.div.classList.add(Math.random() > 0.5 ? 'piano-black' : 'piano-white');
        idea.vx = -(Math.random() * 2 + 2);
        idea.vy = 0;
    } else {
        const angle = Math.random() * 2 * Math.PI;
        idea.vx = Math.cos(angle) * 2;
        idea.vy = Math.sin(angle) * 2;
    }
}

modeToggleButton.addEventListener('click', () => {
    currentMode = currentMode === 'bounce' ? 'piano' : 'bounce';
    modeToggleButton.textContent = currentMode === 'piano' ? 'Piano Mode' : 'Flow Mode';
    modeToggleButton.classList.toggle('active', currentMode === 'piano');
    IDEAS.forEach(applyModeStyle);
    saveToLocal();
});

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
    const deltaTime = currentTime - (lastTime || currentTime);
    lastTime = currentTime;
    IDEAS.forEach(i => updateIdeaMovement(i, deltaTime));
    requestAnimationFrame(animate);
}

// 시작
loadFromLocal();
requestAnimationFrame(animate);