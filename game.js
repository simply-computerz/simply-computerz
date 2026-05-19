// ================================
// NETRUNNER.EXE - Simply Computerz
// ================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
resize();
window.addEventListener('resize', resize);

// --- State ---
let gameState = 'START';
let score = 0;
let highScore = parseInt(localStorage.getItem('nr_hi')) || 0;
let wave = 0;
let waveActive = false;
let waveTimer = 0;
let enemiesThisWave = 0;
let enemiesSpawned = 0;
let spawnTimer = 0;
let bossWave = false;
let screenShake = 0;
let frame = 0;
let scrollY = 0;

// --- Entities ---
let bullets = [], eBullets = [], enemies = [], particles = [], powerups = [];

// --- Input ---
const keys = {};
let mouseX = innerWidth / 2, mouseY = innerHeight / 2, mouseDown = false, shootCooldown = 0;
let leftJoy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
let rightJoy = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();
    if (gameState === 'START' || gameState === 'OVER') startGame();
});
document.addEventListener('keyup', e => keys[e.code] = false);
canvas.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
canvas.addEventListener('mousedown', () => { mouseDown = true; if (gameState !== 'PLAYING') startGame(); });
canvas.addEventListener('mouseup', () => mouseDown = false);

// Touch Listeners
function handleTouchStart(e) {
    if (e.cancelable) e.preventDefault();
    if (gameState !== 'PLAYING') { startGame(); return; }
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.clientX < innerWidth / 2) {
            if (!leftJoy.active) {
                leftJoy.active = true;
                leftJoy.id = t.identifier;
                leftJoy.ox = t.clientX;
                leftJoy.oy = t.clientY;
                leftJoy.x = t.clientX;
                leftJoy.y = t.clientY;
            }
        } else {
            if (!rightJoy.active) {
                rightJoy.active = true;
                rightJoy.id = t.identifier;
                rightJoy.ox = t.clientX;
                rightJoy.oy = t.clientY;
                rightJoy.x = t.clientX;
                rightJoy.y = t.clientY;
            }
        }
    }
}
function handleTouchMove(e) {
    if (e.cancelable) e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (leftJoy.active && t.identifier === leftJoy.id) {
            leftJoy.x = t.clientX;
            leftJoy.y = t.clientY;
        }
        if (rightJoy.active && t.identifier === rightJoy.id) {
            rightJoy.x = t.clientX;
            rightJoy.y = t.clientY;
        }
    }
}
function handleTouchEnd(e) {
    if (e.cancelable) e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (leftJoy.id === t.identifier) { leftJoy.active = false; leftJoy.id = null; }
        if (rightJoy.id === t.identifier) { rightJoy.active = false; rightJoy.id = null; }
    }
}
canvas.addEventListener('touchstart', handleTouchStart, {passive: false});
canvas.addEventListener('touchmove', handleTouchMove, {passive: false});
canvas.addEventListener('touchend', handleTouchEnd, {passive: false});
canvas.addEventListener('touchcancel', handleTouchEnd, {passive: false});

