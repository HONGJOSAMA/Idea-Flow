const canvas = document.getElementById('canvas');
const ideaInput = document.getElementById('idea-input');
const submitIdeaButton = document.getElementById('submit-idea');
const modeToggleButton = document.getElementById('mode-toggle');
const trashCan = document.getElementById('trash-can');

let currentMode = 'bounce';
let IDEAS = []; // const 대신 let으로 변경 (초기화 용이성)
const IDEA_BASE_SPEED = 1.5; // 애플스러운 부드러운 속도
let lastTime = 0;

let isComposing = false; // IME 구성 상태 추적

// 1. 로컬 저장소 로직
function saveToLocal() {
    const data = IDEAS.map(i => ({
        text: i.div.textContent,
        x: i.x,
        y: i.y,
        vx: i.vx,
        vy: i.vy,
        modeClass: Array.from(i.div.classList).join(' '),
        fontSize: i.div.style.fontSize || null // 글자 크기 저장
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
    
    // 글자 크기 로드
    if (savedData && savedData.fontSize) {
        ideaDiv.style.fontSize = savedData.fontSize;
    }

    ideaDiv.addEventListener('mousedown', (e) => onMouseDown(e, ideaObject));
    IDEAS.push(ideaObject);
}

// 3. 드래그 로직 (중복 트리거 방지를 위한 stopPropagation 추가)
let isDragging = false;
let draggedIdea = null;

function onMouseDown(e, ideaObj) {
    if (e.button !== 0) return;

    // ✅ 선택 처리 (드래그보다 먼저)
    if (selectedIdea && selectedIdea !== ideaObj) {
        selectedIdea.div.classList.remove('selected');
    }

    selectedIdea = ideaObj;
    ideaObj.div.classList.add('selected');

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
        // ⬅️ 왼쪽으로 완전히 벗어나면
        if (x + w < 0) {
            // 👉 오른쪽 완전 바깥으로 이동 (화면 밖에서 텔레포트)
            x = canvas.offsetWidth + w + 50; // ✅ 요소 너비 + 여유 공간
            // 🎲 Y 위치도 랜덤하게 변경
            y = Math.random() * (canvas.offsetHeight - h);

            // 🎨 색상도 랜덤하게 재설정
            div.classList.remove('piano-white', 'piano-black');
            div.classList.add(
                Math.random() > 0.5 ? 'piano-black' : 'piano-white'
            );
        }
        
        // 🔝🔽 위아래 경계 처리 (바운스 없이 고정)
        if (y < 0) {
            y = 0;
            vy = 0; // ✅ 바운스 제거
        }
        if (y + h > canvas.offsetHeight) {
            y = canvas.offsetHeight - h;
            vy = 0; // ✅ 바운스 제거
        }
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
        // 🎨 랜덤 흑 / 백
        idea.div.classList.add(
            Math.random() > 0.5 ? 'piano-black' : 'piano-white'
        );

        // 📍 오른쪽 바깥에서 시작
        idea.x = canvas.offsetWidth + idea.div.offsetWidth;
        idea.y = Math.random() * (canvas.offsetHeight - idea.div.offsetHeight); // Corrected this line
        
        // ⬅️ 왼쪽으로 일정 속도로 이동
        idea.vx = -(1.2 + Math.random() * 0.8);
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

ideaInput.addEventListener('compositionstart', () => {
    isComposing = true;
});

ideaInput.addEventListener('compositionend', () => {
    isComposing = false;
});

ideaInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' && !isComposing) {
        submitAction(e);
    }
});

modeToggleButton.onclick = () => {
    currentMode = currentMode === 'bounce' ? 'piano' : 'bounce';
    modeToggleButton.textContent = currentMode === 'piano' ? 'Piano Mode' : 'Flow Mode';
    modeToggleButton.classList.toggle('active', currentMode === 'piano');
    IDEAS.forEach(applyModeStyle);
    saveToLocal();
};

const resetButton = document.getElementById('reset-all');

resetButton.onclick = () => {
    // 모든 아이디어 제거
    IDEAS.forEach(i => i.div.remove());
    IDEAS = [];

    // 선택 상태 초기화
    if (selectedIdea) {
        selectedIdea.div.classList.remove('selected');
        selectedIdea = null;
    }

    // 로컬 스토리지 초기화
    localStorage.removeItem('apple_canvas_final_v3');
    saveToLocal(); // 빈 상태를 저장
};

/* ===============================
   Word 스타일 글자 크기 조절
================================ */

// 선택된 아이디어 상태
let selectedIdea = null;

// 아이디어 클릭 → 선택
function attachSelectionHandler(ideaObject) {
    ideaObject.div.addEventListener('click', (e) => {
        e.stopPropagation();

        if (selectedIdea) {
            selectedIdea.div.classList.remove('selected');
        }

        selectedIdea = ideaObject;
        ideaObject.div.classList.add('selected');
    });
}

// 캔버스 클릭 → 선택 해제
canvas.addEventListener('mousedown', () => {
    if (selectedIdea) {
        selectedIdea.div.classList.remove('selected');
        selectedIdea = null;
    }
});

// 글자 크기 버튼
const biggerBtn = document.getElementById('font-bigger');
const smallerBtn = document.getElementById('font-smaller');

const FONT_STEP = 2;
const MIN_FONT = 10;
const MAX_FONT = 40;

biggerBtn.onclick = () => {
    if (!selectedIdea) return;

    const current = parseInt(
        window.getComputedStyle(selectedIdea.div).fontSize
    );
    const next = Math.min(current + FONT_STEP, MAX_FONT);

    selectedIdea.div.style.fontSize = next + 'px';
    saveToLocal();
};

smallerBtn.onclick = () => {
    if (!selectedIdea) return;

    const current = parseInt(
        window.getComputedStyle(selectedIdea.div).fontSize
    );
    const next = Math.max(current - FONT_STEP, MIN_FONT);

    selectedIdea.div.style.fontSize = next + 'px';
    saveToLocal();
};

/* ===============================
   아이디어 간 충돌 처리
================================ */

function handleIdeaCollisions() {
    // ✅ 피아노 모드에서는 충돌 처리 비활성화
    if (currentMode === 'piano') return;
    
    for (let i = 0; i < IDEAS.length; i++) {
        for (let j = i + 1; j < IDEAS.length; j++) {
            const a = IDEAS[i];
            const b = IDEAS[j];

            const dx = (a.x + a.div.offsetWidth / 2) - (b.x + b.div.offsetWidth / 2);
            const dy = (a.y + a.div.offsetHeight / 2) - (b.y + b.div.offsetHeight / 2);

            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDist = (a.div.offsetWidth + b.div.offsetWidth) / 4;

            if (distance < minDist && distance > 0) {
                const angle = Math.atan2(dy, dx);
                const force = 0.8;

                const fx = Math.cos(angle) * force;
                const fy = Math.sin(angle) * force;

                a.vx += fx;
                a.vy += fy;
                b.vx -= fx;
                b.vy -= fy;
            }
        }
    }
}
function animate(currentTime) {
    const deltaTime = Math.min(currentTime - lastTime, 100); 
    lastTime = currentTime;

    handleIdeaCollisions(); // ✅ 충돌 처리

    IDEAS.forEach(i => updateIdeaMovement(i, deltaTime));
    requestAnimationFrame(animate);
}

// 시작
loadFromLocal();
requestAnimationFrame(animate);

const titleInput = document.getElementById('title-input');

// 불러오기
const savedTitle = localStorage.getItem('canvas_title');
if (savedTitle) {
    titleInput.value = savedTitle;
}

// 저장
titleInput.addEventListener('input', () => {
    localStorage.setItem('canvas_title', titleInput.value);
});