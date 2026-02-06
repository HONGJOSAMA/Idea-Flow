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
        // 현재 모드 스타일을 저장하여 불러올 때 유지되도록 함
        currentModeClass: Array.from(i.div.classList).filter(c => c.startsWith('piano-')).join(' ')
    }));
    localStorage.setItem('my_private_ideas', JSON.stringify(data));
}

function loadFromLocal() {
    const saved = localStorage.getItem('my_private_ideas');
    if (saved) {
        JSON.parse(saved).forEach(item => {
            // 불러올 때는 savedData를 전달하여 기본 속도/위치 사용
            createIdeaElement(item.text, item);
        });
    }
}

// 2. 아이디어 생성 통합 함수 (중복 차단의 핵심 개선)
function createIdeaElement(text, savedData = null) {
    // 이미 생성된 아이디어인지 확인 (동일한 텍스트로)
    // 이 로직은 `loadFromLocal`에서 중복 방지에 필요하지만,
    // input 처리 시에는 중복 입력 방지를 위한 `trim()`과 `if (text)`로 충분함.
    // 여기서는 `savedData`가 있는 경우에만 중복 체크하여 로드 시 문제가 없도록 함.
    if (savedData && IDEAS.some(idea => idea.x === savedData.x && idea.y === savedData.y && idea.div.textContent === text)) {
        return; // 이미 존재하는 아이디어는 다시 생성하지 않음
    }


    const ideaDiv = document.createElement('div');
    ideaDiv.classList.add('idea');
    ideaDiv.textContent = text;
    canvas.appendChild(ideaDiv);

    const angle = Math.random() * 2 * Math.PI;
    const speed = IDEA_BASE_SPEED + (Math.random() * 2);

    const ideaObject = {
        div: ideaDiv,
        // 저장된 데이터가 있으면 해당 위치/속도 사용, 없으면 랜덤 생성
        x: savedData?.x ?? Math.random() * (canvas.offsetWidth - 150),
        y: savedData?.y ?? Math.random() * (canvas.offsetHeight - 150),
        vx: savedData?.vx ?? Math.cos(angle) * speed,
        vy: savedData?.vy ?? Math.sin(angle) * speed,
        lastMouseX: 0,
        lastMouseY: 0
    };
    
    // 불러온 데이터에 저장된 모드 클래스가 있다면 적용
    if (savedData?.currentModeClass) {
        savedData.currentModeClass.split(' ').forEach(cls => {
            if (cls) ideaDiv.classList.add(cls);
        });
    } else {
        // 새로 생성된 아이디어에만 현재 모드 스타일 적용
        applyModeStyle(ideaObject);
    }
    
    // 초기 위치 적용
    ideaDiv.style.transform = `translate(${ideaObject.x}px, ${ideaObject.y}px)`;

    ideaDiv.addEventListener('mousedown', (e) => onMouseDown(e, ideaObject));
    IDEAS.push(ideaObject);
}

// 3. 드래그 및 관성 물리 (이전 코드와 동일, 잘 작동하므로 유지)
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
        draggedIdea.vx = dx * 0.5;
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

// 4. 벽 충돌 및 서로 충돌 로직 (이전 코드와 동일, 잘 작동하므로 유지)
function updateIdeaMovement(ideaObject, deltaTime) {
    if (isDragging && draggedIdea === ideaObject) return;
    let { x, y, vx, vy, div } = ideaObject;
    x += vx * deltaTime * 0.01;
    y += vy * deltaTime * 0.01;

    // 화면 밖으로 나가지 않도록 경계 조건 강화 (넉넉하게 설정)
    const padding = 10; // 벽에서 살짝 안쪽으로 튕기게
    const minX = -div.offsetWidth / 2; // 아이디어 절반까지는 나갈 수 있도록
    const maxX = canvas.offsetWidth - div.offsetWidth / 2;
    const minY = 0;
    const maxY = canvas.offsetHeight - div.offsetHeight;

    if (currentMode === 'piano') {
        if (x + div.offsetWidth < 0) {
            x = canvas.offsetWidth;
            y = Math.random() * (canvas.offsetHeight - 100);
        }
    } else {
        if (x + div.offsetWidth > canvas.offsetWidth - padding || x < padding) vx *= -1;
        if (y + div.offsetHeight > canvas.offsetHeight - padding || y < padding) vy *= -1;

        // 경계 보정
        x = Math.max(minX, Math.min(x, maxX));
        y = Math.max(minY, Math.min(y, maxY));
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
                // 충돌 시 속도 교환 (좀 더 부드럽게)
                const tempVx = a.vx; const tempVy = a.vy;
                a.vx = b.vx * 0.9; b.vx = tempVx * 0.9; // 속도 약간 감소
                a.vy = b.vy * 0.9; b.vy = tempVy * 0.9;

                // 겹침 방지를 위해 즉시 밀어냄
                const overlapX = Math.min(rA.right - rB.left, rB.right - rA.left);
                const overlapY = Math.min(rA.bottom - rB.top, rB.bottom - rA.top);

                if (overlapX < overlapY) { // X축으로 겹침
                    if (rA.left < rB.left) a.x -= overlapX / 2;
                    else b.x -= overlapX / 2;
                } else { // Y축으로 겹침
                    if (rA.top < rB.top) a.y -= overlapY / 2;
                    else b.y -= overlapY / 2;
                }
            }
        }
    }
}

// 5. 유틸리티 및 초기화
function isOverTrashCan(div, trash) {
    const r1 = div.getBoundingClientRect(); const r2 = trash.getBoundingClientRect();
    return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
}

function applyModeStyle(idea) {
    idea.div.classList.remove('piano-white', 'piano-black');
    if (currentMode === 'piano') {
        idea.div.classList.add(Math.random() > 0.5 ? 'piano-black' : 'piano-white');
        idea.vx = -(Math.random() * 2 + 2); // Piano Mode 속도 조정
        idea.vy = 0;
    } else {
        const angle = Math.random() * 2 * Math.PI;
        idea.vx = Math.cos(angle) * (IDEA_BASE_SPEED + Math.random() * 1);
        idea.vy = Math.sin(angle) * (IDEA_BASE_SPEED + Math.random() * 1);
    }
}

modeToggleButton.addEventListener('click', () => {
    currentMode = currentMode === 'bounce' ? 'piano' : 'bounce';
    modeToggleButton.textContent = currentMode === 'piano' ? 'Piano Mode' : 'Flow Mode';
    modeToggleButton.classList.toggle('active', currentMode === 'piano');
    
    IDEAS.forEach(idea => {
        applyModeStyle(idea); // 모드 변경 시 기존 아이디어에도 스타일 적용
    });
    saveToLocal(); // 모드 변경사항 저장
});

// 입력 핸들러 통합 (중복 실행 방지)
function submitAction() {
    const text = ideaInput.value.trim();
    if (text) {
        createIdeaElement(text);
        ideaInput.value = ''; // 입력창 비우기
        saveToLocal();
    }
}

submitIdeaButton.addEventListener('click', submitAction);
ideaInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // 기본 폼 제출 동작 방지
        submitAction();
    }
});


function animate(currentTime) {
    if (!lastTime) lastTime = currentTime;
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    IDEAS.forEach(i => updateIdeaMovement(i, deltaTime));
    if (currentMode === 'bounce') checkIdeaCollisions();
    
    requestAnimationFrame(animate);
}

// 애플리케이션 시작 시
loadFromLocal();
requestAnimationFrame(animate);