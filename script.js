// ─── Init ───
lucide.createIcons();
document.getElementById('year').textContent = new Date().getFullYear();

// ─── Navbar Scroll Effect ───
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// ─── Mobile Menu Toggle ───
const mobileToggle = document.getElementById('mobile-toggle');
const navLinks = document.getElementById('nav-links');

if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
        const isOpen = navLinks.classList.toggle('mobile-open');
        mobileToggle.setAttribute('aria-expanded', isOpen);
        // Swap hamburger / close icon
        const icon = mobileToggle.querySelector('i, svg');
        if (icon) {
            icon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
            lucide.createIcons();
        }
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('mobile-open');
            mobileToggle.setAttribute('aria-expanded', 'false');
            const icon = mobileToggle.querySelector('i, svg');
            if (icon) {
                icon.setAttribute('data-lucide', 'menu');
                lucide.createIcons();
            }
        });
    });
}

// ─── Intersection Observer for Scroll Animations ───
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
};

const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal').forEach(el => {
    revealObserver.observe(el);
});

// ─── Setup Infinite Marquee ───
const marqueeContent = document.getElementById('marquee-content');
const marqueeItems = [
    "🔴 NLM Subsidy 50% available!",
    "🟢 KCC Loans at 4% Interest",
    "⭐ AHIDF ₹15,000 Cr Fund Active",
    "🟣 PM Livestock Insurance Scheme Live"
];

let marqueeHTML = '';
for (let i = 0; i < 4; i++) {
    marqueeItems.forEach(text => {
        marqueeHTML += `<div class="marquee-item"><i data-lucide="check-circle" width="16" height="16"></i> ${text}</div>`;
    });
}
marqueeContent.innerHTML = marqueeHTML;
lucide.createIcons(); // re-init for dynamically added marquee icons

// ─── Smooth Scroll for Anchor Links ───
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        if (this.getAttribute('href') === '#') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 100;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.scrollY - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ─── Hero Carousel Logic ───
const heroSlider = document.getElementById('hero-slider');
const dots = document.querySelectorAll('.slider-dots .dot');
let currentSlide = 0;
const totalSlides = dots.length;

function updateSlider(index) {
    currentSlide = index;
    if (heroSlider) {
        heroSlider.style.transform = `translateX(-${currentSlide * 100}%)`;
    }
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentSlide);
        dot.setAttribute('aria-selected', i === currentSlide ? 'true' : 'false');
    });
}

// Dot click handlers
dots.forEach(dot => {
    dot.addEventListener('click', () => {
        const index = parseInt(dot.getAttribute('data-index'));
        updateSlider(index);
        resetAutoPlay();
    });
});

// Keyboard support for dots (arrow key navigation)
dots.forEach((dot, i) => {
    dot.addEventListener('keydown', (e) => {
        let targetIndex;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            targetIndex = (i + 1) % totalSlides;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            targetIndex = (i - 1 + totalSlides) % totalSlides;
        }
        if (targetIndex !== undefined) {
            updateSlider(targetIndex);
            dots[targetIndex].focus();
            resetAutoPlay();
        }
    });
});

// Touch/Swipe logic
let touchStartX = 0;
let touchEndX = 0;

if (heroSlider) {
    heroSlider.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    heroSlider.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    // Mouse drag support for desktop
    let isDragging = false;
    heroSlider.addEventListener('mousedown', e => {
        isDragging = true;
        touchStartX = e.pageX;
    });
    heroSlider.addEventListener('mouseup', e => {
        if (!isDragging) return;
        isDragging = false;
        touchEndX = e.pageX;
        handleSwipe();
    });
    heroSlider.addEventListener('mouseleave', () => isDragging = false);
}

function handleSwipe() {
    const swipeThreshold = 50;
    if (touchEndX < touchStartX - swipeThreshold) {
        updateSlider((currentSlide + 1) % totalSlides);
        resetAutoPlay();
    }
    if (touchEndX > touchStartX + swipeThreshold) {
        updateSlider((currentSlide - 1 + totalSlides) % totalSlides);
        resetAutoPlay();
    }
}

// ─── Auto-play with Visibility Awareness ───
let autoPlayInterval;

function startAutoPlay() {
    autoPlayInterval = setInterval(() => {
        updateSlider((currentSlide + 1) % totalSlides);
    }, 5000);
}

function stopAutoPlay() {
    clearInterval(autoPlayInterval);
}

function resetAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
}

// Pause carousel when tab is not visible (saves battery)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        stopAutoPlay();
    } else {
        resetAutoPlay();
    }
});

// Initialize Carousel
startAutoPlay();

// ─── Contact Form AJAX Submission ───
const contactForm = document.getElementById('contactForm');
const submitBtn = document.getElementById('submitBtn');

if (contactForm && submitBtn) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Prevent standard page redirect
        
        // Change button state
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
        submitBtn.disabled = true;
        
        const formData = new FormData(contactForm);
        
        fetch(contactForm.action, {
            method: 'POST',
            body: formData,
            headers: {
                'Accept': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success || data.success === "true") {
                // Redirect securely on success
                const nextUrl = contactForm.querySelector('input[name="_next"]').value;
                window.location.href = nextUrl;
            } else {
                alert("Something went wrong. Please try again or contact us via WhatsApp.");
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert("Network error. Please try again later.");
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
    });
}