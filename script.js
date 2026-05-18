// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    // Animate hamburger lines
    hamburger.classList.toggle('toggle');
});

// Close mobile menu when a link is clicked
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        hamburger.classList.remove('toggle');
    });
});

// Scroll animations (Intersection Observer)
const fadeElements = document.querySelectorAll('.fade-in');

const appearOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
};

const appearOnScroll = new IntersectionObserver(function(entries, appearOnScroll) {
    entries.forEach(entry => {
        if (!entry.isIntersecting) {
            return;
        } else {
            entry.target.classList.add('visible');
            appearOnScroll.unobserve(entry.target);
        }
    });
}, appearOptions);

fadeElements.forEach(el => {
    appearOnScroll.observe(el);
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    });
});

// Interactive Gaming Orb Logic & Shooting Mechanic
const orb = document.querySelector('.circuit-orb');
const gameOverlay = document.querySelector('.game-overlay');
const scoreBoard = document.getElementById('score-board');
let score = 0;

if (orb && gameOverlay) {
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let orbX = window.innerWidth / 2;
    let orbY = window.innerHeight / 2;
    
    orb.style.left = '0';
    orb.style.top = '0';

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY; // Using fixed position, so no scrollY needed
    });

    function animateOrb() {
        // Faster lerp for gaming feel
        orbX += (mouseX - orbX) * 0.15;
        orbY += (mouseY - orbY) * 0.15;
        
        orb.style.transform = `translate(calc(-50% + ${orbX}px), calc(-50% + ${orbY}px))`;
        
        requestAnimationFrame(animateOrb);
    }
    
    animateOrb();

    // Shooting Mechanic
    document.addEventListener('click', (e) => {
        // Firing recoil animation
        orb.style.transform = `translate(calc(-50% + ${orbX}px), calc(-50% + ${orbY}px)) scale(0.7)`;
        setTimeout(() => {
            if(orb) orb.style.transform = `translate(calc(-50% + ${orbX}px), calc(-50% + ${orbY}px)) scale(1)`;
        }, 100);

        // Check if we clicked a target
        const target = e.target.closest('.target');
        if (target) {
            explodeTarget(target);
        } else {
            createLaser(e.clientX, e.clientY);
        }
    });

    function createLaser(x, y) {
        const laser = document.createElement('div');
        laser.classList.add('laser');
        laser.style.left = orbX + 'px';
        laser.style.top = orbY + 'px';
        
        const dx = x - orbX;
        const dy = y - orbY;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI - 90;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        laser.style.transform = `rotate(${angle}deg)`;
        gameOverlay.appendChild(laser);
        
        // Animate laser
        let length = 0;
        const interval = setInterval(() => {
            length += 30; // Laser speed
            laser.style.height = length + 'px';
            if (length >= distance) {
                clearInterval(interval);
                createParticles(x, y);
                setTimeout(() => laser.remove(), 100);
            }
        }, 10);
    }

    function createParticles(x, y) {
        for(let i=0; i<8; i++) {
            const p = document.createElement('div');
            p.classList.add('particle');
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            gameOverlay.appendChild(p);
            
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 5 + 2;
            let px = x;
            let py = y;
            let opacity = 1;
            
            const anim = setInterval(() => {
                px += Math.cos(angle) * velocity;
                py += Math.sin(angle) * velocity;
                opacity -= 0.05;
                p.style.left = px + 'px';
                p.style.top = py + 'px';
                p.style.opacity = opacity;
                if(opacity <= 0) {
                    clearInterval(anim);
                    p.remove();
                }
            }, 16);
        }
    }

    // Spawn targets randomly
    setInterval(() => {
        if(document.querySelectorAll('.target').length < 8) {
            const techEmojis = ['👾', '🐛', '💾', '💻', '🔋'];
            const randomEmoji = techEmojis[Math.floor(Math.random() * techEmojis.length)];
            const target = document.createElement('div');
            target.classList.add('target');
            target.innerHTML = randomEmoji;
            target.style.left = Math.random() * (window.innerWidth - 100) + 50 + 'px';
            target.style.top = Math.random() * (window.innerHeight - 150) + 50 + 'px';
            gameOverlay.appendChild(target);
        }
    }, 1500);

    function explodeTarget(target) {
        const rect = target.getBoundingClientRect();
        createParticles(rect.left + rect.width/2, rect.top + rect.height/2);
        target.remove();
        
        score += 10;
        scoreBoard.innerText = `Score: ${score}`;
        scoreBoard.style.transform = 'scale(1.2)';
        setTimeout(() => scoreBoard.style.transform = 'scale(1)', 200);
    }
}

// Navbar background change on scroll
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.background = 'rgba(0, 20, 10, 0.98)';
        navbar.style.boxShadow = '0 2px 20px rgba(0, 255, 102, 0.15)';
    } else {
        navbar.style.background = 'rgba(0, 20, 10, 0.9)';
        navbar.style.boxShadow = 'none';
    }
});

// Animated stat counters
function animateCounter(el) {
    const target = parseInt(el.getAttribute('data-target'));
    const duration = 1800;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        el.textContent = Math.floor(current) + (el.parentElement.querySelector('.stat-label').textContent.includes('%') ? '' : '+');
    }, 16);
}

const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const numbers = entry.target.querySelectorAll('.stat-number');
            numbers.forEach(n => animateCounter(n));
            statObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

const statsBar = document.querySelector('.stats-bar');
if (statsBar) statObserver.observe(statsBar);