// --- Player ---
const P = {
    x: 0, y: 0, size: 18, speed: 4.5, angle: 0,
    health: 100, maxHealth: 100, lives: 3,
    invincible: false, iTimer: 0, shield: false, sTimer: 0,
    init() {
        this.x = canvas.width / 2; this.y = canvas.height / 2;
        this.health = 100; this.lives = 3;
        this.invincible = false; this.shield = false;
    },
    update() {
        let dx = 0, dy = 0;
        if (keys['KeyW'] || keys['ArrowUp']) dy -= this.speed;
        if (keys['KeyS'] || keys['ArrowDown']) dy += this.speed;
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= this.speed;
        if (keys['KeyD'] || keys['ArrowRight']) dx += this.speed;
        
        if (leftJoy.active) {
            let jx = leftJoy.x - leftJoy.ox, jy = leftJoy.y - leftJoy.oy, d = Math.hypot(jx, jy);
            if (d > 5) { let f = Math.min(d/40, 1); dx = (jx/d)*this.speed*f; dy = (jy/d)*this.speed*f; }
        } else if (dx && dy) { dx *= 0.707; dy *= 0.707; }

        this.x = Math.max(this.size, Math.min(canvas.width - this.size, this.x + dx));
        this.y = Math.max(this.size, Math.min(canvas.height - this.size, this.y + dy));
        
        let isShooting = mouseDown || keys['Space'];
        if (rightJoy.active) {
            let jx = rightJoy.x - rightJoy.ox, jy = rightJoy.y - rightJoy.oy;
            if (Math.hypot(jx, jy) > 5) { this.angle = Math.atan2(jy, jx); isShooting = true; }
        } else {
            this.angle = Math.atan2(mouseY - this.y, mouseX - this.x);
        }

        shootCooldown--;
        if (isShooting && shootCooldown <= 0) {
            bullets.push({ x: this.x + Math.cos(this.angle)*this.size, y: this.y + Math.sin(this.angle)*this.size, vx: Math.cos(this.angle)*11, vy: Math.sin(this.angle)*11, life: 75 });
            shootCooldown = 8;
            sfx('shoot');
        }
        if (this.invincible) { this.iTimer--; if (this.iTimer <= 0) this.invincible = false; }
        if (this.shield) { this.sTimer--; if (this.sTimer <= 0) this.shield = false; }
    },
    hit(dmg) {
        if (this.invincible || this.shield) return;
        this.health -= dmg;
        this.invincible = true; this.iTimer = 90;
        screenShake = 10;
        burst(this.x, this.y, '#ff003c', 10, 4);
        sfx('hurt');
        if (this.health <= 0) {
            this.lives--;
            if (this.lives <= 0) { endGame(); }
            else { this.health = 100; this.iTimer = 180; }
        }
        updateHUD();
    },
    draw() {
        if (this.invincible && frame % 6 < 3) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + Math.PI / 2);
        if (this.shield) {
            ctx.shadowBlur = 30; ctx.shadowColor = '#9d00ff';
            ctx.strokeStyle = '#9d00ff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, this.size + 12, 0, Math.PI*2); ctx.stroke();
        }
        ctx.shadowBlur = 25; ctx.shadowColor = '#00ff66';
        ctx.fillStyle = '#00ff66'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -this.size);
        ctx.lineTo(-this.size * 0.7, this.size * 0.7);
        ctx.lineTo(0, this.size * 0.3);
        ctx.lineTo(this.size * 0.7, this.size * 0.7);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Engine flame
        ctx.shadowColor = '#00ff66'; ctx.fillStyle = 'rgba(0,255,102,0.7)';
        ctx.beginPath(); ctx.ellipse(0, this.size * 0.6, 5, 3 + Math.random()*5, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
};

// --- Enemy templates ---
const TYPES = {
    BOT:      { size:13, speed:1.6, hp:1, pts:10,  col:'#00ccff', shoot:0,   label:'DATA_BOT' },
    TRACKER:  { size:11, speed:3.0, hp:2, pts:25,  col:'#ffaa00', shoot:0,   label:'TRACKER' },
    FIREWALL: { size:20, speed:0.8, hp:5, pts:50,  col:'#ff4444', shoot:100, label:'FIREWALL' },
    ANTIVIRUS:{ size:15, speed:1.3, hp:4, pts:60,  col:'#cc00ff', shoot:70,  label:'ANTIVIRUS' },
};

function mkEnemy(type, x, y) {
    const t = TYPES[type];
    return { type, x, y, size:t.size, speed:t.speed + wave*0.06, hp:t.hp + Math.floor(wave/3), maxHp:t.hp+Math.floor(wave/3), pts:t.pts, col:t.col, shoot:t.shoot, sTimer:Math.random()*t.shoot|0, wobble:Math.random()*6.28, spin:0, label:t.label };
}

function mkBoss() {
    return { type:'BOSS', x:canvas.width/2, y:-100, size:48, speed:1.0, hp:60+wave*12, maxHp:60+wave*12, pts:1000+wave*200, col:'#ff003c', shoot:35, sTimer:0, phase:1, spin:0, tx:canvas.width/2, ty:180, mTimer:0, isBoss:true, label:'MAINFRAME' };
}

function spawnEdge() {
    const s = Math.random()*4|0, m=40;
    if(s===0) return {x:Math.random()*canvas.width, y:-m};
    if(s===1) return {x:canvas.width+m, y:Math.random()*canvas.height};
    if(s===2) return {x:Math.random()*canvas.width, y:canvas.height+m};
    return {x:-m, y:Math.random()*canvas.height};
}

