/**
 * 图像云图生成器 - Image Cloud Generator
 * 批量上传图像，自动生成星云状散布排列
 */

class ImageCloudGenerator {
    constructor() {
        // DOM Elements
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');
        this.imageCount = document.getElementById('imageCount');
        this.clearBtn = document.getElementById('clearBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.canvasWrapper = document.getElementById('canvasWrapper');
        this.imageCloud = document.getElementById('imageCloud');
        this.emptyState = document.getElementById('emptyState');
        this.exportCanvas = document.getElementById('exportCanvas');

        // Controls
        this.bgColor = document.getElementById('bgColor');
        this.useGradient = document.getElementById('useGradient');
        this.gradientColors = document.getElementById('gradientColors');
        this.gradientColor1 = document.getElementById('gradientColor1');
        this.gradientColor2 = document.getElementById('gradientColor2');
        this.imageSize = document.getElementById('imageSize');
        this.sizeValue = document.getElementById('sizeValue');
        this.spreadRange = document.getElementById('spreadRange');
        this.spreadValue = document.getElementById('spreadValue');
        this.rotationIntensity = document.getElementById('rotationIntensity');
        this.rotationValue = document.getElementById('rotationValue');
        this.useShadow = document.getElementById('useShadow');

        // State
        this.images = [];
        this.positions = [];
        this.downscaleCount = 0;

        this.defaults = {
            shape: 'original',
            bgColor: '#000000',
            useGradient: false,
            gradientColor1: '#0c0a1d',
            gradientColor2: '#1e1b4b',
            imageSize: 100,
            spreadRange: 100,
            rotationIntensity: 30,
            useShadow: true
        };

        this.MAX_IMAGE_DIM = 2000;

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateBackground();
    }

    bindEvents() {
        // Upload events
        this.uploadZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // Drag and drop
        this.uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadZone.classList.add('dragover');
        });

        this.uploadZone.addEventListener('dragleave', () => {
            this.uploadZone.classList.remove('dragover');
        });

