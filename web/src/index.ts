const svgImage = document.getElementById('svg-image') as any as SVGSVGElement;
const svgContainer = document.getElementById('svg-container') as HTMLElement;
let viewBox = { x: 0, y: 0, width: 100, height: 100 };
let isDragging = false;
let startX = 0;
let startY = 0;
let movedDistance = 0;
const VIEW_MOVED_THRESHOLD = 7;

svgImage.addEventListener('mousedown', (e: MouseEvent) => {
    if (e.button !== 0) return; // Ignore right button clicks
    isDragging = true;
    movedDistance = 0;
    startX = e.clientX;
    startY = e.clientY;
});

document.addEventListener('mousemove', (e: MouseEvent) => {
    if (isDragging) {
        const dx = (e.clientX - startX) * (viewBox.width / svgImage.clientWidth);
        const dy = (e.clientY - startY) * (viewBox.height / svgImage.clientHeight);
        viewBox.x -= dx;
        viewBox.y -= dy;
        svgImage.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
        startX = e.clientX;
        startY = e.clientY;

        const d = svgToScreen(dx, dy, true);
        movedDistance += Math.sqrt(d.x * d.x + d.y * d.y);
    }
});

document.addEventListener('mouseup', (e: MouseEvent) => {
    if (e.button !== 0) return; // Ignore right button clicks
    isDragging = false;
});

function zoom(zoomFactor: number, centerX: number, centerY: number) {
    const newWidth = viewBox.width * zoomFactor;
    const newHeight = viewBox.height * zoomFactor;

    const dx = (centerX / svgImage.clientWidth) * (viewBox.width - newWidth);
    const dy = (centerY / svgImage.clientHeight) * (viewBox.height - newHeight);

    viewBox.x += dx;
    viewBox.y += dy;
    viewBox.width = newWidth;
    viewBox.height = newHeight;

    svgImage.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
}

function screenToSvg(x: number, y: number, asVector: boolean = false) {
    const point = svgImage.createSVGPoint();
    point.x = x;
    point.y = y;
    const ctm = svgImage.getScreenCTM()!.inverse();
    if (asVector) {
        ctm.e = 0;
        ctm.f = 0;
    }
    const svgPoint = point.matrixTransform(ctm);
    return { x: svgPoint.x, y: svgPoint.y };
}

function svgToScreen(x: number, y: number, asVector: boolean = false) {
    const point = svgImage.createSVGPoint();
    point.x = x;
    point.y = y;
    const ctm = svgImage.getScreenCTM()!;
    if (asVector) {
        ctm.e = 0;
        ctm.f = 0;
    }
    const screenPoint = point.matrixTransform(ctm);
    return { x: screenPoint.x, y: screenPoint.y };
}

svgImage.addEventListener('click', (e: MouseEvent) => {
    if (e.button !== 0 || movedDistance > VIEW_MOVED_THRESHOLD) return; // Ignore right button clicks and dragging
    const svgCoords = screenToSvg(e.clientX, e.clientY);
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', svgCoords.x.toString());
    circle.setAttribute('cy', svgCoords.y.toString());
    circle.setAttribute('r', '2');
    circle.setAttribute('fill', 'blue');
    svgImage.appendChild(circle);
});

document.addEventListener('keydown', (e: KeyboardEvent) => {
    const step = 0.1;
    const centerX = svgContainer.clientWidth / 2;
    const centerY = svgContainer.clientHeight / 2;
    switch (e.key) {
        case 'ArrowUp':
            viewBox.y -= 10;
            break;
        case 'ArrowDown':
            viewBox.y += 10;
            break;
        case 'ArrowLeft':
            viewBox.x -= 10;
            break;
        case 'ArrowRight':
            viewBox.x += 10;
            break;
        case '+':
            zoom(1 - step, centerX, centerY);
            break;
        case '-':
            zoom(1 + step, centerX, centerY);
            break;
    }
    svgImage.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
});

document.addEventListener('wheel', (e: WheelEvent) => {
    const step = 0.1;
    const mouseX = e.clientX - svgImage.getBoundingClientRect().left;
    const mouseY = e.clientY - svgImage.getBoundingClientRect().top;
    const zoomFactor = e.deltaY < 0 ? (1 - step) : (1 + step);
    zoom(zoomFactor, mouseX, mouseY);
});
