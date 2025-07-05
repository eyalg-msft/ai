class PacmanGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.gameMessageElement = document.getElementById('gameMessage');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        
        // Game settings
        this.tileSize = 20;
        this.boardWidth = 38;
        this.boardHeight = 30;
        
        // Game state
        this.score = 0;
        this.lives = 3;
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameWon = false;
        this.gameOver = false;
        
        // Initialize maze (1 = wall, 0 = dot, 2 = power pellet, 3 = empty)
        this.maze = this.createMaze();
        this.totalDots = this.countDots();
        this.dotsCollected = 0;
        
        // Pacman
        this.pacman = {
            x: 19,
            y: 23,
            direction: 0, // 0=right, 1=down, 2=left, 3=up
            nextDirection: 0,
            mouthOpen: true
        };
        
        // Ghosts
        this.ghosts = [
            { x: 19, y: 11, direction: 0, color: '#ff0000', scared: false, scaredTimer: 0 },
            { x: 18, y: 11, direction: 1, color: '#ffb8ff', scared: false, scaredTimer: 0 },
            { x: 20, y: 11, direction: 2, color: '#00ffff', scared: false, scaredTimer: 0 },
            { x: 19, y: 12, direction: 3, color: '#ffb852', scared: false, scaredTimer: 0 }
        ];
        
        this.powerPelletTimer = 0;
        this.directions = [
            { x: 1, y: 0 },   // right
            { x: 0, y: 1 },   // down
            { x: -1, y: 0 },  // left
            { x: 0, y: -1 }   // up
        ];
        
        this.setupEventListeners();
        this.gameLoop = this.gameLoop.bind(this);
    }
    
    createMaze() {
        // Simple maze layout (1 = wall, 0 = dot, 2 = power pellet, 3 = empty)
        const maze = [];
        for (let y = 0; y < this.boardHeight; y++) {
            maze[y] = [];
            for (let x = 0; x < this.boardWidth; x++) {
                if (x === 0 || x === this.boardWidth - 1 || y === 0 || y === this.boardHeight - 1) {
                    maze[y][x] = 1; // walls around the border
                } else if (x % 4 === 0 && y % 4 === 0) {
                    maze[y][x] = 1; // create some internal walls
                } else if ((x === 3 && y === 3) || (x === this.boardWidth - 4 && y === 3) || 
                          (x === 3 && y === this.boardHeight - 4) || (x === this.boardWidth - 4 && y === this.boardHeight - 4)) {
                    maze[y][x] = 2; // power pellets in corners
                } else if ((x >= 17 && x <= 21 && y >= 10 && y <= 13)) {
                    maze[y][x] = 3; // ghost house area
                } else {
                    maze[y][x] = 0; // dots
                }
            }
        }
        return maze;
    }
    
    countDots() {
        let count = 0;
        for (let y = 0; y < this.boardHeight; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                if (this.maze[y][x] === 0 || this.maze[y][x] === 2) {
                    count++;
                }
            }
        }
        return count;
    }
    
    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning || this.gamePaused) return;
            
            switch (e.key) {
                case 'ArrowRight':
                    this.pacman.nextDirection = 0;
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    this.pacman.nextDirection = 1;
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    this.pacman.nextDirection = 2;
                    e.preventDefault();
                    break;
                case 'ArrowUp':
                    this.pacman.nextDirection = 3;
                    e.preventDefault();
                    break;
            }
        });
        
        // Button controls
        this.startBtn.addEventListener('click', () => this.startGame());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
    }
    
    startGame() {
        this.score = 0;
        this.lives = 3;
        this.dotsCollected = 0;
        this.gameRunning = true;
        this.gamePaused = false;
        this.gameWon = false;
        this.gameOver = false;
        this.powerPelletTimer = 0;
        
        // Reset positions
        this.pacman.x = 19;
        this.pacman.y = 23;
        this.pacman.direction = 0;
        this.pacman.nextDirection = 0;
        
        this.ghosts.forEach((ghost, index) => {
            ghost.x = 19 + (index % 2 === 0 ? 0 : index === 1 ? -1 : 1);
            ghost.y = 11 + Math.floor(index / 2);
            ghost.direction = index;
            ghost.scared = false;
            ghost.scaredTimer = 0;
        });
        
        // Reset maze
        this.maze = this.createMaze();
        this.totalDots = this.countDots();
        
        this.startBtn.disabled = true;
        this.pauseBtn.disabled = false;
        this.hideMessage();
        this.updateUI();
        
        requestAnimationFrame(this.gameLoop);
    }
    
    togglePause() {
        this.gamePaused = !this.gamePaused;
        this.pauseBtn.textContent = this.gamePaused ? 'Resume' : 'Pause';
        if (!this.gamePaused) {
            requestAnimationFrame(this.gameLoop);
        }
    }
    
    gameLoop() {
        if (!this.gameRunning || this.gamePaused) return;
        
        this.update();
        this.draw();
        
        if (this.gameRunning && !this.gameOver && !this.gameWon) {
            setTimeout(() => requestAnimationFrame(this.gameLoop), 150);
        }
    }
    
    update() {
        this.updatePacman();
        this.updateGhosts();
        this.checkCollisions();
        this.updatePowerPellets();
        this.checkWinCondition();
    }
    
    updatePacman() {
        // Try to change direction
        const nextDir = this.directions[this.pacman.nextDirection];
        const nextX = this.pacman.x + nextDir.x;
        const nextY = this.pacman.y + nextDir.y;
        
        if (this.isValidMove(nextX, nextY)) {
            this.pacman.direction = this.pacman.nextDirection;
        }
        
        // Move in current direction
        const dir = this.directions[this.pacman.direction];
        const newX = this.pacman.x + dir.x;
        const newY = this.pacman.y + dir.y;
        
        if (this.isValidMove(newX, newY)) {
            this.pacman.x = newX;
            this.pacman.y = newY;
            
            // Handle tunnel effect (go through walls to other side)
            if (this.pacman.x < 0) this.pacman.x = this.boardWidth - 1;
            if (this.pacman.x >= this.boardWidth) this.pacman.x = 0;
            
            // Collect dots
            if (this.maze[this.pacman.y][this.pacman.x] === 0) {
                this.maze[this.pacman.y][this.pacman.x] = 3;
                this.score += 10;
                this.dotsCollected++;
            } else if (this.maze[this.pacman.y][this.pacman.x] === 2) {
                this.maze[this.pacman.y][this.pacman.x] = 3;
                this.score += 50;
                this.dotsCollected++;
                this.activatePowerPellet();
            }
        }
        
        // Animate mouth
        this.pacman.mouthOpen = !this.pacman.mouthOpen;
        this.updateUI();
    }
    
    updateGhosts() {
        this.ghosts.forEach(ghost => {
            if (ghost.scared && ghost.scaredTimer > 0) {
                ghost.scaredTimer--;
                if (ghost.scaredTimer <= 0) {
                    ghost.scared = false;
                }
            }
            
            // Simple AI - random direction changes
            if (Math.random() < 0.3) {
                ghost.direction = Math.floor(Math.random() * 4);
            }
            
            const dir = this.directions[ghost.direction];
            const newX = ghost.x + dir.x;
            const newY = ghost.y + dir.y;
            
            if (this.isValidMove(newX, newY) && !(newX >= 17 && newX <= 21 && newY >= 10 && newY <= 13)) {
                ghost.x = newX;
                ghost.y = newY;
                
                // Handle tunnel effect
                if (ghost.x < 0) ghost.x = this.boardWidth - 1;
                if (ghost.x >= this.boardWidth) ghost.x = 0;
            } else {
                // Change direction if hit wall
                ghost.direction = Math.floor(Math.random() * 4);
            }
        });
    }
    
    updatePowerPellets() {
        if (this.powerPelletTimer > 0) {
            this.powerPelletTimer--;
            if (this.powerPelletTimer <= 0) {
                this.ghosts.forEach(ghost => {
                    ghost.scared = false;
                    ghost.scaredTimer = 0;
                });
            }
        }
    }
    
    activatePowerPellet() {
        this.powerPelletTimer = 200; // About 30 seconds at 150ms per frame
        this.ghosts.forEach(ghost => {
            ghost.scared = true;
            ghost.scaredTimer = 200;
        });
    }
    
    checkCollisions() {
        this.ghosts.forEach(ghost => {
            if (ghost.x === this.pacman.x && ghost.y === this.pacman.y) {
                if (ghost.scared) {
                    // Eat ghost
                    this.score += 200;
                    ghost.x = 19;
                    ghost.y = 11;
                    ghost.scared = false;
                    ghost.scaredTimer = 0;
                } else {
                    // Ghost caught Pacman
                    this.lives--;
                    if (this.lives <= 0) {
                        this.endGame(false);
                    } else {
                        // Reset positions
                        this.pacman.x = 19;
                        this.pacman.y = 23;
                        this.ghosts.forEach((g, index) => {
                            g.x = 19 + (index % 2 === 0 ? 0 : index === 1 ? -1 : 1);
                            g.y = 11 + Math.floor(index / 2);
                        });
                    }
                }
            }
        });
    }
    
    checkWinCondition() {
        if (this.dotsCollected >= this.totalDots) {
            this.endGame(true);
        }
    }
    
    isValidMove(x, y) {
        if (x < 0 || x >= this.boardWidth || y < 0 || y >= this.boardHeight) {
            return x < 0 || x >= this.boardWidth; // Allow horizontal tunneling
        }
        return this.maze[y][x] !== 1; // Not a wall
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawMaze();
        this.drawPacman();
        this.drawGhosts();
    }
    
    drawMaze() {
        for (let y = 0; y < this.boardHeight; y++) {
            for (let x = 0; x < this.boardWidth; x++) {
                const pixelX = x * this.tileSize;
                const pixelY = y * this.tileSize;
                
                switch (this.maze[y][x]) {
                    case 1: // Wall
                        this.ctx.fillStyle = '#0000ff';
                        this.ctx.fillRect(pixelX, pixelY, this.tileSize, this.tileSize);
                        break;
                    case 0: // Dot
                        this.ctx.fillStyle = '#ffff00';
                        this.ctx.beginPath();
                        this.ctx.arc(pixelX + this.tileSize/2, pixelY + this.tileSize/2, 2, 0, Math.PI * 2);
                        this.ctx.fill();
                        break;
                    case 2: // Power pellet
                        this.ctx.fillStyle = '#ffff00';
                        this.ctx.beginPath();
                        this.ctx.arc(pixelX + this.tileSize/2, pixelY + this.tileSize/2, 6, 0, Math.PI * 2);
                        this.ctx.fill();
                        break;
                }
            }
        }
    }
    
    drawPacman() {
        const pixelX = this.pacman.x * this.tileSize + this.tileSize/2;
        const pixelY = this.pacman.y * this.tileSize + this.tileSize/2;
        
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        
        if (this.pacman.mouthOpen) {
            // Draw Pacman with mouth open
            const startAngle = (this.pacman.direction * Math.PI/2) - Math.PI/6;
            const endAngle = (this.pacman.direction * Math.PI/2) + Math.PI/6;
            this.ctx.arc(pixelX, pixelY, this.tileSize/2 - 2, startAngle, endAngle);
            this.ctx.lineTo(pixelX, pixelY);
        } else {
            // Draw full circle
            this.ctx.arc(pixelX, pixelY, this.tileSize/2 - 2, 0, Math.PI * 2);
        }
        
        this.ctx.fill();
        
        // Draw eye
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        const eyeX = pixelX + Math.cos(this.pacman.direction * Math.PI/2 - Math.PI/2) * 3;
        const eyeY = pixelY + Math.sin(this.pacman.direction * Math.PI/2 - Math.PI/2) * 3;
        this.ctx.arc(eyeX, eyeY, 2, 0, Math.PI * 2);
        this.ctx.fill();
    }
    
    drawGhosts() {
        this.ghosts.forEach(ghost => {
            const pixelX = ghost.x * this.tileSize + this.tileSize/2;
            const pixelY = ghost.y * this.tileSize + this.tileSize/2;
            
            this.ctx.fillStyle = ghost.scared ? '#0000ff' : ghost.color;
            
            // Draw ghost body
            this.ctx.beginPath();
            this.ctx.arc(pixelX, pixelY - 2, this.tileSize/2 - 2, Math.PI, 0);
            this.ctx.fillRect(pixelX - this.tileSize/2 + 2, pixelY - 2, this.tileSize - 4, this.tileSize/2);
            
            // Draw ghost bottom (wavy)
            this.ctx.beginPath();
            this.ctx.moveTo(pixelX - this.tileSize/2 + 2, pixelY + this.tileSize/2 - 2);
            for (let i = 0; i < 4; i++) {
                const x = pixelX - this.tileSize/2 + 2 + (i * (this.tileSize - 4) / 3);
                const y = pixelY + this.tileSize/2 - 2 + (i % 2 === 0 ? -4 : 0);
                this.ctx.lineTo(x, y);
            }
            this.ctx.lineTo(pixelX + this.tileSize/2 - 2, pixelY + this.tileSize/2 - 2);
            this.ctx.fill();
            
            // Draw eyes
            this.ctx.fillStyle = '#fff';
            this.ctx.beginPath();
            this.ctx.arc(pixelX - 4, pixelY - 4, 3, 0, Math.PI * 2);
            this.ctx.arc(pixelX + 4, pixelY - 4, 3, 0, Math.PI * 2);
            this.ctx.fill();
            
            if (!ghost.scared) {
                this.ctx.fillStyle = '#000';
                this.ctx.beginPath();
                this.ctx.arc(pixelX - 4, pixelY - 4, 1.5, 0, Math.PI * 2);
                this.ctx.arc(pixelX + 4, pixelY - 4, 1.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
    
    updateUI() {
        this.scoreElement.textContent = this.score;
        this.livesElement.textContent = this.lives;
    }
    
    showMessage(text, type = '') {
        this.gameMessageElement.textContent = text;
        this.gameMessageElement.className = `game-message ${type}`;
        this.gameMessageElement.classList.remove('hidden');
    }
    
    hideMessage() {
        this.gameMessageElement.classList.add('hidden');
    }
    
    endGame(won) {
        this.gameRunning = false;
        this.startBtn.disabled = false;
        this.pauseBtn.disabled = true;
        
        if (won) {
            this.gameWon = true;
            this.showMessage('YOU WIN!', 'win');
        } else {
            this.gameOver = true;
            this.showMessage('GAME OVER', 'lose');
        }
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    new PacmanGame();
});