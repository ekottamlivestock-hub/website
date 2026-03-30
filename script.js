// Init Icons
        lucide.createIcons();

        // Dynamic Year
        document.getElementById('year').textContent = new Date().getFullYear();

        // Navbar Scroll Effect
        const navbar = document.getElementById('navbar');
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });

        // Intersection Observer for Scroll Animations
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

        // Setup Infinite Marquee
        const marqueeContent = document.getElementById('marquee-content');
        const marqueeItems = [
            "🔴 NLM Subsidy 50% available!", 
            "🟢 KCC Loans at 4% Interest", 
            "⭐ AHIDF ₹15,000 Cr Fund Active", 
            "🟣 PM Livestock Insurance Scheme Live",
            "🔴 NLM Subsidy 50% available!", 
            "🟢 KCC Loans at 4% Interest", 
            "⭐ AHIDF ₹15,000 Cr Fund Active"
        ];

        // Clone items for infinite scroll effect
        let marqueeHTML = '';
        for(let i=0; i<3; i++) {
            marqueeItems.forEach(text => {
                marqueeHTML += `<div class="marquee-item"><i data-lucide="check-circle" size="18"></i> ${text}</div>`;
            });
        }
        marqueeContent.innerHTML = marqueeHTML;
        lucide.createIcons(); // re-init icons for dynamic content

        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                // Not for empty hashes
                if(this.getAttribute('href') === '#') return;
                
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

        // Hero Carousel Logic
        const heroSlider = document.getElementById('hero-slider');
        const dots = document.querySelectorAll('.slider-dots .dot');
        let currentSlide = 0;
        const totalSlides = dots.length;

        function updateSlider(index) {
            currentSlide = index;
            if (heroSlider) {
                heroSlider.style.transform = `translateX(-${currentSlide * 100}%)`;
            }
            dots.forEach(dot => dot.classList.remove('active'));
            if (dots[currentSlide]) {
                dots[currentSlide].classList.add('active');
            }
        }

        // Dot click handlers
        dots.forEach(dot => {
            dot.addEventListener('click', () => {
                const index = parseInt(dot.getAttribute('data-index'));
                updateSlider(index);
                resetAutoPlay();
            });
        });

        // Touch/Swipe logic
        let touchStartX = 0;
        let touchEndX = 0;

        if (heroSlider) {
            heroSlider.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
            }, {passive: true});

            heroSlider.addEventListener('touchend', e => {
                touchEndX = e.changedTouches[0].screenX;
                handleSwipe();
            }, {passive: true});

            // Optional mouse drag support for desktop testing
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
                // Swiped left
                let next = currentSlide + 1;
                if (next >= totalSlides) next = 0;
                updateSlider(next);
                resetAutoPlay();
            }
            if (touchEndX > touchStartX + swipeThreshold) {
                // Swiped right
                let prev = currentSlide - 1;
                if (prev < 0) prev = totalSlides - 1;
                updateSlider(prev);
                resetAutoPlay();
            }
        }

        // Auto-play
        let autoPlayInterval;
        function startAutoPlay() {
            autoPlayInterval = setInterval(() => {
                let next = currentSlide + 1;
                if (next >= totalSlides) next = 0;
                updateSlider(next);
            }, 5000);
        }

        function resetAutoPlay() {
            clearInterval(autoPlayInterval);
            startAutoPlay();
        }

        // Initialize Carousel
        startAutoPlay();