function pickType() {
    const r = Math.random();
    if (wave<3) return 'BOT';
    if (wave<5) return r<0.55 ? 'BOT':'TRACKER';
    if (wave<8) return r<0.35?'BOT':r<0.6?'TRACKER':'FIREWALL';
    return r<0.25?'BOT':r<0.5?'TRACKER':r<0.7?'FIREWALL':'ANTIVIRUS';
}

// --- Wave ---
function startWave() {
    wave++; waveActive = true;
    bossWave = wave % 5 === 0;
    enemiesThisWave = bossWave ? 1 : 6 + wave*2;
    enemiesSpawned = 0; spawnTimer = 0;
    announce(bossWave ? '⚠ MAINFRAME DETECTED ⚠' : `WAVE ${wave}`, bossWave);
    sfx('wave');
    if (bossWave) { enemies.push(mkBoss()); enemiesSpawned = 1; }
    document.getElementById('wave-val').textContent = wave;
}

function announce(txt, isBoss) {
    const el = document.getElementById('wave-announce');
    el.textContent = txt;
    el.className = isBoss ? 'boss' : '';
    el.style.opacity = '1';
    setTimeout(() => el.style.opacity = '0', 2200);
}

// --- Power-ups ---
function spawnPowerup(x, y) {
    const types = ['HEALTH','SHIELD','MULTI'];
    const t = types[Math.random()*3|0];
    powerups.push({ x, y, type:t, life:300, spin:0 });
}

function applyPowerup(p) {
    if (p.type==='HEALTH') { P.health = Math.min(P.maxHealth, P.health+40); sfx('power'); }
    if (p.type==='SHIELD') { P.shield=true; P.sTimer=300; sfx('power'); }
    if (p.type==='MULTI')  { score += 200; sfx('power'); }
    updateHUD();
}

// --- Particles ---
function burst(x, y, col, n, spd) {
    for (let i=0;i<n;i++) {
        const a=Math.random()*6.28, v=Math.random()*spd+1;
        particles.push({ x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, col, life:50+Math.random()*20|0 });
    }
}