        this.uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadZone.classList.remove('dragover');
            this.handleFileDrop(e);
        });

        // Button events
        this.clearBtn.addEventListener('click', () => this.clearImages());
        this.shuffleBtn.addEventListener('click', () => this.shuffleLayout());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        this.resetBtn.addEventListener('click', () => this.resetControls());

        // Shape radio buttons
        document.querySelectorAll('input[name="shape"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateImageShapes());
        });

        // Background controls
        this.bgColor.addEventListener('input', () => this.updateBackground());
        this.useGradient.addEventListener('change', () => {
            this.gradientColors.style.display = this.useGradient.checked ? 'flex' : 'none';
            this.updateBackground();
        });
        this.gradientColor1.addEventListener('input', () => this.updateBackground());
        this.gradientColor2.addEventListener('input', () => this.updateBackground());

        // Effect sliders
        this.imageSize.addEventListener('input', () => {
            this.sizeValue.textContent = this.imageSize.value + '%';
            this.updateLayout();
        });

        this.spreadRange.addEventListener('input', () => {
            this.spreadValue.textContent = this.spreadRange.value + '%';
            this.updateLayout();
        });

        this.rotationIntensity.addEventListener('input', () => {
            this.rotationValue.textContent = this.rotationIntensity.value + '°';
            this.updateLayout();
        });

        // Shadow toggle
        this.useShadow.addEventListener('change', () => this.updateImageShadows());

        // Resize handling
        window.addEventListener('resize', () => this.handleResize());
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.loadImages(files);
    }

    handleFileDrop(e) {
        const files = Array.from(e.dataTransfer.files).filter(file =>
            file.type.startsWith('image/')
        );
        this.loadImages(files);
    }

    loadImages(files) {
        const validFiles = files.filter(file => {
            const validTypes = [
                'image/jpeg',
                'image/png',
                'image/gif',
                'image/webp',
                'image/svg+xml',
                'image/heic',
                'image/heif'
            ];
            return validTypes.includes(file.type);
        });

        if (validFiles.length === 0) {
            alert('请选择有效的图片文件 (JPG, PNG, GIF, WebP, SVG)');
            return;
        }

        const loadPromises = validFiles.map(file => this.loadSingleImage(file));

        Promise.all(loadPromises).then(loadedImages => {
            this.images.push(...loadedImages);
            this.updateImageCount();
            this.generateLayout();
            this.renderCloud();
            this.updateButtonStates();
            if (this.downscaleCount > 0) {
                alert(`已自动缩放 ${this.downscaleCount} 张超大图片以保证性能。`);
                this.downscaleCount = 0;
            }
        });
    }

    loadSingleImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    if (file.type !== 'image/svg+xml') {
                        const maxDim = Math.max(img.width, img.height);
                        if (maxDim > this.MAX_IMAGE_DIM) {
                            const scale = this.MAX_IMAGE_DIM / maxDim;
                            const canvas = document.createElement('canvas');
                            canvas.width = Math.round(img.width * scale);
                            canvas.height = Math.round(img.height * scale);
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            const resizedSrc = canvas.toDataURL('image/png');
                            this.downscaleCount += 1;
                            resolve({
                                src: resizedSrc,
                                width: canvas.width,
                                height: canvas.height,
                                aspect: canvas.width / canvas.height
                            });
                            return;
                        }
                    }
                    resolve({
                        src: e.target.result,
                        width: img.width,
                        height: img.height,
                        aspect: img.width / img.height
                    });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    updateImageCount() {
        this.imageCount.textContent = `已选择 ${this.images.length} 张图片`;
    }

    updateButtonStates() {
        const hasImages = this.images.length > 0;
        this.clearBtn.disabled = !hasImages;
        this.shuffleBtn.disabled = !hasImages;
        this.downloadBtn.disabled = !hasImages;
        this.emptyState.style.display = hasImages ? 'none' : 'block';
    }

    clearImages() {
        this.images = [];
        this.positions = [];
        this.imageCloud.innerHTML = '';
        this.updateImageCount();
        this.updateButtonStates();
        this.fileInput.value = '';
    }

    resetControls() {
        const shapeInput = document.querySelector(`input[name="shape"][value="${this.defaults.shape}"]`);
        if (shapeInput) shapeInput.checked = true;

        this.bgColor.value = this.defaults.bgColor;
        this.useGradient.checked = this.defaults.useGradient;
        this.gradientColors.style.display = this.useGradient.checked ? 'flex' : 'none';
        this.gradientColor1.value = this.defaults.gradientColor1;
        this.gradientColor2.value = this.defaults.gradientColor2;

        this.imageSize.value = this.defaults.imageSize;
        this.sizeValue.textContent = this.defaults.imageSize + '%';
        this.spreadRange.value = this.defaults.spreadRange;
        this.spreadValue.textContent = this.defaults.spreadRange + '%';
        this.rotationIntensity.value = this.defaults.rotationIntensity;
        this.rotationValue.textContent = this.defaults.rotationIntensity + '°';
        this.useShadow.checked = this.defaults.useShadow;

        this.updateBackground();
        this.updateImageShadows();
        this.updateLayout();
    }

    /**
     * 生成星云布局 - 确保所有图片都在画布边界内
     */
    generateLayout() {
        const containerRect = this.canvasWrapper.getBoundingClientRect();
        const canvasWidth = containerRect.width;
        const canvasHeight = containerRect.height;
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;

        const sizeMultiplier = parseInt(this.imageSize.value) / 100;
        const spreadMultiplier = parseInt(this.spreadRange.value) / 100;
        const rotationMax = parseInt(this.rotationIntensity.value);

        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const imageCount = this.images.length;

        this.positions = this.images.map((img, index) => {
            // 先计算图片尺寸
            const distanceRatio = (index + 1) / imageCount;
            const sizeVariation = 1 - distanceRatio * 0.15;
            const baseSize = 130 * sizeMultiplier * sizeVariation;

            let width, height;
            if (img.aspect > 1) {
                height = baseSize;
                width = baseSize * img.aspect;
            } else {
                width = baseSize;
                height = baseSize / img.aspect;
            }

            // 限制最大尺寸
            const maxSize = 280 * sizeMultiplier;
            if (width > maxSize) {
                const ratio = maxSize / width;
                width = maxSize;
                height *= ratio;
            }
            if (height > maxSize) {
                const ratio = maxSize / height;
                height = maxSize;
                width *= ratio;
            }

            // 计算有效散布区域（考虑图片尺寸和旋转）
            const halfW = width / 2;
            const halfH = height / 2;
            const rotationPadding = Math.max(halfW, halfH) * 0.3; // 旋转余量
            const margin = 10 + rotationPadding;

            // 可用范围（图片中心点的有效范围）
            const minX = margin + halfW;
            const maxX = canvasWidth - margin - halfW;
            const minY = margin + halfH;
            const maxY = canvasHeight - margin - halfH;

            // 如果可用范围太小，调整到中心
            const validMinX = Math.min(minX, centerX);
            const validMaxX = Math.max(maxX, centerX);
            const validMinY = Math.min(minY, centerY);
            const validMaxY = Math.max(maxY, centerY);

            // 可用散布半径
            const availableRadiusX = (validMaxX - validMinX) / 2;
            const availableRadiusY = (validMaxY - validMinY) / 2;
            const maxSpreadRadius = Math.min(availableRadiusX, availableRadiusY) * spreadMultiplier;

            // 黄金角度螺旋分布
            const angle = index * goldenAngle + Math.random() * 0.3;
            const normalizedIndex = (index + 1) / imageCount;
            const baseRadius = Math.sqrt(normalizedIndex) * maxSpreadRadius;
            const randomOffset = (Math.random() - 0.5) * maxSpreadRadius * 0.3;
            const radius = Math.max(0, baseRadius + randomOffset);

            // 计算位置
            let x = centerX + Math.cos(angle) * radius;
            let y = centerY + Math.sin(angle) * radius;

            // 添加随机偏移
            x += (Math.random() - 0.5) * maxSpreadRadius * 0.2;
            y += (Math.random() - 0.5) * maxSpreadRadius * 0.2;

            // 严格限制在边界内
            x = Math.max(validMinX, Math.min(validMaxX, x));
            y = Math.max(validMinY, Math.min(validMaxY, y));

            // 随机旋转
            const rotation = (Math.random() - 0.5) * 2 * rotationMax;

            // Z-index
            const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            const maxDistance = Math.max(centerX, centerY);
            const zIndex = Math.floor((1 - distanceFromCenter / maxDistance) * 100) + Math.floor(Math.random() * 15);

            return {
                x: x - halfW,
                y: y - halfH,
                width,
                height,
                rotation,
                zIndex,
                scale: 0.88 + Math.random() * 0.24
            };
        });
    }

    renderCloud() {
        this.imageCloud.innerHTML = '';

        const shape = document.querySelector('input[name="shape"]:checked').value;
        const useShadow = this.useShadow.checked;

        this.images.forEach((img, index) => {
            const pos = this.positions[index];

            const wrapper = document.createElement('div');
            wrapper.className = `cloud-image ${shape}${useShadow ? ' with-shadow' : ''}`;
            wrapper.style.cssText = `
                left: ${pos.x}px;
                top: ${pos.y}px;
                width: ${pos.width}px;
                height: ${pos.height}px;
                z-index: ${pos.zIndex};
                transform: rotate(${pos.rotation}deg) scale(${pos.scale});
            `;

            const imgEl = document.createElement('img');
            imgEl.src = img.src;

            if (shape === 'circle') {
                imgEl.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 50%;
                `;
            } else if (shape === 'square') {
                const size = Math.min(pos.width, pos.height);
                imgEl.style.cssText = `
                    width: ${size}px;
                    height: ${size}px;
                    object-fit: cover;
                    border-radius: 8px;
                `;
                wrapper.style.width = `${size}px`;
                wrapper.style.height = `${size}px`;
            } else {
                imgEl.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                `;
            }

            wrapper.appendChild(imgEl);
            this.imageCloud.appendChild(wrapper);
        });
    }

    updateLayout() {
        if (this.images.length === 0) return;
        this.generateLayout();
        this.renderCloud();
    }

    handleResize() {
        if (this.images.length === 0) return;
        this.generateLayout();
        this.renderCloud();
    }

    shuffleLayout() {
        this.images = this.shuffleArray([...this.images]);
        this.generateLayout();
        this.renderCloud();
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    updateImageShapes() {
        this.renderCloud();
    }

    updateImageShadows() {
        const wrappers = this.imageCloud.querySelectorAll('.cloud-image');
        wrappers.forEach(wrapper => {
            wrapper.classList.toggle('with-shadow', this.useShadow.checked);
        });
    }

    updateBackground() {
        if (this.useGradient.checked) {
            this.canvasWrapper.style.background = `linear-gradient(135deg, ${this.gradientColor1.value} 0%, ${this.gradientColor2.value} 100%)`;
        } else {
            this.canvasWrapper.style.background = this.bgColor.value;
        }
    }

    async downloadImage() {
        const canvas = this.exportCanvas;
        const ctx = canvas.getContext('2d');

        const containerRect = this.canvasWrapper.getBoundingClientRect();
        const scale = 2;

        canvas.width = containerRect.width * scale;
        canvas.height = containerRect.height * scale;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(scale, scale);

        // Draw background
        if (this.useGradient.checked) {
            const gradient = ctx.createLinearGradient(0, 0, containerRect.width, containerRect.height);
            gradient.addColorStop(0, this.gradientColor1.value);
            gradient.addColorStop(1, this.gradientColor2.value);
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = this.bgColor.value;
        }
        ctx.fillRect(0, 0, containerRect.width, containerRect.height);

        // Sort by z-index
        const sortedImages = this.images
            .map((img, index) => ({ img, pos: this.positions[index], index }))
            .sort((a, b) => a.pos.zIndex - b.pos.zIndex);

        // Draw images
        try {
            let skipped = 0;
            for (const { img, pos } of sortedImages) {
                const drawn = await this.drawImageOnCanvas(ctx, img, pos);
                if (!drawn) skipped += 1;
            }

            // Download
            const link = document.createElement('a');
            link.download = `image-cloud-${Date.now()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            if (skipped > 0) {
                alert(`导出完成，但有 ${skipped} 张图片加载失败，已跳过。`);
            }
        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败：可能是跨域图片或内存不足，请重试或更换图片。');
        }
    }

    drawImageOnCanvas(ctx, img, pos) {
        return new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
                ctx.save();

                const centerX = pos.x + pos.width / 2;
                const centerY = pos.y + pos.height / 2;
                ctx.translate(centerX, centerY);
                ctx.rotate(pos.rotation * Math.PI / 180);
                ctx.scale(pos.scale, pos.scale);

                const shape = document.querySelector('input[name="shape"]:checked').value;

                if (this.useShadow.checked) {
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 20;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 6;
                }

                if (shape === 'circle') {
                    const radius = Math.min(pos.width, pos.height) / 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, radius, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(image, -radius, -radius, radius * 2, radius * 2);
                } else if (shape === 'square') {
                    const size = Math.min(pos.width, pos.height);
                    const half = size / 2;
                    this.roundRect(ctx, -half, -half, size, size, 8);
                    ctx.clip();
                    ctx.drawImage(image, -half, -half, size, size);
                } else {
                    const halfW = pos.width / 2;
                    const halfH = pos.height / 2;
                    ctx.drawImage(image, -halfW, -halfH, pos.width, pos.height);
                }

                ctx.restore();
                resolve(true);
            };
            image.onerror = () => {
                console.warn('Image failed to load for export.');
                resolve(false);
            };
            image.src = img.src;
        });
    }

    roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new ImageCloudGenerator();
});
