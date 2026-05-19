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

// Interactive Ambient Floater Shooting Game
const floaters = document.querySelectorAll('.ambient-floater');
const heroSection = document.querySelector('.hero');
const turret = document.querySelector('.gaming-controller-turret');
const orb = document.querySelector('.circuit-orb');
const scoreVal = document.getElementById('score-val');
let score = 0;

if (heroSection && floaters.length > 0) {
    // Smooth trailing Circuit Orb logic
    let mouseX = 0, mouseY = 0;
    let orbX = 0, orbY = 0;
    let hasMoved = false;

    // 1. Mouse movements
    document.addEventListener('mousemove', (e) => {
        // Show orb on first mouse movement
        if (!hasMoved && orb) {
            orb.style.opacity = '1';
            hasMoved = true;
        }
        
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Rotate turret towards cursor
        if (turret) {
            const turretRect = turret.getBoundingClientRect();
            const turretX = turretRect.left + turretRect.width / 2;
            const turretY = turretRect.top + turretRect.height / 2;
            const dx = e.clientX - turretX;
            const dy = e.clientY - turretY;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
            turret.style.transform = `translateX(-50%) rotate(${angle}deg)`;
        }
    });

    // Lerp/smooth update the circuit orb position
    function updateOrbPosition() {
        if (orb && hasMoved) {
            const dx = mouseX - orbX;
            const dy = mouseY - orbY;
            orbX += dx * 0.15;
            orbY += dy * 0.15;
            orb.style.left = orbX + 'px';
            orb.style.top = orbY + 'px';
        }
        requestAnimationFrame(updateOrbPosition);
    }
    updateOrbPosition();

    // Target hover status for the cursor-following orb
    floaters.forEach(floater => {
        floater.addEventListener('mouseenter', () => {
            if (orb) orb.classList.add('target-hover');
        });
        floater.addEventListener('mouseleave', () => {
            if (orb) orb.classList.remove('target-hover');
        });
    });

    // 2. Click to shoot lasers from the controller
    document.addEventListener('click', (e) => {
        // Ignore clicks on standard links, inputs, navbars, and buttons to keep them usable
        if (e.target.closest('a') || e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('.calendly-inline-widget') || e.target.closest('.navbar')) {
            return;
        }

        // Fire laser from controller position (bottom-center) to click coordinate
        const startX = window.innerWidth / 2;
        const startY = window.innerHeight - 20;
        createLaser(startX, startY, e.clientX, e.clientY);
        
        // Robust Hit Detection: check if click coordinates fall within any floater's bounding box
        // We use a generous hitbox (+20px padding) since they are text emojis and hard to click precisely
        let hitFloater = null;
        for (let i = 0; i < floaters.length; i++) {
            const floater = floaters[i];
            if (floater.style.pointerEvents === 'none') continue; // Skip if already exploded/hidden
            
            const rect = floater.getBoundingClientRect();
            const padding = 20; // 20px extra clickable area
            
            if (e.clientX >= rect.left - padding && e.clientX <= rect.right + padding &&
                e.clientY >= rect.top - padding && e.clientY <= rect.bottom + padding) {
                hitFloater = floater;
                break;
            }
        }

        if (hitFloater) {
            score++;
            if (scoreVal) scoreVal.textContent = score;
            if (orb) orb.classList.remove('target-hover');
            explodeFloater(hitFloater);
        }
    });

    function createLaser(startX, startY, endX, endY) {
        const laser = document.createElement('div');
        laser.className = 'hero-laser';
        document.body.appendChild(laser);

        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        // Position laser and rotate it towards click coordinates
        laser.style.width = length + 'px';
        laser.style.transform = `translate(${startX}px, ${startY}px) rotate(${angle}deg)`;

        // Visual recoil on controller turret
        if (turret) {
            turret.style.transform += ' scale(0.85)';
            setTimeout(() => {
                // Return to hover angle
                const turretRect = turret.getBoundingClientRect();
                const turretX = turretRect.left + turretRect.width / 2;
                const turretY = turretRect.top + turretRect.height / 2;
                const dx = endX - turretX;
                const dy = endY - turretY;
                const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                turret.style.transform = `translateX(-50%) rotate(${angle}deg) scale(1)`;
            }, 80);
        }

        // Dissolve laser beam
        setTimeout(() => {
            laser.style.opacity = '0';
            setTimeout(() => laser.remove(), 150);
        }, 80);
    }

    function explodeFloater(floater) {
        const rect = floater.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // Spark particles
        for (let i = 0; i < 16; i++) {
            const p = document.createElement('div');
            p.className = 'laser-particle';
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            
            // Alternating neon purple and neon green colors
            const isPurple = Math.random() > 0.5;
            p.style.background = isPurple ? 'var(--primary)' : 'var(--secondary)';
            p.style.boxShadow = `0 0 10px ${isPurple ? 'var(--primary-glow)' : 'var(--secondary-glow)'}`;
            
            document.body.appendChild(p);
            
            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 6 + 2;
            let px = x;
            let py = y;
            let opacity = 1;
            let scale = 1.0;
            
            const anim = setInterval(() => {
                px += Math.cos(angle) * velocity;
                py += Math.sin(angle) * velocity;
                opacity -= 0.04;
                scale -= 0.04;
                p.style.left = px + 'px';
                p.style.top = py + 'px';
                p.style.opacity = opacity;
                p.style.transform = `scale(${scale})`;
                
                if (opacity <= 0) {
                    clearInterval(anim);
                    p.remove();
                }
            }, 16);
        }

        // Hide / explode the floater — stop animation so keyframes don't override the scale(0)
        floater.style.animation = 'none';
        floater.style.transform = 'scale(0)';
        floater.style.opacity = '0';
        floater.style.pointerEvents = 'none';

        // Respawn at a random viewport position after 3.5 seconds
        // Keep away from navbar (top ~90px = ~11vh) and edges
        setTimeout(() => {
            const newTop = Math.random() * 55 + 15;  // 15vh to 70vh (avoids navbar & bottom turret)
            const newLeft = Math.random() * 70 + 8;  // 8vw to 78vw (avoids edges)
            floater.style.top = newTop + 'vh';
            floater.style.left = newLeft + 'vw';
            floater.style.right = '';
            floater.style.opacity = '0.45';
            floater.style.pointerEvents = 'auto';
            // Pop-in: restore animation and reset transform
            setTimeout(() => {
                floater.style.animation = '';
                floater.style.transform = '';
            }, 50);
        }, 3500);
    }
}