// --- SFX (Web Audio) ---
let audioCtx;
function sfx(type) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g); g.connect(audioCtx.destination);
        if (type==='shoot') { o.frequency.setValueAtTime(800,audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(200,audioCtx.currentTime+0.08); g.gain.setValueAtTime(0.15,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.08); o.type='square'; }
        if (type==='hurt')  { o.frequency.setValueAtTime(150,audioCtx.currentTime); g.gain.setValueAtTime(0.3,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.2); o.type='sawtooth'; }
        if (type==='die')   { o.frequency.setValueAtTime(400,audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(50,audioCtx.currentTime+0.15); g.gain.setValueAtTime(0.2,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.15); o.type='sawtooth'; }
        if (type==='wave')  { o.frequency.setValueAtTime(300,audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(600,audioCtx.currentTime+0.2); g.gain.setValueAtTime(0.2,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.3); }
        if (type==='power') { o.frequency.setValueAtTime(400,audioCtx.currentTime); o.frequency.exponentialRampToValueAtTime(900,audioCtx.currentTime+0.2); g.gain.setValueAtTime(0.2,audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+0.25); }
        o.start(); o.stop(audioCtx.currentTime + 0.3);
    } catch(e) {}
}

// --- HUD ---
function updateHUD() {
    document.getElementById('score-val').textContent = score;
    document.getElementById('health-bar').style.width = (P.health/P.maxHealth*100)+'%';
    document.getElementById('health-bar').style.background = P.health > 50 ? 'linear-gradient(90deg,#00ff66,#00cc44)' : P.health > 25 ? 'linear-gradient(90deg,#ff9900,#ff6600)' : 'linear-gradient(90deg,#ff003c,#cc0020)';
    const lv = document.getElementById('lives-display');
    lv.innerHTML = '';
    for(let i=0;i<P.lives;i++) lv.innerHTML += '<span class="life-icon">▲</span>';
    document.getElementById('hi-val').textContent = 'HI: ' + highScore;
}

// --- Game control ---
function startGame() {
    score=0; wave=0; bullets=[]; eBullets=[]; enemies=[]; particles=[]; powerups=[];
    P.init(); gameState='PLAYING';
    document.getElementById('overlay').style.display='none';
    document.getElementById('hud').style.display='flex';
    waveActive=false; waveTimer=60;
    updateHUD();
}

function endGame() {
    gameState='OVER';
    if(score>highScore) { highScore=score; localStorage.setItem('nr_hi',highScore); }
    document.getElementById('overlay').style.display='flex';
    document.getElementById('instr').style.display='none';
    document.getElementById('overlay-score').style.display='block';
    document.getElementById('overlay-score').textContent = 'SCORE: '+score;
    document.getElementById('overlay-hi').style.display='block';
    document.getElementById('overlay-hi').textContent = 'HIGH SCORE: '+highScore;
    document.getElementById('overlay').querySelector('h1').textContent='CONNECTION LOST';
    document.getElementById('start-prompt').textContent='[ RECONNECT? CLICK OR PRESS ANY KEY ]';
}

// --- Drawing helpers ---
function drawGrid() {
    scrollY = (scrollY + 0.5) % 40;
    ctx.strokeStyle = 'rgba(0,255,102,0.05)';
    ctx.lineWidth = 1;
    for(let x=0;x<canvas.width;x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
    for(let y=-scrollY;y<canvas.height;y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
}

function drawEnemy(e) {
    e.spin += 0.04;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.spin);
    ctx.shadowBlur = 20; ctx.shadowColor = e.col;
    ctx.strokeStyle = e.col; ctx.lineWidth = 2;
    ctx.fillStyle = e.col + '33';

    if (e.type==='BOT') {
        ctx.strokeRect(-e.size/2, -e.size/2, e.size, e.size);
        ctx.fillRect(-e.size/2, -e.size/2, e.size, e.size);
        // X marks the spot
        ctx.beginPath(); ctx.moveTo(-e.size/2,-e.size/2); ctx.lineTo(e.size/2,e.size/2);
        ctx.moveTo(e.size/2,-e.size/2); ctx.lineTo(-e.size/2,e.size/2); ctx.stroke();
    } else if (e.type==='TRACKER') {
        ctx.beginPath(); ctx.moveTo(0,-e.size); ctx.lineTo(e.size,0); ctx.lineTo(0,e.size); ctx.lineTo(-e.size,0); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (e.type==='FIREWALL') {
        ctx.beginPath();
        for(let i=0;i<6;i++) { const a=i/6*Math.PI*2; i===0?ctx.moveTo(Math.cos(a)*e.size,Math.sin(a)*e.size):ctx.lineTo(Math.cos(a)*e.size,Math.sin(a)*e.size); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (e.type==='ANTIVIRUS') {
        ctx.beginPath(); ctx.moveTo(0,-e.size); ctx.lineTo(e.size*0.866,e.size*0.5); ctx.lineTo(-e.size*0.866,e.size*0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (e.isBoss) {
        // Boss - large octagon
        ctx.rotate(e.spin);
        ctx.beginPath();
        for(let i=0;i<8;i++) { const a=i/8*Math.PI*2; i===0?ctx.moveTo(Math.cos(a)*e.size,Math.sin(a)*e.size):ctx.lineTo(Math.cos(a)*e.size,Math.sin(a)*e.size); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        // Core
        ctx.fillStyle = e.col; ctx.shadowBlur=40;
        ctx.beginPath(); ctx.arc(0,0,e.size*0.4,0,Math.PI*2); ctx.fill();
        // Label
        ctx.restore();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px "Share Tech Mono"';
        ctx.textAlign = 'center'; ctx.fillText('MAINFRAME', e.x, e.y - e.size - 8);
        // HP bar
        const bw = e.size*2.5;
        ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.fillRect(e.x-bw/2, e.y-e.size-28, bw, 6);
        ctx.fillStyle=e.col; ctx.shadowBlur=10; ctx.shadowColor=e.col;
        ctx.fillRect(e.x-bw/2, e.y-e.size-28, bw*(e.hp/e.maxHp), 6);
        return;
    }
    ctx.restore();

    // Label above
    ctx.fillStyle = e.col + 'aa'; ctx.font = '10px "Share Tech Mono"'; ctx.textAlign='center';
    ctx.fillText(e.label, e.x, e.y - e.size - 4);
}

function drawBullet(b, col) {
    ctx.save();
    ctx.shadowBlur = 15; ctx.shadowColor = col;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
    ctx.restore();
}

function drawPowerup(p) {
    p.spin += 0.06; p.life--;
    const icons = { HEALTH:'❤', SHIELD:'🛡', MULTI:'⚡' };
    const cols  = { HEALTH:'#ff4466', SHIELD:'#9d00ff', MULTI:'#ffdd00' };
    ctx.save();
    ctx.translate(p.x, p.y); ctx.rotate(p.spin);
    ctx.shadowBlur = 20; ctx.shadowColor = cols[p.type];
    ctx.font = '22px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(icons[p.type], 0, 0);
    ctx.restore();
}

function drawScanlines() {
    ctx.fillStyle = 'rgba(0,0,0,0.03)';
    for(let y=0;y<canvas.height;y+=3) ctx.fillRect(0,y,canvas.width,1);
}

// --- Main update ---
function update() {
    frame++;
    if (screenShake > 0) screenShake--;

    if (!waveActive) {
        waveTimer--;
        if (waveTimer <= 0) startWave();
    } else if (!bossWave && enemiesSpawned < enemiesThisWave) {
        spawnTimer--;
        if (spawnTimer <= 0) {
            const p = spawnEdge();
            enemies.push(mkEnemy(pickType(), p.x, p.y));
            enemiesSpawned++;
            spawnTimer = Math.max(18, 80 - wave*3);
        }
    }

    P.update();

    // Update enemies
    for(let i=enemies.length-1;i>=0;i--) {
        const e = enemies[i];
        if (e.isBoss) {
            e.mTimer++;
            if (e.mTimer % 110===0) { e.tx=100+Math.random()*(canvas.width-200); e.ty=80+Math.random()*200; }
            e.x += (e.tx-e.x)*0.025; e.y += (e.ty-e.y)*0.025;
            if (e.hp < e.maxHp/2 && e.phase===1) { e.phase=2; e.shoot=22; announce('⚠ FIREWALL PHASE 2 ⚠', true); }
        } else {
            const dx=P.x-e.x, dy=P.y-e.y, dist=Math.hypot(dx,dy);
            if (e.type==='FIREWALL') { e.wobble+=0.04; e.x+=Math.cos(e.wobble)*2+(dx/dist)*e.speed*0.4; e.y+=Math.sin(e.wobble*0.7)+(dy/dist)*e.speed*0.4; }
            else { e.x+=(dx/dist)*e.speed; e.y+=(dy/dist)*e.speed; }
            if (dist < e.size+P.size) P.hit(12);
        }
        if (e.shoot>0) { e.sTimer--; if(e.sTimer<=0) { enemyShoot(e); e.sTimer=e.shoot; } }
    }

    // Player bullets vs enemies
    for(let i=bullets.length-1;i>=0;i--) {
        const b=bullets[i]; b.x+=b.vx; b.y+=b.vy; b.life--;
        let hit=false;
        for(let j=enemies.length-1;j>=0;j--) {
            const e=enemies[j];
            if(Math.hypot(b.x-e.x,b.y-e.y)<e.size+4) {
                e.hp--; burst(b.x,b.y,e.col,4,3);
                bullets.splice(i,1); hit=true;
                if(e.hp<=0) { killEnemy(j,e); }
                break;
            }
        }
        if(!hit && (b.life<=0||b.x<0||b.x>canvas.width||b.y<0||b.y>canvas.height)) bullets.splice(i,1);
    }

    // Enemy bullets vs player
    for(let i=eBullets.length-1;i>=0;i--) {
        const b=eBullets[i]; b.x+=b.vx; b.y+=b.vy; b.life--;
        if(Math.hypot(b.x-P.x,b.y-P.y)<P.size+b.size) { P.hit(18); burst(b.x,b.y,'#ff003c',5,3); eBullets.splice(i,1); continue; }
        if(b.life<=0||b.x<0||b.x>canvas.width||b.y<0||b.y>canvas.height) eBullets.splice(i,1);
    }

    // Powerups
    for(let i=powerups.length-1;i>=0;i--) {
        const p=powerups[i];
        if(Math.hypot(p.x-P.x,p.y-P.y)<P.size+15) { applyPowerup(p); powerups.splice(i,1); continue; }
        if(p.life<=0) powerups.splice(i,1);
    }

    // Particles
    for(let i=particles.length-1;i>=0;i--) {
        const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.vx*=0.93; p.vy*=0.93; p.life--;
        if(p.life<=0) particles.splice(i,1);
    }

    if (waveActive && enemies.length===0 && enemiesSpawned>=enemiesThisWave) {
        waveActive=false; waveTimer=180; score+=wave*50; updateHUD();
        announce('WAVE CLEARED +' + (wave*50), false);
    }
    updateHUD();
}

function enemyShoot(e) {
    const dx=P.x-e.x, dy=P.y-e.y, dist=Math.hypot(dx,dy), spd=e.isBoss?5:3.5;
    if(e.isBoss && e.phase===2) {
        for(let s=-1;s<=1;s++) {
            const a=Math.atan2(dy,dx)+s*0.25;
            eBullets.push({x:e.x,y:e.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,size:5,life:100});
        }
    } else {
        eBullets.push({x:e.x,y:e.y,vx:(dx/dist)*spd,vy:(dy/dist)*spd,size:4,life:90});
    }
}

function killEnemy(idx, e) {
    score += e.pts; burst(e.x,e.y,e.col,18,5); burst(e.x,e.y,'#fff',8,3);
    screenShake = e.isBoss?22:5; sfx('die');
    if(Math.random()<0.18) spawnPowerup(e.x,e.y);
    enemies.splice(idx,1);
}

// --- Draw ---
function draw() {
    // Screen shake
    if(screenShake>0) { ctx.save(); ctx.translate((Math.random()-0.5)*screenShake,(Math.random()-0.5)*screenShake); }
    ctx.fillStyle='rgba(0,0,0,0.92)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    drawGrid();
    powerups.forEach(drawPowerup);
    bullets.forEach(b => drawBullet(b,'#00ff66'));
    eBullets.forEach(b => drawBullet(b,'#ff003c'));
    enemies.forEach(drawEnemy);
    // Particles
    particles.forEach(p => {
        const alpha = p.life/60;
        ctx.globalAlpha = Math.min(alpha,1);
        ctx.fillStyle = p.col; ctx.shadowBlur=8; ctx.shadowColor=p.col;
        ctx.beginPath(); ctx.arc(p.x,p.y,2,0,Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha=1; ctx.shadowBlur=0;
    P.draw();
    drawScanlines();
    if(screenShake>0) ctx.restore();

    // Draw Joysticks
    ctx.lineWidth = 2;
    if (leftJoy.active) {
        ctx.strokeStyle = 'rgba(0,255,102,0.3)'; ctx.beginPath(); ctx.arc(leftJoy.ox, leftJoy.oy, 40, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = 'rgba(0,255,102,0.5)'; ctx.beginPath(); ctx.arc(leftJoy.x, leftJoy.y, 20, 0, Math.PI*2); ctx.fill();
    }
    if (rightJoy.active) {
        ctx.strokeStyle = 'rgba(0,255,102,0.3)'; ctx.beginPath(); ctx.arc(rightJoy.ox, rightJoy.oy, 40, 0, Math.PI*2); ctx.stroke();
        ctx.fillStyle = 'rgba(0,255,102,0.5)'; ctx.beginPath(); ctx.arc(rightJoy.x, rightJoy.y, 20, 0, Math.PI*2); ctx.fill();
    }

    // Custom cursor crosshair
    ctx.save();
    ctx.strokeStyle='#00ff66'; ctx.lineWidth=1.5; ctx.shadowBlur=10; ctx.shadowColor='#00ff66';
    ctx.beginPath(); ctx.arc(mouseX,mouseY,12,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mouseX-20,mouseY); ctx.lineTo(mouseX-14,mouseY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mouseX+20,mouseY); ctx.lineTo(mouseX+14,mouseY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mouseX,mouseY-20); ctx.lineTo(mouseX,mouseY-14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mouseX,mouseY+20); ctx.lineTo(mouseX,mouseY+14); ctx.stroke();
    ctx.restore();
}

function loop() {
    if(gameState==='PLAYING') update();
    draw();
    requestAnimationFrame(loop);
}
loop();
